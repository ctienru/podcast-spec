# ES Query Template: search_episodes_zh_tw

## Target Index

- Index alias: `episodes-zh-tw`
- Analyzer: `ik_max_word` (IK Analyzer for Traditional Chinese)

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
| `bm25` | `multi_match` on `title.chinese`, `description.chinese`, `show.title.chinese`, `show.publisher` |
| `hybrid` | BM25 + kNN (`embedding`) combined via RRF |
| `exact` | `match_phrase` on `title.chinese` |
| `knn` | Not directly in template; handled at the routing layer |

---

## Design Notes

- **No language filter clause**: this index is single-language by design (v2). The v1 `terms.language` filter has been removed. Index routing replaces filtering.
- **IK Analyzer**: uses `title.chinese` and `description.chinese` sub-fields (mapped with `ik_max_word`).
- **STConvert removed**: v1 had the STConvert plugin for Traditional/Simplified Chinese auto-conversion. Removed in v2 because the index is now split by language; Traditional Chinese content goes to this index, Simplified goes to `zh-cn`.

## Related Docs

- Index mapping and analyzer config: `podcast-search-v2-plan.md` §1-B
- Embedding and kNN strategy: `embedding-strategy.md` §2
