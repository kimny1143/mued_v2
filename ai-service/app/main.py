"""
MUED LMS AI Service - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router as api_router

app = FastAPI(
    title="MUED LMS AI Service",
    description="AI Service for Music Education LMS",
    version="0.1.0",
)

# CORSを設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切なオリジンに制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "MUED LMS AI Service",
        "status": "running",
        "version": app.version,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 