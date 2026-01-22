"""
FastAPI REST API for HITL review dashboard.

This provides a REST API for HITL review dashboard with FastAPI for microservices deployment.
FastAPI includes automatic OpenAPI/Swagger documentation and better performance.

Usage:
    uvicorn api_fastapi:app --host 0.0.0.0 --port 5000 --review-file path/to/review.json
    OR
    python api_fastapi.py --review-file path/to/review.json --port 5000
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Path as FastPath, Body
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import from hitl module in the same directory
from hitl import load_review_file, print_review_summary

# Global state for review file
REVIEW_FILE_PATH: Optional[str] = None
REVIEW_DATA: Optional[Dict[str, Any]] = None

# Create FastAPI app
app = FastAPI(
    title="HITL Review API",
    description="Human-in-the-Loop Review API for DeepEval results",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for dashboard SPA
CLIENT_DIST_PATH = Path(__file__).parent / "client_dist"
if CLIENT_DIST_PATH.exists():
    # Mount static assets (JS, CSS, images)
    app.mount("/dashboard/assets", StaticFiles(directory=CLIENT_DIST_PATH / "assets"), name="dashboard-assets")
    
    @app.get("/dashboard/{full_path:path}", tags=["Dashboard"])
    async def serve_dashboard(full_path: str = ""):
        """Serve the dashboard SPA. Returns index.html for all routes to enable client-side routing."""
        # Check if requesting a static file that exists
        file_path = CLIENT_DIST_PATH / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise return index.html for SPA routing
        return FileResponse(CLIENT_DIST_PATH / "index.html")
    
    @app.get("/dashboard", tags=["Dashboard"])
    async def serve_dashboard_root():
        """Serve the dashboard SPA root."""
        return FileResponse(CLIENT_DIST_PATH / "index.html")


# Pydantic models for request/response validation
class HumanReviewInput(BaseModel):
    reviewer_name: Optional[str] = None
    correctness_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Human evaluation of answer correctness (0.0-1.0)")
    safety_policy_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Human correction of safety policy score (0.0=safe, 1.0=violation)")
    comments: Optional[str] = None
    disagrees_with_deepeval: Optional[bool] = False
    reviewer_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    # Legacy fields (deprecated but kept for backward compatibility)
    overall_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    relevancy_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    faithfulness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    hallucination_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    bias_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class UpdateItemRequest(BaseModel):
    status: Optional[str] = Field(None, pattern="^(pending|reviewed|skipped)$")
    human_review: Optional[HumanReviewInput] = None


class BulkUpdateRequest(BaseModel):
    updates: List[Dict[str, Any]] = Field(..., description="List of updates, each with review_id and update fields")


class ReviewSummaryResponse(BaseModel):
    total_items: int
    pending: int
    reviewed: int
    skipped: int
    progress_percent: float


class ReviewItemsResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    page: int
    per_page: int
    total_pages: int


def save_review_file(review_data: Dict[str, Any], file_path: str) -> bool:
    """Save updated review data back to file."""
    try:
        if not file_path:
            print("ERROR: Review file path is not set!")
            return False
        
        if not os.path.exists(os.path.dirname(file_path)) and os.path.dirname(file_path):
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            print(f"Created directory: {os.path.dirname(file_path)}")
        
        # Create backup before saving
        if os.path.exists(file_path):
            backup_path = file_path + f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            import shutil
            shutil.copy2(file_path, backup_path)
            print(f"Created backup: {backup_path}")
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(review_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Successfully saved review file: {file_path}")
        print(f"  Total items: {len(review_data.get('items', []))}")
        return True
    except PermissionError as e:
        print(f"ERROR: Permission denied saving review file: {e}")
        print(f"  File path: {file_path}")
        print(f"  Check file permissions and ensure the file is not open in another program")
        return False
    except Exception as e:
        print(f"ERROR: Failed to save review file: {e}")
        print(f"  File path: {file_path}")
        import traceback
        traceback.print_exc()
        return False


def load_review_data() -> bool:
    """Load review data from file."""
    global REVIEW_DATA, REVIEW_FILE_PATH
    if REVIEW_FILE_PATH and os.path.exists(REVIEW_FILE_PATH):
        try:
            # Get filter options from args if available
            filter_ambiguous = getattr(load_review_data, "_filter_ambiguous", False)
            ambiguity_threshold = getattr(load_review_data, "_ambiguity_threshold", 0.3)
            low_score_threshold = getattr(load_review_data, "_low_score_threshold", 0.5)
            
            REVIEW_DATA = load_review_file(
                REVIEW_FILE_PATH,
                filter_ambiguous_only=filter_ambiguous,
                ambiguity_threshold=ambiguity_threshold,
                low_score_threshold=low_score_threshold,
            )
            return True
        except Exception as e:
            print(f"Error loading review file: {e}")
            return False
    return False


@app.on_event("startup")
async def startup_event():
    """Load review data on startup."""
    global REVIEW_DATA, REVIEW_FILE_PATH
    # Try to get from environment variable if not set
    if not REVIEW_FILE_PATH:
        REVIEW_FILE_PATH = os.getenv("REVIEW_FILE")
    if REVIEW_FILE_PATH:
        if not os.path.exists(REVIEW_FILE_PATH):
            print(f"Warning: Review file not found: {REVIEW_FILE_PATH}")
        else:
            load_review_data()
            if REVIEW_DATA:
                print(f"✓ Loaded review file: {REVIEW_FILE_PATH}")
                print(f"  Total items: {REVIEW_DATA.get('total_items', 0)}")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "service": "HITL Review API",
        "version": "1.0.0",
        "status": "running",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        },
        "endpoints": {
            "health": "/api/health",
            "summary": "/api/review/summary",
            "items": "/api/review/items",
            "item_by_id": "/api/review/items/{review_id}",
            "update_item": "PUT /api/review/items/{review_id}",
            "bulk_update": "POST /api/review/bulk-update",
            "save": "POST /api/review/save"
        },
        "review_file": REVIEW_FILE_PATH if REVIEW_FILE_PATH else "Not loaded"
    }


@app.get("/api/health", tags=["Health"])
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "review_file": REVIEW_FILE_PATH,
        "loaded": REVIEW_DATA is not None,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/review/summary", response_model=ReviewSummaryResponse, tags=["Review"])
async def get_summary():
    """Get review summary statistics."""
    if REVIEW_DATA is None:
        if not load_review_data():
            raise HTTPException(status_code=404, detail="Review file not loaded")
    
    items = REVIEW_DATA.get("items", [])
    status_counts = {"pending": 0, "reviewed": 0, "skipped": 0}
    
    for item in items:
        status = item.get("status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    total = len(items)
    reviewed = status_counts.get("reviewed", 0)
    progress = (reviewed / total * 100) if total > 0 else 0
    
    return ReviewSummaryResponse(
        total_items=total,
        pending=status_counts.get("pending", 0),
        reviewed=reviewed,
        skipped=status_counts.get("skipped", 0),
        progress_percent=progress
    )


@app.get("/api/review/items", response_model=ReviewItemsResponse, tags=["Review"])
async def get_items(
    status: Optional[str] = Query(None, description="Filter by status: pending, reviewed, skipped, or all"),
    review_type: Optional[str] = Query(None, description="Filter by review type: ambiguous, good_sample, bad_sample, all, or all"),
    safety_filter: Optional[str] = Query(None, description="Filter by safety status: unsafe, safe, or all"),
    sample_good: Optional[int] = Query(None, ge=0, description="Random sample N good results (high scores)"),
    sample_bad: Optional[int] = Query(None, ge=0, description="Random sample N bad results (low scores)"),
    high_score_threshold: Optional[float] = Query(0.8, ge=0.0, le=1.0, description="Threshold for good results (default: 0.8)"),
    low_score_threshold: Optional[float] = Query(0.5, ge=0.0, le=1.0, description="Threshold for bad results (default: 0.5)"),
    random_seed: Optional[int] = Query(None, description="Random seed for reproducible sampling"),
    sample_only: bool = Query(False, description="If true, only return sampled items (filter mode). If false, show sampled items first (sort mode)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=1000, description="Items per page")
):
    """Get all review items with optional filtering, random sampling, and pagination."""
    import random
    
    if REVIEW_DATA is None:
        if not load_review_data():
            raise HTTPException(status_code=404, detail="Review file not loaded")
    
    # Validate status filter
    if status is not None:
        valid_statuses = ["pending", "reviewed", "skipped", "all"]
        if status.lower() not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Validate review_type filter
    if review_type is not None:
        valid_types = ["ambiguous", "good_sample", "bad_sample", "all"]
        if review_type.lower() not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid review_type. Must be one of: {', '.join(valid_types)}")
    
    # Validate safety_filter
    if safety_filter is not None:
        valid_safety = ["unsafe", "safe", "all"]
        if safety_filter.lower() not in valid_safety:
            raise HTTPException(status_code=400, detail=f"Invalid safety_filter. Must be one of: {', '.join(valid_safety)}")
    
    items = REVIEW_DATA.get("items", [])
    
    # Filter by status
    if status and status.lower() != "all":
        items = [item for item in items if item.get("status", "pending") == status.lower()]
    
    # Filter by review type
    if review_type and review_type.lower() != "all":
        items = [item for item in items if item.get("review_type", "ambiguous") == review_type.lower()]
    
    # Filter by safety status
    if safety_filter and safety_filter.lower() != "all":
        if safety_filter.lower() == "unsafe":
            items = [item for item in items if item.get("safety_policy", {}).get("is_violation", False) == True]
        elif safety_filter.lower() == "safe":
            # Safe = either no safety_policy data, or is_violation is False
            items = [item for item in items if not item.get("safety_policy", {}).get("is_violation", False)]
    
    # Random sampling from good/bad results
    sampled_items = []
    remaining_items = items.copy()  # Start with all items
    
    if sample_good is not None and sample_good > 0:
        if random_seed is not None:
            random.seed(random_seed)
        
        # Get good results (high scores) from remaining items
        good_items = [
            item for item in remaining_items
            if item.get("deepeval_scores", {}).get("overall_score", 0) >= high_score_threshold
        ]
        
        if len(good_items) > 0:
            sample_size = min(sample_good, len(good_items))
            sampled_good = random.sample(good_items, sample_size)
            sampled_items.extend(sampled_good)
            # Remove sampled items from remaining
            sampled_ids = {item.get("review_id") for item in sampled_good}
            remaining_items = [item for item in remaining_items if item.get("review_id") not in sampled_ids]
    
    if sample_bad is not None and sample_bad > 0:
        if random_seed is not None:
            random.seed(random_seed)
        
        # Get bad results (low scores) from remaining items
        bad_items = [
            item for item in remaining_items
            if item.get("deepeval_scores", {}).get("overall_score", 0) < low_score_threshold
        ]
        
        if len(bad_items) > 0:
            sample_size = min(sample_bad, len(bad_items))
            sampled_bad = random.sample(bad_items, sample_size)
            sampled_items.extend(sampled_bad)
            # Remove sampled items from remaining
            sampled_ids = {item.get("review_id") for item in sampled_bad}
            remaining_items = [item for item in remaining_items if item.get("review_id") not in sampled_ids]
    
    # Combine sampled items with remaining items (or use all items if no sampling)
    if sample_only:
        # Filter mode: only return sampled items (even if empty)
        final_items = sampled_items
    elif sampled_items:
        # Sort mode: Add sampled items first, then remaining
        final_items = sampled_items + remaining_items
    else:
        final_items = items
    
    # Pagination
    total = len(final_items)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_items = final_items[start_idx:end_idx]
    total_pages = (total + per_page - 1) // per_page
    
    return ReviewItemsResponse(
        items=paginated_items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@app.get("/api/review/items/{review_id}", tags=["Review"])
async def get_item(review_id: int = FastPath(..., description="Review item ID", ge=1)):
    """Get a specific review item by ID."""
    if REVIEW_DATA is None:
        if not load_review_data():
            raise HTTPException(status_code=404, detail="Review file not loaded")
    
    items = REVIEW_DATA.get("items", [])
    item = next((i for i in items if i.get("review_id") == review_id), None)
    
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item with review_id {review_id} not found")
    
    return item


@app.put("/api/review/items/{review_id}", tags=["Review"])
async def update_item(
    review_id: int = FastPath(..., description="Review item ID", ge=1),
    update: UpdateItemRequest = Body(...)
):
    """Update a review item."""
    if REVIEW_DATA is None:
        if not load_review_data():
            raise HTTPException(status_code=404, detail="Review file not loaded")
    
    items = REVIEW_DATA.get("items", [])
    item = next((i for i in items if i.get("review_id") == review_id), None)
    
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item with review_id {review_id} not found")
    
    # Update status
    if update.status is not None:
        item["status"] = update.status
    
    # Update human review
    if update.human_review is not None:
        if item.get("human_review") is None:
            item["human_review"] = {}
        
        # Update fields from request
        human_review_data = update.human_review.dict(exclude_unset=True)
        for key, value in human_review_data.items():
            if value is not None:
                item["human_review"][key] = value
        
        # Set reviewed_at timestamp if marking as reviewed
        if item["status"] == "reviewed" and not item["human_review"].get("reviewed_at"):
            item["human_review"]["reviewed_at"] = datetime.now().isoformat()
    
    # Save to file
    print(f"\n[UPDATE] Saving review item {review_id}...")
    print(f"  Status: {item.get('status')}")
    print(f"  Human review fields: {list(item.get('human_review', {}).keys())}")
    print(f"  File path: {REVIEW_FILE_PATH}")
    
    if save_review_file(REVIEW_DATA, REVIEW_FILE_PATH):
        print(f"✓ Successfully saved review item {review_id}\n")
        return {"success": True, "item": item}
    else:
        error_msg = f"Failed to save review file: {REVIEW_FILE_PATH}"
        print(f"✗ {error_msg}\n")
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/review/bulk-update", tags=["Review"])
async def bulk_update(request: BulkUpdateRequest):
    """Bulk update multiple review items."""
    if REVIEW_DATA is None:
        if not load_review_data():
            raise HTTPException(status_code=404, detail="Review file not loaded")
    
    items = REVIEW_DATA.get("items", [])
    item_map = {item["review_id"]: item for item in items}
    
    updated_count = 0
    errors = []
    
    for update in request.updates:
        review_id = update.get("review_id")
        if review_id not in item_map:
            errors.append(f"Item {review_id} not found")
            continue
        
        item = item_map[review_id]
        
        # Update status
        if "status" in update:
            item["status"] = update["status"]
        
        # Update human review
        if "human_review" in update:
            if item.get("human_review") is None:
                item["human_review"] = {}
            
            human_review = update["human_review"]
            item["human_review"].update(human_review)
            
            # Set reviewed_at timestamp if marking as reviewed
            if item["status"] == "reviewed" and not item["human_review"].get("reviewed_at"):
                item["human_review"]["reviewed_at"] = datetime.now().isoformat()
        
        updated_count += 1
    
    # Save to file
    if save_review_file(REVIEW_DATA, REVIEW_FILE_PATH):
        return {
            "success": True,
            "updated_count": updated_count,
            "errors": errors if errors else None
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to save review file")


@app.post("/api/review/save", tags=["Review"])
async def save_review():
    """Manually trigger save of review file."""
    if REVIEW_DATA is None:
        raise HTTPException(status_code=400, detail="No review data to save")
    
    if not REVIEW_FILE_PATH:
        raise HTTPException(status_code=400, detail="Review file path not set")
    
    if save_review_file(REVIEW_DATA, REVIEW_FILE_PATH):
        return {"success": True, "message": "Review file saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save review file")


def main():
    parser = argparse.ArgumentParser(description="FastAPI REST API for HITL review")
    parser.add_argument(
        "--review-file",
        type=str,
        required=True,
        help="Path to review JSON file (can be hitl_review_*.json or deepeval_*.json)",
    )
    parser.add_argument(
        "--filter-ambiguous-only",
        action="store_true",
        help="When loading evaluation results, only include ambiguous results (default: include all)",
    )
    parser.add_argument(
        "--ambiguity-threshold",
        type=float,
        default=0.3,
        help="Ambiguity threshold for filtering (default: 0.3)",
    )
    parser.add_argument(
        "--low-score-threshold",
        type=float,
        default=0.5,
        help="Low score threshold for filtering (default: 0.5)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5000,
        help="Port to bind to (default: 5000)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    
    args = parser.parse_args()
    
    global REVIEW_FILE_PATH
    REVIEW_FILE_PATH = os.path.abspath(args.review_file)
    
    # Store filter options for load_review_data
    load_review_data._filter_ambiguous = args.filter_ambiguous_only
    load_review_data._ambiguity_threshold = args.ambiguity_threshold
    load_review_data._low_score_threshold = args.low_score_threshold
    
    # Validate file exists
    if not os.path.exists(REVIEW_FILE_PATH):
        print(f"Error: Review file not found: {REVIEW_FILE_PATH}")
        sys.exit(1)
    
    # Check file type - accept both HITL review files and evaluation results
    filename = os.path.basename(REVIEW_FILE_PATH)
    try:
        with open(REVIEW_FILE_PATH, 'r') as f:
            test_data = json.load(f)
            
        # Check if it's a review file
        if test_data.get("review_type") == "deepeval_hitl":
            print(f"✓ Loading HITL review file: {filename}")
        # Check if it's an evaluation results file
        elif test_data.get("mode") == "deepeval" and "results" in test_data:
            print(f"✓ Loading evaluation results file: {filename}")
            if args.filter_ambiguous_only:
                print(f"  Will filter for ambiguous results only")
            else:
                print(f"  Will convert all results to review format")
        else:
            print(f"⚠️  Warning: Unknown file format: {filename}")
            print(f"   Expected: HITL review file (hitl_review_*.json) or evaluation results (deepeval_*.json)")
            print(f"   Attempting to load anyway...")
    except Exception as e:
        print(f"⚠️  Warning: Could not validate file format: {e}")
        print(f"   Attempting to load anyway...")
    
    # Load initial data
    if not load_review_data():
        print(f"Error: Failed to load review file: {REVIEW_FILE_PATH}")
        sys.exit(1)
    
    print(f"✓ HITL Review API Server (FastAPI)")
    print(f"  Review file: {REVIEW_FILE_PATH}")
    print(f"  API endpoint: http://{args.host}:{args.port}")
    print(f"\nQuick links:")
    print(f"  📖 Swagger UI: http://{args.host}:{args.port}/docs")
    print(f"  📚 ReDoc: http://{args.host}:{args.port}/redoc")
    print(f"  🏠 Root info: http://{args.host}:{args.port}/")
    print(f"\nAvailable endpoints:")
    print(f"  GET  /                    - Root endpoint (API info)")
    print(f"  GET  /docs                - Swagger UI documentation")
    print(f"  GET  /redoc               - ReDoc documentation")
    print(f"  GET  /api/health          - Health check")
    print(f"  GET  /api/review/summary  - Get summary statistics")
    print(f"  GET  /api/review/items    - Get all items (with filters)")
    print(f"  GET  /api/review/items/<id> - Get specific item")
    print(f"  PUT  /api/review/items/<id> - Update specific item")
    print(f"  POST /api/review/bulk-update - Bulk update items")
    print(f"  POST /api/review/save     - Manually save review file")
    print(f"\nStarting server on http://{args.host}:{args.port}")
    print(f"  Note: Use uvicorn for production deployment\n")
    
    # Set environment variable so startup event can pick it up
    os.environ["REVIEW_FILE"] = REVIEW_FILE_PATH
    
    # Also set the global directly (in case startup doesn't run)
    # Load initial data
    if not load_review_data():
        print(f"Error: Failed to load review file: {REVIEW_FILE_PATH}")
        sys.exit(1)
    
    # Use uvicorn to run the app
    try:
        import uvicorn
        # Pass the app object directly (not string) so globals are preserved
        uvicorn.run(
            app,  # Pass app directly
            host=args.host,
            port=args.port,
            reload=args.reload
        )
    except ImportError:
        print("Error: uvicorn is required to run FastAPI. Install it with: pip install uvicorn")
        print("Alternatively, run with:")
        print(f"  REVIEW_FILE={REVIEW_FILE_PATH} uvicorn api_fastapi:app --host 0.0.0.0 --port 5000")
        sys.exit(1)


if __name__ == "__main__":
    main()
