import { apiClient } from "./client"
import type { ReviewItem, ItemUpdatePayload } from "@/types/items"

export async function getItemDetails(id: string): Promise<ReviewItem> {
  const response = await apiClient.get<ReviewItem>(`/api/review/items/${id}`)
  return response.data
}

export async function updateItemReview(id: string, payload: ItemUpdatePayload): Promise<ReviewItem> {
  const response = await apiClient.put<ReviewItem>(`/api/review/items/${id}`, payload)
  return response.data
}
