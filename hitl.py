"""
Human-in-the-loop evaluation for LLMs.

This module provides functionality to review ambiguous DeepEval results with human reviewers.
It identifies cases where DeepEval results are uncertain and creates review files for human evaluation.
"""

import os
import json
import random
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


def analyze_result_ambiguity(
    result: Dict[str, Any],
    ambiguity_threshold: float = 0.3,
    low_score_threshold: float = 0.5,
) -> Tuple[List[str], str]:
    """
    Analyze a single result to determine if it's ambiguous and why.
    
    Args:
        result: Single evaluation result with DeepEval scores
        ambiguity_threshold: Range around threshold to consider ambiguous (default: 0.3)
        low_score_threshold: Score below which review is always needed (default: 0.5)
    
    Returns:
        Tuple of (ambiguity_reasons list, review_type)
    """
    scores = result.get("scores", {})
    deepeval_scores = scores.get("deepeval", {})
    
    if not deepeval_scores:
        return [], "all"
    
    overall_score = deepeval_scores.get("overall_score", None)
    
    # Extract individual metric scores
    relevancy = deepeval_scores.get("relevancy", {}).get("score")
    faithfulness = deepeval_scores.get("faithfulness", {}).get("score")
    hallucination = deepeval_scores.get("hallucination", {}).get("score")
    bias = deepeval_scores.get("bias", {}).get("score")
    correctness = deepeval_scores.get("correctness", {}).get("score")
    
    ambiguity_reasons = []
    review_type = "all"
    
    # Check 1: Low overall score
    if overall_score is not None and overall_score < low_score_threshold:
        ambiguity_reasons.append(
            f"Low overall score: {overall_score:.2f} (below {low_score_threshold})"
        )
        review_type = "bad_sample"
    
    # Check 2: Near threshold (ambiguous zone)
    if overall_score is not None:
        threshold = 0.7  # Default DeepEval threshold
        ambiguous_zone_low = max(0.0, threshold - ambiguity_threshold)
        ambiguous_zone_high = min(1.0, threshold + ambiguity_threshold)
        
        if ambiguous_zone_low <= overall_score <= ambiguous_zone_high:
            ambiguity_reasons.append(
                f"Score in ambiguous zone: {overall_score:.2f} (threshold: {threshold})"
            )
            if review_type == "all":
                review_type = "ambiguous"
    
    # Check 3: Missing critical scores
    valid_scores = [s for s in [relevancy, faithfulness] if s is not None]
    if len(valid_scores) < 2:
        ambiguity_reasons.append(
            "Missing critical metric scores (relevancy or faithfulness)"
        )
        if review_type == "all":
            review_type = "ambiguous"
    
    # Check 4: Conflicting metrics (high variance)
    if len(valid_scores) >= 2:
        score_values = [
            relevancy if relevancy is not None else 0.0,
            faithfulness if faithfulness is not None else 0.0,
            # Invert hallucination and bias (lower is better for these)
            (1.0 - hallucination) if hallucination is not None else 0.5,
            (1.0 - bias) if bias is not None else 0.5,
        ]
        if correctness is not None:
            score_values.append(correctness)
        
        if score_values:
            score_mean = sum(score_values) / len(score_values)
            score_variance = sum((x - score_mean) ** 2 for x in score_values) / len(score_values)
            
            # High variance indicates conflicting metrics
            if score_variance > 0.1:  # Variance threshold
                ambiguity_reasons.append(
                    f"Conflicting metrics (variance: {score_variance:.3f})"
                )
                if review_type == "all":
                    review_type = "ambiguous"
    
    # Check 5: Specific metric issues
    if relevancy is not None and relevancy < 0.5:
        ambiguity_reasons.append(f"Low relevancy score: {relevancy:.2f}")
        if review_type == "all":
            review_type = "ambiguous"
    
    if faithfulness is not None and faithfulness < 0.5:
        ambiguity_reasons.append(f"Low faithfulness score: {faithfulness:.2f}")
        if review_type == "all":
            review_type = "ambiguous"
    
    # Check 6: High hallucination or bias (bad scores)
    if hallucination is not None and hallucination > 0.5:
        ambiguity_reasons.append(f"High hallucination score: {hallucination:.2f}")
        if review_type == "all":
            review_type = "ambiguous"
    
    if bias is not None and bias > 0.5:
        ambiguity_reasons.append(f"High bias score: {bias:.2f}")
        if review_type == "all":
            review_type = "ambiguous"
    
    # Determine review type label
    if overall_score is not None:
        if overall_score >= 0.8 and not ambiguity_reasons:
            review_type = "good_sample"
        elif overall_score < low_score_threshold:
            review_type = "bad_sample"
        elif ambiguity_reasons:
            review_type = "ambiguous"
    
    return ambiguity_reasons, review_type


def identify_ambiguous_results(
    results: List[Dict[str, Any]],
    ambiguity_threshold: float = 0.3,
    low_score_threshold: float = 0.5,
    high_confidence_threshold: float = 0.8,
    sample_good_answers: int = 0,
    sample_bad_answers: int = 0,
    random_seed: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Identify ambiguous DeepEval results that need human review.
    
    A result is considered ambiguous if:
    1. Overall score is near the threshold (ambiguous zone: threshold ± ambiguity_threshold)
    2. Low overall score (below low_score_threshold)
    3. Conflicting metrics (some high, some low)
    4. Missing or None scores for critical metrics
    5. High variance between metrics (uncertainty indicator)
    
    Additionally, can sample random examples from:
    - High-confidence good answers (for validation that DeepEval correctly identifies good answers)
    - High-confidence bad answers (for validation that DeepEval correctly identifies bad answers)
    
    Args:
        results: List of evaluation results with DeepEval scores
        ambiguity_threshold: Range around threshold to consider ambiguous (default: 0.3)
                           e.g., threshold=0.7, ambiguous range = [0.4, 1.0]
        low_score_threshold: Score below which review is always needed (default: 0.5)
        high_confidence_threshold: Score above which review is rarely needed (default: 0.8)
        sample_good_answers: Number of random high-score answers to include for validation (default: 0)
        sample_bad_answers: Number of random low-score answers to include for validation (default: 0)
        random_seed: Random seed for reproducibility (default: None)
    
    Returns:
        List of results that need review (ambiguous + sampled good/bad for validation)
    """
    if random_seed is not None:
        random.seed(random_seed)
    
    ambiguous_results = []
    good_answers = []
    bad_answers = []
    
    for result in results:
        scores = result.get("scores", {})
        deepeval_scores = scores.get("deepeval", {})
        
        if not deepeval_scores:
            # No DeepEval scores - skip
            continue
        
        overall_score = deepeval_scores.get("overall_score", None)
        
        # Extract individual metric scores
        relevancy = deepeval_scores.get("relevancy", {}).get("score")
        faithfulness = deepeval_scores.get("faithfulness", {}).get("score")
        hallucination = deepeval_scores.get("hallucination", {}).get("score")
        bias = deepeval_scores.get("bias", {}).get("score")
        correctness = deepeval_scores.get("correctness", {}).get("score")
        
        ambiguity_reasons = []
        needs_review = False
        
        # Check 1: Low overall score
        if overall_score is not None and overall_score < low_score_threshold:
            needs_review = True
            ambiguity_reasons.append(
                f"Low overall score: {overall_score:.2f} (below {low_score_threshold})"
            )
        
        # Check 2: Near threshold (ambiguous zone)
        # Ambiguous if score is between (threshold - ambiguity_threshold) and (threshold + ambiguity_threshold)
        if overall_score is not None:
            threshold = 0.7  # Default DeepEval threshold
            ambiguous_zone_low = max(0.0, threshold - ambiguity_threshold)
            ambiguous_zone_high = min(1.0, threshold + ambiguity_threshold)
            
            if ambiguous_zone_low <= overall_score <= ambiguous_zone_high:
                needs_review = True
                ambiguity_reasons.append(
                    f"Score in ambiguous zone: {overall_score:.2f} (threshold: {threshold})"
                )
        
        # Check 3: Missing critical scores
        valid_scores = [s for s in [relevancy, faithfulness] if s is not None]
        if len(valid_scores) < 2:
            needs_review = True
            ambiguity_reasons.append(
                "Missing critical metric scores (relevancy or faithfulness)"
            )
        
        # Check 4: Conflicting metrics (high variance)
        if len(valid_scores) >= 2:
            score_values = [
                relevancy if relevancy is not None else 0.0,
                faithfulness if faithfulness is not None else 0.0,
                # Invert hallucination and bias (lower is better for these)
                (1.0 - hallucination) if hallucination is not None else 0.5,
                (1.0 - bias) if bias is not None else 0.5,
            ]
            if correctness is not None:
                score_values.append(correctness)
            
            if score_values:
                score_mean = sum(score_values) / len(score_values)
                score_variance = sum((x - score_mean) ** 2 for x in score_values) / len(score_values)
                
                # High variance indicates conflicting metrics
                if score_variance > 0.1:  # Variance threshold
                    needs_review = True
                    ambiguity_reasons.append(
                        f"Conflicting metrics (variance: {score_variance:.3f})"
                    )
        
        # Check 5: Specific metric issues
        if relevancy is not None and relevancy < 0.5:
            needs_review = True
            ambiguity_reasons.append(f"Low relevancy score: {relevancy:.2f}")
        
        if faithfulness is not None and faithfulness < 0.5:
            needs_review = True
            ambiguity_reasons.append(f"Low faithfulness score: {faithfulness:.2f}")
        
        # Check 6: High hallucination or bias (bad scores)
        if hallucination is not None and hallucination > 0.5:
            needs_review = True
            ambiguity_reasons.append(f"High hallucination score: {hallucination:.2f}")
        
        if bias is not None and bias > 0.5:
            needs_review = True
            ambiguity_reasons.append(f"High bias score: {bias:.2f}")
        
        # # Check 7: Overall score is None or unclear
        # if overall_score is None:
        #     needs_review = True
        #     ambiguity_reasons.append("Overall score is missing")
        
        if needs_review:
            ambiguous_result = result.copy()
            ambiguous_result["_hitl_metadata"] = {
                "ambiguity_reasons": ambiguity_reasons,
                "needs_review": True,
                "review_type": "ambiguous",  # Gray zone - uncertain
                "identified_at": datetime.now().isoformat(),
            }
            ambiguous_results.append(ambiguous_result)
        else:
            # Categorize non-ambiguous results for sampling
            if overall_score is not None:
                if overall_score >= high_confidence_threshold:
                    # High confidence good answer
                    good_result = result.copy()
                    good_result["_hitl_metadata"] = {
                        "ambiguity_reasons": [],
                        "needs_review": False,
                        "review_type": "good_sample",  # High score - validate it's truly good
                        "identified_at": datetime.now().isoformat(),
                    }
                    good_answers.append(good_result)
                elif overall_score <= low_score_threshold:
                    # High confidence bad answer
                    bad_result = result.copy()
                    bad_result["_hitl_metadata"] = {
                        "ambiguity_reasons": [],
                        "needs_review": False,
                        "review_type": "bad_sample",  # Low score - validate it's truly bad
                        "identified_at": datetime.now().isoformat(),
                    }
                    bad_answers.append(bad_result)
    
    # Combine all results that need review
    results_for_review = ambiguous_results.copy()
    
    # Sample good answers for validation
    if sample_good_answers > 0 and good_answers:
        sampled_good = random.sample(
            good_answers, 
            min(sample_good_answers, len(good_answers))
        )
        for good_result in sampled_good:
            # Mark as needing review for validation purposes
            good_result["_hitl_metadata"]["needs_review"] = True
            good_result["_hitl_metadata"]["ambiguity_reasons"].append(
                f"Random sample for validation: High score ({good_result.get('scores', {}).get('deepeval', {}).get('overall_score', 0):.2f}) - validating DeepEval correctly identified good answer"
            )
        results_for_review.extend(sampled_good)
        print(f"  ✓ Added {len(sampled_good)} random high-score samples for validation")
    
    # Sample bad answers for validation
    if sample_bad_answers > 0 and bad_answers:
        sampled_bad = random.sample(
            bad_answers,
            min(sample_bad_answers, len(bad_answers))
        )
        for bad_result in sampled_bad:
            # Mark as needing review for validation purposes
            bad_result["_hitl_metadata"]["needs_review"] = True
            bad_result["_hitl_metadata"]["ambiguity_reasons"].append(
                f"Random sample for validation: Low score ({bad_result.get('scores', {}).get('deepeval', {}).get('overall_score', 0):.2f}) - validating DeepEval correctly identified bad answer"
            )
        results_for_review.extend(sampled_bad)
        print(f"  ✓ Added {len(sampled_bad)} random low-score samples for validation")
    
    return results_for_review


def create_review_file(
    ambiguous_results: List[Dict[str, Any]],
    output_path: str,
    include_deepeval_reasons: bool = True,
) -> str:
    """
    Create a JSON file for human reviewers to evaluate ambiguous results.
    
    The review file format is designed to be easy for humans to review:
    - Clear question and answer sections
    - DeepEval scores prominently displayed
    - Reasons for ambiguity highlighted
    - Fields for human reviewer input
    
    Args:
        ambiguous_results: List of ambiguous results from identify_ambiguous_results()
        output_path: Path where review file should be saved
        include_deepeval_reasons: If True, include DeepEval's reasoning in the review file
    
    Returns:
        Path to the created review file
    """
    review_data = {
        "review_type": "deepeval_hitl",
        "created_at": datetime.now().isoformat(),
        "total_items": len(ambiguous_results),
        "reviewed_items": 0,
        "items": [],
    }
    
    for idx, result in enumerate(ambiguous_results, 1):
        scores = result.get("scores", {})
        deepeval_scores = scores.get("deepeval", {})
        safety_policy_scores = scores.get("safety_policy", {})
        metadata = result.get("_hitl_metadata", {})
        
        # Extract scores
        relevancy = deepeval_scores.get("relevancy", {})
        faithfulness = deepeval_scores.get("faithfulness", {})
        hallucination = deepeval_scores.get("hallucination", {})
        bias = deepeval_scores.get("bias", {})
        correctness = deepeval_scores.get("correctness", {})
        
        # Get review type for display
        review_type = metadata.get("review_type", "ambiguous")
        review_type_labels = {
            "ambiguous": "🔶 Gray Zone (Ambiguous)",
            "good_sample": "✅ High Score Sample (Validation)",
            "bad_sample": "❌ Low Score Sample (Validation)",
        }
        review_type_label = review_type_labels.get(review_type, "Unknown")
        
        review_item = {
            "review_id": idx,
            "question_id": result.get("question_id"),
            "status": "pending",  # pending, reviewed, skipped
            "review_type": review_type,  # ambiguous, good_sample, bad_sample
            "review_type_label": review_type_label,
            "question": result.get("question"),
            "reference_answer": result.get("reference_answer"),
            "llm_answer": result.get("llm_answer"),
            "subject": result.get("subject"),
            "question_type": result.get("question_type"),
            "model": result.get("model"),
            "provider": result.get("provider"),
            "ambiguity_reasons": metadata.get("ambiguity_reasons", []),
            "deepeval_scores": {
                "overall_score": deepeval_scores.get("overall_score"),
                "relevancy": {
                    "score": relevancy.get("score"),
                    "reason": relevancy.get("reason") if include_deepeval_reasons else None,
                    "is_successful": relevancy.get("is_successful"),
                },
                "faithfulness": {
                    "score": faithfulness.get("score"),
                    "reason": faithfulness.get("reason") if include_deepeval_reasons else None,
                    "is_successful": faithfulness.get("is_successful"),
                },
                "hallucination": {
                    "score": hallucination.get("score"),
                    "reason": hallucination.get("reason") if include_deepeval_reasons else None,
                    "is_successful": hallucination.get("is_successful"),
                },
                "bias": {
                    "score": bias.get("score"),
                    "reason": bias.get("reason") if include_deepeval_reasons else None,
                    "is_successful": bias.get("is_successful"),
                },
            },
            "human_review": {
                "reviewer_name": None,
                "reviewed_at": None,
                "overall_score": None,  # Human's overall score (0.0-1.0)
                "relevancy_score": None,
                "faithfulness_score": None,
                "hallucination_score": None,
                "bias_score": None,
                "correctness_score": None,
                "comments": None,
                "disagrees_with_deepeval": False,
                "reviewer_confidence": None,  # 0.0-1.0
            },
        }
        
        # Add correctness if available
        if correctness.get("score") is not None:
            review_item["deepeval_scores"]["correctness"] = {
                "score": correctness.get("score"),
                "reason": correctness.get("reason") if include_deepeval_reasons else None,
                "is_successful": correctness.get("is_successful"),
            }
        
        # Add safety_policy if available
        if safety_policy_scores:
            review_item["safety_policy"] = {
                "score": safety_policy_scores.get("score"),
                "is_violation": safety_policy_scores.get("is_violation", False),
                "violation_type": safety_policy_scores.get("violation_type", "none"),
                "reason": safety_policy_scores.get("reason"),
                "is_successful": safety_policy_scores.get("is_successful", False),
                "judge_token_usage": safety_policy_scores.get("judge_token_usage", {}),
            }
        
        review_data["items"].append(review_item)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    
    # Write review file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(review_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Created review file: {output_path}")
    print(f"  Total items for review: {len(ambiguous_results)}")
    
    return output_path


def convert_eval_results_to_review_file(
    eval_results: Dict[str, Any],
    ambiguity_threshold: float = 0.3,
    low_score_threshold: float = 0.5,
) -> Dict[str, Any]:
    """
    Convert regular evaluation results file to HITL review file format.
    
    This allows any evaluation results to be used for human review,
    not just those created with --enable-hitl.
    
    Args:
        eval_results: Evaluation results dictionary (from deepeval_*.json)
        ambiguity_threshold: Range around threshold to consider ambiguous (default: 0.3)
        low_score_threshold: Score below which review is always needed (default: 0.5)
    
    Returns:
        Review file format dictionary (compatible with HITL review format)
    """
    results = eval_results.get("results", [])
    
    review_data = {
        "review_type": "deepeval_hitl",
        "created_at": datetime.now().isoformat(),
        "total_items": len(results),
        "reviewed_items": 0,
        "source_file_type": "evaluation_results",  # Track that this was converted
        "items": [],
    }
    
    # Review type labels
    review_type_labels = {
        "ambiguous": "🔶 Gray Zone (Ambiguous)",
        "good_sample": "✅ High Score Sample (Validation)",
        "bad_sample": "❌ Low Score Sample (Validation)",
        "all": "📋 All Results (Converted)",
    }
    
    for idx, result in enumerate(results, 1):
        scores = result.get("scores", {})
        deepeval_scores = scores.get("deepeval", {})
        safety_policy_scores = scores.get("safety_policy", {})
        
        # Extract scores
        relevancy = deepeval_scores.get("relevancy", {})
        faithfulness = deepeval_scores.get("faithfulness", {})
        hallucination = deepeval_scores.get("hallucination", {})
        bias = deepeval_scores.get("bias", {})
        correctness = deepeval_scores.get("correctness", {})
        
        # Analyze ambiguity for this result
        ambiguity_reasons, review_type = analyze_result_ambiguity(
            result,
            ambiguity_threshold=ambiguity_threshold,
            low_score_threshold=low_score_threshold,
        )
        
        review_item = {
            "review_id": idx,
            "question_id": result.get("question_id"),
            "status": "pending",
            "review_type": review_type,
            "review_type_label": review_type_labels.get(review_type, "📋 All Results (Converted)"),
            "question": result.get("question"),
            "reference_answer": result.get("reference_answer"),
            "llm_answer": result.get("llm_answer"),
            "subject": result.get("subject"),
            "question_type": result.get("question_type"),
            "model": result.get("model"),
            "provider": result.get("provider"),
            "ambiguity_reasons": ambiguity_reasons,  # Populated during conversion
            "deepeval_scores": {
                "overall_score": deepeval_scores.get("overall_score"),
                "relevancy": {
                    "score": relevancy.get("score"),
                    "reason": relevancy.get("reason"),
                    "is_successful": relevancy.get("is_successful"),
                },
                "faithfulness": {
                    "score": faithfulness.get("score"),
                    "reason": faithfulness.get("reason"),
                    "is_successful": faithfulness.get("is_successful"),
                },
                "hallucination": {
                    "score": hallucination.get("score"),
                    "reason": hallucination.get("reason"),
                    "is_successful": hallucination.get("is_successful"),
                },
                "bias": {
                    "score": bias.get("score"),
                    "reason": bias.get("reason"),
                    "is_successful": bias.get("is_successful"),
                },
            },
            "human_review": {
                "reviewer_name": None,
                "reviewed_at": None,
                "overall_score": None,
                "relevancy_score": None,
                "faithfulness_score": None,
                "hallucination_score": None,
                "bias_score": None,
                "correctness_score": None,
                "comments": None,
                "disagrees_with_deepeval": None,
                "reviewer_confidence": None,
            },
        }
        
        # Add correctness if available
        if correctness.get("score") is not None:
            review_item["deepeval_scores"]["correctness"] = {
                "score": correctness.get("score"),
                "reason": correctness.get("reason"),
                "is_successful": correctness.get("is_successful"),
            }
        
        # Add safety_policy if available
        if safety_policy_scores:
            review_item["safety_policy"] = {
                "score": safety_policy_scores.get("score"),
                "is_violation": safety_policy_scores.get("is_violation", False),
                "violation_type": safety_policy_scores.get("violation_type", "none"),
                "reason": safety_policy_scores.get("reason"),
                "is_successful": safety_policy_scores.get("is_successful", False),
                "judge_token_usage": safety_policy_scores.get("judge_token_usage", {}),
            }
        
        review_data["items"].append(review_item)
    
    return review_data


def load_review_file(
    review_file_path: str,
    filter_ambiguous_only: bool = False,
    ambiguity_threshold: float = 0.3,
    low_score_threshold: float = 0.5,
    analyze_ambiguity: bool = True,
) -> Dict[str, Any]:
    """
    Load a review file or evaluation results file.
    
    Automatically detects the file type and converts evaluation results
    to review format if needed. When converting evaluation results, automatically
    analyzes each result for ambiguity and populates ambiguity_reasons.
    
    Args:
        review_file_path: Path to the review file or evaluation results file
        filter_ambiguous_only: If True, only include ambiguous results when converting
                              evaluation results (default: False - includes all)
        ambiguity_threshold: Range around threshold to consider ambiguous (default: 0.3)
        low_score_threshold: Score below which review is always needed (default: 0.5)
        analyze_ambiguity: If True, analyze ambiguity for each result (default: True)
                          Note: Currently always True, parameter reserved for future use
    
    Returns:
        Review data dictionary (always in HITL review format)
    """
    with open(review_file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Check if it's already a review file
    if data.get("review_type") == "deepeval_hitl":
        # If it's already a review file, check if ambiguity_reasons need to be populated
        items = data.get("items", [])
        needs_analysis = any(
            not item.get("ambiguity_reasons") or len(item.get("ambiguity_reasons", [])) == 0
            for item in items
        )
        
        if needs_analysis:
            # Re-analyze items that don't have ambiguity_reasons
            print(f"  Re-analyzing {len(items)} items for ambiguity...")
            for item in items:
                # Reconstruct the original result structure for analysis
                deepeval_scores = item.get("deepeval_scores", {})
                if deepeval_scores:
                    # Create a temporary result structure for analysis
                    temp_result = {
                        "question_id": item.get("question_id"),
                        "scores": {
                            "deepeval": deepeval_scores
                        }
                    }
                    
                    # Analyze and update
                    ambiguity_reasons, review_type = analyze_result_ambiguity(
                        temp_result,
                        ambiguity_threshold=ambiguity_threshold,
                        low_score_threshold=low_score_threshold,
                    )
                    
                    # Update the item
                    item["ambiguity_reasons"] = ambiguity_reasons
                    if review_type != "all":
                        item["review_type"] = review_type
                        review_type_labels = {
                            "ambiguous": "🔶 Gray Zone (Ambiguous)",
                            "good_sample": "✅ High Score Sample (Validation)",
                            "bad_sample": "❌ Low Score Sample (Validation)",
                        }
                        item["review_type_label"] = review_type_labels.get(review_type, item.get("review_type_label", "📋 All Results"))
            
            print(f"  ✓ Analyzed and populated ambiguity_reasons for all items")
        
        return data
    
    # Check if it's an evaluation results file
    if data.get("mode") == "deepeval" and "results" in data:
        # Filter for ambiguous results only if requested
        if filter_ambiguous_only:
            results = data.get("results", [])
            ambiguous_results = identify_ambiguous_results(
                results,
                ambiguity_threshold=ambiguity_threshold,
                low_score_threshold=low_score_threshold,
                sample_good_answers=0,
                sample_bad_answers=0,
            )
            # Create a temporary data structure with only ambiguous results
            filtered_data = {
                "mode": "deepeval",
                "provider": data.get("provider"),
                "model": data.get("model"),
                "results": ambiguous_results,
            }
            print(f"  Filtered to {len(ambiguous_results)} ambiguous results (out of {len(results)} total)")
            return convert_eval_results_to_review_file(
                filtered_data,
                ambiguity_threshold=ambiguity_threshold,
                low_score_threshold=low_score_threshold,
            )
        else:
            # Convert all evaluation results to review format with ambiguity analysis
            return convert_eval_results_to_review_file(
                data,
                ambiguity_threshold=ambiguity_threshold,
                low_score_threshold=low_score_threshold,
            )
    
    # Unknown format - try to return as-is but warn
    print(f"⚠️  Warning: Unknown file format. Attempting to use as review file.")
    return data


def merge_human_reviews(
    original_results: List[Dict[str, Any]],
    review_file_path: str,
    overwrite_deepeval: bool = False,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Merge human reviews back into original results.
    
    Args:
        original_results: Original evaluation results
        review_file_path: Path to the completed review file
        overwrite_deepeval: If True, replace DeepEval scores with human scores.
                          If False, add human scores as additional "human_review" field
    
    Returns:
        Tuple of (updated_results, merge_statistics)
    """
    review_data = load_review_file(review_file_path)
    review_items = review_data.get("items", [])
    
    # Create mapping of question_id to review
    review_map = {}
    for review_item in review_items:
        question_id = review_item.get("question_id")
        if question_id and review_item.get("status") == "reviewed":
            review_map[question_id] = review_item
    
    updated_results = []
    merge_stats = {
        "total_results": len(original_results),
        "reviewed_count": len(review_map),
        "merged_count": 0,
        "skipped_count": 0,
    }
    
    for result in original_results:
        question_id = result.get("question_id")
        human_review = review_map.get(question_id)
        
        if human_review:
            # Merge human review
            review_data = human_review.get("human_review", {})
            
            if overwrite_deepeval:
                # Replace DeepEval scores with human scores
                if "scores" not in result:
                    result["scores"] = {}
                if "deepeval" not in result["scores"]:
                    result["scores"]["deepeval"] = {}
                
                deepeval_scores = result["scores"]["deepeval"]
                
                # Update scores from human review
                if review_data.get("overall_score") is not None:
                    deepeval_scores["overall_score"] = review_data["overall_score"]
                
                if review_data.get("relevancy_score") is not None:
                    if "relevancy" not in deepeval_scores:
                        deepeval_scores["relevancy"] = {}
                    deepeval_scores["relevancy"]["score"] = review_data["relevancy_score"]
                    deepeval_scores["relevancy"]["source"] = "human_review"
                
                if review_data.get("faithfulness_score") is not None:
                    if "faithfulness" not in deepeval_scores:
                        deepeval_scores["faithfulness"] = {}
                    deepeval_scores["faithfulness"]["score"] = review_data["faithfulness_score"]
                    deepeval_scores["faithfulness"]["source"] = "human_review"
                
                if review_data.get("hallucination_score") is not None:
                    if "hallucination" not in deepeval_scores:
                        deepeval_scores["hallucination"] = {}
                    deepeval_scores["hallucination"]["score"] = review_data["hallucination_score"]
                    deepeval_scores["hallucination"]["source"] = "human_review"
                
                if review_data.get("bias_score") is not None:
                    if "bias" not in deepeval_scores:
                        deepeval_scores["bias"] = {}
                    deepeval_scores["bias"]["score"] = review_data["bias_score"]
                    deepeval_scores["bias"]["source"] = "human_review"
                
                if review_data.get("correctness_score") is not None:
                    if "correctness" not in deepeval_scores:
                        deepeval_scores["correctness"] = {}
                    deepeval_scores["correctness"]["score"] = review_data["correctness_score"]
                    deepeval_scores["correctness"]["source"] = "human_review"
                
                result["_human_review_applied"] = True
            else:
                # Add human review as additional data (preserve DeepEval scores)
                if "_human_reviews" not in result:
                    result["_human_reviews"] = []
                
                result["_human_reviews"].append({
                    "reviewer": review_data.get("reviewer_name"),
                    "reviewed_at": review_data.get("reviewed_at"),
                    "scores": {
                        "overall_score": review_data.get("overall_score"),
                        "relevancy": review_data.get("relevancy_score"),
                        "faithfulness": review_data.get("faithfulness_score"),
                        "hallucination": review_data.get("hallucination_score"),
                        "bias": review_data.get("bias_score"),
                        "correctness": review_data.get("correctness_score"),
                    },
                    "comments": review_data.get("comments"),
                    "disagrees_with_deepeval": review_data.get("disagrees_with_deepeval", False),
                    "confidence": review_data.get("reviewer_confidence"),
                })
            
            merge_stats["merged_count"] += 1
        else:
            merge_stats["skipped_count"] += 1
        
        updated_results.append(result)
    
    return updated_results, merge_stats


def print_review_summary(review_file_path: str):
    """Print a summary of the review file status."""
    review_data = load_review_file(review_file_path)
    
    total_items = review_data.get("total_items", 0)
    items = review_data.get("items", [])
    
    status_counts = {
        "pending": 0,
        "reviewed": 0,
        "skipped": 0,
    }
    
    for item in items:
        status = item.get("status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"\n{'='*80}")
    print("HUMAN REVIEW SUMMARY")
    print(f"{'='*80}")
    print(f"Review file: {review_file_path}")
    print(f"Total items: {total_items}")
    print(f"  - Pending: {status_counts['pending']}")
    print(f"  - Reviewed: {status_counts['reviewed']}")
    print(f"  - Skipped: {status_counts['skipped']}")
    print(f"{'='*80}\n")
