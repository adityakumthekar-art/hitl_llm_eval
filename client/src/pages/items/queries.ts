import { useQuery } from "@tanstack/react-query"
import { getItems } from "@/api/items"
import type { ItemsQueryParams } from "@/types/items"

export const itemsKeys = {
  all: ["items"] as const,
  list: (params: ItemsQueryParams) => [...itemsKeys.all, "list", params] as const,
}

export function useItemsQuery(params: ItemsQueryParams, enabled = true) {
  return useQuery({
    queryKey: itemsKeys.list(params),
    queryFn: () => getItems(params),
    enabled,
    refetchOnMount: "always",
  })
}
