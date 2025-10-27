/**
 * Markdown to HTML Converter
 *
 * Markdownを印刷用HTMLに変換
 */

/**
 * Markdownを簡易HTMLに変換（印刷用）
 * react-markdownを使わずシンプルな変換を実装
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // ABC記法ブロックを一時的に除去（後で別途レンダリング）
  html = html.replace(/```abc\n[\s\S]*?```/g, '<!-- ABC_BLOCK -->');

  // コードブロック
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 見出し (h1-h6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 太字
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // イタリック
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // リスト（順序なし）
  html = html.replace(/^\-\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');

  // <li>をまとめて<ul>で囲む
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>');

  // 順序付きリスト
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // 段落（2つ以上の改行）
  html = html.split('\n\n').map(para => {
    para = para.trim();
    if (para.length === 0) return '';
    if (para.startsWith('<')) return para; // すでにHTMLタグの場合
    return `<p>${para}</p>`;
  }).join('\n');

  // 単一の改行を<br>に
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Markdownからプレーンテキストを抽出（メタデータ用）
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // コードブロックを除去
  text = text.replace(/```[\s\S]*?```/g, '');

  // 見出しマーカーを除去
  text = text.replace(/^#+\s+/gm, '');

  // リストマーカーを除去
  text = text.replace(/^\-\s+/gm, '');
  text = text.replace(/^\*\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // 太字・イタリックマーカーを除去
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // 連続する空白を1つに
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}
