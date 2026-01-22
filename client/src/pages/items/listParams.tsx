import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    ParamSelect,
    ParamNumberInput,
    ParamSlider,
    ParamSwitch,
} from "@/components/form"
import { useItemsParams } from "./useItemsParams"
import {
    statusOptions,
    reviewTypeOptions,
    safetyFilterOptions,
    perPageOptions,
} from "./constants"
import type { StatusFilter, ReviewTypeFilter, SafetyFilter } from "@/types/items"
import { Search } from "lucide-react"

interface ListParamsProps {
    isLoading?: boolean
}

export default function ListParams({ isLoading }: ListParamsProps) {
    const { draftParams, updateDraft, commitParams, resetParams } = useItemsParams()

    const handleSearch = () => {
        commitParams()
    }

    const handleReset = () => {
        resetParams()
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center p-4 border-b border-border justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
            </div>

            <div className="flex-1 overflow-auto space-y-4 py-6 px-5">
                {/* Filters Section */}
                <div className="space-y-4">
                    <ParamSelect<StatusFilter>
                        label="Status"
                        value={draftParams.status}
                        options={statusOptions}
                        onChange={(value) => updateDraft({ status: value })}
                        placeholder="All statuses"
                    />

                    <ParamSelect<ReviewTypeFilter>
                        label="Review Type"
                        value={draftParams.review_type}
                        options={reviewTypeOptions}
                        onChange={(value) => updateDraft({ review_type: value })}
                        placeholder="All types"
                    />

                    <ParamSelect<SafetyFilter>
                        label="Safety Filter"
                        value={draftParams.safety_filter}
                        options={safetyFilterOptions}
                        onChange={(value) => updateDraft({ safety_filter: value })}
                        placeholder="All"
                    />
                </div>

                <Separator />

                {/* Sampling Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Sampling</h3>

                    <ParamNumberInput
                        label="Sample Good (N)"
                        value={draftParams.sample_good}
                        onChange={(value) => updateDraft({ sample_good: value })}
                        placeholder="No limit"
                        min={0}
                    />

                    <ParamNumberInput
                        label="Sample Bad (N)"
                        value={draftParams.sample_bad}
                        onChange={(value) => updateDraft({ sample_bad: value })}
                        placeholder="No limit"
                        min={0}
                    />

                    <ParamNumberInput
                        label="Random Seed"
                        value={draftParams.random_seed}
                        onChange={(value) => updateDraft({ random_seed: value })}
                        placeholder="Random"
                    />

                    <ParamSwitch
                        label="Sample Only"
                        description="Only show sampled items"
                        checked={draftParams.sample_only}
                        onChange={(checked) => updateDraft({ sample_only: checked })}
                    />
                </div>

                <Separator />

                {/* Thresholds Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Thresholds</h3>

                    <ParamSlider
                        label="High Score Threshold"
                        value={draftParams.high_score_threshold}
                        onChange={(value) => updateDraft({ high_score_threshold: value })}
                        min={0}
                        max={1}
                        step={0.05}
                    />

                    <ParamSlider
                        label="Low Score Threshold"
                        value={draftParams.low_score_threshold}
                        onChange={(value) => updateDraft({ low_score_threshold: value })}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                </div>

                <Separator />

                {/* Pagination Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Pagination</h3>

                    <ParamSelect<string>
                        label="Items per page"
                        value={String(draftParams.per_page)}
                        options={perPageOptions.map((n) => ({ label: String(n), value: String(n) }))}
                        onChange={(value) => updateDraft({ per_page: value ? parseInt(value, 10) : 10 })}
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-2 border-t flex gap-6 justify-between px-6 pb-4 ">
                <Button onClick={handleReset} variant="ghost" disabled={isLoading}>
                    Reset
                </Button>

                <Button onClick={handleSearch} className="w-40" disabled={isLoading}>
                    <Search className="size-4 mr-1" />
                    Search
                </Button>

            </div>
        </div>
    )
}
