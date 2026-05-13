# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **User set-type preference.** Signed-in users can choose which set types
  appear in their default browse/search listings via the new "Set Types To
  Show" section on `/user`. `NULL` preference (the default) falls back to
  `is_main = true` so anonymous users and existing accounts see no change
  until they opt in. Backed by `users.included_set_types text[]`
  (migration `033`) and `GET`/`PUT /api/v1/user/preferences/set-types`.
  Curated UI: 8 primary types visible, 12 advanced types behind a
  `<details>` disclosure. Pairs with the scry-side `in_main` classifier
  fixes (scry `5.10.0` and `5.11.0`).

### Removed

- **Breaking (API):** `price` object removed from `SealedProductApiResponseDto`
  (`GET /api/v1/sealed-products/:uuid`). Sealed-product prices are not
  surfaced publicly - we don't have reliable sealed pricing, and buy-intent
  goes through the TCGPlayer affiliate link instead. The underlying
  `sealed_product_price` schema and ORM entities remain in place; only the
  API response field is removed. This endpoint is not part of the public
  RapidAPI surface (`PUBLIC_PATH_ALLOWLIST`), but any internal or direct
  consumers of the JSON response should drop references to `price`.
