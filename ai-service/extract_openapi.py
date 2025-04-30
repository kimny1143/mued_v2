#!/usr/bin/env python
"""
OpenAPIスキーマ抽出スクリプト

FastAPIアプリケーションからOpenAPIスキーマを抽出し、JSONファイルとして保存します。
"""
import json
import os
from pathlib import Path

from app.main import app

def main():
    """メイン関数"""
    # OpenAPIスキーマを取得
    openapi_schema = app.openapi()
    
    # 出力ディレクトリ
    output_dir = Path(__file__).parent / "openapi"
    os.makedirs(output_dir, exist_ok=True)
    
    # ファイルに保存
    output_file = output_dir / "openapi.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, ensure_ascii=False, indent=2)
    
    print(f"OpenAPIスキーマを保存しました: {output_file}")

if __name__ == "__main__":
    main() 