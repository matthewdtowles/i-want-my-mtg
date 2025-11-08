use crate::{
    card::{event_processor::CardEventProcessor, mapper::CardMapper, repository::CardRepository},
    database::ConnectionPool,
    utils::{HttpClient, JsonStreamParser},
};
use anyhow::Result;
use serde_json::Value;
use std::{collections::HashSet, sync::Arc};
use tokio::sync::{Mutex, Semaphore};
use tracing::{debug, info, warn};

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

    pub async fn ingest_set_cards(&self, set_code: &str, cleanup_online: bool) -> Result<u64> {
        info!("Starting card ingestion for set: {}", set_code);
        let raw_data: Value = self.client.fetch_set_cards(&set_code).await?;
        if cleanup_online {
            if raw_data
                .get("isOnlineOnly")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
            {
                info!(
                    "Cleanup enabled and source set {} is online-only; deleting DB rows",
                    set_code
                );
                let _deleted = self
                    .repository
                    .delete_set_and_dependents(set_code, Self::BATCH_SIZE as i64)
                    .await?;
                return Ok(0);
            }
        }
        let cards = CardMapper::map_to_cards(raw_data, cleanup_online)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        if cleanup_online {
            let (online_only, keep): (Vec<_>, Vec<_>) =
                cards.into_iter().partition(|c| c.is_online_only);
            if !online_only.is_empty() {
                let ids: Vec<String> = online_only.iter().map(|c| c.id.clone()).collect();
                let _ = self
                    .repository
                    .delete_cards_by_ids_batched(&ids, 500)
                    .await?;
            }
            if keep.is_empty() {
                return Ok(0);
            }
            let count = self.repository.save_cards(&keep).await?;
            let _ = self.repository.save_legalities(&keep).await?;
            info!("Successfully ingested {} cards for set {}", count, set_code);
            return Ok(count);
        }
        let count = self.repository.save_cards(&cards).await?;
        let _ = self.repository.save_legalities(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    pub async fn ingest_all(&self, cleanup_online: bool) -> Result<()> {
        info!("Start ingestion of all cards");
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
                    let batch_owned = batch.to_vec();
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
                                    Err(e) => {
                                        return Err::<(), anyhow::Error>(e);
                                    }
                                }
                            }
                        }
                        // If cleanup run is requested, partition and delete online-only cards in this batch
                        if cleanup_online {
                            let (online_only, keep): (Vec<_>, Vec<_>) =
                                batch_owned.into_iter().partition(|c| c.is_online_only);
                            if !online_only.is_empty() {
                                let ids: Vec<String> =
                                    online_only.into_iter().map(|c| c.id).collect();
                                let _ = repo.delete_cards_by_ids_batched(&ids, 500).await?;
                            }
                            if !keep.is_empty() {
                                repo.save_cards(&keep).await?;
                                repo.save_legalities(&keep).await?;
                            }
                        } else {
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
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}
