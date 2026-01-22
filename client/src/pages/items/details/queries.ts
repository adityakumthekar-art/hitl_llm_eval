import { useQuery } from "@tanstack/react-query"
import { getItemDetails } from "@/api/itemDetails"

export const itemDetailsKeys = {
  all: ["itemDetails"] as const,
  detail: (id: string) => [...itemDetailsKeys.all, id] as const,
}

export function useItemDetailsQuery(id: string) {
  return useQuery({
    queryKey: itemDetailsKeys.detail(id),
    queryFn: () => getItemDetails(id),
    enabled: !!id,
  })
}

