# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **Breaking (API):** `price` object removed from `SealedProductApiResponseDto`
  (`GET /api/v1/sealed-products/:uuid`). Sealed-product prices are not
  surfaced publicly - we don't have reliable sealed pricing, and buy-intent
  goes through the TCGPlayer affiliate link instead. The underlying
  `sealed_product_price` schema and ORM entities remain in place; only the
  API response field is removed. This endpoint is not part of the public
  RapidAPI surface (`PUBLIC_PATH_ALLOWLIST`), but any internal or direct
  consumers of the JSON response should drop references to `price`.
