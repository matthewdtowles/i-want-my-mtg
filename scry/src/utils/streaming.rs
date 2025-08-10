use actson::{tokio::AsyncBufReaderJsonFeeder, JsonParser};
use bytes::Bytes;
use futures::Stream;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;

pub struct StreamingJsonParser<S>
where
    S: Stream<Item = Result<Bytes, reqwest::Error>> + Unpin,
{
    buf_reader: BufReader<StreamReader<S, Bytes>>,
    feeder: AsyncBufReaderJsonFeeder<BufReader<StreamReader<S, Bytes>>>,
    parser: JsonParser<AsyncBufReaderJsonFeeder<BufReader<StreamReader<S, Bytes>>>>,
}

impl<S> StreamingJsonParser<S>
where
    S: Stream<Item = Result<Bytes, reqwest::Error>> + Unpin,
{
    pub fn new(stream: S, buf_size: usize) -> Self {
        let stream_reader = StreamReader::new(stream);
        let buf_reader = BufReader::with_capacity(buf_size, stream_reader);
        let feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let parser = JsonParser::new(feeder);
        Self {
            buf_reader: feeder.get_mut().clone(), // or keep feeder/buf_reader as needed
            feeder,
            parser,
        }
    }

    pub fn parser_mut(&mut self) -> &mut JsonParser<AsyncBufReaderJsonFeeder<BufReader<StreamReader<S, Bytes>>>> {
        &mut self.parser
    }

    pub fn feeder_mut(&mut self) -> &mut AsyncBufReaderJsonFeeder<BufReader<StreamReader<S, Bytes>>> {
        &mut self.feeder
    }
}