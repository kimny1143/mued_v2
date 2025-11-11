'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import {
  MUSIC_MATERIAL_TYPES,
  INSTRUMENTS,
  GENRES,
  DIFFICULTY_LEVELS,
  PRACTICE_DURATIONS,
  type Instrument,
} from '@/types/music-material';
import { InlineError } from '@/components/ui/error-boundary';

export default function NewMusicMaterialPage() {
  const router = useRouter();
  const [naturalInput, setNaturalInput] = useState('');
  const [generationEngine, setGenerationEngine] = useState<'openai' | 'midi-llm'>('openai');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState({
    materialType: '',
    instrument: '',
    difficulty: '',
    duration: 0,
    genre: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!naturalInput.trim() && !advancedSettings.instrument) {
      setError('どんな教材が欲しいか教えてください');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      // Parse natural language input using AI
      const parseResponse = await fetch('/api/ai/parse-material-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naturalInput,
          advancedSettings: showAdvanced ? advancedSettings : undefined,
        }),
      });

      const parsedData = await parseResponse.json();

      if (!parsedData.success) {
        console.error('Parse request error:', parsedData);
        const errorMessage = parsedData.error || 'リクエストの解析に失敗しました';
        const detailsInfo = parsedData.details
          ? `\n詳細: ${JSON.stringify(parsedData.details, null, 2)}`
          : '';
        setError(errorMessage + detailsInfo);
        setGenerating(false);
        return;
      }

      // Map instrument to schema enum (only send if it matches)
      const instrumentMap: Record<string, string> = {
        'Piano': 'piano',
        'Guitar': 'guitar',
        'Violin': 'violin',
        'Flute': 'flute',
      };
      const schemaInstrument = instrumentMap[parsedData.instrument];

      // Map difficulty to schema enum (handle expert/professional -> advanced)
      const difficultyMap: Record<string, string> = {
        'beginner': 'beginner',
        'intermediate': 'intermediate',
        'advanced': 'advanced',
        'expert': 'advanced',
        'professional': 'advanced',
      };
      const schemaDifficulty = difficultyMap[parsedData.difficulty] || 'intermediate';

      // Include metadata in additional context
      const contextWithMetadata = `${naturalInput}

[教材メタデータ]
楽器: ${parsedData.instrument}
ジャンル: ${parsedData.genre || '指定なし'}
練習時間: ${parsedData.duration}分
教材タイプ: ${parsedData.materialType}`;

      // Generate material with parsed parameters
      const requestBody: {
        subject: string;
        topic: string;
        difficulty: string;
        format: string;
        additionalContext: string;
        instrument?: string;
        isPublic?: boolean;
      } = {
        subject: parsedData.instrument,
        topic: parsedData.topic,
        difficulty: schemaDifficulty, // Use mapped difficulty
        format: 'music', // Fixed to 'music' for all music materials
        additionalContext: contextWithMetadata,
        isPublic: isPublic,
      };

      if (schemaInstrument) {
        requestBody.instrument = schemaInstrument;
      }

      // Select API endpoint based on generation engine
      const apiEndpoint = generationEngine === 'midi-llm'
        ? '/api/ai/midi-llm/generate'
        : '/api/ai/materials';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // API uses standardized response format: { success: true, data: {...} }
        const materialId = data.data?.materialId || data.materialId;
        router.push(`/dashboard/materials/${materialId}`);
      } else {
        console.error('Material generation error:', data);
        setError(data.error || 'Failed to generate material');
        if (data.upgradeRequired) {
          setTimeout(() => {
            router.push('/dashboard/subscription');
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError('ネットワークエラーが発生しました。もう一度お試しください。');
    } finally {
      setGenerating(false);
    }
  };

  // Group instruments by category
  const instrumentsByCategory = INSTRUMENTS.reduce((acc, instrument) => {
    if (!acc[instrument.category]) {
      acc[instrument.category] = [];
    }
    acc[instrument.category].push(instrument);
    return acc;
  }, {} as Record<string, Instrument[]>);

  const categoryLabels: Record<string, string> = {
    keyboard: '🎹 Keyboard',
    strings: '🎸 Strings',
    brass: '🎺 Brass',
    woodwind: '🎶 Woodwind',
    percussion: '🥁 Percussion',
    vocal: '🎤 Vocal',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-[var(--color-brand-green)] hover:text-[var(--color-brand-green-hover)] mb-4 flex items-center font-medium"
        >
          ← 教材ライブラリに戻る
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          🎵 AI教材生成
        </h1>
        <p className="text-gray-600 mt-2">
          欲しい教材を自由に説明してください。AIが最適な教材を生成します。
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <InlineError error={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Natural Language Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            🎵 どんな教材が欲しいですか？
          </label>
          <textarea
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder={`例：\n・ジャズピアノの初心者向けに、ブルーススケールを使った30分の練習メニューを作って\n・クラシックギターの中級者向けに、アルペジオの練習曲を生成して\n・ドラムの上級者向けに、ジャズのリズムパターン集を作って\n・即興演奏の基礎を学びたい。どんな練習が必要？`}
            rows={8}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900 resize-none"
            disabled={generating}
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 楽器、レベル、ジャンル、時間など、具体的に書くほど精度の高い教材が生成されます
          </p>
        </div>

        {/* Generation Engine Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            🎵 生成エンジン
          </label>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                generationEngine === 'openai'
                  ? 'border-[var(--color-brand-green)] bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="engine"
                value="openai"
                checked={generationEngine === 'openai'}
                onChange={(e) => setGenerationEngine(e.target.value as 'openai' | 'midi-llm')}
                className="mt-1"
                disabled={generating}
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">標準（OpenAI）- 推奨</div>
                <div className="text-xs text-gray-600 mt-1">
                  汎用的な音楽教材生成。幅広いジャンルと楽器に対応
                </div>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                generationEngine === 'midi-llm'
                  ? 'border-[var(--color-brand-green)] bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="engine"
                value="midi-llm"
                checked={generationEngine === 'midi-llm'}
                onChange={(e) => setGenerationEngine(e.target.value as 'openai' | 'midi-llm')}
                className="mt-1"
                disabled={generating}
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  音楽専用AI（MIDI-LLM）
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                    Beta
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  音楽専用LLM。より高度な音楽理論とリアルな演奏表現
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors mb-4"
          disabled={generating}
        >
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            ⚙️ 詳細設定（オプション）
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Advanced Settings (Collapsible) */}
        {showAdvanced && (
          <div className="border-2 border-gray-200 rounded-lg p-6 mb-6 space-y-6 bg-gray-50">
            {/* Material Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                教材タイプ（自動判定）
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancedSettings({ ...advancedSettings, materialType: '' })}
                  className={`px-3 py-2 rounded-lg border-2 text-center transition-all text-xs ${
                    advancedSettings.materialType === ''
                      ? 'border-[var(--color-brand-green)] bg-green-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  自動
                </button>
                {MUSIC_MATERIAL_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setAdvancedSettings({ ...advancedSettings, materialType: type.id })}
                    className={`px-3 py-2 rounded-lg border-2 text-center transition-all ${
                      advancedSettings.materialType === type.id
                        ? 'border-[var(--color-brand-green)] bg-green-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    title={type.description}
                  >
                    <div className="text-lg mb-1">{type.icon}</div>
                    <div className="text-xs font-medium text-gray-700">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instrument */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                楽器（自動判定）
              </label>
              <select
                value={advancedSettings.instrument}
                onChange={(e) => setAdvancedSettings({ ...advancedSettings, instrument: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900"
              >
                <option value="">自動判定</option>
                {Object.entries(instrumentsByCategory).map(([category, instruments]) => (
                  <optgroup key={category} label={categoryLabels[category]}>
                    {instruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.label}>
                        {instrument.icon} {instrument.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  難易度（自動判定）
                </label>
                <select
                  value={advancedSettings.difficulty}
                  onChange={(e) => setAdvancedSettings({ ...advancedSettings, difficulty: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900"
                >
                  <option value="">自動判定</option>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  練習時間（自動判定）
                </label>
                <select
                  value={advancedSettings.duration}
                  onChange={(e) => setAdvancedSettings({ ...advancedSettings, duration: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-brand-green)] focus:border-[var(--color-brand-green)] text-gray-900"
                >
                  <option value="0">自動判定</option>
                  {PRACTICE_DURATIONS.map((duration) => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                ジャンル（オプション）
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancedSettings({ ...advancedSettings, genre: '' })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    advancedSettings.genre === ''
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  指定なし
                </button>
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => setAdvancedSettings({ ...advancedSettings, genre: genre.label })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      advancedSettings.genre === genre.label
                        ? 'bg-[var(--color-brand-green)] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {genre.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Public/Private Toggle */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 text-[var(--color-brand-green)] rounded focus:ring-2 focus:ring-[var(--color-brand-green)]"
            disabled={generating}
          />
          <label htmlFor="isPublic" className="text-sm font-medium text-gray-700 cursor-pointer">
            🌐 この教材を公開する（他のユーザーもライブラリで閲覧可能）
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            disabled={generating}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={generating || (!naturalInput.trim() && !advancedSettings.instrument)}
            className="px-8 py-3 bg-[var(--color-brand-green)] hover:bg-[var(--color-brand-green-hover)] text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                教材を生成する
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generation Status */}
      {generating && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-[var(--color-brand-green)] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl animate-bounce">🎼</span>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-lg mb-2">
                AIが教材を生成しています...
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                あなたのリクエストを分析して、最適な教材を作成中です。
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-brand-green)] rounded-full animate-pulse w-3/4"></div>
                </div>
                <span className="text-xs font-medium text-gray-600">処理中...</span>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                ⏱️ 通常10〜30秒程度かかります
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      {!generating && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            💡 効果的な教材生成のコツ
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-brand-green)] mt-0.5">✓</span>
              <span><strong>具体的に書く：</strong>「ピアノの練習」より「ジャズピアノのコードボイシング練習」</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-brand-green)] mt-0.5">✓</span>
              <span><strong>レベルを明記：</strong>「初心者」「中級者」「上級者」など</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-brand-green)] mt-0.5">✓</span>
              <span><strong>目標を伝える：</strong>「〜ができるようになりたい」「〜を改善したい」</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--color-brand-green)] mt-0.5">✓</span>
              <span><strong>時間を指定：</strong>「15分」「30分」「1時間」など</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
