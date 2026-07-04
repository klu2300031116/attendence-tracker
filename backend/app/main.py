"""
PS-96 backend -- FastAPI service.

Endpoints:
  GET  /api/health              -> liveness check
  GET  /api/analysis            -> run pipeline on a fresh synthetic dataset (default seed)
  POST /api/analysis/upload     -> run pipeline on an uploaded CSV (date, class_id, enrolled, present)
  GET  /api/analysis/csv        -> download the current synthetic dataset as CSV

Run locally:
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000

Docs served automatically at /docs (Swagger UI).
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import io

from . import analysis

app = FastAPI(
    title="PS-96 Attendance Trend API",
    description="Weekly attendance aggregation and steady-decline detection for class attendance data.",
    version="1.0.0",
)

# Allow the frontend (any origin, incl. deployed Vercel/Netlify URLs) to call this API.
# Tighten `allow_origins` to your actual frontend URL once deployed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/analysis")
def get_analysis(seed: int = Query(42, description="Random seed for synthetic data generation")):
    """Run the full pipeline on a freshly generated synthetic dataset."""
    try:
        result = analysis.run_full_pipeline(csv_bytes=None, seed=seed)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analysis/upload")
async def post_analysis_upload(file: UploadFile = File(...)):
    """Run the full pipeline on an uploaded CSV. Expected columns: date, class_id, enrolled, present."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")
    content = await file.read()
    try:
        result = analysis.run_full_pipeline(csv_bytes=content)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process file: {e}")


@app.get("/api/analysis/csv", response_class=PlainTextResponse)
def get_synthetic_csv(seed: int = Query(42)):
    """Download the raw synthetic dataset as CSV text (for reference / re-upload)."""
    df = analysis.generate_synthetic_data(seed=seed)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()
