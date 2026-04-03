# Embeddings API

OpenAI-style embedding endpoint for converting text to dense vectors.

Both the Python `podcast-search` service (local dev / eval) and the RunPod serverless backend
(production) implement this contract. Java `podcast-backend` calls whichever URL is configured
via `EMBEDDING_API_URL` — no code change needed to switch environments.

The Java backend supports two HTTP client implementations selected by `EMBEDDING_PROVIDER_TYPE`:
- `openai` (default): standard OpenAI-compatible `/v1/embeddings` — used for local dev (podcast-search)
- `runpod`: RunPod serverless format (different request/response envelope) — used in production

This document defines the **API contract** only.
Internal model weights and inference infrastructure are not exposed.

---

## Endpoint

```
POST /v1/embeddings
```

---

## Request Body

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| model | string | ✅ | Model identifier. Must be one of the supported models listed below. |
| input | string \| string[] | ✅ | Text to embed. Single string or array of strings (batch). |

### Supported Models

| Model | Language | Dimensions | Notes |
|-------|----------|-----------|-------|
| `paraphrase-multilingual-MiniLM-L12-v2` | zh-tw, zh-cn | 384 | Default Chinese model |
| `paraphrase-multilingual-MiniLM-L12-v2` | en | 384 | Default English model |

**Important:** The model name controls which vector space the output belongs to.
Always use the same model for both indexing and query time.
Indexing and query vectors must come from the same model — otherwise cosine similarity
scores are meaningless.

Unsupported model names return HTTP 422 immediately (no silent fallback).

See `request.single.example.json` and `request.batch.example.json`.

---

## Response (200 OK)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| object | string | Always `"list"` |
| data | array | List of embedding objects, one per input text |
| model | string | Model name echoed back from the request |

### Embedding Object

| Field | Type | Description |
|-------|------|-------------|
| object | string | Always `"embedding"` |
| index | integer | 0-based position corresponding to the input array |
| embedding | number[] | Dense float vector. Length is always 384. |

**Note:** `index` is guaranteed to be present and must be used to re-order results
when processing batch responses. Do not assume the response array is in input order.

See `response.success.single.example.json` and `response.success.batch.example.json`.

---

## Error Responses

### Error Response Format

| Field | Type | Description |
|-------|------|-------------|
| detail | string | Human-readable error message |

### Error Codes

| HTTP Status | Scenario | Client Action |
|-------------|----------|---------------|
| 401 / 403 | Invalid or missing API key | Do not retry; fix credentials |
| 422 | Unsupported model name | Do not retry; fix request |
| 429 | Rate limit exceeded | Retry with exponential backoff |
| 503 | Upstream model server unavailable | Retry with exponential backoff |
| 500 | Unexpected server error | Log and surface as `EmbeddingUnavailableException` |

**Retry strategy (Java `ExternalEmbeddingProvider` / `RunPodEmbeddingProvider`):**
- Single-text (`embed()`): up to 3 attempts, exponential backoff (500 ms base)
- Batch (`embed_batch()`): fail-fast, no retry (retrying large batches is too expensive)
- 401 / 403 / 422: never retry regardless of method

See `response.error.401.example.json`, `response.error.422.example.json`,
`response.error.503.example.json`.

---

## Environment Variables

These variables are read by both the Java backend and the Python service (when running in `api` strategy mode).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMBEDDING_API_URL` | ✅ | — | Full URL of the embedding endpoint (e.g. `https://api.siliconflow.cn/v1/embeddings`) |
| `EMBEDDING_API_KEY` | ✅ | — | Bearer token for `Authorization` header |
| `EMBEDDING_PROVIDER_TYPE` | ❌ | `openai` | HTTP client implementation: `openai` (local dev, OpenAI-compatible) or `runpod` (production, RunPod serverless) |
| `EMBEDDING_MODEL_ZH` | ❌ | `paraphrase-multilingual-MiniLM-L12-v2` | Model name for Chinese (zh-tw / zh-cn) text |
| `EMBEDDING_MODEL_EN` | ❌ | `paraphrase-multilingual-MiniLM-L12-v2` | Model name for English text |
| `EMBEDDING_TIMEOUT_MS` | ❌ | `2000` | Per-request timeout in milliseconds |

**Switching models:** To change models, update `EMBEDDING_MODEL_ZH` / `EMBEDDING_MODEL_EN`
**and** re-run the full batch indexing pipeline. Changing models without re-indexing produces
mismatched vector spaces and silently degrades search quality.

---

## Local Development

In local dev, run `podcast-search` with `EMBEDDING_STRATEGY=local` to serve this endpoint
from a local ML model (no API key needed):

```bash
# podcast-search/.env
EMBEDDING_STRATEGY=local
```

Then set `EMBEDDING_API_URL=http://localhost:8081/v1/embeddings` in the Java service.
The Java service is unaware of whether the URL points to a local Python server or an external provider.

---

## Notes

- Embeddings are **not normalized** by default unless the upstream model does so internally.
  Callers should not assume unit vectors.
- Batch input order: always sort the response `data` array by `index` before use.
- All embeddings are 384 dimensions regardless of language.
- This endpoint keeps request and success data shape close to OpenAI `/v1/embeddings`
  for easier provider switching, but it is not a 100% schema match
  (for example, error format and optional fields may differ).
