"""
MUED LMS AI Service - API Tests
"""
from fastapi.testclient import TestClient
import pytest
from unittest.mock import patch, MagicMock
import sys
import os
import uuid

# 注意: conftest.pyとtests/__init__.pyでパスを設定するため、ここでは不要
# sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app.main import app
from app.models import ChatMessageCreate

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

def test_exercise_log_create_success():
    """練習記録作成エンドポイントの成功ケースのテスト"""
    request_data = {
        "user_id": "user123",
        "instrument": "piano",
        "duration_minutes": 45,
        "difficulty": "medium",
        "notes": "今日は練習が捗りました",
        "mood": "good"
    }
    
    response = client.post("/api/v1/exercise/logs", json=request_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "id" in data
    assert data["user_id"] == request_data["user_id"]
    assert data["instrument"] == request_data["instrument"]
    assert data["duration_minutes"] == request_data["duration_minutes"]
    assert data["difficulty"] == request_data["difficulty"]
    assert data["notes"] == request_data["notes"]
    assert data["mood"] == request_data["mood"]
    assert "date" in data
    assert "created_at" in data

def test_exercise_log_validation_error():
    """練習記録作成エンドポイントのバリデーションエラーのテスト"""
    # 必須フィールドが欠けているリクエスト
    request_data = {
        "instrument": "piano",
        "duration_minutes": 45,
        "difficulty": "medium"
    }
    
    response = client.post("/api/v1/exercise/logs", json=request_data)
    assert response.status_code == 422  # バリデーションエラー
    
    data = response.json()
    assert "detail" in data  # バリデーションエラーの詳細

def test_chat_messages_get_success():
    """チャットメッセージ取得エンドポイントの成功ケースのテスト"""
    response = client.get("/api/v1/chat/messages?room_id=test-room")
    assert response.status_code == 200
    
    data = response.json()
    assert "messages" in data
    assert "total" in data
    assert isinstance(data["messages"], list)
    assert data["total"] == len(data["messages"])

def test_chat_messages_create_success():
    """チャットメッセージ作成エンドポイントの成功ケースのテスト"""
    request_data = {
        "room_id": "test-room",
        "user_id": "user123",
        "username": "テストユーザー",
        "message": "こんにちは！テストメッセージです。"
    }
    
    response = client.post("/api/v1/chat/messages", json=request_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "id" in data
    assert data["room_id"] == request_data["room_id"]
    assert data["user_id"] == request_data["user_id"]
    assert data["username"] == request_data["username"]
    assert data["message"] == request_data["message"]
    assert "created_at" in data

def test_chat_messages_validation_error():
    """チャットメッセージ作成エンドポイントのバリデーションエラーのテスト"""
    # 必須フィールドが欠けているリクエスト
    request_data = {
        "user_id": "user123",
        "message": "こんにちは！"
    }
    
    response = client.post("/api/v1/chat/messages", json=request_data)
    assert response.status_code == 422  # バリデーションエラー
    
    data = response.json()
    assert "detail" in data  # バリデーションエラーの詳細

def test_musicxml_convert_success():
    """MusicXML変換エンドポイントの成功ケースのテスト"""
    request_data = {
        "xml_content": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBNdXNpY1hNTCBTYW1wbGUgLS0+CjxzY29yZS1wYXJ0aXdpc2U+PC9zY29yZS1wYXJ0aXdpc2U+",
        "format": "json",
        "options": {
            "includeMetadata": True,
            "includeNotations": True
        }
    }
    
    response = client.post("/api/v1/musicxml/convert", json=request_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "id" in data
    assert data["format"] == request_data["format"]
    assert "result" in data
    assert "created_at" in data

def test_musicxml_invalid_format_error():
    """MusicXML変換エンドポイントの無効なフォーマットエラーのテスト"""
    request_data = {
        "xml_content": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBNdXNpY1hNTCBTYW1wbGUgLS0+CjxzY29yZS1wYXJ0aXdpc2U+PC9zY29yZS1wYXJ0aXdpc2U+",
        "format": "invalid_format",  # 無効なフォーマット
        "options": {}
    }
    
    response = client.post("/api/v1/musicxml/convert", json=request_data)
    assert response.status_code == 400  # 不正なリクエスト
    
    data = response.json()
    assert "detail" in data
    assert "Unsupported format" in data["detail"]

def test_musicxml_server_error():
    """MusicXML変換エンドポイントのサーバーエラーのテスト"""
    request_data = {
        "xml_content": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCEtLSBNdXNpY1hNTCBTYW1wbGUgLS0+CjxzY29yZS1wYXJ0aXdpc2U+PC9zY29yZS1wYXJ0aXdpc2U+",
        "format": "json",
        "options": {}
    }
    
    # 実装を見ると、base64.b64decodeが内部で使用される可能性がある
    # 例外を発生させるためにそれをモックする
    error_message = "シミュレートされたサーバーエラー"
    with patch("app.api.uuid.uuid4", side_effect=Exception(error_message)):
        response = client.post("/api/v1/musicxml/convert", json=request_data)
        assert response.status_code == 500  # サーバーエラー
        
        data = response.json()
        assert "detail" in data
        assert error_message in data["detail"] 