from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class PromptTemplate:
    """プロンプトテンプレートのデータクラス"""
    name: str
    system_prompt: str
    user_prompt_template: str
    variables: List[str]
    
    def format(self, **kwargs) -> Dict[str, str]:
        """変数を埋め込んでプロンプトを生成"""
        missing_vars = set(self.variables) - set(kwargs.keys())
        if missing_vars:
            raise ValueError(f"Missing required variables: {missing_vars}")
        
        return {
            "system": self.system_prompt,
            "user": self.user_prompt_template.format(**kwargs)
        }


class PromptTemplates:
    """プロンプトテンプレート管理クラス"""
    
    MATERIAL_GENERATION = PromptTemplate(
        name="material_generation",
        system_prompt="""あなたは音楽教育の専門家です。
学習者のレベルに合わせた、わかりやすく実践的な音楽教材を作成してください。
教材は以下の形式で作成してください：

# タイトル

## 概要
この教材の簡潔な説明

## 学習目標
- 目標1
- 目標2
- 目標3

## 本文
具体例を含む詳細な説明

## 練習問題
実践的な練習課題

## まとめ
重要なポイントの振り返り

Markdown形式で出力してください。""",
        user_prompt_template="""以下の条件で音楽教材を作成してください：

テーマ: {theme}
対象レベル: {level}
教材の種類: {material_type}
追加の要件: {additional_requirements}

参考情報:
{reference_content}""",
        variables=["theme", "level", "material_type", "additional_requirements", "reference_content"]
    )
    
    CURRICULUM_GENERATION = PromptTemplate(
        name="curriculum_generation",
        system_prompt="""あなたは音楽教育カリキュラムの設計専門家です。
学習者の目標とレベルに基づいて、体系的で実践的なカリキュラムを作成してください。
各レッスンの順序と依存関係を考慮し、段階的に学習できる構成にしてください。""",
        user_prompt_template="""以下の条件でカリキュラムを作成してください：

学習目標: {learning_goal}
現在のレベル: {current_level}
学習期間: {duration}
1週間の学習時間: {weekly_hours}
特別な要望: {special_requests}

以下の形式で出力してください：
1. カリキュラム概要
2. 各週の学習内容と目標
3. 必要な教材リスト
4. 評価方法""",
        variables=["learning_goal", "current_level", "duration", "weekly_hours", "special_requests"]
    )
    
    EXERCISE_FEEDBACK = PromptTemplate(
        name="exercise_feedback",
        system_prompt="""あなたは音楽講師として、生徒の練習記録に対して
建設的でモチベーションを高めるフィードバックを提供します。
技術的な改善点と励ましのバランスを保ってください。""",
        user_prompt_template="""以下の練習記録に対してフィードバックを提供してください：

練習内容: {practice_content}
練習時間: {practice_duration}
自己評価: {self_evaluation}
困難だった点: {difficulties}

フィードバックには以下を含めてください：
1. 良かった点
2. 改善のアドバイス
3. 次回の練習への提案""",
        variables=["practice_content", "practice_duration", "self_evaluation", "difficulties"]
    )
    
    @classmethod
    def get_template(cls, name: str) -> PromptTemplate:
        """名前でテンプレートを取得"""
        templates = {
            "material_generation": cls.MATERIAL_GENERATION,
            "curriculum_generation": cls.CURRICULUM_GENERATION,
            "exercise_feedback": cls.EXERCISE_FEEDBACK
        }
        
        if name not in templates:
            raise ValueError(f"Template '{name}' not found")
        
        return templates[name]