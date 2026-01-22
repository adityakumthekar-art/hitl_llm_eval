import { apiClient } from "./client"
import type { ItemsQueryParams, ItemsResponse } from "@/types/items"

export async function getItems(params: ItemsQueryParams): Promise<ItemsResponse> {
  const response = await apiClient.get<ItemsResponse>("/api/review/items", {
    params: {
      page: params.page,
      per_page: params.per_page,
    },
  })
  return response.data
}

