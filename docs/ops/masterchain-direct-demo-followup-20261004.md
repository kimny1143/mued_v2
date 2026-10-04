# masterchain direct demo and follow-up — 2026-10-04

Requested by kimny in the conductor Codex session, adopting Gemini's direct-demo proposal. Scope: remove the masterchain demo's email form, prepare a follow-up, and prepare KVR updates. Sending the follow-up is not part of this change.

## Behavior

`/en/muedsp#demo` and `/ja/muedsp#demo` display native links to the already-published, integrity-pinned Mac PKG and Windows ZIP. No email, account, checkout or API call precedes the download. The amber CTA styling, purchase button, demo flag and Windows flag remain. Demo restrictions: first 45 seconds of audio per insert, then bypass; no settings/preset saving. Windows is VST3 only; Mac is AU/VST3/AAX.

The historical demo API remains for compatibility. New direct downloads do not create a Resend contact or receipt, so receipt counts no longer measure demo uptake. `cta_click` with `demo_direct_mac` / `demo_direct_windows`, destination `download_link`, records a click, not completion. Static-file links do not run GA4; email links deliberately have no UTM query. Resend HTML click tracking can count those clicks.

## Preparation (read-only)

Use a **fresh, private output directory**, outside version control. `RESEND_API_KEY` comes from the existing secret environment; never put its value in a command, file or PR.

```sh
node --import tsx scripts/prepare-masterchain-demo-followup.ts --preview-only /private/tmp/masterchain-followup-preview-NEW
node --import tsx scripts/prepare-masterchain-demo-followup.ts --prepare /private/tmp/masterchain-followup-NEW 6ff80645-34af-4cd7-8d1f-d20a16e863b6 a615f3f2-4bd5-4e52-9e74-32a2ec67cbef
```

The script only GETs Resend. It validates campaign identity and the MUEDsp segment, exhausts pages, requires email history before the demo launch, and refuses incomplete data. It selects product-page clicks (including #windows), deduplicates addresses, and excludes demo/trial/license mail recipients, absent/unsubscribed contacts and observed bounce/complaint/suppression events. Matching a mail excludes the recipient regardless of its delivery status. Unsubscribe-only and learn-only clicks do not qualify. Language is unknown; use one bilingual broadcast or independently verified preferences, never infer language from an address.

API references: [broadcast recipients](https://resend.com/docs/api-reference/broadcasts/list-broadcast-recipients), [emails](https://resend.com/docs/api-reference/emails/list-emails), [contacts](https://resend.com/docs/api-reference/contacts/list-contacts). Recipient results may be cached for 15 minutes. Re-run before sending and let Resend enforce current unsubscribes/suppressions. Never import as resubscribed. Outputs are preparation snapshots, not an evergreen mailing list.

Live read at 2026-10-04 23:24 JST: 96 distinct clicked recipients across the two broadcasts, 80 clicked product-page links; 3 had demo/license mail, 4 were otherwise ineligible; **73 candidates**. History reached 2026-09-05. The 3 and 4 did not overlap in this snapshot. These are email events, not download completions, and the supplied “105 clicks / 4 downloads” was not reproduced by this definition.

`emailTemplates.masterchainDemoFollowup('en'|'ja')` uses the existing mail template's new minimal variant (all other email layouts unchanged). The script renders HTML and text. The `{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder must be expanded by **Resend Broadcasts**, not transactional send. Verify that footer and direct links in the final draft. Nothing here creates or sends a broadcast.

## Link allocation

| Email label | URL | Placement |
|---|---|---|
| Download the Mac demo / Mac 版デモをダウンロード (AU / VST3 / AAX) | https://mued.jp/downloads/keyentry-2026.10/MUEDsp-masterchain-1.0.1-installer.pkg | Download paragraph |
| Download the Windows demo / Windows 版デモをダウンロード (VST3) | https://mued.jp/downloads/MUEDsp-masterchain-1.0.1-win-x64-a2678157.zip | Same paragraph, second OS option |
| Unsubscribe / 配信停止 | `{{{RESEND_UNSUBSCRIBE_URL}}}` | Footer |

## KVR update, after LP deployment

Product: https://www.kvraudio.com/product/muedsp-masterchain-by-glasswerks

Keep the main product link; point demo/download to `https://mued.jp/en/muedsp?utm_source=kvr&utm_medium=referral&utm_campaign=press_masterchain-demo-direct&utm_content=demo#demo` (OS options, no form). If KVR supports distinct OS download fields, use the two direct file links above.

Replace the stale “a Windows version is coming soon” sentence with:

> Available for macOS (AU, VST3 and AAX) and Windows (VST3). The demo is now available as a direct download, with no registration or email address required.

Retain the existing demo-limit and license paragraphs. Prepared forum reply:

> No registration required for the masterchain demo now. We removed the email form, so you can download the Mac (AU/VST3/AAX) or Windows (VST3) demo directly: https://mued.jp/en/muedsp?utm_source=kvr&utm_medium=referral&utm_campaign=press_masterchain-demo-direct&utm_content=forum#demo
>
> The demo processes the first 45 seconds of audio each time you insert it, then passes audio through unprocessed. Settings and presets aren't saved. Thanks for trying it.

At inspection KVR's public product page showed Forum 0, Discussion 0, and an LP URL as its Mac download link. Do not invent a prior forum thread or create a new thread just to “bump” it. A verified existing thread and an authenticated developer session are required to apply these updates.

## Validation

- Focused tests initially: 81 passed, including installer integrity pins and purchase modal.
- Full unit run: 3,398 passed; one new Windows-format line hit an existing Mac format guard; three failures were sandbox IPC startup restrictions. The narrow Windows-label exemption and rendered-label assertion were added; the affected suites then passed (35 tests). The IPC-only suites passed outside the sandbox (57 tests).
- App and scripts type checks passed. Touched-file lint passed.
- Local Next server rendered both locales; Japanese 390px phone layout showed two amber full-width download links.
- Mac link clicked in the browser with no form: downloaded PKG SHA-256 `2a800e04fe5bee6d992e39db4a8cad15550107d47cde3b1b7994f5b2b3817d51`, identical to the pinned shelf file.
- Both live installer URLs returned 200 with binary content types and expected sizes (Mac 4,321,171 bytes; Windows 1,416,745 bytes).
- Email previews generated; no broadcast or KVR publication performed during preparation.

Rollback: revert this PR through the normal reviewed branch/PR route. Installer binaries and purchase/license handling are unchanged.
