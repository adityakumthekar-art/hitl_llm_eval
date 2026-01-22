import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getItemDetails, updateItemReview } from "@/api/itemDetails"
import type { ItemUpdatePayload } from "@/types/items"

export const itemDetailsKeys = {
  all: ["itemDetails"] as const,
  detail: (id: string) => [...itemDetailsKeys.all, id] as const,
}

export function useItemDetailsQuery(id: string) {
  return useQuery({
    queryKey: itemDetailsKeys.detail(id),
    queryFn: () => getItemDetails(id),
    enabled: !!id,
    refetchOnMount: "always",
  })
}

export function useUpdateItemReviewMutation(id: string, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ItemUpdatePayload) => updateItemReview(id, payload),
    onSuccess: () => {
      // Only invalidate the items list so it refreshes when user goes back
      queryClient.invalidateQueries({ queryKey: ["items"] })
      // Call the onSuccess callback (for navigation/toast)
      onSuccess?.()
    },
  })
}
