# Elasticsearch – Search Shows

This directory defines the Elasticsearch **query template** and **index design**
used by the **Search Shows API**.

The goal of this search is **podcast discovery**:
return a small number of high-quality shows quickly,
rather than exhaustive or perfectly precise results.

---

## Related API

| Item | Value |
|----|----|
| Endpoint | POST /api/search/shows |
| Pagination | Page-based contract (currently page = 1 only) |
| UI Usage | Horizontal carousel on search page |

Although pagination is defined at the API level,
the current UI only consumes the first page.

---

## Use Case

Search Shows is designed for **discovery-oriented scenarios**.

| Aspect | Description |
|------|-------------|
| Primary goal | Discovery and exploration |
| UI pattern | Horizontal carousel |
| Result size | Small, curated set |
| Response time | Fast |
| Result stability | High (cache-friendly) |

This is **not** intended for:
- exact lookup
- deep browsing
- exhaustive recall

---

## Query Design Principles

### 1. Discovery-first Relevance

Ranking emphasizes **good-looking and relevant results** over exact recall.

| Priority | Signal | Notes |
|--------|--------|------|
| 1 | Text relevance (`_score`) | Show title has highest weight |
| 2 | Popularity / activity | `popularity_score` (reserved) |
| 3 | Visual readiness | Exclude shows without `image_url` |

Precision is intentionally relaxed
to improve discovery experience.

---

### 2. Controlled Response Shape

The query explicitly defines returned `_source` fields.

| Benefit | Explanation |
|-------|-------------|
| Stable schema | Response shape does not drift |
| Cache safety | Predictable cache keys |
| Performance | No accidental payload growth |

The backend service **must not dynamically change**
returned fields.

---

### 3. Lightweight Query (No Highlight)

| Aspect | Decision |
|------|----------|
| Highlighting | Disabled |
| Reason | Carousel UI does not display snippets |
| Benefit | Faster and cheaper queries |

This differs intentionally from episode search.

---

## Query Template

| Item | Value |
|----|------|
| Template engine | Mustache |
| File | `query.template.mustache` |
| Query type | `multi_match` |

### Weighted Fields

| Field | Relative Weight | Purpose |
|------|-----------------|---------|
| title | Highest | Primary discovery signal |
| description | Medium | Context |
| publisher | Lower | Brand recognition |

### Filters

| Filter | Purpose |
|------|---------|
| language | Language selection |
| image_url exists | Ensure UI-ready results |

---

### Ranking Strategy

Final ordering is determined by:

| Order | Signal |
|-----|--------|
| 1 | `_score` (text relevance) |
| 2 | `popularity_score` (reserved) |
| 3 | `episode_count` (activity signal) |

This allows future ranking improvements
without changing the API contract.

---

## Returned Fields (`_source`)

The query explicitly returns **only** the following fields:

| Field | Purpose |
|------|--------|
| podcast_id | API identifier |
| title | Primary display text |
| description | Secondary context |
| publisher | Branding / recognition |
| language | UI badge and filtering |
| image_url | Required for carousel rendering |
| episode_count | Activity indicator |

Any additional fields must be added **intentionally**
and reviewed together with query changes.

---

## Index Mapping Considerations

The `shows` index is designed specifically for discovery search.

| Aspect | Design Choice |
|------|---------------|
| Text fields | Indexed for relevance |
| language | `keyword` for filtering |
| image_url | Not indexed (UI-only) |
| episode_count | Ranking / activity |
| popularity_score | Ranking (reserved) |

Mapping changes should always be reviewed
together with query changes.

---

## Popularity Score (Reserved)

The `popularity_score` field is reserved for ranking optimization.

| Status | Description |
|------|-------------|
| Required in v1 | No |
| Stored in mapping | Yes |
| Used in query | Optional / future |

### Planned Signals (Future)

| Signal | Description |
|------|-------------|
| Update frequency | How often new episodes are published |
| Recency | Time since last episode |
| Scale | Total episode count |

The query already supports this field,
allowing future improvements **without API or query rewrites**.

---

## Pagination Notes

| Aspect | Description |
|------|-------------|
| Pagination model | Page-based (API level) |
| Current UI | Page 1 only |
| Query support | `from` / `size` |

This design allows future expansion
without breaking existing clients.

---

## Summary

The **Search Shows** Elasticsearch query is intentionally:

| Quality | Reason |
|-------|--------|
| Discovery-focused | Optimized for exploration |
| Performance-aware | Lightweight, no highlight |
| Cache-friendly | Stable `_source` |
| Forward-compatible | Ranking fields reserved |

Changes to this query should prioritize:

**UX impact** and **system stability**
over marginal relevance improvements.