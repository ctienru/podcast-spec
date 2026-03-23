# POST /api/log/click

## Overview
- Method: POST
- Path: /api/log/click
- Purpose: Record a click event when a user selects a search result. Used to compute online metrics such as same-language click rate and first-click rank.

## Request
- Content-Type: application/json
- Schema: [request.schema.json](./request.schema.json)
- Example: [request.example.json](./request.example.json)

### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestId` | string (UUID v4) | ✅ | Must come from `EpisodeSearchResponse.searchRequestId`. Do not generate a new UUID on the frontend. |
| `timestamp` | string (ISO 8601 UTC) | ✅ | Time of the click event. |
| `query` | string | ✅ | Search query (same as the corresponding query log). |
| `selectedLang` | LangParam | ✅ | Language selected when searching. |
| `clickedEpisodeId` | string | ✅ | ID of the clicked episode. Format: `episode:{source}:{showId}:{episodeId}` |
| `clickedRank` | integer (≥ 1) | ✅ | 1-based rank of the clicked result. |
| `clickedLanguage` | string | ✅ | Language index of the clicked episode. Used for same-language click rate. |
| `timeToClickSec` | number | ❌ | Seconds from search display to click. |

## Response

### Success (200)
- [response.success.example.json](./response.success.example.json)

```json
{ "status": "ok" }
```

### Error Codes
| Code | HTTP Status | Trigger |
|------|-------------|---------|
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds 200 req/sec |

- [response.error.429.example.json](./response.error.429.example.json)

## Rate Limit
200 req/sec (more permissive than search, as one search may produce multiple clicks).

## Notes
- `requestId` must come from the search response's `searchRequestId` field — this is required for query/click log join in the analytics pipeline.
- Frontend must not generate its own UUID for `requestId`.

## Related Docs
- Backend implementation: `podcast-backend-v2-plan.md` §5.2
- Query/click log schema: `search-quality-framework.md`
