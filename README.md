# podcast-spec

API contract specifications for the podcast search platform. This repository defines the shared contracts between frontend and backend services using a **contract-first design** approach.

## Why Contract-First?

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│podcast-frontend │     │  podcast-spec   │     │ podcast-backend │
│    (Client)     │◀────│   (Contract)    │────▶│    (Server)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                    Single Source of Truth
```

**Benefits:**
- Frontend and backend can develop in parallel
- API changes are reviewed before implementation
- Request/response examples serve as documentation
- Reduces integration bugs

## Project Structure

```
podcast-spec/
├── api/                          # API Contracts
│   ├── search_episodes/
│   │   ├── README.md            # Endpoint documentation
│   │   ├── request.example.json
│   │   ├── response.success.example.json
│   │   ├── response.partial_success.example.json
│   │   └── response.error.*.json
│   └── search_shows/
│       ├── README.md
│       ├── request.example.json
│       └── response.*.json
│
└── es/                           # Elasticsearch Query Specs
    ├── search_episodes/
    │   ├── README.md            # Query design rationale
    │   ├── bm25.query.template.mustache    # Text search with time decay
    │   ├── knn.query.template.mustache     # Semantic search
    │   ├── exact.query.template.mustache   # Exact phrase match
    │   └── query.template.mustache         # Legacy (alias to bm25)
    ├── search_shows/
    │   ├── README.md
    │   ├── bm25.query.template.mustache
    │   ├── knn.query.template.mustache
    │   └── query.template.mustache
    └── suggest/
        ├── shows.query.template.mustache   # Show autocomplete
        └── episodes.query.template.mustache # Episode autocomplete
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search/episodes` | GET | Search episodes (supports bm25/knn/hybrid/exact modes) |
| `/api/search/shows` | GET | Search podcasts (supports bm25/knn/hybrid modes) |
| `/api/search/suggest` | GET | Autocomplete suggestions for shows and episodes |

### Search Episodes

Full-text search for podcast episodes with highlighting.

**Request:**
```json
{
  "q": "machine learning",
  "page": 1,
  "size": 20,
  "sort": "relevance",
  "language": ["en"]
}
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "page": 1,
    "size": 20,
    "total": 1243,
    "items": [
      {
        "episodeId": "episode_987",
        "title": "Intro to Machine Learning",
        "highlights": {
          "title": ["Intro to <em>Machine Learning</em>"]
        },
        "podcast": {
          "podcastId": "show_123",
          "title": "ML Podcast"
        }
      }
    ]
  }
}
```

### Search Shows

Discovery-oriented search for podcasts (first page only).

**Request:**
```json
{
  "q": "technology",
  "page": 1,
  "size": 5
}
```

## Response Status

All API responses include a `status` field:

| Status | Description |
|--------|-------------|
| `ok` | Request succeeded |
| `partial_success` | Succeeded with warnings (e.g., highlight service down) |
| `error` | Request failed |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETER` | 400 | Invalid request parameters |
| `SEARCH_SERVICE_ERROR` | 503 | Search service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Usage as Git Submodule

Add this repository as a submodule in dependent projects:

```bash
# Add submodule
git submodule add git@github.com:user/podcast-spec.git spec

# Clone with submodules
git clone --recurse-submodules <repo-url>

# Update submodule
git submodule update --remote
```

### In podcast-backend

```
podcast-backend/
├── spec/                  # ← Submodule
│   └── api/
└── src/
    └── main/java/...
```

### In podcast-frontend

```
podcast-frontend/
├── spec/                  # ← Submodule
│   └── api/
└── src/
    └── types/             # Types derived from spec
```

## Elasticsearch Query Design

The `es/` directory contains query specifications with design rationale:

### Search Modes

| Mode | Template | Description |
|------|----------|-------------|
| `bm25` | `bm25.query.template.mustache` | Text matching (TF-IDF) with time decay |
| `knn` | `knn.query.template.mustache` | Semantic search using embeddings |
| `hybrid` | (in-code RRF fusion) | BM25 + kNN with Reciprocal Rank Fusion |
| `exact` | `exact.query.template.mustache` | Exact phrase match (match_phrase) |

### Query Templates

| Query | Purpose | Features |
|-------|---------|----------|
| `search_episodes/bm25` | Keyword search | Time decay, IK analyzer for Chinese |
| `search_episodes/knn` | Concept search | 384-dim embedding, cosine similarity |
| `search_episodes/exact` | Precise search | match_phrase query |
| `search_shows/bm25` | Show keyword search | Title^5, description^2 boosting |
| `search_shows/knn` | Show semantic search | Embedding-based |
| `suggest/shows` | Show autocomplete | Edge n-gram on title |
| `suggest/episodes` | Episode autocomplete | Edge n-gram on title |

## Related Projects

- **podcast-backend**: Implements these API contracts (Spring Boot)
- **podcast-frontend**: Consumes these APIs (Next.js)
- **podcast-search**: Elasticsearch indexing service
