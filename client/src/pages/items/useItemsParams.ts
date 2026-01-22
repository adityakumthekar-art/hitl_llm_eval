import { useSearchParams } from "react-router-dom"
import { useCallback, useMemo, useState, useEffect } from "react"
import type { ItemsQueryParams, StatusFilter, ReviewTypeFilter, SafetyFilter } from "@/types/items"
import { DEFAULT_ITEMS_PARAMS } from "./constants"

function parseIntOrNull(value: string | null): number | null {
  if (value === null || value === "") return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

function parseFloatOrDefault(value: string | null, defaultValue: number): number {
  if (value === null || value === "") return defaultValue
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

function parseBool(value: string | null): boolean {
  return value === "true"
}

function parseUrlParams(searchParams: URLSearchParams): ItemsQueryParams {
  return {
    page: parseIntOrNull(searchParams.get("page")) ?? DEFAULT_ITEMS_PARAMS.page,
    per_page: parseIntOrNull(searchParams.get("per_page")) ?? DEFAULT_ITEMS_PARAMS.per_page,
    status: (searchParams.get("status") as StatusFilter) || null,
    review_type: (searchParams.get("review_type") as ReviewTypeFilter) || null,
    safety_filter: (searchParams.get("safety_filter") as SafetyFilter) || null,
    sample_good: parseIntOrNull(searchParams.get("sample_good")),
    sample_bad: parseIntOrNull(searchParams.get("sample_bad")),
    high_score_threshold: parseFloatOrDefault(
      searchParams.get("high_score_threshold"),
      DEFAULT_ITEMS_PARAMS.high_score_threshold
    ),
    low_score_threshold: parseFloatOrDefault(
      searchParams.get("low_score_threshold"),
      DEFAULT_ITEMS_PARAMS.low_score_threshold
    ),
    random_seed: parseIntOrNull(searchParams.get("random_seed")),
    sample_only: parseBool(searchParams.get("sample_only")),
  }
}

function paramsToSearchParams(params: ItemsQueryParams): URLSearchParams {
  const result = new URLSearchParams()

  if (params.page !== DEFAULT_ITEMS_PARAMS.page) {
    result.set("page", String(params.page))
  }
  if (params.per_page !== DEFAULT_ITEMS_PARAMS.per_page) {
    result.set("per_page", String(params.per_page))
  }
  if (params.status && params.status !== "all") {
    result.set("status", params.status)
  }
  if (params.review_type && params.review_type !== "all") {
    result.set("review_type", params.review_type)
  }
  if (params.safety_filter && params.safety_filter !== "all") {
    result.set("safety_filter", params.safety_filter)
  }
  if (params.sample_good !== null) {
    result.set("sample_good", String(params.sample_good))
  }
  if (params.sample_bad !== null) {
    result.set("sample_bad", String(params.sample_bad))
  }
  if (params.high_score_threshold !== DEFAULT_ITEMS_PARAMS.high_score_threshold) {
    result.set("high_score_threshold", String(params.high_score_threshold))
  }
  if (params.low_score_threshold !== DEFAULT_ITEMS_PARAMS.low_score_threshold) {
    result.set("low_score_threshold", String(params.low_score_threshold))
  }
  if (params.random_seed !== null) {
    result.set("random_seed", String(params.random_seed))
  }
  if (params.sample_only) {
    result.set("sample_only", "true")
  }

  return result
}

export function useItemsParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Committed params from URL (used for API calls)
  const committedParams: ItemsQueryParams = useMemo(
    () => parseUrlParams(searchParams),
    [searchParams]
  )

  // Draft params for form editing (local state)
  const [draftParams, setDraftParams] = useState<ItemsQueryParams>(committedParams)

  // Sync draft with URL when URL changes externally (e.g., browser back/forward)
  useEffect(() => {
    setDraftParams(committedParams)
  }, [committedParams])

  // Update draft params (does NOT trigger API call)
  const updateDraft = useCallback((updates: Partial<ItemsQueryParams>) => {
    setDraftParams((prev) => ({ ...prev, ...updates }))
  }, [])

  // Commit draft params to URL (triggers API call)
  const commitParams = useCallback(() => {
    const newParams = paramsToSearchParams({ ...draftParams, page: 1 })
    setSearchParams(newParams, { replace: true })
  }, [draftParams, setSearchParams])

  // Reset to defaults
  const resetParams = useCallback(() => {
    setDraftParams(DEFAULT_ITEMS_PARAMS)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  return {
    // For API calls - only changes on commit
    committedParams,
    // For form display - changes on every input
    draftParams,
    // Update form values without triggering API
    updateDraft,
    // Trigger API call with current draft values
    commitParams,
    // Reset everything
    resetParams,
  }
}
