# MUEDnote Hub macOS - 公証作業引き継ぎ

**作成日**: 2026-01-21
**作業ディレクトリ**: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/apps/muednote-hub-macos`

---

## 現在の状況

### 完了した作業

| 項目 | 状態 | 備考 |
|-----|------|-----|
| Entitlementsファイル作成 | ✅ 完了 | `MUEDnoteHub.entitlements` |
| 署名スクリプト作成 | ✅ 完了 | `scripts/sign.sh` |
| 公証スクリプト作成 | ✅ 完了 | `scripts/notarize.sh` |
| DMG作成スクリプト作成 | ✅ 完了 | `scripts/create-dmg.sh` |
| バージョン管理スクリプト作成 | ✅ 完了 | `scripts/bump-version.sh` |
| Developer ID証明書取得 | ✅ 完了 | glasswerks inc. (F529L4WT3V) |
| Keychain認証情報設定 | ✅ 完了 | プロファイル名: `MUEDnote-Notarization` |
| アプリ署名 | ✅ 完了 | `dist/MUEDnoteHub.app` |
| セキュリティ修正マージ | ✅ 完了 | `fix/security-warnings` → `main` |
| Git push | ✅ 完了 | commit: 6729519 |

### 未完了（Apple障害により停滞）

| 項目 | 状態 | 備考 |
|-----|------|-----|
| Apple公証 | ⏳ 停滞中 | Apple側のサーバー障害 |
| Stapler実行 | 未着手 | 公証完了待ち |
| DMG作成 | 未着手 | 公証完了待ち |

---

## Apple公証サーバー障害について

### 障害概要

- **発生時期**: 2026年1月2日〜6日頃から
- **症状**: 全ての提出が「In Progress」のまま無期限に停滞
- **影響**: 多数の開発者（特に初回公証の人）
- **待機時間**: 24時間〜8日以上の報告あり

### 提出履歴（全て停滞中）

```
c7da5113-33c4-47db-aafc-e0a60dbf2e0a (2026-01-21 22:07 JST) - In Progress
1608a169-a1d3-4efd-b323-d68c93c8eca9 (2026-01-21 21:15 JST) - In Progress
40902ff8-1e70-4d41-9027-9cf65d486a21 (2026-01-20 17:59 JST) - In Progress
```

### 参考リンク

- [All notarization submissions stuck - Apple Developer Forums](https://developer.apple.com/forums/thread/811968)
- [Notarization stuck at "In Progress" - Apple Developer Forums](https://developer.apple.com/forums/thread/812103)

### Appleの見解（Quinn, DTS）

> 「最近、公証リクエストが長時間In Progressになる問題が発生している。特に初回公証の人に影響。まず待つこと。1〜2日で解消することが多く、解消後は新しいリクエストはすぐ通る」

---

## 次回作業手順

### 1. 公証状態の確認

```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/apps/muednote-hub-macos
xcrun notarytool history --keychain-profile "MUEDnote-Notarization"
```

### 2-A. いずれかが「Accepted」になっていた場合

```bash
# Staplerでチケット埋め込み
xcrun stapler staple dist/MUEDnoteHub.app

# 検証
xcrun stapler validate dist/MUEDnoteHub.app
spctl --assess --type execute --verbose dist/MUEDnoteHub.app

# DMG作成
./scripts/create-dmg.sh
```

### 2-B. まだ「In Progress」または「Invalid」の場合

```bash
# 再ビルド・再署名
./scripts/sign.sh

# 再公証
./scripts/notarize.sh
```

### 3. リリース（公証完了後）

```bash
# バージョン設定（必要に応じて）
./scripts/bump-version.sh 1.0.0

# GitHub Releaseにアップロード
gh release create v1.0.0 dist/MUEDnoteHub-1.0.0.dmg --title "MUEDnote Hub v1.0.0" --notes "Initial release"
```

---

## ファイル構成

```
muednote-hub-macos/
├── MUEDnoteHub.entitlements      # 本番用entitlements（network.client/server）
├── Package.swift
├── Sources/
│   └── MUEDnoteHub/
│       ├── Models/
│       ├── Services/
│       │   ├── APIClient.swift    # セキュリティ修正済み
│       │   └── AuthService.swift  # セキュリティ修正済み
│       └── Views/
├── scripts/
│   ├── sign.sh                   # ビルド・署名スクリプト
│   ├── notarize.sh               # 公証スクリプト
│   ├── create-dmg.sh             # DMG作成スクリプト
│   └── bump-version.sh           # バージョン更新スクリプト
├── dist/                         # ビルド成果物（.gitignore対象）
│   ├── MUEDnoteHub.app/          # 署名済みアプリ
│   └── MUEDnoteHub.zip           # 公証提出用ZIP
└── .env.native.local             # 認証情報（.gitignore対象、Keychainに移行済み）
```

---

## 認証情報

### Keychain設定済み

| 項目 | 値 |
|-----|-----|
| プロファイル名 | `MUEDnote-Notarization` |
| Apple ID | glasswerkskimny@gmail.com |
| Team ID | F529L4WT3V |
| 証明書 | Developer ID Application: glasswerks inc. (F529L4WT3V) |

### 確認コマンド

```bash
# 証明書一覧
security find-identity -v -p codesigning

# Keychainプロファイル確認（認証テスト）
xcrun notarytool history --keychain-profile "MUEDnote-Notarization"
```

---

## 署名検証コマンド

```bash
# 署名検証
codesign --verify --deep --strict --verbose=2 dist/MUEDnoteHub.app

# Gatekeeper検証
spctl --assess --type execute --verbose dist/MUEDnoteHub.app

# 署名詳細表示
codesign -dv --verbose=4 dist/MUEDnoteHub.app
```

---

## トラブルシューティング

### 公証が「Invalid」で失敗した場合

```bash
# ログ取得
xcrun notarytool log <submission-id> --keychain-profile "MUEDnote-Notarization"

# 問題を修正後、再署名・再公証
./scripts/sign.sh
./scripts/notarize.sh
```

### 証明書が見つからない場合

```bash
# Keychainで確認
security find-identity -v -p codesigning

# 証明書がない場合はApple Developer Portalから再ダウンロード
```

---

## 関連コミット

- `6729519` - chore: Add distribution scripts and merge security fixes
- `3d573b2` - chore: Add Claude Code configuration for native apps
- `987a572` - feat(muednote-hub): Add transport-aware MIDI recording

---

## 備考

- `.env.native.local` はKeychainへの移行が完了しているため不要（削除可）
- `dist/` ディレクトリは `.gitignore` に追加済み
- 公証サーバー障害が解消次第、`./scripts/notarize.sh` を実行するだけでOK
