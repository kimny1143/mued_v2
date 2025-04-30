"""
MUED LMS AI Service - Data Models
"""
from typing import List, Optional
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