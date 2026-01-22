import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useItemDetailsQuery, useUpdateItemReviewMutation } from "./queries"
import type { ReviewStatus, HumanReviewUpdate, ReviewItem } from "@/types/items"
import { RotateCcw, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import UpdateStatus from "./updateStatus"

interface FormState {
    status: ReviewStatus
    reviewer_name: string
    correctness_score: number | null
    safety_policy_score: number | null
    comments: string
    disagrees_with_deepeval: boolean
    reviewer_confidence: number
    overall_score: number | null
    relevancy_score: number | null
    faithfulness_score: number | null
    hallucination_score: number | null
    bias_score: number | null
}

function getFormFromItemData(itemData: ReviewItem): FormState {
    return {
        status: itemData.status,
        reviewer_name: itemData.human_review.reviewer_name ?? "",
        correctness_score: itemData.human_review.correctness_score,
        safety_policy_score: null,
        comments: itemData.human_review.comments ?? "",
        disagrees_with_deepeval: itemData.human_review.disagrees_with_deepeval,
        reviewer_confidence: itemData.human_review.reviewer_confidence,
        overall_score: itemData.human_review.overall_score,
        relevancy_score: itemData.human_review.relevancy_score,
        faithfulness_score: itemData.human_review.faithfulness_score,
        hallucination_score: itemData.human_review.hallucination_score,
        bias_score: itemData.human_review.bias_score,
    }
}

export default function EvaluationParameters() {
    const { id } = useParams<{ id: string }>()
    const { data: itemData } = useItemDetailsQuery(id ?? "")

    // Use inner component with key to reset state when itemData changes
    if (!itemData) {
        return (
            <div className=" h-full grid place-items-center">
                <div className="text-sm text-muted-foreground">
                    Loading evaluation form...
                </div>
            </div>
        )
    }

    return <EvaluationForm key={itemData.review_id} itemData={itemData} itemId={id ?? ""} />
}

interface EvaluationFormProps {
    itemData: ReviewItem
    itemId: string
}

function EvaluationForm({ itemData, itemId }: EvaluationFormProps) {
    const navigate = useNavigate()
    const [form, setForm] = useState<FormState>(() => getFormFromItemData(itemData))

    // Reset form when itemData changes (e.g., after refetch)
    useEffect(() => {
        setForm(getFormFromItemData(itemData))
    }, [itemData])

    const handleSuccess = () => {
        toast.success("Review submitted successfully!")
        navigate("/items")
    }

    const updateMutation = useUpdateItemReviewMutation(itemId, handleSuccess)

    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleReset = () => {
        setForm(getFormFromItemData(itemData))
    }

    const handleSubmit = () => {
        const payload: { status: ReviewStatus; human_review: HumanReviewUpdate } = {
            status: "reviewed",
            human_review: {
                reviewer_name: form.reviewer_name,
                correctness_score: form.correctness_score,
                safety_policy_score: form.safety_policy_score,
                comments: form.comments || null,
                disagrees_with_deepeval: form.disagrees_with_deepeval,
                reviewer_confidence: form.reviewer_confidence,
                overall_score: form.overall_score,
                relevancy_score: form.relevancy_score,
                faithfulness_score: form.faithfulness_score,
                hallucination_score: form.hallucination_score,
                bias_score: form.bias_score,
            },
        }
        updateMutation.mutate(payload, {
            onError: (error) => {
                toast.error("Failed to submit review", {
                    description: error.message,
                })
            },
        })
    }

    return (
        <div className="flex-1 flex h-full flex-col">

            <div className="flex items-center p-4 border-b border-border justify-between">
                <h2 className="text-lg font-semibold">Human review</h2>
            </div>

            <UpdateStatus />

            <div className="flex-1 p-4 overflow-auto space-y-4">

                {/* Reviewer Name */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Reviewer Name</Label>
                    <Input
                        value={form.reviewer_name}
                        onChange={(e) => updateField("reviewer_name", e.target.value)}
                        placeholder="Enter your name"
                    />
                </div>

                <Separator />

                {/* Score Sliders */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-600">Scores</h3>

                    <ScoreSlider
                        label="Overall Score"
                        value={form.overall_score}
                        onChange={(value) => updateField("overall_score", value)}
                    />

                    <ScoreSlider
                        label="Correctness"
                        value={form.correctness_score}
                        onChange={(value) => updateField("correctness_score", value)}
                    />

                    <ScoreSlider
                        label="Relevancy"
                        value={form.relevancy_score}
                        onChange={(value) => updateField("relevancy_score", value)}
                    />

                    <ScoreSlider
                        label="Faithfulness"
                        value={form.faithfulness_score}
                        onChange={(value) => updateField("faithfulness_score", value)}
                    />

                    <ScoreSlider
                        label="Hallucination"
                        value={form.hallucination_score}
                        onChange={(value) => updateField("hallucination_score", value)}
                    />

                    <ScoreSlider
                        label="Bias"
                        value={form.bias_score}
                        onChange={(value) => updateField("bias_score", value)}
                    />

                    <ScoreSlider
                        label="Safety Policy"
                        value={form.safety_policy_score}
                        onChange={(value) => updateField("safety_policy_score", value)}
                    />
                </div>

                <Separator />

                {/* Confidence */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Reviewer Confidence</Label>
                        <span className="text-sm text-muted-foreground">
                            {(form.reviewer_confidence * 100).toFixed(0)}%
                        </span>
                    </div>
                    <Slider
                        value={[form.reviewer_confidence]}
                        onValueChange={([value]) => updateField("reviewer_confidence", value)}
                        min={0}
                        max={1}
                        step={0.1}
                    />
                </div>

                <Separator />
                {/* Disagrees with DeepEval */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Disagrees with DeepEval</Label>
                        <p className="text-xs text-muted-foreground">
                            Check if your assessment differs from DeepEval's
                        </p>
                    </div>
                    <Switch
                        checked={form.disagrees_with_deepeval}
                        onCheckedChange={(checked) => updateField("disagrees_with_deepeval", checked)}
                    />
                </div>

                <Separator />

                {/* Comments */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Comments</Label>
                    <Textarea
                        value={form.comments}
                        onChange={(e) => updateField("comments", e.target.value)}
                        placeholder="Add your review comments..."
                        rows={4}
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 bg-background flex justify-between px-6 py-2 border-t">
                <Button
                    onClick={handleReset}
                    variant="ghost"
                    disabled={updateMutation.isPending}
                >
                    <RotateCcw className="size-4 mr-2" />
                    Reset
                </Button>

                <Button
                    onClick={handleSubmit}
                    className="w-40"
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                        <Send className="size-4 mr-2" />
                    )}
                    Submit Review
                </Button>
            </div>
        </div>
    )
}

interface ScoreSliderProps {
    label: string
    value: number | null
    onChange: (value: number | null) => void
}

function ScoreSlider({ label, value, onChange }: ScoreSliderProps) {
    const hasValue = value !== null

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <div className="flex items-center gap-2">
                    {hasValue && (
                        <span className="text-sm text-muted-foreground">
                            {(value * 100).toFixed(0)}%
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onChange(hasValue ? null : 0.5)}
                    >
                        {hasValue ? "Clear" : "Set"}
                    </Button>
                </div>
            </div>
            {hasValue && (
                <Slider
                    value={[value]}
                    onValueChange={([v]) => onChange(v)}
                    min={0}
                    max={1}
                    step={0.05}
                />
            )}
        </div>
    )
}
