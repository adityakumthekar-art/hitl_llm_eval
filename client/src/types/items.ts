// Individual score detail for DeepEval metrics
export interface ScoreDetail {
  score: number | null
  reason: string | null
  is_successful: boolean | null
}

// DeepEval scores object
export interface DeepEvalScores {
  overall_score: number
  relevancy: ScoreDetail
  faithfulness: ScoreDetail
  hallucination: ScoreDetail
  bias: ScoreDetail
  correctness: ScoreDetail
}

// Human review information
export interface HumanReview {
  reviewer_name: string | null
  reviewed_at: string | null
  overall_score: number | null
  relevancy_score: number | null
  faithfulness_score: number | null
  hallucination_score: number | null
  bias_score: number | null
  correctness_score: number | null
  comments: string | null
  disagrees_with_deepeval: boolean
  reviewer_confidence: number
}

// Token usage for safety policy judge
export interface JudgeTokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  call_count: number
}

// Safety policy evaluation
export interface SafetyPolicy {
  score: number
  is_violation: boolean
  violation_type: string
  reason: string
  is_successful: boolean
  judge_token_usage: JudgeTokenUsage
}

// Review status type
export type ReviewStatus = "reviewed" | "pending" | "skipped"

// Review type
export type ReviewType = "ambiguous" | "bad_sample" | "good_sample"

// Question type
export type QuestionType = "long_answer" | "numerical" | "short_answer" | "multiple_choice"

// Main review item type
export interface ReviewItem {
  review_id: number
  question_id: number
  status: ReviewStatus
  review_type: ReviewType
  review_type_label: string
  question: string
  reference_answer: string
  llm_answer: string
  subject: string
  question_type: QuestionType
  model: string
  provider: string
  ambiguity_reasons: string[]
  deepeval_scores: DeepEvalScores
  human_review: HumanReview
  safety_policy: SafetyPolicy
}

// Pagination params for the request
export interface ItemsQueryParams {
  page: number
  per_page: number
}

// API response for items list
export interface ItemsResponse {
  items: ReviewItem[]
}

