# 法的コンプライアンスページ作成スキル

## 概要

特定商取引法に基づく表記、プライバシーポリシー、利用規約など、法的ページを作成・更新する際のガイドライン。

**重要**: 法的ページは正確性が最重要。推測や仮定で記載しない。

---

## 作成前の必須確認事項

### 1. ドメイン・URL確認

```bash
# 実際に使用しているドメインを確認
grep -r "metadataBase\|siteUrl\|NEXT_PUBLIC.*URL" --include="*.ts" --include="*.tsx" --include="*.env*"
```

**チェック項目:**
- [ ] `app/layout.tsx` の `metadataBase`
- [ ] 環境変数の `NEXT_PUBLIC_SITE_URL` など
- [ ] Vercelのデプロイ先ドメイン

### 2. 会社情報確認

```bash
# 既存の会社名記載を確認（一貫性チェック）
grep -r "glasswerks\|グラスワークス\|MUED\|木村" messages/ --include="*.json"
```

**チェック項目:**
- [ ] 登記上の正式名称（株式会社グラスワークス）
- [ ] 代表者名
- [ ] 登記住所
- [ ] 連絡先メールアドレス

### 3. サービス情報確認

```bash
# 価格情報を確認
grep -r "price\|1980\|2980\|料金" --include="*.ts" --include="*.tsx" --include="*.json" | head -20
```

**チェック項目:**
- [ ] 現在の価格プラン（translations.tsと一致）
- [ ] サービス名（MUEDnote）
- [ ] 対応決済方法（Stripe設定と一致）

---

## 特定商取引法に基づく表記（tokushoho）

### 必須記載項目（消費者庁ガイドライン準拠）

| # | 項目 | 必須 | 備考 |
|---|------|------|------|
| 1 | 販売業者名 | ◎ | 登記名称 |
| 2 | 運営責任者 | ◎ | 代表者または責任者 |
| 3 | 所在地 | ◎ | 登記住所 |
| 4 | 電話番号 | ◎ | 「請求により開示」可 |
| 5 | メールアドレス | ◎ | |
| 6 | 販売URL | ◎ | **実際のドメインと一致必須** |
| 7 | サービス名 | ◎ | |
| 8 | 販売価格 | ◎ | 税込表示 |
| 9 | 追加料金 | ◎ | 通信費等 |
| 10 | 支払方法 | ◎ | 全ブランド列挙 |
| 11 | 支払時期 | ◎ | |
| 12 | サービス提供時期 | ◎ | |
| 13 | 契約成立時期 | ◎ | 決済完了時など |
| 14 | 返品・解約 | ◎ | お客様都合/不具合の両方 |
| 15 | 動作環境 | ○ | ソフトウェアの場合 |
| 16 | お問い合わせ | ◎ | |

### 標準表示順序

消費者庁推奨の順序で表示:

1. 販売業者
2. 運営責任者
3. 所在地
4. 電話番号
5. メールアドレス
6. 販売URL
7. サービス名
8. 販売価格
9. 追加料金
10. 支払方法
11. 支払時期
12. サービス提供時期
13. 契約成立時期
14. 返品・解約について
15. 動作環境
16. お問い合わせ

---

## 整合性チェックリスト

### 作成/更新後に必ず実行

```bash
# 1. ドメイン整合性
echo "=== ドメイン確認 ==="
grep "metadataBase" app/layout.tsx
grep "muednote\|mued" messages/ja.json | grep -i "url\|http"

# 2. 会社名整合性
echo "=== 会社名確認 ==="
grep -o "glasswerks[^\"]*\|グラスワークス[^\"]*" messages/ja.json | sort | uniq

# 3. 価格整合性
echo "=== 価格確認 ==="
grep -E "[0-9],?[0-9]{3}円" messages/ja.json
```

### 手動確認項目

- [ ] 記載URLにアクセスできる
- [ ] 会社名が登記と一致
- [ ] 価格がStripe設定と一致
- [ ] メールアドレスが実際に受信可能
- [ ] 電話番号（記載する場合）が有効

---

## Stripe審査対応

### 審査で見られるポイント

1. **URLの一致**: 申請URLと特商法ページの販売URLが一致
2. **情報の完全性**: 必須項目が全て記載
3. **情報の正確性**: 実際のサービス内容と一致
4. **ページの可視性**: 誰でもアクセス可能な場所に配置

### 審査用URL形式

```
https://[実際のドメイン]/ja/tokushoho
```

---

## 参考リンク

- [消費者庁 特定商取引法ガイド - 通信販売](https://www.no-trouble.caa.go.jp/what/mailorder/)
- [Stripe - Guidelines under the revised Specified Commercial Transactions Act](https://support.stripe.com/questions/guidelines-under-the-revised-specified-commercial-transactions-act-to-be-enforced-in-june-2022)

---

## プロジェクト固有情報

★**この節に値を書き写さない。** 特商法ページの本文の正本は **`messages/ja.json` / `messages/en.json` の `tokushoho` 配下**で、
`app/[locale]/tokushoho/page.tsx` が `useTranslations("tokushoho")` で読む★唯一の source。
★複製をここに置くと、法定表記が改定された時にこの skill だけが古くなる——★この節が実際にそうなっていた
（2026-01-24 の版が MUEDnote 1製品ぶんだけを載せたまま、実ページは★3製品に増えていた）。

### 構造（2026-08-30 実測）

`tokushoho` は **共通項目 + サービス別**の2層:

| 層 | キー |
|----|------|
| 共通 | `seller` / `representative` / `address` / `email` / `phone` / `contact` / `payment` / `additionalCost` / `contractEstablishment` / `lastUpdated` |
| サービス別 | ★`muednote` / ★`muedial` / ★`advisory`（`servicesSectionTitle` の下） |

★**サービスが増えたらここも増える。** 値も一覧も引く時は `messages/ja.json` を直接 読むこと。

**注意**: `muednote.com` は取得していない。正しいドメインは `mued.jp`

---

*最終更新: 2026-08-30（値の複製をやめ、正本へのポインタに置換）*
