import type { Page, Route } from '@playwright/test';

export type DialMode = 'omakase' | 'dialogue' | null;
export type MasteringMode = 'omakase' | 'dialogue' | null;
export type TaskType =
  | 'preview'
  | 'mix_check'
  | 'final_basic'
  | 'final_advanced'
  | 'mastering_preview'
  | 'mastering';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ChatAction =
  | 'adjust_preview'
  | 'request_mix_check'
  | 'request_final'
  | 'set_mastering_params'
  | 'request_mastering_final';

export interface MockTrack {
  id: string;
  originalFilename: string;
  instrumentGroup: string;
  presenceSetting: string;
  panPreference: string;
  reverbPreference: string;
  r2Url: string | null;
}

export interface MockTask {
  id: string;
  taskType: TaskType;
  status: TaskStatus;
  previewUrl: string | null;
  finalUrl: string | null;
  stemsUrls: Record<string, string> | null;
  previewParams: {
    musicalStyle: string;
    tracks: Array<{
      id: string;
      filename: string;
      instrumentGroup: string;
      presenceSetting: string;
      panPreference: string;
      reverbPreference: string;
    }>;
  } | null;
  createdAt: string;
}

export interface MockChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parameterChanges?: Array<{
    track: string;
    changes: Record<string, unknown>;
    reason: string;
  }> | null;
  action?: ChatAction | null;
  applied?: boolean;
  createdAt: string;
}

export interface MockSession {
  id: string;
  mode: DialMode;
  masteringMode: MasteringMode;
  status: string;
  musicalStyle: string;
  title: string | null;
  paymentStatus: 'pending' | 'paid';
  mixCheckCount: number;
  previewCount: number;
  paidCycleCount: number;
  baseCycleLimit: number;
  additionalCyclesPurchased: number;
  additionalCycleLimit: number;
  tracks: MockTrack[];
  tasks: MockTask[];
  analysisResult: Record<string, unknown> | null;
  referenceTrackUrl?: string | null;
  referenceTrackFilename?: string | null;
  referenceAnalysisResult?: Record<string, unknown> | null;
}

export interface ChatResponse {
  content: string;
  action?: ChatAction | null;
  parameterChanges?: MockChatMessage['parameterChanges'];
  desiredLoudness?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  styleSet?: string | null;
}

interface JsonResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DialMockOptions {
  session?: Partial<MockSession>;
  messages?: MockChatMessage[];
  paymentPendingPolls?: number;
  onChat?: (message: string, server: DialMockServer) => ChatResponse;
  onPreview?: (server: DialMockServer) => JsonResponse;
  onFinal?: (
    body: { taskId: string; type: 'mix_check' | 'final' },
    server: DialMockServer
  ) => JsonResponse | 'timeout';
  onMasteringPreview?: (
    body: { sessionId: string; desiredLoudness?: 'LOW' | 'MEDIUM' | 'HIGH' },
    server: DialMockServer
  ) => JsonResponse;
  onMasteringFinal?: (body: { taskId: string }, server: DialMockServer) => JsonResponse;
  onPollFinal?: (taskId: string, server: DialMockServer) => JsonResponse;
  onPollMasteringPreview?: (taskId: string, server: DialMockServer) => JsonResponse;
}

let taskCounter = 1;
let messageCounter = 1;
let trackCounter = 1;

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function success(data: unknown): JsonResponse {
  return { success: true, data };
}

function failure(error: string): JsonResponse {
  return { success: false, error };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function buildTrack(name: string, instrumentGroup = 'OTHER'): MockTrack {
  const id = `track-${trackCounter++}`;
  return {
    id,
    originalFilename: name,
    instrumentGroup,
    presenceSetting: 'NORMAL',
    panPreference: 'NO_PREFERENCE',
    reverbPreference: 'NONE',
    r2Url: `https://cdn.example.test/r2/original-${id}.wav`,
  };
}

export interface BuildTaskOptions {
  stemCount?: number;
  stemNames?: string[];
}

const DEFAULT_STEM_NAMES = ['vocals.wav', 'drums.wav'];

export function buildTask(
  taskType: TaskType,
  overrides: Partial<MockTask> = {},
  options: BuildTaskOptions = {},
): MockTask {
  const stemNamesForTask = options.stemNames
    ?? (options.stemCount
      ? DEFAULT_STEM_NAMES.slice(0, options.stemCount).concat(
          Array.from({ length: Math.max(0, options.stemCount - DEFAULT_STEM_NAMES.length) }, (_, i) => `stem-${i + DEFAULT_STEM_NAMES.length + 1}.wav`)
        )
      : DEFAULT_STEM_NAMES);

  const defaultStemsUrls = Object.fromEntries(
    stemNamesForTask.map((name) => [name, `https://cdn.example.test/stems/${name}`])
  );

  return {
    id: overrides.id ?? `task-${taskCounter++}`,
    taskType,
    status: overrides.status ?? 'completed',
    previewUrl: overrides.previewUrl ?? (taskType === 'preview' || taskType === 'mastering_preview' ? `https://cdn.example.test/${taskType}-${taskCounter}.mp3` : null),
    finalUrl: overrides.finalUrl ?? (taskType === 'mix_check' || taskType === 'final_basic' || taskType === 'final_advanced' || taskType === 'mastering'
      ? `https://cdn.example.test/${taskType}-${taskCounter}.wav`
      : null),
    stemsUrls: overrides.stemsUrls !== undefined
      ? overrides.stemsUrls
      : (taskType === 'final_basic' || taskType === 'final_advanced' ? defaultStemsUrls : null),
    previewParams: overrides.previewParams ?? null,
    createdAt: overrides.createdAt ?? nowIso(),
  };
}

export function buildSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    id: overrides.id ?? 'dial-session-1',
    mode: overrides.mode ?? 'dialogue',
    masteringMode: overrides.masteringMode ?? null,
    status: overrides.status ?? 'uploading',
    musicalStyle: overrides.musicalStyle ?? 'pop',
    title: overrides.title ?? 'E2E Session',
    paymentStatus: overrides.paymentStatus ?? 'paid',
    mixCheckCount: overrides.mixCheckCount ?? 0,
    previewCount: overrides.previewCount ?? 0,
    paidCycleCount: overrides.paidCycleCount ?? 0,
    baseCycleLimit: overrides.baseCycleLimit ?? 5,
    additionalCyclesPurchased: overrides.additionalCyclesPurchased ?? 0,
    additionalCycleLimit: overrides.additionalCycleLimit ?? 5,
    tracks: overrides.tracks ?? [],
    tasks: overrides.tasks ?? [],
    analysisResult: overrides.analysisResult ?? null,
    referenceTrackUrl: overrides.referenceTrackUrl ?? null,
    referenceTrackFilename: overrides.referenceTrackFilename ?? null,
    referenceAnalysisResult: overrides.referenceAnalysisResult ?? null,
  };
}

export async function seedDialGuestSession(
  page: Page,
  sessionId: string,
  guestToken = 'guest-token-e2e',
) {
  await page.addInitScript(
    ({ storedSessionId, storedGuestToken }) => {
      window.localStorage.setItem('dial_session_id', storedSessionId);
      window.localStorage.setItem('dial_guest_token', storedGuestToken);
    },
    { storedSessionId: sessionId, storedGuestToken: guestToken },
  );
}

export class DialMockServer {
  readonly guestToken = 'guest-token-e2e';
  readonly state: {
    session: MockSession;
    messages: MockChatMessage[];
  };

  private readonly options: DialMockOptions;
  private paymentPendingPolls: number;
  private shouldCompleteTimedOutFinalOnPoll = false;

  constructor(private readonly page: Page, options: DialMockOptions = {}) {
    this.options = options;
    this.state = {
      session: buildSession(options.session),
      messages: clone(options.messages ?? []),
    };
    this.paymentPendingPolls = options.paymentPendingPolls ?? 0;
  }

  async install() {
    await this.page.route('**/__e2e/upload-proxy', async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fulfill({ status: 405, body: 'Method Not Allowed' });
        return;
      }

      await route.fulfill({ status: 200, body: '' });
    });

    await this.page.route('**/api/dial/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();

      if (path === '/api/dial/checkout' && method === 'POST') {
        await this.fulfillJson(route, success({
          url: `/dial/session/${this.state.session.id}?payment=success`,
          sessionId: this.state.session.id,
          guestToken: this.guestToken,
        }));
        return;
      }

      if (path === '/api/dial/session' && method === 'GET') {
        if (this.paymentPendingPolls > 0) {
          this.paymentPendingPolls -= 1;
          await this.fulfillJson(route, success({
            ...clone(this.state.session),
            paymentStatus: 'pending',
          }));
          return;
        }

        this.state.session.paymentStatus = 'paid';
        await this.fulfillJson(route, success(clone(this.state.session)));
        return;
      }

      if (path === '/api/dial/session' && method === 'PATCH') {
        const body = await request.postDataJSON();
        if (typeof body.musicalStyle === 'string') {
          this.state.session.musicalStyle = body.musicalStyle;
        }
        if (typeof body.title === 'string') {
          this.state.session.title = body.title;
        }
        await this.fulfillJson(route, success(clone(this.state.session)));
        return;
      }

      if (path === '/api/dial/upload/presign' && method === 'POST') {
        const body = await request.postDataJSON();
        const fileName = body.fileName as string;
        await this.fulfillJson(route, success({
          signedUrl: `https://upload.example.test/${encodeURIComponent(fileName)}`,
          readableUrl: `https://readable.example.test/${encodeURIComponent(fileName)}`,
        }));
        return;
      }

      if (path === '/api/dial/upload/confirm' && method === 'POST') {
        const body = await request.postDataJSON();
        const track = buildTrack(body.fileName as string, (body.instrumentGroup as string) || 'OTHER');
        this.state.session.tracks.push(track);
        this.state.session.status = 'uploading';
        await this.fulfillJson(route, success({
          trackId: track.id,
          readableUrl: body.readableUrl,
          r2Url: null,
        }));
        return;
      }

      if (path === '/api/dial/tracks' && method === 'PATCH') {
        const body = await request.postDataJSON();
        const updates = (body.updates as Array<Record<string, string>>) ?? [];
        for (const update of updates) {
          const track = this.state.session.tracks.find((item) => item.id === update.trackId);
          if (!track) continue;
          if (typeof update.instrumentGroup === 'string') track.instrumentGroup = update.instrumentGroup;
          if (typeof update.presenceSetting === 'string') track.presenceSetting = update.presenceSetting;
          if (typeof update.panPreference === 'string') track.panPreference = update.panPreference;
          if (typeof update.reverbPreference === 'string') track.reverbPreference = update.reverbPreference;
        }
        await this.fulfillJson(route, success({ tracks: clone(this.state.session.tracks) }));
        return;
      }

      if (path === '/api/dial/tracks' && method === 'DELETE') {
        const body = await request.postDataJSON();
        this.state.session.tracks = this.state.session.tracks.filter((track) => track.id !== body.trackId);
        await this.fulfillJson(route, success({ deleted: true }));
        return;
      }

      if (path === '/api/dial/chat' && method === 'GET') {
        await this.fulfillJson(route, success({ messages: clone(this.state.messages) }));
        return;
      }

      if (path === '/api/dial/chat' && method === 'POST') {
        const body = await request.postDataJSON();
        const message = body.message as string;
        this.state.messages.push({
          id: `msg-${messageCounter++}`,
          role: 'user',
          content: message,
          createdAt: nowIso(),
        });

        const response = this.options.onChat
          ? this.options.onChat(message, this)
          : { content: 'Hoo is ready when you are.' };

        const assistantMessage: MockChatMessage = {
          id: `msg-${messageCounter++}`,
          role: 'assistant',
          content: response.content,
          parameterChanges: response.parameterChanges ?? null,
          action: response.action ?? null,
          createdAt: nowIso(),
        };
        this.state.messages.push(assistantMessage);

        if (response.styleSet) {
          this.state.session.musicalStyle = response.styleSet;
        }

        await this.fulfillJson(route, success({
          content: response.content,
          parameterChanges: response.parameterChanges ?? null,
          action: response.action ?? null,
          desiredLoudness: response.desiredLoudness ?? null,
          styleSet: response.styleSet ?? null,
        }));
        return;
      }

      if (path === '/api/dial/preview' && method === 'POST') {
        const result = this.options.onPreview
          ? this.options.onPreview(this)
          : this.defaultPreviewResponse();
        await this.fulfillJson(route, result, result.success ? 200 : 400);
        return;
      }

      if (path === '/api/dial/final' && method === 'POST') {
        const body = await request.postDataJSON();
        const result = this.options.onFinal
          ? this.options.onFinal(body, this)
          : this.defaultFinalResponse(body);

        if (result === 'timeout') {
          await route.abort('timedout');
          return;
        }

        await this.fulfillJson(route, result, result.success ? 200 : 402);
        return;
      }

      if (path === '/api/dial/final' && method === 'GET') {
        const taskId = url.searchParams.get('taskId') ?? '';
        const result = this.options.onPollFinal
          ? this.options.onPollFinal(taskId, this)
          : this.defaultPollFinal(taskId);
        await this.fulfillJson(route, result, result.success ? 200 : 404);
        return;
      }

      if (path === '/api/dial/mastering/preview' && method === 'POST') {
        const body = await request.postDataJSON();
        const result = this.options.onMasteringPreview
          ? this.options.onMasteringPreview(body, this)
          : this.defaultMasteringPreviewResponse(body);
        await this.fulfillJson(route, result, result.success ? 200 : 400);
        return;
      }

      if (path === '/api/dial/mastering/preview' && method === 'GET') {
        const taskId = url.searchParams.get('taskId') ?? '';
        const result = this.options.onPollMasteringPreview
          ? this.options.onPollMasteringPreview(taskId, this)
          : this.defaultPollMasteringPreview(taskId);
        await this.fulfillJson(route, result, result.success ? 200 : 404);
        return;
      }

      if (path === '/api/dial/mastering/final' && method === 'POST') {
        const body = await request.postDataJSON();
        const result = this.options.onMasteringFinal
          ? this.options.onMasteringFinal(body, this)
          : this.defaultMasteringFinalResponse(body);
        await this.fulfillJson(route, result, result.success ? 200 : 400);
        return;
      }

      if (path === '/api/dial/download' && method === 'GET') {
        await this.fulfillDownload(route, 'final-mix.wav', 'RIFF....WAVE');
        return;
      }

      if (path === '/api/dial/stems' && method === 'GET') {
        await this.fulfillDownload(route, 'muedial-stems.zip', 'PK\x03\x04');
        return;
      }

      if (path === '/api/dial/analyze' && method === 'POST') {
        await this.fulfillJson(route, success({ analyzed: true }));
        return;
      }

      if (path === '/api/dial/link-account' && method === 'POST') {
        await this.fulfillJson(route, success({ linked: true }));
        return;
      }

      await route.fulfill({ status: 501, body: `Unhandled Dial mock route: ${method} ${path}` });
    });
  }

  latestTask(taskType?: TaskType) {
    if (!taskType) return this.state.session.tasks[0];
    return this.state.session.tasks.find((task) => task.taskType === taskType);
  }

  pushPreviewTask(status: TaskStatus = 'completed') {
    const task = buildTask('preview', {
      status,
      previewParams: {
        musicalStyle: this.state.session.musicalStyle,
        tracks: this.state.session.tracks.map((track) => ({
          id: track.id,
          filename: track.originalFilename,
          instrumentGroup: track.instrumentGroup,
          presenceSetting: track.presenceSetting,
          panPreference: track.panPreference,
          reverbPreference: track.reverbPreference,
        })),
      },
    });
    if (status !== 'completed') {
      task.previewUrl = null;
    }
    this.state.session.tasks.unshift(task);
    this.state.session.previewCount += 1;
    this.state.session.status = status === 'completed' ? 'uploading' : 'previewing';
    return task;
  }

  pushMixTask(taskType: 'mix_check' | 'final_basic' | 'final_advanced', status: TaskStatus = 'completed', options: BuildTaskOptions = {}) {
    const task = buildTask(taskType, { status }, options);
    if (status !== 'completed') {
      task.finalUrl = null;
      task.stemsUrls = null;
    }
    this.state.session.tasks.unshift(task);
    this.state.session.paidCycleCount += 1;
    if (taskType === 'mix_check') {
      this.state.session.mixCheckCount += 1;
      this.state.session.status = status === 'completed' ? 'mixing' : 'mixing';
    } else if (this.state.session.masteringMode) {
      this.state.session.status = status === 'completed' ? 'mastering' : 'mixing';
    } else {
      this.state.session.status = status === 'completed' ? 'completed' : 'mixing';
    }
    return task;
  }

  pushMasteringPreviewTask(status: TaskStatus = 'completed') {
    const task = buildTask('mastering_preview', { status });
    if (status !== 'completed') {
      task.previewUrl = null;
    }
    this.state.session.tasks.unshift(task);
    this.state.session.status = 'mastering';
    return task;
  }

  pushMasteringFinalTask(status: TaskStatus = 'completed') {
    const task = buildTask('mastering', { status });
    if (status !== 'completed') {
      task.finalUrl = null;
    }
    this.state.session.tasks.unshift(task);
    this.state.session.status = status === 'completed' ? 'completed' : 'mastering';
    return task;
  }

  private defaultPreviewResponse(): JsonResponse {
    if (this.state.session.mode === 'omakase' && this.state.session.previewCount >= 5) {
      return failure('Preview limit reached (max 5). Generate your final mix.');
    }

    const task = this.pushPreviewTask('completed');
    return success({
      taskId: task.id,
      roexTaskId: task.id,
      status: task.status,
      previewUrl: task.previewUrl,
    });
  }

  private defaultFinalResponse(body: { taskId: string; type: 'mix_check' | 'final' }): JsonResponse {
    const totalCycleLimit = this.state.session.baseCycleLimit + this.state.session.additionalCyclesPurchased;

    if (body.type === 'mix_check' && this.state.session.mixCheckCount >= 2) {
      return failure('Mix check limit reached (max 2). Please generate Final Mix instead.');
    }

    if (this.state.session.paidCycleCount >= totalCycleLimit) {
      return failure('Cycle limit reached. Purchase additional cycles or finalize.');
    }

    const taskType = body.type === 'mix_check'
      ? 'mix_check'
      : this.state.session.mode === 'omakase'
        ? 'final_basic'
        : 'final_advanced';

    const task = this.pushMixTask(taskType, 'completed');

    return success({
      taskId: task.id,
      status: task.status,
      finalUrl: task.finalUrl,
    });
  }

  private defaultPollFinal(taskId: string): JsonResponse {
    const task = this.state.session.tasks.find((item) => item.id === taskId);
    if (!task) return failure('Task not found');

    if (this.shouldCompleteTimedOutFinalOnPoll && task.status === 'processing') {
      task.status = 'completed';
      task.finalUrl = `https://cdn.example.test/${task.taskType}-${task.id}.wav`;
      task.stemsUrls = task.taskType === 'mix_check'
        ? null
        : {
            'vocals.wav': 'https://cdn.example.test/stems/vocals.wav',
            'drums.wav': 'https://cdn.example.test/stems/drums.wav',
          };
      this.state.session.status = this.state.session.masteringMode ? 'mastering' : 'completed';
      this.shouldCompleteTimedOutFinalOnPoll = false;
    }

    return success({
      status: task.status,
      finalUrl: task.finalUrl,
      stemsUrls: task.stemsUrls,
    });
  }

  private defaultMasteringPreviewResponse(
    body: { sessionId: string; desiredLoudness?: 'LOW' | 'MEDIUM' | 'HIGH' },
  ): JsonResponse {
    const task = this.pushMasteringPreviewTask('completed');
    return success({
      taskId: task.id,
      roexTaskId: task.id,
      status: task.status,
      previewUrl: task.previewUrl,
      desiredLoudness: body.desiredLoudness ?? 'MEDIUM',
    });
  }

  private defaultPollMasteringPreview(taskId: string): JsonResponse {
    const task = this.state.session.tasks.find((item) => item.id === taskId);
    if (!task) return failure('Task not found');

    if (task.status === 'processing') {
      task.status = 'completed';
      task.previewUrl = `https://cdn.example.test/${task.taskType}-${task.id}.mp3`;
    }

    return success({
      status: task.status,
      previewUrl: task.previewUrl,
    });
  }

  private defaultMasteringFinalResponse(body: { taskId: string }): JsonResponse {
    const previewTask = this.state.session.tasks.find((task) => task.id === body.taskId);
    if (!previewTask) return failure('Mastering preview task not found');

    const task = this.pushMasteringFinalTask('completed');
    return success({
      taskId: task.id,
      status: task.status,
      finalUrl: task.finalUrl,
    });
  }

  forceTimedOutFinalThenCompleteOnPoll(body: { taskId: string; type: 'mix_check' | 'final' }) {
    if (this.state.session.paidCycleCount >= this.state.session.baseCycleLimit + this.state.session.additionalCyclesPurchased) {
      return failure('Cycle limit reached. Purchase additional cycles or finalize.');
    }

    const taskType = body.type === 'mix_check'
      ? 'mix_check'
      : this.state.session.mode === 'omakase'
        ? 'final_basic'
        : 'final_advanced';
    this.pushMixTask(taskType, 'processing');
    this.shouldCompleteTimedOutFinalOnPoll = true;
    return 'timeout' as const;
  }

  private async fulfillJson(route: Route, body: JsonResponse, status = 200) {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  }

  private async fulfillDownload(route: Route, filename: string, body: string) {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body,
    });
  }
}
