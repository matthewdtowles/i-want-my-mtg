use crate::{
    card::{mapper::CardMapper, repository::CardRepository, stream_parser::CardStreamParser},
    database::ConnectionPool,
    utils::HttpClient,
};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use futures::StreamExt;
use std::sync::Arc;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BATCH_SIZE: usize = 500;
const BUF_READER_SIZE: usize = 64 * 1024;

pub struct CardService {
    client: Arc<HttpClient>,
    repository: CardRepository,
}

impl CardService {
    pub fn new(db: Arc<ConnectionPool>, http_client: Arc<HttpClient>) -> Self {
        Self {
            client: http_client,
            repository: CardRepository::new(db),
        }
    }

    pub async fn fetch_count(&self) -> Result<u64> {
        self.repository.count().await
    }

    /// Ingests all cards for a specific set identified by `set_code`.
    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting ingestion for set: {}", set_code);
        let url_path = format!("{set_code}.json");
        let raw_data = self.client.get_json(&url_path).await?;
        let cards = CardMapper::map_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    /// Ingests all available cards using a streaming approach.
    pub async fn ingest_all(&self) -> Result<()> {
        let url_path = "AllPrintings.json";
        debug!("Start ingestion of all cards");
        let byte_stream = self.client.get_bytes_stream(url_path).await?;
        debug!("Received byte stream for {}", url_path);
        //
        //
        // NEW/TEST
        let mut stream_parser = CardStreamParser::new(BATCH_SIZE);
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // TODO: YOU ARE HERE!!!!!
        // END NEW/TEST
        // 
        // 
        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));

        let mut buf_reader = BufReader::with_capacity(BUF_READER_SIZE, stream_reader);
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut stream_parser = CardStreamParser::new(BATCH_SIZE);
        let mut error_count = 0;

        loop {
            let mut event = parser.next_event();
            if event == JsonEvent::NeedMoreInput {
                let mut fill_attempts = 0;
                loop {
                    match parser.feeder.fill_buf().await {
                        Ok(()) => {
                            fill_attempts += 1;
                            if fill_attempts >= 3 {
                                break;
                            }
                            continue;
                        }
                        Err(e) => {
                            if fill_attempts == 0 {
                                error!("Failed to fill buffer: {}", e);
                            }
                            break;
                        }
                    }
                }
                event = parser.next_event();
            }
            match event {
                JsonEvent::Eof => {
                    let remaining_cards = stream_parser.take_batch();
                    if !remaining_cards.is_empty() {
                        debug!("Saving final batch of {} cards", remaining_cards.len());
                        self.repository.save(&remaining_cards).await?;
                    }
                    return Ok(());
                }
                JsonEvent::Error => {
                    warn!("JSON card parser error.");
                    error_count += 1;
                    if error_count > 10 {
                        error!("Parser error limit (10) exceeded. Aborting stream.");
                        return Err(anyhow::anyhow!(
                            "Streaming parse failed due to parser errors"
                        ));
                    }
                    continue;
                }
                JsonEvent::NeedMoreInput => {
                    continue;
                }
                _ => {
                    error_count = 0;
                    let processed_count = stream_parser.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let cards = stream_parser.take_batch();
                        if !cards.is_empty() {
                            self.repository.save(&cards).await?;
                        }
                    }
                }
            }
        }
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}
