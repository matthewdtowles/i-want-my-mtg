use std::marker::PhantomData;

use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use bytes::Bytes;
use futures::StreamExt;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, warn};

const BUF_READER_SIZE: usize = 64 * 1024;

pub struct JsonStreamParser<T, P>
where
    P: JsonEventProcessor<T>,
{
    event_processor: P,
    _phantom: PhantomData<T>,
}

pub trait JsonEventProcessor<T> {
    async fn process_event<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> Result<usize>;

    fn take_batch(&mut self) -> Vec<T>;
}

impl<T, P> JsonStreamParser<T, P>
where
    P: JsonEventProcessor<T>,
{
    pub fn new(event_processor: P) -> Self {
        Self {
            event_processor,
            _phantom: PhantomData,
        }
    }

    pub async fn parse_stream<'a, S, F>(
        &mut self,
        byte_stream: S,
        mut on_batch: F,
    ) -> Result<()>
    where
        S: futures::Stream<Item = Result<Bytes, reqwest::Error>>,
        F: FnMut(Vec<T>) -> futures::future::BoxFuture<'a, Result<()>>,
    {
        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));
        let mut pinned_stream_reader = Box::pin(stream_reader);
        let mut buf_reader =
            BufReader::with_capacity(BUF_READER_SIZE, pinned_stream_reader.as_mut());
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut error_count = 0;
        loop {
            let event = self.get_next_event(&mut parser).await;
            let should_continue = self
                .handle_parse_event(event, &parser, &mut on_batch, &mut error_count)
                .await?;
            if !should_continue {
                return Ok(());
            }
        }
    }

    async fn get_next_event<R: tokio::io::AsyncRead + Unpin>(
        &self,
        parser: &mut JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> JsonEvent {
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
                    }
                }
            }
            event = parser.next_event();
        }
        event
    }

    async fn handle_parse_event<'a, R, F>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
        on_batch: &mut F,
        error_count: &mut usize,
    ) -> Result<bool>
    where
        R: tokio::io::AsyncRead + Unpin,
        F: FnMut(Vec<T>) -> futures::future::BoxFuture<'a, Result<()>>,
    {
        match event {
            JsonEvent::Eof => {
                let remaining = self.event_processor.take_batch();
                if !remaining.is_empty() {
                    debug!("Processing final batch of {} length", remaining.len());
                    on_batch(remaining).await?;
                }
                Ok(false)
            }
            JsonEvent::Error => {
                warn!("JSON parser error.");
                *error_count += 1;
                if *error_count > 10 {
                    error!("Parser error limit (10) exceeded. Aborting stream.");
                    return Err(anyhow::anyhow!("JSON streaming parse failed."));
                }
                Ok(true)
            }
            JsonEvent::NeedMoreInput => Ok(true),
            _ => {
                *error_count = 0;
                let processed_count = self.event_processor.process_event(event, parser).await?;
                if processed_count > 0 {
                    let batch = self.event_processor.take_batch();
                    if !batch.is_empty() {
                        on_batch(batch).await?;
                    }
                }
                Ok(true)
            }
        }
    }
}
