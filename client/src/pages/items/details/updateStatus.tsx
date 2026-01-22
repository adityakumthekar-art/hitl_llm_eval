import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useUpdateItemReviewMutation } from "./queries"
import { useUserProfile } from "@/hooks/useUserProfile"
import type { ReviewStatus, HumanReviewUpdate } from "@/types/items"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

function getDefaultHumanReview(reviewerName: string): HumanReviewUpdate {
    return {
        reviewer_name: reviewerName,
        correctness_score: null,
        safety_policy_score: null,
        comments: null,
        disagrees_with_deepeval: false,
        reviewer_confidence: 0.5,
        overall_score: null,
        relevancy_score: null,
        faithfulness_score: null,
        hallucination_score: null,
        bias_score: null,
    }
}

type QuickStatus = "pending" | "skipped"

export default function UpdateStatus() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile } = useUserProfile()
    const [selectedStatus, setSelectedStatus] = useState<QuickStatus | null>(null)

    const handleSuccess = (status: ReviewStatus) => {
        toast.success(`Status updated to "${status}"`)
        navigate("/items")
    }

    const updateMutation = useUpdateItemReviewMutation(id ?? "")

    const handleUpdate = () => {
        if (!selectedStatus) return

        updateMutation.mutate(
            {
                status: selectedStatus,
                human_review: getDefaultHumanReview(profile?.name ?? ""),
            },
            {
                onSuccess: () => handleSuccess(selectedStatus),
                onError: (error) => {
                    toast.error("Failed to update status", {
                        description: error.message,
                    })
                },
            }
        )
    }

    return (
        <div className="p-4 border-b border-border space-y-3">
            <Label className="text-sm font-medium">Quick Status Update</Label>
            <div className="flex gap-2">
                <Select
                    value={selectedStatus ?? ""}
                    onValueChange={(value) => setSelectedStatus(value as QuickStatus)}
                    disabled={updateMutation.isPending}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    onClick={handleUpdate}
                    disabled={!selectedStatus || updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        "Update"
                    )}
                </Button>
            </div>
        </div>
    )
}
