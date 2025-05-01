"""
MUED LMS AI Service - Data Models
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class CourseGenerationRequest(BaseModel):
    """コース生成リクエストモデル"""
    topic: str = Field(..., description="コースのトピック")
    level: str = Field(..., description="難易度レベル (beginner, intermediate, advanced)")
    goal: Optional[str] = Field(None, description="学習目標")
    keywords: Optional[List[str]] = Field(None, description="含めるべきキーワード")
    
    class Config:
        schema_extra = {
            "example": {
                "topic": "ジャズピアノ入門",
                "level": "beginner",
                "goal": "基本的なジャズピアノコードと即興演奏の基礎を学ぶ",
                "keywords": ["ジャズハーモニー", "コードプログレッション", "即興演奏"]
            }
        }

class LessonContent(BaseModel):
    """レッスンコンテンツモデル"""
    title: str
    description: str
    content_type: str = Field(..., description="コンテンツタイプ (video, text, exercise)")
    duration_minutes: int
    content_url: Optional[str] = None
    content_text: Optional[str] = None

class CourseModule(BaseModel):
    """コースモジュールモデル"""
    title: str
    description: str
    order: int
    lessons: List[LessonContent]

class CourseGenerationResponse(BaseModel):
    """コース生成レスポンスモデル"""
    course_id: str
    title: str
    description: str
    level: str
    estimated_duration_hours: float
    modules: List[CourseModule]
    
    class Config:
        schema_extra = {
            "example": {
                "course_id": "jazz-piano-basics-001",
                "title": "ジャズピアノ入門: 基礎から即興演奏まで",
                "description": "ジャズピアノの基本的な技術とハーモニーを学び、簡単な即興演奏ができるようになるためのコースです。",
                "level": "beginner",
                "estimated_duration_hours": 12.5,
                "modules": [
                    {
                        "title": "ジャズハーモニーの基礎",
                        "description": "ジャズで使われる基本的なコードとスケールを学びます。",
                        "order": 1,
                        "lessons": [
                            {
                                "title": "ジャズピアノ入門",
                                "description": "ジャズピアノの基本とコースの概要",
                                "content_type": "video",
                                "duration_minutes": 15,
                                "content_url": "https://example.com/videos/jazz-intro"
                            }
                        ]
                    }
                ]
            }
        }

# チャットメッセージ関連のモデル
class ChatMessageCreate(BaseModel):
    """チャットメッセージ作成リクエスト"""
    room_id: str
    user_id: str
    username: str
    message: str

class ChatMessage(BaseModel):
    """チャットメッセージレスポンス"""
    id: str
    room_id: str
    user_id: str
    username: str
    message: str
    created_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "id": "msg-123456",
                "room_id": "room-abc123",
                "user_id": "user-456",
                "username": "田中先生",
                "message": "こんにちは、レッスンの準備はできていますか？",
                "created_at": "2024-05-01T12:30:45.123456"
            }
        }

class ChatMessageList(BaseModel):
    """チャットメッセージリストレスポンス"""
    messages: List[ChatMessage]
    total: int

# 練習ログ関連のモデル
class ExerciseLogCreate(BaseModel):
    """練習記録作成リクエスト"""
    user_id: str
    instrument: str
    duration_minutes: int
    difficulty: str  # 'easy', 'medium', 'hard'
    notes: Optional[str] = None
    mood: Optional[str] = None  # 'good', 'normal', 'bad'
    date: Optional[datetime] = None

class ExerciseLog(BaseModel):
    """練習記録レスポンス"""
    id: str
    user_id: str
    instrument: str
    duration_minutes: int
    difficulty: str
    notes: Optional[str] = None
    mood: Optional[str] = None
    date: datetime
    created_at: datetime

# MusicXML関連のモデル
class MusicXMLConvertRequest(BaseModel):
    """MusicXML変換リクエスト"""
    xml_content: str = Field(..., description="MusicXMLコンテンツ（Base64エンコード）")
    format: str = Field(..., description="変換フォーマット (json, preview)")
    options: Optional[Dict[str, Any]] = Field(None, description="変換オプション")
    
    class Config:
        schema_extra = {
            "example": {
                "xml_content": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBNdXNpY1hNTCBTYW1wbGUgLS0+CjxzY29yZS1wYXJ0aXdpc2U+PC9zY29yZS1wYXJ0aXdpc2U+",
                "format": "json",
                "options": {
                    "includeMetadata": True,
                    "includeNotations": True
                }
            }
        }

class MusicXMLConvertResponse(BaseModel):
    """MusicXML変換レスポンス"""
    id: str
    format: str
    result: Dict[str, Any]
    preview_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "id": "convert-123456",
                "format": "json",
                "result": {
                    "metadata": {
                        "title": "楽譜タイトル",
                        "composer": "作曲者名"
                    },
                    "parts": [
                        {
                            "id": "P1",
                            "name": "Piano",
                            "measures": []
                        }
                    ]
                },
                "preview_url": "https://example.com/preview/123456.png",
                "created_at": "2024-05-01T12:30:45.123456"
            }
        }

# Webhookモデル
class WebhookEvent(BaseModel):
    """汎用Webhookイベントモデル"""
    id: str = Field(..., description="イベントID")
    type: str = Field(..., description="イベントタイプ")
    created: datetime = Field(..., description="作成日時")
    data: Dict[str, Any] = Field(..., description="イベントデータ")

class StripeWebhookEvent(BaseModel):
    """Stripe Webhook用のモデル"""
    id: str = Field(..., description="Stripeイベント識別子")
    type: str = Field(..., description="イベントタイプ (payment_intent.succeeded 等)")
    created: int = Field(..., description="UNIXタイムスタンプ")
    data: Dict[str, Any] = Field(..., description="イベントデータ")
    livemode: bool = Field(..., description="本番環境のイベントかどうか")
    api_version: Optional[str] = None 