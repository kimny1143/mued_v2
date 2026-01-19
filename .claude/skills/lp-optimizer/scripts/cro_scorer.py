#!/usr/bin/env python3
"""
CRO Scorer
10項目チェックリストに基づきスコアリング

Usage:
    python cro_scorer.py --interactive
    python cro_scorer.py --scores '{"hero_headline":3,"hero_subheadline":2,...}'
    python cro_scorer.py --file scores.json
"""

import sys
import json
import argparse
from typing import Dict, Optional


# スコア項目定義
SCORE_ITEMS = {
    "hero_headline": {
        "name": "ヘッドライン",
        "category": "Hero Section",
        "max": 5,
        "criteria": {
            5: "具体的ベネフィット＋数値＋ターゲット明確",
            4: "具体的ベネフィットあり",
            3: "ベネフィットあるが曖昧",
            2: "フィーチャー中心",
            1: "意味不明/汎用的すぎ"
        }
    },
    "hero_subheadline": {
        "name": "サブヘッドライン",
        "category": "Hero Section",
        "max": 5,
        "criteria": {
            5: "完璧な補完＋誰のため＋何が得られる",
            4: "良好な補完",
            3: "基本的な補完",
            2: "弱い補完",
            1: "なし/不明確"
        }
    },
    "hero_cta": {
        "name": "プライマリCTA",
        "category": "Hero Section",
        "max": 5,
        "criteria": {
            5: "アクション動詞＋価値＋目立つ＋Above the fold",
            4: "上記3つ満たす",
            3: "上記2つ満たす",
            2: "汎用的（詳しくはこちら等）",
            1: "送信/Submit等"
        }
    },
    "social_proof": {
        "name": "ソーシャルプルーフ",
        "category": "Social Proof",
        "max": 5,
        "criteria": {
            5: "具体的数値＋顔写真付き証言＋著名ロゴ",
            4: "具体的数値＋証言",
            3: "証言あり（曖昧）",
            2: "曖昧な表現のみ",
            1: "なし"
        }
    },
    "benefits_vs_features": {
        "name": "ベネフィット変換",
        "category": "Value Proposition",
        "max": 5,
        "criteria": {
            5: "全フィーチャーがベネフィット変換済み",
            4: "主要フィーチャーは変換済み",
            3: "一部変換",
            2: "ほぼフィーチャー列挙",
            1: "スペック羅列のみ"
        }
    },
    "conversion_path": {
        "name": "コンバージョンパス",
        "category": "Conversion",
        "max": 5,
        "criteria": {
            5: "CTAまで1-2ステップ、摩擦ゼロ",
            4: "3ステップ以内、軽微な摩擦",
            3: "摩擦点あるが許容範囲",
            2: "複雑なフォーム/多ステップ",
            1: "パス不明確"
        }
    },
    "visual_hierarchy": {
        "name": "ビジュアルヒエラルキー",
        "category": "Design",
        "max": 5,
        "criteria": {
            5: "完璧なF/Zパターン、明確な優先順位",
            4: "良好な視線誘導",
            3: "基本的な構造あり",
            2: "要素が競合/散漫",
            1: "カオス"
        }
    },
    "copy_clarity": {
        "name": "コピーの明瞭性",
        "category": "Copy",
        "max": 5,
        "criteria": {
            5: "5秒で価値提案理解可能",
            4: "10秒で理解可能",
            3: "読めば理解できる",
            2: "専門用語多い/冗長",
            1: "意味不明"
        }
    },
    "trust_elements": {
        "name": "信頼性要素",
        "category": "Trust",
        "max": 5,
        "criteria": {
            5: "プライバシー＋セキュリティ＋連絡先＋会社情報",
            4: "上記3つ",
            3: "上記2つ",
            2: "1つのみ",
            1: "なし"
        }
    },
    "mobile_optimization": {
        "name": "モバイル最適化",
        "category": "Technical",
        "max": 5,
        "criteria": {
            5: "CWV全合格＋優れたモバイルUX",
            4: "CWV合格",
            3: "基本的なレスポンシブ",
            2: "一部崩れ",
            1: "未対応"
        }
    },
    "message_match": {
        "name": "メッセージマッチ",
        "category": "Consistency",
        "max": 5,
        "criteria": {
            5: "流入元と完全一致＋期待超え",
            4: "高い一貫性",
            3: "基本的な一貫性",
            2: "ややズレ",
            1: "乖離"
        }
    },
    "competitive_diff": {
        "name": "競合差別化",
        "category": "Positioning",
        "max": 5,
        "criteria": {
            5: "明確な独自ポジション＋競合と明確な差",
            4: "独自性あり",
            3: "差別化要素あるが弱い",
            2: "競合と類似",
            1: "差別化なし"
        }
    }
}


def get_grade(percentage: float) -> str:
    """スコア率からグレードを算出"""
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"


def calculate_scores(scores: Dict[str, int]) -> dict:
    """スコアを集計してレポートデータを生成"""
    
    # カテゴリ別集計
    categories = {}
    for item_id, item_info in SCORE_ITEMS.items():
        cat = item_info["category"]
        if cat not in categories:
            categories[cat] = {"items": [], "score": 0, "max": 0}
        
        score = scores.get(item_id, 0)
        categories[cat]["items"].append({
            "id": item_id,
            "name": item_info["name"],
            "score": score,
            "max": item_info["max"]
        })
        categories[cat]["score"] += score
        categories[cat]["max"] += item_info["max"]
    
    # 総合スコア
    total_score = sum(scores.get(k, 0) for k in SCORE_ITEMS.keys())
    max_score = sum(item["max"] for item in SCORE_ITEMS.values())
    percentage = (total_score / max_score) * 100 if max_score > 0 else 0
    
    # 優先改善項目（スコア2以下）
    priority_improvements = []
    for item_id, item_info in SCORE_ITEMS.items():
        score = scores.get(item_id, 0)
        if score <= 2:
            priority_improvements.append({
                "id": item_id,
                "name": item_info["name"],
                "category": item_info["category"],
                "score": score,
                "severity": "critical" if score == 1 else "important"
            })
    
    # スコア3の項目（改善余地あり）
    improvement_opportunities = []
    for item_id, item_info in SCORE_ITEMS.items():
        score = scores.get(item_id, 0)
        if score == 3:
            improvement_opportunities.append({
                "id": item_id,
                "name": item_info["name"],
                "category": item_info["category"]
            })
    
    return {
        "total_score": total_score,
        "max_score": max_score,
        "percentage": round(percentage, 1),
        "grade": get_grade(percentage),
        "categories": categories,
        "priority_improvements": priority_improvements,
        "improvement_opportunities": improvement_opportunities,
        "raw_scores": scores
    }


def print_report(result: dict):
    """人間可読なレポートを出力"""
    
    print("=" * 60)
    print("CRO AUDIT REPORT")
    print("=" * 60)
    print()
    
    # 総合スコア
    grade_emoji = {"A": "🏆", "B": "✅", "C": "📊", "D": "⚠️", "F": "🚨"}
    emoji = grade_emoji.get(result["grade"], "")
    
    print(f"📈 OVERALL SCORE: {result['total_score']}/{result['max_score']} ({result['percentage']}%)")
    print(f"   Grade: {emoji} {result['grade']}")
    print()
    
    # カテゴリ別
    print("📋 CATEGORY BREAKDOWN")
    print("-" * 40)
    for cat_name, cat_data in result["categories"].items():
        cat_pct = (cat_data["score"] / cat_data["max"]) * 100 if cat_data["max"] > 0 else 0
        bar = "█" * int(cat_pct / 10) + "░" * (10 - int(cat_pct / 10))
        print(f"  {cat_name}")
        print(f"    [{bar}] {cat_data['score']}/{cat_data['max']} ({cat_pct:.0f}%)")
        for item in cat_data["items"]:
            icon = "🔴" if item["score"] <= 2 else "🟡" if item["score"] == 3 else "🟢"
            print(f"      {icon} {item['name']}: {item['score']}/{item['max']}")
    print()
    
    # 優先改善項目
    if result["priority_improvements"]:
        print("🔴 PRIORITY IMPROVEMENTS (Critical)")
        print("-" * 40)
        for imp in result["priority_improvements"]:
            severity_label = "🚨 CRITICAL" if imp["severity"] == "critical" else "⚠️ IMPORTANT"
            print(f"  {severity_label}: {imp['name']} ({imp['category']})")
            # 改善基準を表示
            item_info = SCORE_ITEMS[imp["id"]]
            if imp["score"] < 5:
                target = min(imp["score"] + 2, 5)
                print(f"    Current: {item_info['criteria'][imp['score']]}")
                print(f"    Target:  {item_info['criteria'][target]}")
        print()
    
    # 改善余地
    if result["improvement_opportunities"]:
        print("🟡 IMPROVEMENT OPPORTUNITIES")
        print("-" * 40)
        for opp in result["improvement_opportunities"]:
            print(f"  • {opp['name']} ({opp['category']})")
        print()


def interactive_scoring() -> Dict[str, int]:
    """対話式でスコアを入力"""
    
    print("=" * 60)
    print("CRO INTERACTIVE SCORING")
    print("各項目を1-5で評価してください")
    print("=" * 60)
    print()
    
    scores = {}
    current_category = None
    
    for item_id, item_info in SCORE_ITEMS.items():
        # カテゴリヘッダー
        if item_info["category"] != current_category:
            current_category = item_info["category"]
            print(f"\n--- {current_category} ---")
        
        # 基準を表示
        print(f"\n{item_info['name']}:")
        for score, desc in sorted(item_info["criteria"].items(), reverse=True):
            print(f"  {score}: {desc}")
        
        # 入力
        while True:
            try:
                value = input(f"Score (1-5): ").strip()
                if value == "":
                    value = 3  # デフォルト
                else:
                    value = int(value)
                if 1 <= value <= 5:
                    scores[item_id] = value
                    break
                else:
                    print("1-5の範囲で入力してください")
            except ValueError:
                print("数値を入力してください")
            except KeyboardInterrupt:
                print("\n中断しました")
                sys.exit(1)
    
    return scores


def main():
    parser = argparse.ArgumentParser(description="CRO Audit Scorer")
    parser.add_argument("--interactive", "-i", action="store_true",
                       help="対話式でスコアを入力")
    parser.add_argument("--scores", "-s", type=str,
                       help="JSON形式のスコア文字列")
    parser.add_argument("--file", "-f", type=str,
                       help="スコアJSONファイル")
    parser.add_argument("--json", "-j", action="store_true",
                       help="JSON形式で出力")
    
    args = parser.parse_args()
    
    # スコア取得
    if args.interactive:
        scores = interactive_scoring()
    elif args.scores:
        scores = json.loads(args.scores)
    elif args.file:
        with open(args.file, 'r') as f:
            scores = json.load(f)
    else:
        # デモ用デフォルトスコア
        print("使用方法:")
        print("  python cro_scorer.py --interactive")
        print("  python cro_scorer.py --scores '{\"hero_headline\":3,...}'")
        print("  python cro_scorer.py --file scores.json")
        print()
        print("デモスコアでレポートを生成します...")
        print()
        scores = {
            "hero_headline": 3,
            "hero_subheadline": 2,
            "hero_cta": 4,
            "social_proof": 2,
            "benefits_vs_features": 3,
            "conversion_path": 4,
            "visual_hierarchy": 3,
            "copy_clarity": 3,
            "trust_elements": 3,
            "mobile_optimization": 4,
            "message_match": 3,
            "competitive_diff": 2
        }
    
    # 計算
    result = calculate_scores(scores)
    
    # 出力
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print_report(result)


if __name__ == "__main__":
    main()
