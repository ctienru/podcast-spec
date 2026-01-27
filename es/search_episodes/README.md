# Elasticsearch – Search Episodes

This document defines the Elasticsearch **query design and behavior**
used by the **Search Episodes API**.

Episode search is **intent-driven**:
users are usually searching for a specific topic or discussion,
not browsing casually.

This document focuses on **why** the query is designed this way,
not just what the query contains.

---

## Query Templates

| Template | Description | Use Case |
|----------|-------------|----------|
| `bm25.query.template.mustache` | BM25 text matching | Keyword search |
| `knn.query.template.mustache` | kNN semantic search | Semantic similarity |
| `query.template.mustache` | Legacy BM25 (deprecated) | Backward compatibility |

### Hybrid Search (Recommended)

For best results, use **Hybrid Search** combining BM25 + kNN with RRF fusion:

```
1. Execute BM25 query  → results_bm25 (top 100)
2. Execute kNN query   → results_knn (top 100)
3. Apply RRF fusion    → final results
```

**RRF (Reciprocal Rank Fusion):**

```
RRF_score(doc) = Σ 1 / (k + rank_i)

where k = 60 (rank constant)
```

RRF is implemented in the application layer (Java backend),
not in Elasticsearch, to avoid license requirements.

---

## Related API

| Item | Value |
|----|----|
| Endpoint | POST /api/search/episodes |
| Search type | Full-text keyword search |
| Pagination | Page / size |
| Sorting | `relevance`, `date` |
| Filtering | Language |
| Highlight | Enabled |

---

## Search Intent

Episode search prioritizes **precision and context**.

| User Goal | Implication for Query |
|---------|-----------------------|
| Find a specific topic | Precision > recall |
| Confirm relevance | Contextual snippets required |
| Compare similar episodes | Stable ordering |

As a result:
- False positives are worse than missing marginal results
- Highlighting is mandatory
- Deterministic ordering is required

---

## Query Design Principles

### 1. Precision-first Relevance

Episode search is **not discovery-oriented**.

| Design Choice | Purpose |
|--------------|---------|
| `best_fields` | Focus on strongest matching fields |
| `operator = and` | Reduce false positives |
| minimum match threshold | Enforce intent strength |

This ensures that results are tightly aligned
with user intent.

---

### 2. Field Importance and Boosting

Relevance signals are intentionally ordered.

| Priority | Field | Reason |
|--------|------|--------|
| 1 | episode.title | Strongest intent signal |
| 2 | episode.description | Contextual relevance |
| 3 | podcast.title | Brand / show association |
| 4 | podcast.publisher | Weak contextual signal |

Podcast fields are included to improve relevance
without requiring cross-index joins.

---

### 3. Embedded Podcast Snapshot

Episodes include a **denormalized snapshot** of podcast metadata.

| Benefit | Explanation |
|-------|-------------|
| Single-pass query | No joins required |
| Simpler scoring | All signals in one document |
| API alignment | Direct response mapping |

The snapshot is **not** a source of truth
and may become temporarily stale.

---

### 4. Deterministic Response Shape

The query explicitly defines returned `_source` fields.

| Benefit | Explanation |
|-------|-------------|
| Stable schema | Response shape does not drift |
| Cache safety | Predictable cache keys |
| Performance | Prevents payload bloat |

Returned fields are intentionally limited
to what the API and UI require.

---

## Returned Fields (`_source`)

The query returns **only** the following fields:

| Field | Purpose |
|------|--------|
| episode_id | Episode identifier |
| title | Episode title |
| description | Episode description |
| published_at | Publish datetime |
| duration_sec | Episode duration |
| image_url | Episode image (UI) |
| language | Episode language |
| podcast.podcast_id | Parent podcast ID |
| podcast.title | Parent podcast title |
| podcast.publisher | Parent podcast publisher |
| podcast.image_url | Parent podcast image |

Any additional data must be fetched
from other systems if required.

---

## Filtering

### Language Filter

| Filter | Description |
|------|-------------|
| language | Restrict results to specific languages |

Language filtering uses a `keyword` field
and does not affect relevance scoring.

---

### UI Safety Filter

| Filter | Description |
|------|-------------|
| exists(image_url) | Exclude episodes without images |

This ensures consistent UI rendering
and avoids broken cards.

---

## Highlighting

Highlighting is a **required feature**.

| Field | Fragments | Fragment Size |
|------|-----------|---------------|
| title | 1 | 150 |
| description | 2 | 180 |

| Setting | Value |
|-------|-------|
| Pre-tag | `<em>` |
| Post-tag | `</em>` |

Highlights provide:
- Context
- Disambiguation
- User confidence

---

## Sorting Strategy

Episode search supports two explicit sort modes.

| Sort Mode | Behavior |
|----------|----------|
| relevance | Sort by text relevance (`_score`) |
| date | Sort by `published_at` (newest first) |

Sorting is controlled at the API level
and mapped directly to the Elasticsearch query.

---

## Pagination

Pagination is deterministic and API-driven.

| Parameter | Description |
|----------|-------------|
| from | `(page - 1) * size` |
| size | Page size (capped by API contract) |

Deep pagination is intentionally limited
to protect performance.

---

## Relationship to Index Mapping

This query is designed to work with the `episodes` index mapping.

| Assumption | Rationale |
|-----------|-----------|
| Podcast snapshot embedded | Avoid joins |
| Standard analyzers | Predictable relevance |
| Autocomplete limited to title | Cost vs benefit |
| `dynamic: strict` | Prevent schema drift |

Mapping and query must evolve together.

---

## Design Boundaries

This query intentionally does **not**:

| Excluded Capability | Reason |
|-------------------|--------|
| Cross-index joins | Performance and complexity |
| Real-time podcast updates | Eventual consistency is acceptable |
| Discovery-oriented ranking | Different use case |

These constraints keep episode search:
- Fast
- Predictable
- Easy to reason about

---

## Summary

The **Search Episodes** Elasticsearch query is:

| Quality | Reason |
|-------|--------|
| Precision-oriented | Intent-driven search |
| Context-rich | Mandatory highlighting |
| Cache-friendly | Stable `_source` |
| Stable | Deterministic behavior |
| Contract-aligned | Matches API exactly |

This design favors **search quality and system simplicity**
over perfect data normalization.

---

## kNN Search Requirements

### Embedding Model

| Property | Value |
|----------|-------|
| Model | `paraphrase-multilingual-mpnet-base-v2` |
| Dimensions | 768 |
| Format | ONNX (for Java runtime) |

### Query Parameters (kNN Template)

| Parameter | Type | Description |
|-----------|------|-------------|
| `query_vector` | float[768] | Encoded query embedding |
| `size` | int | Number of results (k) |
| `num_candidates` | int | ANN candidates (default: 100) |

### Java Integration

```java
// 1. Load ONNX model
OrtSession session = env.createSession("model.onnx");

// 2. Encode query
float[] queryVector = encode("ADHD");

// 3. Execute kNN query with template
Map<String, Object> params = Map.of(
    "query_vector", queryVector,
    "size", 100,
    "num_candidates", 100
);
```

---

## Hybrid Search Implementation

### RRF Fusion (Java Pseudocode)

```java
Map<String, Double> rrfScores = new HashMap<>();
int k = 60; // rank constant

// Add BM25 contributions
for (int rank = 0; rank < bm25Results.size(); rank++) {
    String id = bm25Results.get(rank).getId();
    rrfScores.merge(id, 1.0 / (k + rank + 1), Double::sum);
}

// Add kNN contributions
for (int rank = 0; rank < knnResults.size(); rank++) {
    String id = knnResults.get(rank).getId();
    rrfScores.merge(id, 1.0 / (k + rank + 1), Double::sum);
}

// Sort by RRF score
List<String> finalResults = rrfScores.entrySet().stream()
    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
    .map(Map.Entry::getKey)
    .limit(size)
    .toList();
```

### Expected Overlap Rates

Based on testing with Chinese podcast data:

| Query Type | BM25-kNN Overlap |
|------------|------------------|
| English terms (ADHD) | ~40% |
| Common Chinese words | ~10-15% |
| Domain-specific Chinese | ~3-7% |

Low overlap is expected and beneficial —
Hybrid search combines diverse signals from both methods.