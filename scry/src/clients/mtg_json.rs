use anyhow::Result;

#[derive(Clone)]
pub struct MtgJsonClient {
    client: reqwest::Client,
    base_url: String,
}

impl MtgJsonClient {
    pub fn new(config: &crate::config::Config) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .user_agent("scry-mtg-tool/1.0")
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: config.mtg_json_base_url.clone(),
        }
    }

    pub async fn fetch_set(&self, set_code: &str) -> Result<Vec<serde_json::Value>> {
        self.fetch_json(set_code).await
    }

    pub async fn fetch_prices(&self) -> Result<Vec<serde_json::Value>> {
        // MTG JSON doesn't have prices, this might be for Scryfall or TCGPlayer
        self.fetch_json("/AllPricesToday.json").await
    }

    pub async fn fetch_sets(&self) -> Result<Vec<serde_json::Value>> {
        self.fetch_json("/SetList.json").await
    }

    pub async fn fetch_json<T>(&self, endpoint: &str) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        let url = format!("{}{}", self.base_url, endpoint);
        tracing::debug!("Fetching data from: {}", url);

        let request = self.client.get(&url);

        let response = request.send().await?;

        if !response.status().is_success() {
            tracing::error!("HTTP request failed: {} - {}", response.status(), url);
            return Err(anyhow::anyhow!(
                "HTTP request failed: {}",
                response.status()
            ));
        }

        let data = response.json::<T>().await?;
        tracing::debug!("Successfully fetched data from: {}", url);

        Ok(data)
    }
}
