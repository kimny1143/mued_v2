import os
from typing import Dict, List, Optional
from openai import AsyncOpenAI
from .base_client import BaseLLMClient, LLMResponse


class OpenAIClient(BaseLLMClient):
    """OpenAI APIクライアント"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4"):
        if api_key is None:
            api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key is required")
        
        super().__init__(api_key, model)
        self.client = AsyncOpenAI(api_key=api_key)
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """シンプルなプロンプトからテキストを生成"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        return await self.generate_with_messages(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    
    async def generate_with_messages(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """メッセージ形式でのテキスト生成"""
        if not self.validate_messages(messages):
            raise ValueError("Invalid message format")
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            content = response.choices[0].message.content
            usage = None
            if response.usage:
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            
            return LLMResponse(
                content=content,
                model=response.model,
                usage=usage,
                metadata={
                    "finish_reason": response.choices[0].finish_reason,
                    "id": response.id
                }
            )
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def generate_material(self, prompt: str, theme: str = None) -> str:
        """教材生成用の特化メソッド"""
        system_prompt = """あなたは音楽教育の専門家です。
学習者のレベルに合わせた、わかりやすく実践的な音楽教材を作成してください。
教材は以下の形式で作成してください：

1. 概要
2. 学習目標
3. 本文（具体例を含む）
4. 練習問題
5. まとめ

Markdown形式で出力してください。"""
        
        if theme:
            prompt = f"テーマ「{theme}」について、{prompt}"
        
        response = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.8,
            max_tokens=2000
        )
        
        return response.content