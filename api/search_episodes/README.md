# Search Episodes API

This API is used to search podcast episodes by keyword.
It supports pagination, sorting, language filter, and text highlight.

This document defines the **API contract** only.
Internal implementation (e.g. Elasticsearch) is not exposed.

---

## Endpoint
POST /api/search/episodes
Although search is read-only, this endpoint uses **POST**
to support complex query parameters in the request body.

---

## Request Body

### Fields

| Field | Type | Required | Description |
|------|------|----------|-------------|
| q | string | ✅ | Search keyword (cannot be empty) |
| page | number | ❌ | Page number (min: 1, default: 1) |
| size | number | ❌ | Page size (min: 1, max: 100, default: 20) |
| sort | string | ❌ | Sort order: `relevance` or `date` |
| language | string[] | ❌ | Language filter (e.g. `["en", "zh-TW"]`) |

### Example

See `request.example.json`.

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
| items | array | Episode list |

---

## Episode Object

| Field | Type | Description |
|------|------|-------------|
| episodeId | string | Episode ID |
| title | string | Episode title |
| description | string | Episode description |
| highlights | object | Highlighted text snippets |
| publishedAt | string | ISO 8601 datetime |
| durationSec | number | Episode duration (seconds) |
| imageUrl | string | Episode image |
| podcast | object | Podcast information |

---

## Highlights Object

Each highlight field contains an array of text fragments.

| Field | Type | Description |
|------|------|-------------|
| title | string[] | Highlighted title fragments |
| description | string[] | Highlighted description fragments |

---

## Podcast Object

| Field | Type | Description |
|------|------|-------------|
| podcastId | string | Podcast ID |
| title | string | Podcast title |
| publisher | string | Podcast publisher |
| imageUrl | string | Podcast image |

See `response.example.json`.

---

## Partial Success (200 OK)

When some internal components fail (for example, highlight service),
the API may still return search results with a warning.

### Top-level Fields

| Field | Type | Description |
|------|------|-------------|
| status | string | `partial_success` |
| warning | string | Warning message |
| data | object | Search result data |

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

- Maximum `size` is 100
- `page * size` must not exceed system limits
- Highlight tags use `<em>` by default