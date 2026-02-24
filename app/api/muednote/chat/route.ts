/**
 * @deprecated このAPIは MUEDnote v2.0（Web チャット）アプローチの実装です。
 *
 * MUEDnote v6.1（沈黙のコンソール）仕様では、AIは応答・質問・コメントを
 * 一切行いません。このAPIは v6.1 仕様に違反しているため、将来的に廃止予定です。
 *
 * 正式な実装は apps/muednote-v3/ (Tauri デスクトップアプリ) で行われます。
 *
 * @see docs/business/MUEDnote/muednote_master_plan_v6.1.md
 * @see docs/business/MUEDnote/DOCUMENTATION_STRUCTURE.md
 */

export const runtime = 'edge';
export const maxDuration = 30;

/**
 * @deprecated v2.0 レガシー実装。410 Gone を返す。
 */
export async function POST() {
  return new Response(
    JSON.stringify({
      error: 'This API is deprecated. Please use the MUEDnote v3 desktop app.',
      code: 'DEPRECATED_ENDPOINT'
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
