# Hoo MCP — Swift Integration Guide

**対象:** macOS Swift アプリから Hoo MCP サーバーへ接続する開発者
**対象読者:** native課（iOS/macOS Swift 開発）
**プロトコル:** MCP Streamable HTTP (JSON-RPC 2.0 over HTTPS)
**Hoo MCP バージョン:** 1.0.0 (protocolVersion: 2024-11-05)

---

## 1. サーバー概要

| 項目 | 値 |
|------|-----|
| **Base URL** | `https://hoo-mcp.glasswerkskimny.workers.dev` |
| **MCP エンドポイント** | `POST /mcp` |
| **ヘルスチェック** | `GET /` |
| **Server Card** | `GET /.well-known/mcp/server-card.json` |
| **トランスポート** | Streamable HTTP（ステートレス、SSE なし） |
| **認証** | Bearer token（`mcp_` prefix 必須） |
| **Content-Type** | `application/json` |

> **ステートレス設計:** Hoo MCP はセッション状態を持たない。毎リクエストで initialize → tools/call の順でコールする必要がある。SSE/WebSocket 不使用。

---

## 2. 認証

### 2-1. APIキー取得

1. `https://mued.jp` にサインイン
2. Dashboard → 設定 → MCP タブ
3. 「APIキーを生成」で `mcp_xxxxxxxxxxxxxxxx` 形式のキーを発行

### 2-2. リクエストヘッダー

```
Authorization: Bearer mcp_xxxxxxxxxxxxxxxx
Content-Type: application/json
```

### 2-3. 認証フロー（サーバー側）

```
Bearer token → SHA-256 hash → DB lookup (mcp_api_keys) → clerk_id 取得
```

- `mcp_` prefix がないトークンは即時拒否（401）
- 失効・無効キーは 401 JSON-RPC エラー

### 2-4. エラーレスポンス（401）

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32000,
    "message": "Unauthorized: invalid or missing API key"
  }
}
```

---

## 3. MCP JSON-RPC プロトコル

### 3-1. リクエスト形式

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "METHOD_NAME",
  "params": { ... }
}
```

### 3-2. レスポンス形式（成功）

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": { ... }
}
```

### 3-3. レスポンス形式（エラー）

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32603,
    "message": "エラーメッセージ"
  }
}
```

### 3-4. 標準エラーコード

| コード | 意味 |
|--------|------|
| -32700 | Parse error（JSON 不正） |
| -32600 | Invalid Request（JSON-RPC 形式エラー） |
| -32601 | Method not found / Unknown tool |
| -32603 | Internal error（ツール実行失敗） |
| -32000 | Unauthorized（認証失敗） |

---

## 4. 接続シーケンス

プロトタイプに必要な最小シーケンス:

```
1. POST /mcp  {"method": "initialize"}
   → protocolVersion, capabilities, serverInfo を確認

2. POST /mcp  {"method": "tools/list"}
   → 利用可能ツール一覧を取得（14件）

3. POST /mcp  {"method": "tools/call", "params": {"name": "get_user_profile"}}
   → ユーザープロファイル取得
```

> **Note:** `initialize` と `tools/list` は毎回コールしてもよい（ステートレスサーバーのため状態は持たない）。プロトタイプではまず `initialize` → `get_user_profile` の 2 ステップで動作確認推奨。

---

## 5. Swift 実装例

### 5-1. 基本モデル

```swift
import Foundation

// MARK: - JSON-RPC Models

struct JsonRpcRequest: Encodable {
    let jsonrpc = "2.0"
    let id: String
    let method: String
    let params: [String: AnyCodable]?
}

struct JsonRpcResponse<T: Decodable>: Decodable {
    let jsonrpc: String
    let id: String?
    let result: T?
    let error: JsonRpcError?
}

struct JsonRpcError: Decodable {
    let code: Int
    let message: String
}

// AnyCodable helper（簡易版）
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) { self.value = value }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let v as String:  try container.encode(v)
        case let v as Int:     try container.encode(v)
        case let v as Bool:    try container.encode(v)
        case let v as Double:  try container.encode(v)
        case let v as [String: Any]:
            try container.encode(v.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let v = try? container.decode(String.self) { value = v }
        else if let v = try? container.decode(Int.self) { value = v }
        else if let v = try? container.decode(Bool.self) { value = v }
        else if let v = try? container.decode(Double.self) { value = v }
        else { value = NSNull() }
    }
}
```

### 5-2. MCP クライアント

```swift
actor HooMCPClient {
    private let baseURL = URL(string: "https://hoo-mcp.glasswerkskimny.workers.dev/mcp")!
    private let apiKey: String
    private let session: URLSession

    init(apiKey: String) {
        self.apiKey = apiKey
        self.session = URLSession.shared
    }

    // MARK: - Core Request

    func send<T: Decodable>(method: String, params: [String: Any]? = nil) async throws -> T {
        var request = URLRequest(url: baseURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        let rpcBody: [String: Any] = [
            "jsonrpc": "2.0",
            "id": UUID().uuidString,
            "method": method,
            "params": params as Any
        ].compactMapValues { $0 }

        request.httpBody = try JSONSerialization.data(withJSONObject: rpcBody)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw HooMCPError.networkError("Invalid response")
        }

        if httpResponse.statusCode == 401 {
            throw HooMCPError.unauthorized
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        if let error = json?["error"] as? [String: Any],
           let message = error["message"] as? String {
            throw HooMCPError.serverError(message)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: - Tools

    /// サーバー初期化確認
    func initialize() async throws -> InitializeResult {
        try await send(method: "initialize")
    }

    /// ユーザープロファイル取得
    func getUserProfile() async throws -> ToolCallResult {
        try await send(
            method: "tools/call",
            params: ["name": "get_user_profile", "arguments": [:]]
        )
    }

    /// Hooコンテキスト取得（最近の会話含む）
    func getHooContext(includeRecentMessages: Int = 5) async throws -> ToolCallResult {
        try await send(
            method: "tools/call",
            params: [
                "name": "get_hoo_context",
                "arguments": ["include_recent_messages": includeRecentMessages]
            ]
        )
    }

    /// ダイアルクレジット残高確認
    func getDialCreditBalance() async throws -> ToolCallResult {
        try await send(
            method: "tools/call",
            params: ["name": "get_dial_credit_balance", "arguments": [:]]
        )
    }
}

// MARK: - Result Types

struct InitializeResult: Decodable {
    let jsonrpc: String
    let result: InitializeData?
    let error: JsonRpcError?

    struct InitializeData: Decodable {
        let protocolVersion: String
        let serverInfo: ServerInfo

        struct ServerInfo: Decodable {
            let name: String
            let version: String
        }
    }
}

struct ToolCallResult: Decodable {
    let jsonrpc: String
    let result: ToolContent?
    let error: JsonRpcError?

    struct ToolContent: Decodable {
        let content: [ContentItem]

        struct ContentItem: Decodable {
            let type: String
            let text: String
        }
    }
}

// MARK: - Errors

enum HooMCPError: LocalizedError {
    case unauthorized
    case serverError(String)
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "APIキーが無効または期限切れです。mued.jp/connect でキーを再発行してください。"
        case .serverError(let msg):
            return "サーバーエラー: \(msg)"
        case .networkError(let msg):
            return "ネットワークエラー: \(msg)"
        }
    }
}
```

### 5-3. SwiftUI 最小UI（プロトタイプ）

```swift
import SwiftUI

@MainActor
class HooViewModel: ObservableObject {
    @Published var connectionStatus: String = "未接続"
    @Published var responseText: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var client: HooMCPClient?

    func connect(apiKey: String) async {
        isLoading = true
        errorMessage = nil
        client = HooMCPClient(apiKey: apiKey)

        do {
            let result = try await client!.initialize()
            if let info = result.result {
                connectionStatus = "接続済み — \(info.serverInfo.name) v\(info.serverInfo.version)"
            }
        } catch HooMCPError.unauthorized {
            errorMessage = "認証失敗: APIキーを確認してください"
            connectionStatus = "認証エラー"
        } catch {
            errorMessage = error.localizedDescription
            connectionStatus = "接続失敗"
        }
        isLoading = false
    }

    func fetchUserProfile() async {
        guard let client else { return }
        isLoading = true

        do {
            let result = try await client.getUserProfile()
            responseText = result.result?.content.first?.text ?? "データなし"
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

struct ContentView: View {
    @StateObject private var vm = HooViewModel()
    @State private var apiKey = ""

    var body: some View {
        VStack(spacing: 16) {
            // 接続状態
            HStack {
                Circle()
                    .fill(vm.connectionStatus.contains("接続済み") ? Color.green : Color.red)
                    .frame(width: 10, height: 10)
                Text(vm.connectionStatus)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // APIキー入力
            SecureField("APIキー (mcp_...)", text: $apiKey)
                .textFieldStyle(.roundedBorder)

            Button("接続") {
                Task { await vm.connect(apiKey: apiKey) }
            }
            .disabled(apiKey.isEmpty || vm.isLoading)

            Divider()

            Button("プロファイル取得") {
                Task { await vm.fetchUserProfile() }
            }
            .disabled(vm.isLoading)

            // レスポンス表示
            if !vm.responseText.isEmpty {
                ScrollView {
                    Text(vm.responseText)
                        .font(.system(.body, design: .monospaced))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                }
                .background(Color(.textBackgroundColor))
                .cornerRadius(8)
            }

            // エラー
            if let error = vm.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            if vm.isLoading {
                ProgressView()
            }
        }
        .padding()
        .frame(minWidth: 480, minHeight: 400)
    }
}
```

---

## 6. 利用可能ツール一覧（14件）

### Tier 1 — ユーザー・Hooコンテキスト（認証必須）

| ツール名 | 用途 | 主要引数 |
|---------|------|---------|
| `get_user_profile` | ユーザー基本プロファイル・音楽的傾向 | なし |
| `get_conversation_history` | Hoo会話履歴一覧 | `limit`, `include_messages` |
| `get_hoo_context` | Hoo向け統合コンテキスト（プロファイル＋最近の会話） | `include_recent_messages` |
| `get_muedlobe_profile` | MUEDlobe認知スコア（7ゲーム結果） | なし |
| `get_subscription_status` | MUEDialサブスク状態・クレジット残高 | なし |
| `save_conversation` | 会話ログを保存（同意フロー付き） | `messages[]`, `title` |

### Tier 2 — MUEDialセッション管理

| ツール名 | 用途 | 主要引数 |
|---------|------|---------|
| `get_dial_session_status` | セッションの現在状態（phase/tier） | `session_id` |
| `get_dial_chat_history` | セッション内チャット履歴 | `session_id`, `limit` |
| `get_dial_credit_balance` | クレジット残高詳細（サブスク＋パック別） | なし |
| `get_dial_task_details` | 処理タスク詳細（RoEx処理結果含む） | `task_id`, `include_fx_settings` |
| `get_dial_phase_and_actions` | 現フェーズと実行可能アクション一覧 | `session_id` |

### Tier 3 — glasswerksクリエイターサービス

| ツール名 | 用途 | 主要引数 |
|---------|------|---------|
| `get_glasswerks_services` | 提供サービス一覧 | `category` |
| `submit_inquiry` | サービス問い合わせ送信 | `service_type`, `budget_range`, `description` |
| `get_inquiry_status` | 問い合わせ状況確認 | `inquiry_id` |

---

## 7. プロトタイプ動作確認シーケンス（Swift向け）

### Step 1: ヘルスチェック（認証不要）

```bash
curl https://hoo-mcp.glasswerkskimny.workers.dev/
# → {"name":"hoo-mcp","version":"1.0.0","status":"ok","transport":"streamable-http"}
```

### Step 2: 認証確認

```bash
curl -X POST https://hoo-mcp.glasswerkskimny.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":"1","method":"initialize"}'
# 成功 → {"jsonrpc":"2.0","id":"1","result":{"protocolVersion":"2024-11-05",...}}
# 失敗 → {"jsonrpc":"2.0","id":null,"error":{"code":-32000,"message":"Unauthorized:..."}}
```

### Step 3: プロファイル取得

```bash
curl -X POST https://hoo-mcp.glasswerkskimny.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"get_user_profile","arguments":{}}}'
```

---

## 8. エラーハンドリング（Swift実装時の注意点）

| シナリオ | HTTP Status | JSON-RPC error.code | 対処 |
|---------|-------------|---------------------|------|
| APIキー不正 | 401 | -32000 | キー再発行を促すUI表示 |
| 不明なツール名 | 200 | -32601 | ツール名のタイポ確認 |
| タイムアウト | URLError | - | 30秒タイムアウト設定推奨。CF Workers は通常 < 1s |
| ネットワーク切断 | URLError | - | リトライUI（1回のみ推奨） |
| JSON Parse エラー | 400 | -32700 | リクエスト形式確認 |
| サーバー内部エラー | 500 | -32603 | mued課にSlack通知（本番障害） |

### Swift タイムアウト設定

```swift
var request = URLRequest(url: baseURL)
request.timeoutInterval = 30  // CF Workers は通常 < 1s なので余裕あり
```

---

## 9. CORS 設定

Hoo MCP サーバーは以下のオリジンを許可:

```
Access-Control-Allow-Origin: (ALLOWED_ORIGINS env var で設定)
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

macOS Swift アプリ（URLSession）は CORS の影響を受けない。ブラウザ環境でのみ考慮が必要。

---

## 10. 開発上の注意事項

### APIキーの安全な保管

```swift
// ❌ ハードコード禁止
let apiKey = "mcp_xxxxxxxxxxxxx"

// ✅ Keychain 使用
import Security

func saveToKeychain(key: String) {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "HooMCPApiKey",
        kSecValueData as String: key.data(using: .utf8)!
    ]
    SecItemAdd(query as CFDictionary, nil)
}

func loadFromKeychain() -> String? {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "HooMCPApiKey",
        kSecReturnData as String: true
    ]
    var result: AnyObject?
    SecItemCopyMatching(query as CFDictionary, &result)
    guard let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
}
```

### ステートレス設計の含意

- Hoo MCP はセッション ID を管理しない → Swift 側でセッション状態を保持する必要なし
- `initialize` は毎回コールしても問題ない（べき等）
- ユーザー識別はすべて Bearer token → clerk_id で解決される

---

## 11. 関連リソース

| リソース | URL |
|---------|-----|
| APIキー生成 | `https://mued.jp/connect` |
| Server Card | `https://hoo-mcp.glasswerkskimny.workers.dev/.well-known/mcp/server-card.json` |
| MCP仕様 | `https://spec.modelcontextprotocol.io/` |
| Hoo MCP ソース | `workers/hoo-mcp/src/` |
| 公式レジストリ登録 | `io.github.kimny1143/hoo-mcp` |

---

*作成: mued課 / 2026-04-24*
*対応プロトタイプ: Task 5 (AI-DAW戦略検証 Week1 4/24-5/1)*
*native課担当: Swift prototype作成（Task 1監査完了後着手、4/26〜）*
