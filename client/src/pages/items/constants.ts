import type { ItemsQueryParams, StatusFilter, ReviewTypeFilter, SafetyFilter } from "@/types/items"

// Default values for the query params
export const DEFAULT_ITEMS_PARAMS: ItemsQueryParams = {
  page: 1,
  per_page: 10,
  status: null,
  review_type: null,
  safety_filter: null,
  sample_good: null,
  sample_bad: null,
  high_score_threshold: 0.8,
  low_score_threshold: 0.5,
  random_seed: null,
  sample_only: false,
}

// Options for select fields
export const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Skipped", value: "skipped" },
]

export const reviewTypeOptions: { label: string; value: ReviewTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ambiguous", value: "ambiguous" },
  { label: "Good Sample", value: "good_sample" },
  { label: "Bad Sample", value: "bad_sample" },
]

export const safetyFilterOptions: { label: string; value: SafetyFilter }[] = [
  { label: "All", value: "all" },
  { label: "Safe", value: "safe" },
  { label: "Unsafe", value: "unsafe" },
]

export const perPageOptions = [10, 20, 30, 50, 100]

