/**
 * Language routing parameter. Determines which ES index to query — not a filter.
 * zh-both = query both zh-tw and zh-cn indexes, results merged via RRF.
 */
export type LangParam = 'zh-tw' | 'zh-cn' | 'en' | 'zh-both';

/**
 * Search mode.
 * - bm25:   BM25 full-text search only
 * - knn:    Vector search only (requires embedding service)
 * - hybrid: BM25 + kNN merged with RRF (default)
 * - exact:  Phrase match, for debugging and precise search
 */
export type SearchMode = 'bm25' | 'knn' | 'hybrid' | 'exact';

/**
 * Sort order.
 * - relevance: Sort by relevance score (default)
 * - date:      Most recent first
 */
export type SortOrder = 'relevance' | 'date';

/** Outer envelope for a successful API response */
export interface ApiSuccessResponse<T> {
  status: 'ok';
  data: T;
}

/** Outer envelope for an error API response */
export interface ApiErrorResponse {
  status: 'error';
  error: {
    /** Machine-readable error code (UPPER_SNAKE_CASE) */
    code: ErrorCode;
    /** Human-readable description (English) */
    message: string;
    /** Additional details, optional */
    details?: string[];
  };
}

/** All defined error codes */
export type ErrorCode =
  | 'CROSS_INDEX_PAGE_LIMIT'  // zh-both page limit exceeded (page > 5)
  | 'INVALID_LANG_PARAM'      // lang value not in allowed set
  | 'INVALID_SEARCH_MODE'     // mode value not in allowed set
  | 'RATE_LIMIT_EXCEEDED'     // request rate exceeded
  | 'INVALID_REQUEST';        // other malformed request errors

// ---------------------------------------------------------------------------
// POST /api/search/episodes
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/search/episodes.
 *
 * Design notes:
 * - lang replaces language[] (changed from filter to routing)
 * - mode defaults to hybrid (BM25 + kNN); frontend does not need to specify it each time
 * - For zh-both, page <= 5 (business rule enforced by backend, not at the schema level)
 */
export interface EpisodeSearchRequest {
  /** Search query string. Must not be empty. */
  q: string;

  /**
   * Target language index. Determines which ES index to query.
   * If omitted, backend maps from UI locale (env var: SEARCH_DEFAULT_LANG).
   */
  lang?: LangParam;

  /**
   * Search mode. Defaults to hybrid.
   * knn / hybrid require embedding service; falls back to bm25 if unavailable.
   */
  mode?: SearchMode;

  /**
   * Page number, 1-based.
   * For zh-both, backend enforces page <= 5 and returns 400 CROSS_INDEX_PAGE_LIMIT if exceeded.
   * Defaults to 1.
   */
  page?: number;

  /** Results per page, max 50. Defaults to 20. */
  size?: number;

  /** Sort order. Defaults to relevance. */
  sort?: SortOrder;

  /**
   * @deprecated Since v2. Use lang instead.
   * Kept for Phase 0 transition: backend ignores this field; routing is determined by lang.
   * Will be removed from spec after Phase 2.
   */
  language?: string[];
}

/** A single episode in the search results */
export interface EpisodeDto {
  /** Globally unique ID. Format: episode:{source}:{showId}:{episodeId} */
  episodeId: string;
  title: string;
  description: string;

  /**
   * Highlighted snippets with <em> tags.
   * Keys are field names; values are arrays of highlighted strings (one element per snippet).
   */
  highlights: {
    title?: string[];
    description?: string[];
  };

  /** ISO 8601 UTC */
  publishedAt: string;
  durationSec: number;
  imageUrl: string;

  /** Language index this episode belongs to (zh-tw / zh-cn / en) */
  language: string;

  podcast: {
    /** Globally unique ID. Format: show:{source}:{showId} */
    podcastId: string;
    title: string;
    publisher: string;
    imageUrl: string;
  };
}

/** Paginated episode search results */
export interface PaginatedEpisodes {
  page: number;
  size: number;
  total: number;
  items: EpisodeDto[];
}

/**
 * Success response body for POST /api/search/episodes.
 *
 * searchRequestId usage:
 * - Backend generates a UUID v4 on each search request
 * - Written to query log (ES index: query-logs) at the same time
 * - Frontend includes this as requestId in subsequent click events for query/click log join
 * - Frontend must NOT generate its own UUID; it must use the value from this response
 */
export interface EpisodeSearchResponse extends ApiSuccessResponse<PaginatedEpisodes> {
  searchRequestId: string; // UUID v4
}

// ---------------------------------------------------------------------------
// POST /api/log/click
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/log/click.
 *
 * Sent by the frontend when a user clicks a search result.
 * Used to compute online metrics: same-language click rate, first-click rank, etc.
 *
 * Note: requestId must come from the search response's searchRequestId
 * so that query logs and click logs can be correctly joined.
 * Frontend must NOT generate a new UUID for this field.
 */
export interface ClickLogRequest {
  /**
   * The search request ID this click corresponds to.
   * Source: EpisodeSearchResponse.searchRequestId. Format: UUID v4.
   */
  requestId: string;

  /** Time the click occurred. ISO 8601 UTC. */
  timestamp: string;

  /** The search query string (same as the corresponding query log) */
  query: string;

  /** The language selected by the user when searching */
  selectedLang: LangParam;

  /** ID of the clicked episode. Format: episode:{source}:{showId}:{episodeId} */
  clickedEpisodeId: string;

  /** 1-based rank of the clicked result in the list */
  clickedRank: number;

  /** Language of the clicked episode (used to calculate same-language click rate) */
  clickedLanguage: string;

  /**
   * Seconds from search result display to click.
   * Optional; used to analyze user decision speed.
   */
  timeToClickSec?: number;
}
