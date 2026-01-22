import { useParams, Link } from "react-router-dom"
import { useItemDetailsQuery } from "./items/details/queries"
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import EvaluationParameters from "./items/details/evaluationParameters"

export default function ItemDetails() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error } = useItemDetailsQuery(id ?? "")

  return (
    <div className="h-dvh grid grid-rows-[auto_1fr] grid-cols-1 overflow-hidden">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background flex items-center gap-4 border-border px-6 h-16">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/items">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span className="text-xl font-semibold">Item Details</span>
        {data && (
          <Badge variant="outline">#{data.review_id}</Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex min-h-0 overflow-hidden">
        {/* Left sidebar - Params (empty for now) */}
        <div className="flex-0 basis-96 border-r border-border bg-neutral-50 h-full overflow-hidden">
          <EvaluationParameters />
        </div>

        {/* Main content area */}
        <div className="flex-1  overflow-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading item details...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-destructive">
                <AlertCircle className="size-8" />
                <p className="text-sm">Error: {error.message}</p>
                <Button variant="outline" asChild>
                  <Link to="/items">Go back to items</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Data display */}
          {data && (
            <div className="p-6 space-y-6 pb-10">
              {/* Meta info */}
              <div className="flex items-center gap-3 flex-wrap justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={data.status === "reviewed" ? "default" : "secondary"}>
                    {data.status}
                  </Badge>
                  <Badge variant="outline" >{data.subject}</Badge>
                  <span className="text-sm pl-4 block">{data.review_type_label}</span>
                </div>
                <span className="text-base text-neutral-900 font-semibold">
                  {data.model} / {data.provider}
                </span>
              </div>

              {/* Question */}
              <section className="space-y-2 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">Question</h3>
                <p className="text-lg font-medium whitespace-pre-wrap">{data.question}</p>
              </section>

              {/* Reference Answer */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Reference Answer</h3>
                <p className="text-base block pr-6 max-w-4xl whitespace-pre-wrap">{data.reference_answer}</p>
              </section>

              {/* LLM Answer */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">LLM Answer</h3>
                <div className="border border-border rounded-lg bg-neutral-50 p-4">
                  <p className="text-base block pr-6 max-w-4xl whitespace-pre-wrap">{data.llm_answer}</p>
                </div>
              </section>

              {/* DeepEval Scores */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">DeepEval Scores</h3>
                <div className="border border-border rounded-lg bg-neutral-50 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <ScoreCard
                      label="Overall"
                      score={data.deepeval_scores.overall_score}
                    />
                    <ScoreCard
                      label="Relevancy"
                      score={data.deepeval_scores.relevancy.score}
                    />
                    <ScoreCard
                      label="Faithfulness"
                      score={data.deepeval_scores.faithfulness.score}
                    />
                    <ScoreCard
                      label="Hallucination"
                      score={data.deepeval_scores.hallucination.score}
                      inverted
                    />
                    <ScoreCard
                      label="Bias"
                      score={data.deepeval_scores.bias.score}
                      inverted
                    />
                    <ScoreCard
                      label="Correctness"
                      score={data.deepeval_scores.correctness.score}
                    />
                  </div>
                </div>
              </section>

              {/* Ambiguity Reasons */}
              {data.ambiguity_reasons.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Ambiguity Reasons</h3>
                  <div className="border border-border rounded-lg bg-neutral-50 p-4">
                    <ul className="list-disc list-inside space-y-1">
                      {data.ambiguity_reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm">{reason}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Safety Policy */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-600">Safety Policy</h3>
                <div className="border border-border rounded-lg bg-neutral-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={data.safety_policy.is_violation ? "destructive" : "default"}>
                      {data.safety_policy.is_violation ? "Violation" : "Safe"}
                    </Badge>
                    {data.safety_policy.is_violation && (
                      <span className="text-sm text-neutral-600">{data.safety_policy.violation_type}</span>
                    )}
                  </div>
                  <p className="text-sm">{data.safety_policy.reason}</p>
                </div>
              </section>

              {/* Human Review */}
              {data.human_review.reviewer_name && (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Human Review</h3>
                  <div className="border border-border rounded-lg bg-neutral-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Reviewer:</span>
                      <span>{data.human_review.reviewer_name}</span>
                    </div>
                    {data.human_review.correctness_score !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Correctness Score:</span>
                        <span>{(data.human_review.correctness_score * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    {data.human_review.disagrees_with_deepeval && (
                      <Badge variant="secondary">Disagrees with DeepEval</Badge>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  score,
  inverted = false,
}: {
  label: string
  score: number | null
  inverted?: boolean
}) {
  if (score === null) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-neutral-600 block pb-2">{label}</p>
        <p className="text-lg font-medium text-neutral-400">N/A</p>
      </div>
    )
  }

  const displayScore = (score * 100).toFixed(0)
  const isGood = inverted ? score <= 0.3 : score >= 0.7
  const isBad = inverted ? score >= 0.7 : score <= 0.3

  return (
    <div className="text-center py-3">
      <p className="text-sm text-neutral-600 block pb-2">{label}</p>
      <p
        className={`text-lg font-medium ${isGood ? "text-green-600" : isBad ? "text-red-600" : "text-neutral-400"
          }`}
      >
        {displayScore}%
      </p>
    </div>
  )
}
