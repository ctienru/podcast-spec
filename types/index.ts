/**
 * Language routing parameter. Determines which ES index to query — not a filter.
 * zh-both = query both zh-tw and zh-cn simultaneously, results merged via RRF.
 */
export type LangParam = 'zh-tw' | 'zh-cn' | 'en' | 'zh-both';

/**
 * Search mode.
 * - bm25:   BM25 full-text search only
 * - knn:    Vector search only (requires embedding service)
 * - hybrid: BM25 + kNN combined via RRF (default)
 * - exact:  Phrase match, for debugging and precise search
 */
export type SearchMode = 'bm25' | 'knn' | 'hybrid' | 'exact';

/**
 * Sort order.
 * - relevance: Sort by relevance score (default)
 * - date:      Sort by most recent first
 */
export type SortOrder = 'relevance' | 'date';

/** Wrapper for ok-status API responses (status: 'ok'). For the full success union including partial_success, see EpisodeSearchResult. */
export interface ApiSuccessResponse<T> {
  status: 'ok';
  data: T;
}

/** Wrapper for all error API responses. */
export interface ApiErrorResponse {
  status: 'error';
  error: {
    /** Machine-readable error code (UPPER_SNAKE_CASE). */
    code: ErrorCode;
    /** Human-readable description (English). */
    message: string;
    /** Optional list of specific error details. */
    details?: string[];
  };
}

/** All defined error codes. */
export type ErrorCode =
  | 'CROSS_INDEX_PAGE_LIMIT'  // zh-both exceeds page limit (page > 5)
  | 'INVALID_LANG_PARAM'      // lang value not in allowed set
  | 'INVALID_SEARCH_MODE'     // mode value not in allowed set
  | 'RATE_LIMIT_EXCEEDED'     // request rate exceeded
  | 'INVALID_REQUEST';        // other malformed request

// ---------------------------------------------------------------------------
// Search Episodes API
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/search/episodes.
 *
 * Design notes:
 * - lang replaces the old language[] field (changed from filter to routing).
 * - mode defaults to hybrid (BM25 + kNN); frontend does not need to specify it.
 * - When lang=zh-both, page must be <= 5 (business rule enforced by backend, not schema).
 */
export interface EpisodeSearchRequest {
  /** Search query string. Must not be empty. */
  q: string;

  /**
   * Target language index. Determines which ES index to query.
   * If omitted, backend defaults based on UI locale (env var: SEARCH_DEFAULT_LANG).
   */
  lang?: LangParam;

  /**
   * Search mode. Defaults to hybrid.
   * knn/hybrid require the embedding service; falls back to bm25 if unavailable.
   */
  mode?: SearchMode;

  /**
   * Page number, starting at 1.
   * When lang=zh-both, maximum is 5; exceeding returns 400 CROSS_INDEX_PAGE_LIMIT.
   * Defaults to 1.
   */
  page?: number;

  /** Page size. Maximum 50. Defaults to 20. */
  size?: number;

  /** Sort order. Defaults to relevance. */
  sort?: SortOrder;
}

/** A single episode in the search results. */
export interface EpisodeDto {
  /** Globally unique ID. Format: episode:{source}:{showId}:{episodeId} */
  episodeId: string;
  title: string;
  description: string;

  /**
   * Highlighted text snippets with <em> tags.
   * Key is the field name; value is an array of snippet strings.
   */
  highlights: {
    title?: string[];
    description?: string[];
  };

  /** ISO 8601 UTC timestamp. */
  publishedAt: string;
  durationSec: number;
  imageUrl: string;

  /** Language index this episode belongs to (zh-tw / zh-cn / en). */
  language: string;

  podcast: {
    /** Globally unique ID. Format: show:{source}:{showId} */
    podcastId: string;
    title: string;
    publisher: string;
    imageUrl: string;
  };
}

/** Paginated episode search results. */
export interface PaginatedEpisodes {
  page: number;
  size: number;
  total: number;
  items: EpisodeDto[];
}

/**
 * Success response for POST /api/search/episodes.
 *
 * searchRequestId usage:
 * - Generated as UUID v4 by backend on each search request.
 * - Written to query log (ES index: query-logs) at the same time.
 * - Frontend must include this ID in subsequent click events for query/click log join.
 * - Frontend must NOT generate its own UUID for this field.
 */
export interface EpisodeSearchResponse extends ApiSuccessResponse<PaginatedEpisodes> {
  searchRequestId: string;  // UUID v4
}

/**
 * Partial success response for POST /api/search/episodes.
 *
 * Returned when the embedding service is unavailable and the backend falls back to BM25.
 * Results are still returned but quality may be lower than hybrid/knn mode.
 *
 * Frontend should display the warning as a non-blocking info banner.
 * Do NOT retry automatically.
 */
export interface EpisodeSearchPartialResponse {
  status: 'partial_success';
  searchRequestId: string; // UUID v4
  warning: string;         // e.g. "Embedding service unavailable; results from BM25 only"
  data: PaginatedEpisodes;
}

/** Union of all successful episode search response shapes */
export type EpisodeSearchResult = EpisodeSearchResponse | EpisodeSearchPartialResponse;

// ---------------------------------------------------------------------------
// Click Log API
// ---------------------------------------------------------------------------

/**
 * Request body for POST /api/log/click.
 *
 * Sent by frontend after the user clicks a search result.
 * Used to calculate: same-language click rate, first click rank, and other online metrics.
 *
 * requestId must come from EpisodeSearchResult.searchRequestId (EpisodeSearchResponse or
 * EpisodeSearchPartialResponse) so that query logs and click logs can be correctly joined.
 * Frontend must NOT generate a new UUID for this field.
 */
export interface ClickLogRequest {
  /**
   * ID of the corresponding search request.
   * Source: EpisodeSearchResult.searchRequestId. Format: UUID v4.
   */
  requestId: string;

  /** Timestamp when the click occurred. ISO 8601 UTC. */
  timestamp: string;

  /** Search query entered by the user (same as in the corresponding query log). */
  query: string;

  /** Language selected by the user (same as in the corresponding query log). */
  selectedLang: LangParam;

  /** ID of the clicked episode. Format: episode:{source}:{showId}:{episodeId} */
  clickedEpisodeId: string;

  /** Rank of the clicked result in the list, starting at 1. */
  clickedRank: number;

  /** Language of the clicked result (used for same-language click rate calculation). */
  clickedLanguage: string;

  /**
   * Seconds elapsed from showing results to click.
   * Optional: used for analyzing user decision speed.
   */
  timeToClickSec?: number;
}
