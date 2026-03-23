# ES Query Template: search_episodes_zh_cn

## Target Index

- Index alias: `episodes-zh-cn`
- Analyzer: `ik_max_word` (IK Analyzer for Simplified Chinese)

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
| `hybrid` | BM25 + kNN (`title_vector`) combined via RRF |
| `exact` | `match_phrase` on `title.chinese` |

---

## Design Notes

- **No language filter clause**: this index is single-language by design (v2). Index routing replaces filtering.
- **IK Analyzer**: same configuration as the zh-tw template. IK supports both Simplified and Traditional Chinese.
- **STConvert removed**: no longer needed because Simplified and Traditional Chinese are in separate indexes.
- Template structure is identical to `search_episodes_zh_tw`; both use the same Chinese field mappings.

## Related Docs

- Index mapping and analyzer config: `podcast-search-v2-plan.md` §1-B
- Embedding and kNN strategy: `embedding-strategy.md` §2
