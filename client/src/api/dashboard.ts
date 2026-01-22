import { apiClient } from "./client"

export interface ReviewSummary {
  total_items: number
  pending: number
  reviewed: number
  skipped: number
  progress_percent: number
}

export async function getReviewSummary(): Promise<ReviewSummary> {
  const response = await apiClient.get<ReviewSummary>("/api/review/summary")
  return response.data
}

