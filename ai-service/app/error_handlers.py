"""
MUED LMS AI Service - Error Handlers
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

# ロガーの設定
logger = logging.getLogger("mued.errors")

def register_error_handlers(app: FastAPI) -> None:
    """アプリケーションにエラーハンドラを登録する"""
    
    # バリデーションエラー (422)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation error: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": exc.errors(),
                "body": exc.body,
                "message": "入力データが無効です。エラー詳細を確認してください。"
            },
        )
    
    # HTTPエラー (4xx-5xx)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(f"HTTP error {exc.status_code}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "message": get_error_message(exc.status_code)
            },
        )
    
    # 内部サーバーエラー (500)
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": str(exc),
                "message": "内部サーバーエラーが発生しました。しばらく経ってから再試行してください。"
            },
        )

def get_error_message(status_code: int) -> str:
    """HTTPステータスコードに応じたエラーメッセージを返す"""
    error_messages = {
        400: "無効なリクエストです。リクエストのパラメータを確認してください。",
        401: "認証が必要です。有効な認証情報を提供してください。",
        403: "アクセスが拒否されました。十分な権限がありません。",
        404: "リソースが見つかりません。URLを確認してください。",
        405: "許可されていないメソッドです。",
        408: "リクエストがタイムアウトしました。しばらく経ってから再試行してください。",
        413: "リクエストサイズが大きすぎます。",
        429: "リクエスト回数が制限を超えています。しばらく経ってから再試行してください。",
        500: "内部サーバーエラーが発生しました。しばらく経ってから再試行してください。",
        502: "ゲートウェイエラーが発生しました。しばらく経ってから再試行してください。",
        503: "サービスは一時的に利用できません。しばらく経ってから再試行してください。",
        504: "ゲートウェイタイムアウトが発生しました。しばらく経ってから再試行してください。"
    }
    
    return error_messages.get(status_code, "エラーが発生しました。しばらく経ってから再試行してください。") 