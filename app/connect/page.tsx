'use client';

/**
 * /connect — Hoo MCP Setup Wizard
 *
 * Interactive guide for connecting Hoo to external AI tools.
 * 3-step wizard: Generate key → Configure host → Test connection
 *
 * Distinct from /dashboard/settings/mcp (management/revoke).
 * This page is the "first encounter" experience.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackMcpConnect } from '@/lib/analytics/gtag';
import {
  Check, Copy, ArrowLeft, Key, AlertTriangle, Loader2,
  Wifi, WifiOff, ChevronRight,
} from 'lucide-react';

// ========================================
// Types & Constants
// ========================================

type McpHost = 'claude-desktop' | 'claude-code' | 'cursor' | 'windsurf' | 'cline';

interface HostInfo {
  id: McpHost;
  name: string;
}

const HOSTS: HostInfo[] = [
  { id: 'claude-desktop', name: 'Claude Desktop' },
  { id: 'claude-code', name: 'Claude Code' },
  { id: 'cursor', name: 'Cursor' },
  { id: 'windsurf', name: 'Windsurf' },
  { id: 'cline', name: 'Cline (VS Code)' },
];

const MCP_SERVER_URL = 'https://hoo-mcp.glasswerkskimny.workers.dev';

// ========================================
// Config Generator
// ========================================

function generateConfig(_host: McpHost, apiKey: string | null): string {
  const serverBlock: Record<string, unknown> = {
    url: `${MCP_SERVER_URL}/mcp`,
  };
  if (apiKey) {
    serverBlock.headers = { Authorization: `Bearer ${apiKey}` };
  }
  return JSON.stringify({ mcpServers: { 'mued-hoo': serverBlock } }, null, 2);
}

// ========================================
// Copy Button
// ========================================

function CopyButton({ text, copiedLabel, copyLabel, onCopy }: { text: string; copiedLabel: string; copyLabel: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.();
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
          {copiedLabel}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {copyLabel}
        </>
      )}
    </button>
  );
}

// ========================================
// Step Indicator
// ========================================

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = currentStep === step;
  const isComplete = currentStep > step;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          isComplete
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isActive
              ? 'bg-indigo-600 text-white'
              : 'bg-white/5 text-white/30 border border-white/10'
        }`}
      >
        {isComplete ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm ${isActive ? 'text-white font-medium' : isComplete ? 'text-white/60' : 'text-white/30'}`}>
        {label}
      </span>
    </div>
  );
}

// ========================================
// Main Component
// ========================================

export default function ConnectPage() {
  const { t } = useLocale();
  const c = t.connect;

  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [existingKeyPrefix, setExistingKeyPrefix] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedHost, setSelectedHost] = useState<McpHost>('claude-desktop');

  // Connection test state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');

  const config = generateConfig(selectedHost, apiKey);
  const hasKey = !!(apiKey || existingKeyPrefix);

  // Track step transitions
  useEffect(() => {
    trackMcpConnect('step_viewed', { step: currentStep });
  }, [currentStep]);

  // Check for existing API key on mount
  useEffect(() => {
    fetch('/api/mcp/api-key')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data.keys.length > 0) {
          setExistingKeyPrefix(res.data.keys[0].prefix);
          setCurrentStep(2); // Skip to step 2 if key exists
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleGenerateKey = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/mcp/api-key', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setApiKey(data.data.key);
        setExistingKeyPrefix(data.data.prefix);
        setCurrentStep(2);
        trackMcpConnect('key_generated');
      } else {
        setGenerateError(data.error ?? 'APIキーの発行に失敗しました');
      }
    } catch {
      setGenerateError('接続エラー。ページを再読み込みしてお試しください。');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!apiKey && !existingKeyPrefix) return;
    setTestStatus('testing');

    try {
      // Use our own API route to test the connection (avoids CORS)
      const res = await fetch('/api/mcp/test-connection', { method: 'POST' });
      const data = await res.json();
      const result = data.success ? 'success' : 'failure';
      setTestStatus(result);
      trackMcpConnect(result === 'success' ? 'test_success' : 'test_failure');
    } catch {
      setTestStatus('failure');
      trackMcpConnect('test_failure');
    }
  }, [apiKey, existingKeyPrefix]);

  if (isLoading) {
    return (
      <MuednoteLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      </MuednoteLayout>
    );
  }

  return (
    <MuednoteLayout>
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="text-white/40 hover:text-white text-sm mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {c.backToDashboard}
        </Link>

        {/* Header with Hoo */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl" role="img" aria-label="owl">🦉</span>
            <h1 className="text-2xl font-bold text-white">{c.title}</h1>
          </div>
          <p className="text-white/50 text-sm">{c.subtitle}</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-10">
          <StepIndicator step={1} currentStep={currentStep} label={c.step1.label} />
          <ChevronRight className="w-4 h-4 text-white/20" />
          <StepIndicator step={2} currentStep={currentStep} label={c.step2.label} />
          <ChevronRight className="w-4 h-4 text-white/20" />
          <StepIndicator step={3} currentStep={currentStep} label={c.step3.label} />
        </div>

        {/* Step Content */}
        <div className="space-y-8">
          {/* === Step 1: Generate API Key === */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">{c.step1.title}</h2>
                <p className="text-sm text-white/50">{c.step1.description}</p>
              </div>

              {apiKey ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-300 font-medium mb-2">{c.step1.keyWarning}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-green-300 bg-black/30 px-3 py-1.5 rounded font-mono break-all">
                            {apiKey}
                          </code>
                          <CopyButton text={apiKey} copiedLabel={c.copied} copyLabel={c.copy} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hoo speech */}
                  <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
                    <p className="text-sm text-indigo-300/80 italic">
                      🦉 {c.step1.hooSays}
                    </p>
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {c.step2.label}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleGenerateKey}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {c.step1.generating}
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        {c.step1.generate}
                      </>
                    )}
                  </button>
                  {generateError && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {generateError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === Step 2: Select Host & Copy Config === */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">{c.step2.title}</h2>
                <p className="text-sm text-white/50">{c.step2.description}</p>
              </div>

              {/* Host selector */}
              <div>
                <p className="text-xs text-white/40 mb-2">{c.step2.selectHost}</p>
                <div className="flex flex-wrap gap-2">
                  {HOSTS.map(host => (
                    <button
                      key={host.id}
                      onClick={() => {
                        setSelectedHost(host.id);
                        trackMcpConnect('host_selected', { host: host.id });
                      }}
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

              {/* Config file location */}
              <div>
                <p className="text-xs text-white/40 mb-2">{c.step2.configLocation}</p>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <pre className="text-sm text-amber-300 whitespace-pre-wrap font-mono">
                    {c.hosts[selectedHost]}
                  </pre>
                </div>
              </div>

              {/* Config JSON */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">{c.step2.configJson}</p>
                  <CopyButton text={config} copiedLabel={c.copied} copyLabel={c.copy} onCopy={() => trackMcpConnect('config_copied', { host: selectedHost })} />
                </div>
                <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-sm text-green-300 font-mono whitespace-pre">{config}</pre>
                </div>
                {!hasKey && (
                  <p className="text-xs text-amber-400/70 mt-2">{c.step2.hint}</p>
                )}
              </div>

              {/* Hoo speech */}
              <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
                <p className="text-sm text-indigo-300/80 italic">
                  🦉 {c.step2.hooSays}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-sm text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
                  {c.step1.label}
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {c.step3.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* === Step 3: Connection Test === */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">{c.step3.title}</h2>
                <p className="text-sm text-white/50">{c.step3.description}</p>
              </div>

              {!hasKey ? (
                <p className="text-sm text-amber-400">{c.step3.noKey}</p>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {testStatus === 'testing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {c.step3.testing}
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4" />
                        {c.step3.testButton}
                      </>
                    )}
                  </button>

                  {/* Test result */}
                  {testStatus === 'success' && (
                    <div className="space-y-3">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-green-400" />
                        <p className="text-sm text-green-300">{c.step3.success}</p>
                      </div>
                      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
                        <p className="text-sm text-indigo-300/80 italic">
                          🦉 {c.step3.hooSuccess}
                        </p>
                      </div>
                    </div>
                  )}

                  {testStatus === 'failure' && (
                    <div className="space-y-3">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-300">{c.step3.failure}</p>
                      </div>
                      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
                        <p className="text-sm text-indigo-300/80 italic">
                          🦉 {c.step3.hooFailure}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* What's next */}
              {testStatus === 'success' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-white mb-3">{c.whatNext.title}</h3>
                  <ul className="space-y-2">
                    {c.whatNext.items.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                        <Check className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-sm text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
                  {c.step2.label}
                </button>
                {testStatus === 'success' && (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {c.backToDashboard}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pro Template CTA */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5">
            <h3 className="text-sm font-medium text-white mb-1">{c.proTemplate.title}</h3>
            <p className="text-xs text-white/50 mb-3">{c.proTemplate.description}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://glasswerks.gumroad.com/l/claude-code-template-pro?utm_source=mued&utm_medium=web&utm_campaign=connect_page&utm_content=pro-template-cta"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {c.proTemplate.proButton}
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://github.com/kimny1143/claude-code-template"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-medium rounded-lg transition-colors"
              >
                {c.proTemplate.freeButton}
              </a>
            </div>
          </div>
        </div>
      </div>
    </MuednoteLayout>
  );
}
