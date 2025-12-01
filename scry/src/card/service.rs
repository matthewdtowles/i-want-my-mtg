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
    foreign_cards: Arc<Mutex<Vec<String>>>,
}

impl CardService {
    const BATCH_SIZE: usize = 500;
    const CONCURRENCY: usize = 6;

    pub fn new(db: Arc<ConnectionPool>, http_client: Arc<HttpClient>) -> Self {
        Self {
            client: http_client,
            repository: CardRepository::new(db),
            foreign_cards: Arc::new(Mutex::new(Vec::new())),
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
        {
            // TODO: Why do we have to do this?
            let mut lock = self.foreign_cards.lock().await;
            lock.clear();
        }
        let byte_stream = self.client.all_cards_stream().await?;
        debug!("Received byte stream for all cards");
        let existing_set_cache: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));
        let sem = Arc::new(Semaphore::new(Self::CONCURRENCY));
        let event_processor = CardEventProcessor::new(Self::BATCH_SIZE);
        let mut json_stream_parser = JsonStreamParser::new(event_processor);
        let repo = self.repository.clone();
        let foreign_cards = self.foreign_cards.clone();
        json_stream_parser
            .parse_stream(byte_stream, move |batch| {
                let repo = repo.clone();
                let sem = sem.clone();
                let cache = existing_set_cache.clone();
                let foreign_cards = foreign_cards.clone();
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
                        let mut foreign_ids = Vec::new();
                        for c in &batch_owned {
                            if !c.language.is_empty() && c.language != "English" {
                                foreign_ids.push(c.id.clone());
                            }
                        }
                        // save foreign card IDs to shared list
                        if !foreign_ids.is_empty() {
                            let mut lock = foreign_cards.lock().await;
                            lock.extend(foreign_ids);
                        }
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
                        if Self::should_filter(c) {
                            ids_to_delete.push(c.id.clone());
                        }
                    }
                    if ids_to_delete.is_empty() {
                        return Ok(());
                    }
                    let deleted = repo.delete_cards_batch(&ids_to_delete, batch_size).await?;
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

    pub async fn prune_foreign_unpriced(&self) -> Result<u64> {
        let card_candidates = {
            let lock = self.foreign_cards.lock().await;
            lock.clone()
        };
        if card_candidates.is_empty() {
            debug!("No foreign card candidates found to prune.");
            return Ok(0);
        }
        debug!(
            "Checking {} foreign card candidates for pricing.",
            card_candidates.len()
        );
        let ids_to_delete = self.repository.fetch_unpriced_ids(&card_candidates).await?;
        if ids_to_delete.is_empty() {
            debug!("Found 0 unpriced foreign cards to delete.");
            return Ok(0);
        }
        debug!(
            "Found {} unpriced foreign cards to delete.",
            ids_to_delete.len()
        );
        let total_deleted = self
            .repository
            .delete_cards_batch(&ids_to_delete, Self::BATCH_SIZE as i64)
            .await?;
        let mut lock = self.foreign_cards.lock().await;
        lock.clear();
        Ok(total_deleted)
    }

    fn merge_and_filter_cards(mut cards: Vec<Card>) -> Vec<Card> {
        use std::collections::HashMap;
        let mut id_index: HashMap<String, usize> = HashMap::new();
        for (i, c) in cards.iter().enumerate() {
            id_index.insert(c.id.clone(), i);
        }
        let mut keep_mask = vec![true; cards.len()];
        for i in 0..cards.len() {
            if Self::should_filter(&cards[i]) {
                keep_mask[i] = false;
                continue;
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

    fn should_filter(card: &Card) -> bool {
        if card.is_online_only || card.is_oversized {
            return true;
        }
        if let Some(side) = card.side.as_deref() {
            return side != "a";
        }
        false
    }
}
