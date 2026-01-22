import { apiClient } from "./client"
import type { ItemsQueryParams, ItemsResponse } from "@/types/items"

export async function getItems(params: ItemsQueryParams): Promise<ItemsResponse> {
  const queryParams: Record<string, string | number | boolean> = {
    page: params.page,
    per_page: params.per_page,
  }

  // Add optional filters
  if (params.status && params.status !== "all") {
    queryParams.status = params.status
  }
  if (params.review_type && params.review_type !== "all") {
    queryParams.review_type = params.review_type
  }
  if (params.safety_filter && params.safety_filter !== "all") {
    queryParams.safety_filter = params.safety_filter
  }

  // Add sampling params
  if (params.sample_good !== null) {
    queryParams.sample_good = params.sample_good
  }
  if (params.sample_bad !== null) {
    queryParams.sample_bad = params.sample_bad
  }
  if (params.random_seed !== null) {
    queryParams.random_seed = params.random_seed
  }
  if (params.sample_only) {
    queryParams.sample_only = params.sample_only
  }

  // Add thresholds
  queryParams.high_score_threshold = params.high_score_threshold
  queryParams.low_score_threshold = params.low_score_threshold

  const response = await apiClient.get<ItemsResponse>("/api/review/items", {
    params: queryParams,
  })
  return response.data
}
