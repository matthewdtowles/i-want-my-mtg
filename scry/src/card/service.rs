use crate::{
    card::{
        event_processor::CardEventProcessor, mapper::CardMapper, models::Card,
        repository::CardRepository,
    },
    database::ConnectionPool,
    utils::{HttpClient, JsonStreamParser},
};
use anyhow::Result;
use serde_json::Value;
use std::{collections::HashSet, sync::Arc};
use tokio::sync::{Mutex, Semaphore};
use tracing::{debug, warn};

pub struct CardService {
    client: Arc<HttpClient>,
    repository: CardRepository,
}

impl CardService {
    const BATCH_SIZE: usize = 500;
    const CONCURRENCY: usize = 6;

    pub fn new(db: Arc<ConnectionPool>, http_client: Arc<HttpClient>) -> Self {
        Self {
            client: http_client,
            repository: CardRepository::new(db),
        }
    }

    pub async fn fetch_count(&self) -> Result<u64> {
        self.repository.count().await
    }

    pub async fn fetch_legality_count(&self) -> Result<u64> {
        self.repository.legality_count().await
    }

    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        debug!("Starting card ingestion for set: {}", set_code);
        let raw_data: Value = self.client.fetch_set_cards(&set_code).await?;
        let parsed = CardMapper::map_to_cards(raw_data)?;
        if parsed.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let final_cards = Self::merge_and_filter_cards(parsed);
        if final_cards.is_empty() {
            return Ok(0);
        }
        let count = self.repository.save_cards(&final_cards).await?;
        let _ = self.repository.save_legalities(&final_cards).await?;
        debug!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    pub async fn ingest_all(&self) -> Result<()> {
        debug!("Start ingestion of all cards");
        let byte_stream = self.client.all_cards_stream().await?;
        debug!("Received byte stream for all cards");
        let existing_set_cache: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));
        let sem = Arc::new(Semaphore::new(Self::CONCURRENCY));
        let event_processor = CardEventProcessor::new(Self::BATCH_SIZE);
        let mut json_stream_parser = JsonStreamParser::new(event_processor);
        let repo = self.repository.clone();
        json_stream_parser
            .parse_stream(byte_stream, move |batch| {
                let repo = repo.clone();
                let sem = sem.clone();
                let cache = existing_set_cache.clone();
                Box::pin(async move {
                    if batch.is_empty() {
                        return Ok(());
                    }
                    let permit = sem.clone().acquire_owned().await;
                    let mut batch_owned = batch.to_vec();
                    let handle = tokio::spawn(async move {
                        let _permit_guard = permit;
                        let set_code = batch_owned[0].set_code.clone();
                        {
                            let cache_lock = cache.lock().await;
                            if !cache_lock.contains(&set_code) {
                                drop(cache_lock);
                                match repo.set_exists(&set_code).await {
                                    Ok(true) => {
                                        let mut cache_lock = cache.lock().await;
                                        cache_lock.insert(set_code.clone());
                                    }
                                    Ok(false) => {
                                        warn!("Skipping cards for missing set {}", set_code);
                                        return Ok::<(), anyhow::Error>(());
                                    }
                                    Err(e) => return Err::<(), anyhow::Error>(e),
                                }
                            }
                        }
                        batch_owned = CardService::merge_and_filter_cards(batch_owned);
                        if !batch_owned.is_empty() {
                            repo.save_cards(&batch_owned).await?;
                            repo.save_legalities(&batch_owned).await?;
                        }
                        Ok::<(), anyhow::Error>(())
                    });
                    match handle.await {
                        Ok(Ok(())) => Ok(()),
                        Ok(Err(e)) => Err(e),
                        Err(join_err) => Err(anyhow::anyhow!("Task join error: {}", join_err)),
                    }
                })
            })
            .await?;
        Ok(())
    }

    pub async fn delete_all(&self) -> Result<u64> {
        debug!("Deleting all prices.");
        self.repository.delete_all().await
    }

    pub async fn cleanup_cards(&self, batch_size: i64) -> Result<u64> {
        debug!("Starting streaming cleanup");
        let byte_stream = self.client.all_cards_stream().await?;
        let sem = Arc::new(Semaphore::new(Self::CONCURRENCY));
        let event_processor = CardEventProcessor::new(Self::BATCH_SIZE);
        let mut json_stream_parser = JsonStreamParser::new(event_processor);
        let repo = self.repository.clone();
        let total = Arc::new(tokio::sync::Mutex::new(0u64));
        let total_for_closure = total.clone();
        json_stream_parser
            .parse_stream(byte_stream, move |batch| {
                let repo = repo.clone();
                let sem = sem.clone();
                let total = total_for_closure.clone();
                Box::pin(async move {
                    if batch.is_empty() {
                        return Ok(());
                    }
                    let _permit = sem.clone().acquire_owned().await;
                    let mut ids_to_delete: Vec<String> = Vec::new();
                    for c in batch.iter() {
                        if self.should_delete(c) {
                            ids_to_delete.push(c.id.clone());
                        }
                    }
                    if ids_to_delete.is_empty() {
                        return Ok(());
                    }
                    let deleted = repo
                        .delete_cards_by_ids_batched(&ids_to_delete, batch_size)
                        .await?;
                    let mut lock = total.lock().await;
                    *lock += deleted;
                    Ok(())
                })
            })
            .await?;
        let final_total = *total.lock().await;
        debug!(
            "Streaming cleanup complete; total affected: {}",
            final_total
        );
        Ok(final_total)
    }

    fn merge_and_filter_cards(mut cards: Vec<Card>) -> Vec<Card> {
        use std::collections::HashMap;
        let mut id_index: HashMap<String, usize> = HashMap::new();
        for (i, c) in cards.iter().enumerate() {
            id_index.insert(c.id.clone(), i);
        }
        let mut keep_mask = vec![true; cards.len()];
        for i in 0..cards.len() {
            if cards[i].is_online_only {
                keep_mask[i] = false;
                continue;
            }
            if cards[i].is_oversized {
                keep_mask[i] = false;
                continue;
            }
            if let Some(side) = cards[i].side.as_deref() {
                if side != "a" {
                    keep_mask[i] = false;
                    continue;
                }
            }
            let layout = cards[i].layout.to_lowercase();
            if layout == "split" || layout == "aftermath" {
                let mut parts: Vec<String> = Vec::new();
                if let Some(mc) = &cards[i].mana_cost {
                    parts.push(mc.clone());
                }
                if let Some(ref other_ids) = cards[i].other_face_ids {
                    for oid in other_ids.iter() {
                        if let Some(&other_idx) = id_index.get(oid) {
                            if let Some(m) = &cards[other_idx].mana_cost {
                                parts.push(m.clone());
                                keep_mask[other_idx] = false;
                            }
                        }
                    }
                }
                if !parts.is_empty() {
                    cards[i].mana_cost = Some(parts.join(" // "));
                }
            }
        }
        cards
            .into_iter()
            .enumerate()
            .filter(|(idx, _)| keep_mask[*idx])
            .map(|(_, c)| c)
            .collect()
    }

    fn should_delete(&self, card: &Card) -> bool {
        if card.is_online_only {
            return true;
        }
        if let Some(side) = card.side.as_deref() {
            return side != "a";
        }
        false
    }
}
