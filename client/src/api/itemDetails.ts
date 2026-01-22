import { apiClient } from "./client"
import type { ReviewItem } from "@/types/items"

export async function getItemDetails(id: string): Promise<ReviewItem> {
  const response = await apiClient.get<ReviewItem>(`/api/review/items/${id}`)
  return response.data
}

