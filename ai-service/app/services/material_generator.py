import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from app.core.llm.openai_client import OpenAIClient
from app.core.llm.prompt_templates import PromptTemplates
from app.models import MaterialGenerationRequest, MaterialGenerationResponse

logger = logging.getLogger("mued.material_generator")


class MaterialGeneratorService:
    """教材生成サービス"""
    
    def __init__(self):
        self.llm_client = None
        self._initialize_llm_client()
    
    def _initialize_llm_client(self):
        """LLMクライアントの初期化"""
        try:
            # 環境変数チェック
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.llm_client = OpenAIClient()
                logger.info("OpenAI client initialized successfully")
            else:
                logger.warning("OpenAI API key not found. Running in mock mode.")
        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {str(e)}")
            self.llm_client = None
    
    async def generate_material(self, request: MaterialGenerationRequest) -> MaterialGenerationResponse:
        """教材を生成"""
        logger.info(f"Generating material for topic: {request.topic}")
        
        try:
            # LLMクライアントが利用可能な場合は実際に生成
            if self.llm_client:
                content = await self._generate_with_llm(request)
                material_id = f"{'-'.join(request.topic.lower().split()[:3])}-{uuid.uuid4().hex[:8]}"
                
                # TODO: 実際のファイル保存処理を実装
                # 現在は仮のURLを返す
                file_name = f"{material_id}.{request.format}"
                download_base_url = "https://storage.mued-lms.com/materials"
                preview_base_url = "https://storage.mued-lms.com/previews"
                
                return MaterialGenerationResponse(
                    material_id=material_id,
                    title=f"{request.topic} - {request.level.capitalize()}レベル教材",
                    description=f"{request.topic}に関する{request.level}レベルの学習教材です。",
                    format=request.format,
                    download_url=f"{download_base_url}/{file_name}",
                    preview_url=f"{preview_base_url}/{material_id}-preview.png" if request.format == "pdf" else None,
                    metadata={
                        "pages": 1,
                        "word_count": len(content.split()),
                        "topics": request.topic.split(','),
                        "language": request.language,
                        "generated_with": "openai",
                        "model": self.llm_client.model
                    },
                    success=True,
                    error=None
                )
            else:
                # モックモードの場合は元のモックレスポンスを返す
                return await self._generate_mock_response(request)
                
        except Exception as e:
            logger.error(f"Material generation failed: {str(e)}")
            return MaterialGenerationResponse(
                material_id="",
                title="",
                description="",
                format=request.format,
                download_url="",
                success=False,
                error={
                    "code": "AI_PROCESSING_GENERATION_FAILED",
                    "message": "教材の生成中にエラーが発生しました",
                    "details": str(e)
                }
            )
    
    async def _generate_with_llm(self, request: MaterialGenerationRequest) -> str:
        """LLMを使用して教材コンテンツを生成"""
        # プロンプトテンプレートを取得
        template = PromptTemplates.get_template("material_generation")
        
        # 教材タイプのマッピング
        material_type_map = {
            "pdf": "詳細な解説付き教材",
            "markdown": "Markdown形式の教材",
            "text": "シンプルなテキスト教材"
        }
        
        # プロンプトの作成
        prompts = template.format(
            theme=request.topic,
            level=request.level,
            material_type=material_type_map.get(request.format, "教材"),
            additional_requirements=request.goal or "特になし",
            reference_content=""  # 今後ナレッジベースから取得
        )
        
        # LLMに生成を依頼
        response = await self.llm_client.generate(
            prompt=prompts["user"],
            system_prompt=prompts["system"],
            temperature=0.8,
            max_tokens=2000
        )
        
        return response.content
    
    async def _generate_mock_response(self, request: MaterialGenerationRequest) -> MaterialGenerationResponse:
        """モックレスポンスを生成"""
        material_id = f"{'-'.join(request.topic.lower().split()[:3])}-{uuid.uuid4().hex[:8]}"
        file_name = f"{material_id}.{request.format}"
        download_base_url = "https://storage.mued-lms.com/materials"
        preview_base_url = "https://storage.mued-lms.com/previews"
        
        return MaterialGenerationResponse(
            material_id=material_id,
            title=f"{request.topic} - {request.level.capitalize()}レベル教材",
            description=f"{request.topic}に関する{request.level}レベルの学習教材です。" + 
                       (f"目標: {request.goal}" if request.goal else ""),
            format=request.format,
            download_url=f"{download_base_url}/{file_name}",
            preview_url=f"{preview_base_url}/{material_id}-preview.png" if request.format == "pdf" else None,
            metadata={
                "pages": 12,
                "word_count": 3500,
                "topics": request.topic.split(','),
                "language": request.language,
                "generated_with": "mock"
            },
            success=True,
            error=None
        )