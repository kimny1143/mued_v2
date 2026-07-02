# Advisory #8 — character-gate E2E runbook (kimny 実機 verify)

*2026-07-02 / mued課 → conductor relay → kimny. M0 core = live/inert（migration 0055 適用済・route deployed）。本runbookは **unlock 前**の「実機で予約が入る」verify（staged: ADVISORY_LIVE=false のまま・LP は URL 直リンクで到達）。所要 ~10-15分。*

---

## STEP 1 — prod env（Vercel dashboard・kimny本番）

Vercel → mued_v2 → Settings → Environment Variables（**Production**）に set。**dashboard UI で貼れば末尾改行は入らない**（CLI の `vercel env add` を使う場合のみ `printf 'value' | vercel env add NAME production`＝echo は改行混入するので不可）。set 後 **redeploy**（env 反映）。

| env | 値 | 必須? |
|---|---|---|
| `ADVISORY_MEET_URL` | kimny が Google Meet（**glasswerks.jp Workspace**）で作る reusable ミーティングURL（例 `https://meet.google.com/abc-defg-hij`）。1回作成。 | **必須**（未設定だと booking は成立するが確認メール skip・.ics/Meetリンク無し） |
| `ADVISORY_BOOKING_TOKEN_SECRET` | `openssl rand -hex 32` で生成した64桁hex（任意のランダム長文字列）。KPI鍵と別物。 | 「実施済みにする」リンク検証用（booking 自体には不要・conducted flag test に必要） |
| `ADVISORY_NOTIFY_EMAIL` | 新規予約通知の受信先（kimny 受信箱）。**未設定なら既存 `GLASSWERKS_INQUIRY_EMAIL` にfallback**。 | 管理者通知を受け取るなら（booker確認メールとは別） |
| `INTERNAL_API_KEY` | **既存で prod set 済ならそのまま**（Hoo MCP worker の glasswerks notify と共有ゆえ**再生成しない**）。未設定なら `openssl rand -hex 32`。insight課 KPI 読取りの bearer も同値。 | KPI route（/api/advisory/kpi-monthly）用・booking E2E には不要 |
| `RESEND_API_KEY` | 既存（メール送信）。 | 既set 想定 |

→ **booking E2E に最低限要るのは `ADVISORY_MEET_URL` + `RESEND_API_KEY`(既set) + 通知先(`ADVISORY_NOTIFY_EMAIL` or `GLASSWERKS_INQUIRY_EMAIL`)**。

## STEP 2 — test 枠を1つ seed（Neon SQL editor・prod branch）

```sql
-- 2日後に60分の open 枠を1つ作成（start は未来必須＝過去枠は予約拒否）
INSERT INTO advisory_slots (start_time, end_time, status)
VALUES (now() + interval '2 days',
        now() + interval '2 days' + interval '60 minutes',
        'open')
RETURNING id, start_time, status;
```
（locale 不要・枠は locale 非依存。返る `id` を控えると STEP 3 の DB確認が楽。）

## STEP 3 — 実機で1件予約（LP booking modal）

1. ブラウザで **`https://mued.jp/ja/advisory`** を開く（noindex/nav非接続だが URL直で到達可）。
2. CTA「**まずは無料で60分、話す**」をクリック → 予約モーダルが開く → STEP 2 の枠が日時候補に出る。
3. 枠を選択 → **お名前（任意）** + **メールアドレス**（kimny のテスト受信箱）→ **必須 consent チェック** → 「**この日時で予約する**」。
4. 「ご予約を受け付けました」画面 → 完了。

## STEP 4 — 確認項目（character-gate＝「実際に予約が入る」）

| 確認 | 方法 | 期待 |
|---|---|---|
| DB 行 | `SELECT type,status,email,scheduled_at,meeting_url,recording_consent,consent_at FROM advisory_inquiries ORDER BY created_at DESC LIMIT 1;` | type='booking' / status='booked' / meeting_url=ADVISORY_MEET_URL / recording_consent=true / consent_at 有 |
| 枠 claim | `SELECT status FROM advisory_slots WHERE id='<STEP2のid>';` | 'booked'（二重予約防止の atomic claim が効いた証跡） |
| **確認メール**（booker） | kimny テスト受信箱 | 件名「ご予約を受け付けました…」+ **日時 + Google Meet 参加リンク + .ics 添付** |
| **.ics** | 添付を開く | カレンダーに追加・LOCATION に Meet URL |
| 管理者通知 | ADVISORY_NOTIFY_EMAIL / GLASSWERKS_INQUIRY_EMAIL 受信箱 | 「新規予約」+「▶ 実施済みにする」リンク |
| KPI | `curl -H "X-Internal-API-Key: <INTERNAL_API_KEY>" https://mued.jp/api/advisory/kpi-monthly` | `bookings_created` が 1 |
| conducted flag（任意） | 枠の時刻を過ぎてから「実施済みにする」リンクをクリック | 「実施済みにしました」+ DB `completed_at` set（実施時刻前は「まだ実施時刻前です」= prefetch guard 正常） |

## STEP 5 — 後片付け（任意）

```sql
-- テスト予約と枠を消す（本番データを汚さない）
DELETE FROM advisory_inquiries WHERE email='<kimnyテストemail>' AND type='booking';
UPDATE advisory_slots SET status='closed' WHERE status='booked' AND inquiry_id IS NOT NULL; -- or DELETE the test slot
```

---

## 注意
- **staged のまま**（ADVISORY_LIVE=false）= LP は noindex/非掲載＝一般公開ゼロ。本 test は URL 直リンクで実施。
- 本番 booking が「実際に入る」ことの確認ゆえ **本物の DB 行 + メールが生成される**（STEP 5 で片付け可）。
- ここが PASS したら **LP unlock（ADVISORY_LIVE=true・別 kimny 不可逆 gate）** で公開（LP/tokushoho/sitemap/llms.txt/privacy §10 同時）。公開前2点（特商法 delivery/cancellation 値・FAQ/opener redline）は content課 supply 済 or kimny redline 待ち。

*一次＝PR #564-567（merged）・v2 brief・conductor deploy verify（/api/advisory/slots 200）。*
