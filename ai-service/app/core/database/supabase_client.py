import os
from typing import Optional
from supabase import create_client, Client
import logging

logger = logging.getLogger("mued.supabase")


class SupabaseClient:
    """Supabaseクライアントのシングルトン実装"""
    
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Supabaseクライアントのインスタンスを取得"""
        if cls._instance is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not url or not key:
                raise ValueError(
                    "Supabase credentials not found. "
                    "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
                )
            
            try:
                cls._instance = create_client(url, key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {str(e)}")
                raise
        
        return cls._instance
    
    @classmethod
    def reset(cls):
        """クライアントインスタンスをリセット（テスト用）"""
        cls._instance = None


# グローバルインスタンス
def get_supabase() -> Client:
    """Supabaseクライアントを取得する便利関数"""
    return SupabaseClient.get_client()