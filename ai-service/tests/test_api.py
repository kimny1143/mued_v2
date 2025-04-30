"""
MUED LMS AI Service - API Tests
"""
from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)

def test_root_endpoint():
    """ルートエンドポイントのテスト"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "status" in data
    assert data["status"] == "running"

def test_course_generation():
    """コース生成エンドポイントのテスト"""
    request_data = {
        "topic": "クラシックギター",
        "level": "beginner",
        "goal": "基本的な演奏技術とクラシック曲の演奏方法を学ぶ",
        "keywords": ["フィンガリング", "読譜", "姿勢"]
    }
    
    response = client.post("/api/v1/courses/generate", json=request_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "course_id" in data
    assert "title" in data
    assert "クラシックギター" in data["title"]
    assert "level" in data
    assert data["level"] == "beginner"
    assert "modules" in data
    assert len(data["modules"]) > 0
    
    # モジュールの検証
    first_module = data["modules"][0]
    assert "title" in first_module
    assert "lessons" in first_module
    assert len(first_module["lessons"]) > 0
    
    # レッスンの検証
    first_lesson = first_module["lessons"][0]
    assert "title" in first_lesson
    assert "description" in first_lesson
    assert "content_type" in first_lesson 