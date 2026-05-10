# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **Breaking (API):** `price` object removed from `SealedProductApiResponseDto`
  (`GET /api/v1/sealed-products/:uuid`). Sealed-product price tracking was
  retired across the database and ETL, so the field can no longer be populated.
  This endpoint is not part of the public RapidAPI surface
  (`PUBLIC_PATH_ALLOWLIST`), but any internal or direct consumers of the JSON
  response should drop references to `price`.
