#!/usr/bin/env python3
"""
Landing Page Analyzer
HTMLを解析し、LP要素を抽出・評価する

Usage:
    python lp_analyzer.py <html_file>
    python lp_analyzer.py --stdin < page.html
    curl -s https://example.com | python lp_analyzer.py --stdin
"""

import sys
import re
import json
from html.parser import HTMLParser
from typing import Dict, List, Any


class LPAnalyzer(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results: Dict[str, Any] = {
            "headlines": [],
            "ctas": [],
            "images": [],
            "forms": [],
            "social_proof": [],
            "links": [],
            "meta": {}
        }
        self.current_tag = None
        self.current_attrs = {}
        self.tag_stack = []
        self.current_text = ""
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.current_tag = tag
        self.current_attrs = attrs_dict
        self.tag_stack.append(tag)
        self.current_text = ""
        
        # Meta tags
        if tag == "meta":
            name = attrs_dict.get("name", attrs_dict.get("property", ""))
            content = attrs_dict.get("content", "")
            if name and content:
                self.results["meta"][name] = content
        
        # Image analysis
        if tag == "img":
            self.results["images"].append({
                "src": attrs_dict.get("src", ""),
                "alt": attrs_dict.get("alt", ""),
                "has_alt": bool(attrs_dict.get("alt")),
                "loading": attrs_dict.get("loading", "")
            })
            
        # Form detection
        if tag == "form":
            self.results["forms"].append({
                "action": attrs_dict.get("action", ""),
                "method": attrs_dict.get("method", "GET").upper(),
                "id": attrs_dict.get("id", ""),
                "fields": []
            })
            
        # Form fields
        if tag == "input" and self.results["forms"]:
            input_type = attrs_dict.get("type", "text")
            if input_type not in ["hidden", "submit"]:
                self.results["forms"][-1]["fields"].append({
                    "type": input_type,
                    "name": attrs_dict.get("name", ""),
                    "required": "required" in attrs_dict
                })
                
        # Links
        if tag == "a":
            href = attrs_dict.get("href", "")
            if href and not href.startswith("#"):
                self.results["links"].append({
                    "href": href,
                    "target": attrs_dict.get("target", ""),
                    "rel": attrs_dict.get("rel", "")
                })
            
    def handle_endtag(self, tag):
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()
            
    def handle_data(self, data):
        data = data.strip()
        if not data:
            return
            
        self.current_text += " " + data
        
        # Capture headline text
        if self.current_tag in ["h1", "h2", "h3"]:
            self.results["headlines"].append({
                "level": self.current_tag,
                "text": data,
                "word_count": len(data.split())
            })
            
        # Detect CTA patterns (buttons and action links)
        if self.current_tag in ["button", "a"]:
            classes = self.current_attrs.get("class", "").lower()
            text_lower = data.lower()
            
            cta_indicators = ["cta", "btn", "button", "primary", "action"]
            action_words = ["始める", "試す", "登録", "ダウンロード", "無料", 
                          "start", "try", "get", "download", "free", "sign"]
            
            is_cta = (
                any(ind in classes for ind in cta_indicators) or
                any(word in text_lower for word in action_words)
            )
            
            if is_cta:
                self.results["ctas"].append({
                    "tag": self.current_tag,
                    "text": data,
                    "classes": classes,
                    "href": self.current_attrs.get("href", "")
                })
            
        # Detect social proof patterns
        social_patterns = [
            r'\d{1,3}(?:,\d{3})*\+?\s*(?:人|名|社|件|users?|customers?|clients?|companies)',
            r'\d+%',
            r'導入実績',
            r'trusted by',
            r'featured in',
            r'as seen on',
            r'お客様の声',
            r'レビュー',
            r'★'
        ]
        for pattern in social_patterns:
            if re.search(pattern, data, re.IGNORECASE):
                self.results["social_proof"].append({
                    "text": data,
                    "pattern": pattern
                })
                break


def analyze_lp(html_content: str) -> dict:
    """Analyze landing page HTML and return structured results"""
    parser = LPAnalyzer()
    parser.feed(html_content)
    
    results = parser.results
    
    # Calculate metrics
    results["metrics"] = {
        "headline_count": len(results["headlines"]),
        "h1_count": len([h for h in results["headlines"] if h["level"] == "h1"]),
        "h2_count": len([h for h in results["headlines"] if h["level"] == "h2"]),
        "cta_count": len(results["ctas"]),
        "unique_cta_texts": len(set(c["text"] for c in results["ctas"])),
        "image_count": len(results["images"]),
        "images_without_alt": len([i for i in results["images"] if not i["has_alt"]]),
        "form_count": len(results["forms"]),
        "total_form_fields": sum(len(f["fields"]) for f in results["forms"]),
        "social_proof_count": len(results["social_proof"]),
        "external_links": len([l for l in results["links"] if l.get("target") == "_blank"])
    }
    
    # Quick assessment
    results["assessment"] = []
    
    # H1 checks
    if results["metrics"]["h1_count"] == 0:
        results["assessment"].append({
            "severity": "critical",
            "category": "hero",
            "issue": "H1ヘッドラインがありません",
            "recommendation": "ページの主要な価値提案をH1で明示してください"
        })
    elif results["metrics"]["h1_count"] > 1:
        results["assessment"].append({
            "severity": "warning",
            "category": "hero",
            "issue": f"H1が{results['metrics']['h1_count']}個あります（1つが推奨）",
            "recommendation": "最も重要なメッセージのみをH1にしてください"
        })
        
    # CTA checks
    if results["metrics"]["cta_count"] == 0:
        results["assessment"].append({
            "severity": "critical",
            "category": "conversion",
            "issue": "CTAが検出されませんでした",
            "recommendation": "明確なアクションボタンを追加してください"
        })
    elif results["metrics"]["unique_cta_texts"] > 3:
        results["assessment"].append({
            "severity": "warning",
            "category": "conversion",
            "issue": f"CTAテキストが{results['metrics']['unique_cta_texts']}種類あります",
            "recommendation": "主要CTAは1-2種類に統一してください"
        })
        
    # Image alt checks
    if results["metrics"]["images_without_alt"] > 0:
        results["assessment"].append({
            "severity": "warning",
            "category": "accessibility",
            "issue": f"{results['metrics']['images_without_alt']}個の画像にalt属性がありません",
            "recommendation": "全画像にalt属性を追加してください（SEO/アクセシビリティ）"
        })
        
    # Social proof checks
    if results["metrics"]["social_proof_count"] == 0:
        results["assessment"].append({
            "severity": "suggestion",
            "category": "trust",
            "issue": "ソーシャルプルーフが検出されませんでした",
            "recommendation": "ユーザー数、レビュー、導入実績等を追加してください"
        })
        
    # Form complexity checks
    if results["metrics"]["total_form_fields"] > 5:
        results["assessment"].append({
            "severity": "warning",
            "category": "conversion",
            "issue": f"フォームフィールドが{results['metrics']['total_form_fields']}個あります",
            "recommendation": "必須フィールドのみに削減を検討してください"
        })
        
    # Meta checks
    if "description" not in results["meta"]:
        results["assessment"].append({
            "severity": "warning",
            "category": "seo",
            "issue": "meta descriptionがありません",
            "recommendation": "150-160文字のdescriptionを追加してください"
        })
        
    return results


def print_report(results: dict):
    """Print human-readable report"""
    print("=" * 60)
    print("LP STRUCTURE ANALYSIS REPORT")
    print("=" * 60)
    print()
    
    # Metrics summary
    m = results["metrics"]
    print("📊 METRICS SUMMARY")
    print("-" * 40)
    print(f"  Headlines: {m['headline_count']} (H1: {m['h1_count']}, H2: {m['h2_count']})")
    print(f"  CTAs: {m['cta_count']} ({m['unique_cta_texts']} unique)")
    print(f"  Images: {m['image_count']} ({m['images_without_alt']} missing alt)")
    print(f"  Forms: {m['form_count']} ({m['total_form_fields']} fields)")
    print(f"  Social Proof: {m['social_proof_count']} elements")
    print()
    
    # Headlines
    if results["headlines"]:
        print("📝 HEADLINES")
        print("-" * 40)
        for h in results["headlines"][:10]:
            print(f"  [{h['level'].upper()}] {h['text'][:60]}...")
        print()
    
    # CTAs
    if results["ctas"]:
        print("🎯 CTAs DETECTED")
        print("-" * 40)
        for c in results["ctas"][:10]:
            print(f"  [{c['tag']}] \"{c['text']}\"")
        print()
    
    # Assessment
    if results["assessment"]:
        print("⚠️  ASSESSMENT")
        print("-" * 40)
        severity_icons = {"critical": "🔴", "warning": "🟡", "suggestion": "💡"}
        for a in results["assessment"]:
            icon = severity_icons.get(a["severity"], "ℹ️")
            print(f"  {icon} [{a['category']}] {a['issue']}")
            print(f"     → {a['recommendation']}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: lp_analyzer.py <html_file>")
        print("       lp_analyzer.py --stdin")
        print("       lp_analyzer.py <html_file> --json")
        sys.exit(1)
    
    # Parse arguments
    json_output = "--json" in sys.argv
    stdin_mode = "--stdin" in sys.argv
    
    # Read HTML
    if stdin_mode:
        html_content = sys.stdin.read()
    else:
        html_file = [a for a in sys.argv[1:] if not a.startswith("--")][0]
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    
    # Analyze
    results = analyze_lp(html_content)
    
    # Output
    if json_output:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        print_report(results)
