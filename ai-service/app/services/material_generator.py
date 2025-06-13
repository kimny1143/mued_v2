import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
import logging
import json

from app.core.llm.openai_client import OpenAIClient
from app.core.llm.prompt_templates import PromptTemplates
from app.core.database.supabase_client import get_supabase
from app.models import MaterialGenerationRequest, MaterialGenerationResponse

logger = logging.getLogger("mued.material_generator")


class MaterialGeneratorService:
    """教材生成サービス"""
    
    def __init__(self):
        self.llm_client = None
        self.supabase = None
        self._initialize_services()
    
    def _initialize_services(self):
        """サービスの初期化"""
        # LLMクライアントの初期化
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.llm_client = OpenAIClient()
                logger.info("OpenAI client initialized successfully")
            else:
                logger.warning("OpenAI API key not found. Running in mock mode.")
        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {str(e)}")
            self.llm_client = None
        
        # Supabaseクライアントの初期化
        try:
            self.supabase = get_supabase()
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {str(e)}")
            self.supabase = None
    
    async def generate_material(self, request: MaterialGenerationRequest) -> MaterialGenerationResponse:
        """教材を生成"""
        logger.info(f"Generating material for topic: {request.topic}")
        
        try:
            # LLMクライアントが利用可能な場合は実際に生成
            if self.llm_client and self.supabase:
                content = await self._generate_with_llm(request)
                material_id = str(uuid.uuid4())
                
                # Supabaseに保存
                title = f"{request.topic} - {request.level.capitalize()}レベル教材"
                description = f"{request.topic}に関する{request.level}レベルの学習教材です。"
                
                material_data = {
                    "id": material_id,
                    "title": title,
                    "content": content,
                    "theme": request.topic,
                    "format": request.format,
                    "generation_params": {
                        "level": request.level,
                        "language": request.language,
                        "goal": request.goal,
                        "model": self.llm_client.model,
                        "generated_at": datetime.now().isoformat()
                    },
                    "status": "draft"
                }
                
                try:
                    # Supabaseに挿入
                    result = self.supabase.table("ai_generated_materials").insert(material_data).execute()
                    logger.info(f"Material saved to Supabase: {material_id}")
                except Exception as e:
                    logger.error(f"Failed to save material to Supabase: {str(e)}")
                
                # 現在は仮のURLを返す（将来的にはCloudinaryなどに保存）
                file_name = f"{material_id}.{request.format}"
                download_base_url = "https://storage.mued-lms.com/materials"
                preview_base_url = "https://storage.mued-lms.com/previews"
                
                return MaterialGenerationResponse(
                    material_id=material_id,
                    title=title,
                    description=description,
                    format=request.format,
                    download_url=f"{download_base_url}/{file_name}",
                    preview_url=f"{preview_base_url}/{material_id}-preview.png" if request.format == "pdf" else None,
                    metadata={
                        "pages": 1,
                        "word_count": len(content.split()),
                        "topics": request.topic.split(','),
                        "language": request.language,
                        "generated_with": "openai",
                        "model": self.llm_client.model,
                        "saved_to_db": True
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