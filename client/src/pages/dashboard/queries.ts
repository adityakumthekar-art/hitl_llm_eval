import { useQuery } from "@tanstack/react-query"
import { getReviewSummary } from "@/api/dashboard"

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
}

export function useReviewSummaryQuery() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getReviewSummary,
    refetchOnMount: "always",
  })
}

