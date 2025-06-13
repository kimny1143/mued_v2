-- AI Service用のテーブル作成SQL

-- 1. ナレッジベース管理テーブル
CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('rss', 'pdf', 'video', 'web')),
    source_url TEXT,
    title VARCHAR(255),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embeddings vector(1536), -- OpenAI embeddings dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 生成された教材テーブル
CREATE TABLE IF NOT EXISTS ai_generated_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Markdown形式
    theme VARCHAR(255),
    format VARCHAR(50) DEFAULT 'markdown',
    knowledge_source_ids UUID[] DEFAULT '{}',
    generation_params JSONB DEFAULT '{}', -- プロンプト、モデル設定など
    creator_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. カリキュラムテーブル
CREATE TABLE IF NOT EXISTS ai_curriculums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_ids UUID[] DEFAULT '{}',
    structure JSONB DEFAULT '{}', -- 階層構造、順序など
    target_level VARCHAR(50) CHECK (target_level IN ('beginner', 'intermediate', 'advanced')),
    duration_weeks INTEGER,
    creator_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 更新日時の自動更新トリガー（既存の関数を使用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_ai_knowledge_sources_updated_at 
    BEFORE UPDATE ON ai_knowledge_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_generated_materials_updated_at 
    BEFORE UPDATE ON ai_generated_materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_curriculums_updated_at 
    BEFORE UPDATE ON ai_curriculums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_type ON ai_knowledge_sources(type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_created_at ON ai_knowledge_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generated_materials_theme ON ai_generated_materials(theme);
CREATE INDEX IF NOT EXISTS idx_ai_generated_materials_status ON ai_generated_materials(status);
CREATE INDEX IF NOT EXISTS idx_ai_generated_materials_creator_id ON ai_generated_materials(creator_id);
CREATE INDEX IF NOT EXISTS idx_ai_curriculums_target_level ON ai_curriculums(target_level);
CREATE INDEX IF NOT EXISTS idx_ai_curriculums_status ON ai_curriculums(status);

-- 6. ベクトル検索用のインデックス（pgvector）
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_embeddings 
    ON ai_knowledge_sources 
    USING ivfflat (embeddings vector_cosine_ops)
    WITH (lists = 100);

-- 7. RLS (Row Level Security) ポリシーの設定
ALTER TABLE ai_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_curriculums ENABLE ROW LEVEL SECURITY;

-- ナレッジソースは誰でも読める（AIサービス用）
CREATE POLICY "Knowledge sources are readable by all" 
    ON ai_knowledge_sources
    FOR SELECT USING (true);

-- AI生成教材は誰でも読めるが、作成者のみ更新可能
CREATE POLICY "Generated materials are readable by all" 
    ON ai_generated_materials
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own materials" 
    ON ai_generated_materials
    FOR UPDATE USING (auth.uid() = creator_id);

-- カリキュラムも同様
CREATE POLICY "Curriculums are readable by all" 
    ON ai_curriculums
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own curriculums" 
    ON ai_curriculums
    FOR UPDATE USING (auth.uid() = creator_id);

-- 8. 作成確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_knowledge_sources', 'ai_generated_materials', 'ai_curriculums');