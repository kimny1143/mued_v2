'use client';

/**
 * MCP Setup Guide Page
 *
 * Shows host-specific MCP configuration JSON with the user's Clerk ID
 * auto-embedded. Supports Claude Desktop, Claude Code, Cursor, Windsurf, Cline.
 */

import { useState } from 'react';
import Link from 'next/link';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { useLocale } from '@/lib/i18n/locale-context';
import { Check, Copy, ArrowLeft, Terminal } from 'lucide-react';

// ========================================
// Types & Constants
// ========================================

type McpHost = 'claude-desktop' | 'claude-code' | 'cursor' | 'windsurf' | 'cline';

interface HostInfo {
  id: McpHost;
  name: string;
  configPath: string;
  configPathJa: string;
}

const HOSTS: HostInfo[] = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    configPath: '~/Library/Application Support/Claude/claude_desktop_config.json (macOS)\n%APPDATA%/Claude/claude_desktop_config.json (Windows)',
    configPathJa: '~/Library/Application Support/Claude/claude_desktop_config.json (macOS)\n%APPDATA%/Claude/claude_desktop_config.json (Windows)',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    configPath: 'Project root: .mcp.json',
    configPathJa: 'プロジェクトルート: .mcp.json',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configPath: 'Project root: .cursor/mcp.json',
    configPathJa: 'プロジェクトルート: .cursor/mcp.json',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    configPathJa: '~/.codeium/windsurf/mcp_config.json',
  },
  {
    id: 'cline',
    name: 'Cline (VS Code)',
    configPath: 'VS Code Settings → cline.mcpServers',
    configPathJa: 'VS Code 設定 → cline.mcpServers',
  },
];

// ========================================
// Config Generators
// ========================================

const MCP_SERVER_URL = 'https://hoo-mcp.glasswerkskimny.workers.dev';

function generateConfig(_host: McpHost): string {
  const serverBlock = {
    url: `${MCP_SERVER_URL}/mcp`,
  };

  return JSON.stringify({ mcpServers: { 'mued-hoo': serverBlock } }, null, 2);
}

// ========================================
// Copy Button Component
// ========================================

function CopyButton({ text, locale }: { text: string; locale: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          {locale === 'ja' ? 'コピー済み' : 'Copied'}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {locale === 'ja' ? 'コピー' : 'Copy'}
        </>
      )}
    </button>
  );
}

// ========================================
// Main Component
// ========================================

export default function McpSetupPage() {
  const { locale } = useLocale();
  const [selectedHost, setSelectedHost] = useState<McpHost>('claude-desktop');

  const config = generateConfig(selectedHost);
  const selectedHostInfo = HOSTS.find(h => h.id === selectedHost)!;

  return (
    <MuednoteLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href="/dashboard/settings" className="text-white/40 hover:text-white text-sm mb-6 inline-flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          {locale === 'ja' ? '設定' : 'Settings'}
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Terminal className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {locale === 'ja' ? 'Hoo MCP セットアップ' : 'Hoo MCP Setup'}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {locale === 'ja'
                ? 'お使いのエディタやAIアプリにHooを接続します'
                : 'Connect Hoo to your editor or AI app'}
            </p>
          </div>
        </div>

        {/* Step 1: Select Host */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-white/70 mb-3">
              {locale === 'ja' ? '1. ホストを選択' : '1. Select your host'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {HOSTS.map(host => (
                <button
                  key={host.id}
                  onClick={() => setSelectedHost(host.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedHost === host.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {host.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Config File Location */}
          <div>
            <h2 className="text-sm font-medium text-white/70 mb-3">
              {locale === 'ja' ? '2. 設定ファイルの場所' : '2. Config file location'}
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <pre className="text-sm text-amber-300 whitespace-pre-wrap font-mono">
                {locale === 'ja' ? selectedHostInfo.configPathJa : selectedHostInfo.configPath}
              </pre>
            </div>
          </div>

          {/* Step 3: Copy Config */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-white/70">
                {locale === 'ja' ? '3. 設定JSONをコピーして貼り付け' : '3. Copy and paste this config'}
              </h2>
              <CopyButton text={config} locale={locale} />
            </div>
            <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm text-green-300 font-mono whitespace-pre">{config}</pre>
            </div>
            <p className="text-xs text-white/30 mt-2">
              {locale === 'ja'
                ? 'リモートMCPサーバーに接続します。認証はClerkセッションで自動処理されます。'
                : 'Connects to the remote MCP server. Authentication is handled automatically via your Clerk session.'}
            </p>
          </div>

          {/* What is MCP? */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-white/70 font-medium mb-2">
              {locale === 'ja' ? 'MCPとは？' : 'What is MCP?'}
            </p>
            <p className="text-xs text-white/40">
              {locale === 'ja'
                ? 'Model Context Protocol（MCP）はAIアシスタントに外部ツールやデータを提供するオープンプロトコルです。Hooを接続すると、Claude DesktopやCursorなどのAIアプリ内で直接Hooの人格・あなたのプロファイルを活用できます。'
                : 'Model Context Protocol (MCP) is an open protocol for providing AI assistants with external tools and data. Connecting Hoo lets you use Hoo\'s personality and your profile directly within AI apps like Claude Desktop or Cursor.'}
            </p>
          </div>
        </div>
      </div>
    </MuednoteLayout>
  );
}
