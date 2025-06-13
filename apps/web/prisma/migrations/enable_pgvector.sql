-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ベクトル検索用のインデックスを作成
-- Note: このインデックスはテーブル作成後に実行する必要があります
-- CREATE INDEX idx_ai_knowledge_sources_embeddings ON ai_knowledge_sources 
--     USING ivfflat (embeddings vector_cosine_ops)
--     WITH (lists = 100);