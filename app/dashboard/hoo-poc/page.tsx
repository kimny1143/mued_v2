'use client';

/**
 * Hoo AI PoC Test Page
 *
 * Model comparison interface for evaluating Claude vs Gemini.
 * Tests character consistency, response quality, cost, and latency.
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, RotateCcw, Clock, Coins, MessageSquare } from 'lucide-react';

type HooModelId = 'claude-sonnet-4' | 'claude-haiku' | 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gpt-4.1-mini' | 'gpt-5-mini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiResponse {
  content: string;
  model: string;
  provider: 'claude' | 'gemini';
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
    totalJpy: number;
  };
  latencyMs: number;
}

interface Stats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  latencyCount: number;
}

const MODELS: { id: HooModelId; name: string; description: string }[] = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', description: '~2.5円/会話' },
  { id: 'claude-haiku', name: 'Claude Haiku 4.5', description: '~0.9円/会話' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '~0.05円/会話' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '~0.08円/会話' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: '~0.3円/会話' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: '~0.35円/会話' },
];

const TEST_SCENARIOS = [
  { label: 'Initial Greeting', text: 'こんにちは' },
  { label: 'Creative Struggle', text: '曲が完成しないんだよね。途中まではいいんだけど、いつも最後まで作れない。' },
  { label: 'Organize Thoughts', text: '最近考えてることがバラバラで整理できてない。新しいアルバムのコンセプトと、ライブの準備と、SNSの発信と...' },
  { label: 'Request Summary', text: 'ここまでの話をまとめて' },
];

export default function HooPocPage() {
  const [selectedModel, setSelectedModel] = useState<HooModelId>('claude-sonnet-4');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalMessages: 0,
    totalTokens: 0,
    totalCost: 0,
    avgLatency: 0,
    latencyCount: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Longer timeout for reasoning models (GPT-5-mini)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

      const response = await fetch('/api/hoo/poc/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: newMessages,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      console.log('[HooPoc] API response:', result);

      if (result.success) {
        const data = result.data as ApiResponse;
        setLastResponse(data);
        setMessages([...newMessages, { role: 'assistant', content: data.content }]);

        // Update stats
        setStats((prev) => ({
          totalMessages: prev.totalMessages + 1,
          totalTokens: prev.totalTokens + data.usage.totalTokens,
          totalCost: prev.totalCost + data.cost.totalJpy,
          avgLatency:
            (prev.avgLatency * prev.latencyCount + data.latencyMs) / (prev.latencyCount + 1),
          latencyCount: prev.latencyCount + 1,
        }));
      } else {
        console.error('API Error:', result.error);
        setMessages([
          ...newMessages,
          { role: 'assistant', content: `Error: ${result.error}` },
        ]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out (2 min). Try a faster model.'
        : 'Network error occurred.';
      setMessages([
        ...newMessages,
        { role: 'assistant', content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setMessages([]);
    setLastResponse(null);
    setStats({
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      avgLatency: 0,
      latencyCount: 0,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Hoo AI PoC
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Model comparison: Claude vs Gemini
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Model Selection & Stats */}
          <div className="space-y-4">
            {/* Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      handleReset();
                    }}
                    className={`w-full p-3 rounded-lg text-left transition ${
                      selectedModel === model.id
                        ? 'bg-[var(--color-brand-green)] text-[var(--color-brand-text)]'
                        : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                    }`}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs opacity-70">{model.description}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span className="text-[var(--color-text-secondary)]">Messages:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {stats.totalMessages}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span className="text-[var(--color-text-secondary)]">Avg Latency:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {stats.avgLatency.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span className="text-[var(--color-text-secondary)]">Total Cost:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {stats.totalCost.toFixed(4)}円
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Tokens: {stats.totalTokens.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            {/* Last Response Details */}
            {lastResponse && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Last Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-[var(--color-text-secondary)]">Model:</div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {lastResponse.model}
                    </div>
                    <div className="text-[var(--color-text-secondary)]">Latency:</div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {lastResponse.latencyMs.toFixed(0)}ms
                    </div>
                    <div className="text-[var(--color-text-secondary)]">Input:</div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {lastResponse.usage.inputTokens} tokens
                    </div>
                    <div className="text-[var(--color-text-secondary)]">Output:</div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {lastResponse.usage.outputTokens} tokens
                    </div>
                    <div className="text-[var(--color-text-secondary)]">Cost:</div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {lastResponse.cost.totalJpy.toFixed(4)}円
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-[500px]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Chat with Hoo
                  <span className="text-sm font-normal text-[var(--color-text-secondary)]">
                    ({MODELS.find((m) => m.id === selectedModel)?.name})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[400px]">
                  {messages.length === 0 && (
                    <div className="text-center text-[var(--color-text-secondary)] py-8">
                      <p className="mb-4">Start a conversation with Hoo</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {TEST_SCENARIOS.map((scenario) => (
                          <button
                            key={scenario.label}
                            onClick={() => sendMessage(scenario.text)}
                            className="px-3 py-1 text-sm rounded-full bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] transition"
                          >
                            {scenario.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-[var(--color-brand-green)] text-[var(--color-brand-text)]'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
                        }`}
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {msg.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--color-bg-secondary)] rounded-lg px-4 py-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {TEST_SCENARIOS.map((scenario) => (
                      <button
                        key={scenario.label}
                        onClick={() => sendMessage(scenario.text)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition disabled:opacity-50"
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 resize-none bg-[var(--color-bg-secondary)] border-[var(--color-card-border)] text-[var(--color-text-primary)]"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
