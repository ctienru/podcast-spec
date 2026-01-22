# Search Shows (Podcasts)

Search podcasts (shows) by keyword.

This endpoint is primarily used for **discovery** on the search page:
- Rendered as a **horizontal carousel**
- Returns a **small number of results**
- Currently supports **first page only**

This document defines the **API contract** only.
Internal implementation details (e.g. Elasticsearch) are not exposed.

---

## Endpoint
POST /api/search/shows

Although search is read-only, this endpoint uses **POST**
to support flexible query parameters in the request body.

---

## Features

- Full-text search on show title and description
- Optional language filtering
- Page-based pagination (contract-level)
- Optimized for fast discovery UI

---

## Request Body

### Fields

| Field | Type | Required | Description |
|------|------|----------|-------------|
| q | string | ✅ | Search keyword (cannot be empty) |
| page | number | ❌ | Page number (min: 1, default: 1) |
| size | number | ❌ | Page size (min: 1, max: 100, default: 10) |
| language | string[] | ❌ | Language filter (e.g. `["en", "zh-TW"]`) |

### Example

See `request.example.json`.

---

## Pagination (Current Limitation)

This endpoint is currently optimized for **discovery use cases**.

- Only `page = 1` is supported at this time
- Requests with `page > 1` may return an empty result
  or a validation error
- Full pagination support may be added in the future
  **without changing the API contract**

Clients should treat this endpoint as a
**first-page-only discovery API** for now.

---

## Response Structure

All responses return a JSON object with a top-level `status` field.

### Status Values

| Value | Description |
|------|-------------|
| ok | Request succeeded |
| partial_success | Request succeeded with warnings |
| error | Request failed |

---

### Response Examples

| Scenario | Example File |
|--------|-------------|
| Success | response.success.example.json |
| Partial success | response.partial_success.example.json |
| Error | response.error.example.json |

---

## Response (200 OK)

### Top-level Fields

| Field | Type | Description |
|------|------|-------------|
| status | string | Response status |
| data | object | Response data (present when status is `ok` or `partial_success`) |
| warning | string | Warning message (only for `partial_success`) |

---

## Data Object

### Fields

| Field | Type | Description |
|------|------|-------------|
| page | number | Current page |
| size | number | Page size |
| total | number | Total matched results |
| items | array | Show list |

---

## Show Object

| Field | Type | Description |
|------|------|-------------|
| podcastId | string | Podcast ID |
| title | string | Podcast title |
| description | string | Podcast description |
| language | string | Primary language (for UI badges / debugging) |
| publisher | string | Podcast publisher |
| imageUrl | string | Podcast image |
| episodeCount | number | Total episode count |

---

## Partial Success (200 OK)

When some internal components fail (for example, enrichment service),
the API may still return results with a warning.

Example: `response.partial_success.example.json`

---

## Error Responses

### Error Response Format

| Field | Type | Description |
|------|------|-------------|
| status | string | Always `error` |
| error | object | Error details |

### Error Object

| Field | Type | Description |
|------|------|-------------|
| code | string | Application-specific error code |
| message | string | Human-readable error message |
| details | string[] | (Optional) List of individual error messages |

---

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_PARAMETER | 400 | Invalid request parameters (e.g., size > 100, empty query) |
| ES_PARSE_ERROR | 500 | Failed to parse search service response |
| ES_MISSING_FIELD | 500 | Required field missing in search response |
| SEARCH_SERVICE_ERROR | 503 | Search service temporarily unavailable |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

### 400 Bad Request

Invalid request parameters.

Example: `response.error.400.example.json`

---

### 500 Internal Server Error

Search response parsing failed or unexpected error.

Example: `response.error.500.example.json`

---

### 503 Service Unavailable

Search service temporarily unavailable.

Example: `response.error.503.example.json`

---

### 429 Too Many Requests

Rate limit exceeded.

---

## Notes

- Default `size` is 10, maximum `size` is 100
- This endpoint is optimized for fast UI rendering
- Results may be approximate (discovery-focused)
