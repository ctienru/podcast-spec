# ES Query Template: search_episodes_en

## Target Index

- Index alias: `episodes-en`
- Analyzer: `standard` (built-in English analyzer)

---

## Template Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `query` | string | ✅ | Search query string. |
| `from` | integer | ✅ | Offset for pagination: `(page - 1) * size`. |
| `size` | integer | ✅ | Number of results per page. |
| `mode_hybrid` | boolean | ❌ | Set to true to enable kNN + BM25 hybrid mode. |
| `mode_exact` | boolean | ❌ | Set to true to use phrase match instead of multi_match. |
| `sort_by_date` | boolean | ❌ | Set to true to sort by `published_at` descending. |
| `queryVector` | float[] | ❌ | Embedding vector (required when `mode_hybrid` is true). |

---

## Search Modes

| Mode | Behavior |
|------|----------|
| `bm25` | `multi_match` on `title`, `description`, `show.title`, `show.publisher` |
| `hybrid` | BM25 + kNN (`embedding`) combined via RRF |
| `exact` | `match_phrase` on `title` |

---

## Design Notes

- **No language filter clause**: this index is single-language by design (v2). Index routing replaces filtering.
- **Standard analyzer**: uses `title` and `description` directly (no `.chinese` sub-field). Field boosting ratios are the same as the Chinese templates.
- `title.chinese` is intentionally absent from this template — it is only defined in the mapping for the Chinese indexes.

## Related Docs

- Index mapping and analyzer config: `podcast-search-v2-plan.md` §1-B
- Embedding and kNN strategy: `embedding-strategy.md` §2
