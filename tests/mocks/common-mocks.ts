import { vi } from 'vitest';

// ============================================================
// Clerk Authentication Mocks
// ============================================================

export const mockClerkAuth = {
  userId: 'user_test_123',
  sessionId: 'sess_test_123',
  sessionClaims: {
    azp: 'http://localhost:3000',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://test.clerk.accounts.dev',
    nbf: Math.floor(Date.now() / 1000),
    sid: 'sess_test_123',
    sub: 'user_test_123',
  },
  actor: null,
  getToken: vi.fn().mockResolvedValue('mock_jwt_token'),
  debug: vi.fn(),
  orgId: null,
  orgRole: null,
  orgSlug: null,
  orgPermissions: null,
  redirectToSignIn: vi.fn(),
};

// ============================================================
// Next.js Router Mocks
// ============================================================

export const mockNextRouter = {
  push: vi.fn().mockResolvedValue(true),
  replace: vi.fn().mockResolvedValue(true),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn().mockResolvedValue(undefined),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  params: {},
  isFallback: false,
  basePath: '',
  locale: 'ja',
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  isReady: true,
  isPreview: false,
  isLocaleDomain: false,
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

export const mockUseSearchParams = () => {
  const searchParams = new URLSearchParams();
  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
    toString: () => searchParams.toString(),
    forEach: searchParams.forEach.bind(searchParams),
    entries: searchParams.entries.bind(searchParams),
    keys: searchParams.keys.bind(searchParams),
    values: searchParams.values.bind(searchParams),
  };
};

// ============================================================
// Database Query Mocks (Drizzle ORM)
// ============================================================

export const mockDrizzleQuery = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  having: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
  then: vi.fn((callback) => callback([])),
};

export const mockDrizzleInsert = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
};

export const mockDrizzleUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
};

export const mockDrizzleDelete = {
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
};

export function createMockDb() {
  return {
    select: vi.fn(() => mockDrizzleQuery),
    insert: vi.fn(() => mockDrizzleInsert),
    update: vi.fn(() => mockDrizzleUpdate),
    delete: vi.fn(() => mockDrizzleDelete),
    transaction: vi.fn(async (callback) => callback({
      select: vi.fn(() => mockDrizzleQuery),
      insert: vi.fn(() => mockDrizzleInsert),
      update: vi.fn(() => mockDrizzleUpdate),
      delete: vi.fn(() => mockDrizzleDelete),
    })),
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
  };
}

// ============================================================
// API Response Mocks
// ============================================================

export interface MockApiOptions {
  status?: number;
  delay?: number;
  headers?: HeadersInit;
}

export function createMockResponse<T>(data: T, options: MockApiOptions = {}) {
  const { status = 200, headers = { 'Content-Type': 'application/json' } } = options;

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function mockFetchResponses(responses: Map<string | RegExp, any>) {
  global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    // Check exact matches first
    if (responses.has(url)) {
      const response = responses.get(url);
      if (response instanceof Error) {
        return Promise.reject(response);
      }
      return Promise.resolve(createMockResponse(response));
    }

    // Check regex patterns
    for (const [pattern, response] of responses) {
      if (pattern instanceof RegExp && pattern.test(url)) {
        if (response instanceof Error) {
          return Promise.reject(response);
        }
        return Promise.resolve(createMockResponse(response));
      }
    }

    // Default 404 response
    return Promise.resolve(
      createMockResponse({ error: 'Not found' }, { status: 404 })
    );
  });

  return {
    restore: () => {
      vi.mocked(global.fetch).mockRestore();
    },
  };
}

// ============================================================
// Common Test Data
// ============================================================

export const mockTestData = {
  // Users
  teacher: {
    id: 'user_teacher_123',
    email: 'teacher@example.com',
    firstName: '田中',
    lastName: '太郎',
    role: 'teacher' as const,
    username: 'tanaka_sensei',
    imageUrl: '/avatars/teacher.png',
  },
  student: {
    id: 'user_student_456',
    email: 'student@example.com',
    firstName: '山田',
    lastName: '花子',
    role: 'student' as const,
    username: 'yamada_student',
    imageUrl: '/avatars/student.png',
  },
  admin: {
    id: 'user_admin_789',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    username: 'admin',
    imageUrl: '/avatars/admin.png',
  },

  // Materials
  material: {
    id: 'mat_123',
    title: 'Test Material',
    description: 'This is a test material',
    content: '# Test Content\n\nThis is test content.',
    authorId: 'user_teacher_123',
    authorName: '田中太郎',
    category: 'mathematics',
    difficulty: 'intermediate',
    tags: ['algebra', 'equations'],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    isPublic: true,
    views: 42,
    likes: 5,
  },

  // Lessons
  lesson: {
    id: 'lesson_456',
    title: 'Math Lesson',
    description: 'Introduction to Algebra',
    teacherId: 'user_teacher_123',
    teacherName: '田中太郎',
    studentId: 'user_student_456',
    studentName: '山田花子',
    scheduledAt: new Date('2025-02-01T10:00:00'),
    duration: 60,
    status: 'scheduled' as const,
    materialId: 'mat_123',
    meetingUrl: 'https://meet.example.com/lesson-456',
    notes: '',
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-20'),
  },

  // Library Items
  libraryItem: {
    id: 'lib_789',
    title: 'Shared Resource',
    description: 'A shared educational resource',
    type: 'article' as const,
    url: 'https://example.com/resource',
    authorId: 'user_teacher_123',
    authorName: '田中太郎',
    tags: ['mathematics', 'education'],
    category: 'teaching-resources',
    likes: 10,
    views: 100,
    isPublic: true,
    metadata: {
      source: 'note.com',
      originalAuthor: 'Original Author',
      publishedAt: '2025-01-01',
    },
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-10'),
  },

  // Stats
  dashboardStats: {
    totalStudents: 25,
    totalLessons: 150,
    completedLessons: 120,
    upcomingLessons: 8,
    totalMaterials: 45,
    totalRevenue: 450000,
    monthlyRevenue: 75000,
    activeSubscriptions: 20,
  },

  // Plugin
  plugin: {
    id: 'plugin_notecom',
    name: 'note.com Integration',
    description: 'Import articles from note.com',
    version: '1.0.0',
    status: 'active' as const,
    health: 'healthy' as const,
    lastCheck: new Date('2025-01-29T10:00:00'),
    config: {
      apiKey: 'encrypted_key',
      importFrequency: 'daily',
    },
    metrics: {
      totalImports: 500,
      successRate: 0.98,
      lastImportAt: new Date('2025-01-29T08:00:00'),
    },
  },
};

// ============================================================
// Stripe Mocks
// ============================================================

export const mockStripeCustomer = {
  id: 'cus_test123',
  email: 'customer@example.com',
  name: 'Test Customer',
  metadata: {
    userId: 'user_test_123',
  },
};

export const mockStripeSubscription = {
  id: 'sub_test123',
  customer: 'cus_test123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000) - 86400 * 15,
  current_period_end: Math.floor(Date.now() / 1000) + 86400 * 15,
  items: {
    data: [
      {
        id: 'si_test123',
        price: {
          id: 'price_test123',
          product: 'prod_test123',
          unit_amount: 5000,
          currency: 'jpy',
        },
      },
    ],
  },
};

export const mockStripeCheckoutSession = {
  id: 'cs_test123',
  customer: 'cus_test123',
  payment_status: 'paid',
  status: 'complete',
  mode: 'subscription',
  subscription: 'sub_test123',
  success_url: 'http://localhost:3000/success',
  cancel_url: 'http://localhost:3000/cancel',
};

// ============================================================
// OpenAI Mocks
// ============================================================

export const mockOpenAICompletion = {
  id: 'chatcmpl-test123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a mock AI response for testing purposes.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 8,
    total_tokens: 18,
  },
};

// ============================================================
// WebSocket Mocks
// ============================================================

export class MockWebSocket {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING

    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
    // Simulate echo for testing
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage!(new MessageEvent('message', { data }));
      }, 10);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = 2; // CLOSING
    setTimeout(() => {
      this.readyState = 3; // CLOSED
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }, 10);
  }
}

// ============================================================
// Date/Time Mocks
// ============================================================

export function mockDateNow(date: Date | string) {
  const mockedDate = typeof date === 'string' ? new Date(date) : date;
  const originalNow = Date.now;

  Date.now = vi.fn(() => mockedDate.getTime());

  return {
    restore: () => {
      Date.now = originalNow;
    },
  };
}

// ============================================================
// LocalStorage/SessionStorage Mocks
// ============================================================

export class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export function mockStorage() {
  const localStorageMock = new MockStorage();
  const sessionStorageMock = new MockStorage();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });

  return {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    restore: () => {
      localStorageMock.clear();
      sessionStorageMock.clear();
    },
  };
}

// ============================================================
// File/Blob Mocks
// ============================================================

export function createMockFile(
  name: string,
  content: string,
  type: string = 'text/plain'
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

export function createMockImageFile(
  name: string = 'test-image.png',
  width: number = 100,
  height: number = 100
): File {
  // Create a simple PNG-like binary data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, width, height);
  }

  return new File([canvas.toDataURL()], name, {
    type: 'image/png',
    lastModified: Date.now(),
  });
}

// ============================================================
// Export all mocks
// ============================================================

export default {
  mockClerkAuth,
  mockNextRouter,
  mockUseSearchParams,
  mockDrizzleQuery,
  mockDrizzleInsert,
  mockDrizzleUpdate,
  mockDrizzleDelete,
  createMockDb,
  createMockResponse,
  mockFetchResponses,
  mockTestData,
  mockStripeCustomer,
  mockStripeSubscription,
  mockStripeCheckoutSession,
  mockOpenAICompletion,
  MockWebSocket,
  mockDateNow,
  MockStorage,
  mockStorage,
  createMockFile,
  createMockImageFile,
};