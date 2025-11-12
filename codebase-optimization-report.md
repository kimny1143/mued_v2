# Codebase Optimization Report

## Executive Summary
Analysis of the MUED LMS v2 codebase identified **116 files with fetch patterns** (35+ unique implementations) and **15+ functions exceeding 100 lines**, with the largest being 705+ lines. The estimated impact includes a 60% reduction in API client code duplication, improved error handling consistency, and enhanced maintainability through function decomposition.

## Critical Issues (High Priority)

### Issue 1: Fragmented API Client Implementation
**Location**: 35+ files across the codebase
**Problem**: Direct fetch() calls scattered throughout components and hooks with inconsistent error handling, no retry logic, and duplicated authentication patterns.
**Impact**:
- **Maintainability**: Changes to API structure require updates in 35+ locations
- **Security**: Inconsistent authentication header handling
- **Performance**: No centralized caching or request deduplication
- **Reliability**: Missing retry logic for transient failures

**Current Implementation Examples**:
```typescript
// /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/components/features/library/library-content.tsx:72
const response = await fetch(`/api/content?${params.toString()}`);
if (!response.ok) {
  throw new Error('Failed to fetch content');
}
const apiResponse = await response.json();

// /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/app/dashboard/materials/new/page.tsx:130
const response = await fetch(apiEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
});

// /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/hooks/useMetricsTracker.ts:95
const response = await fetch('/api/metrics/save-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(session),
});
```

**Recommended Solution**:
```typescript
// /lib/api-client.ts
import { auth } from '@clerk/nextjs';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuth?: boolean;
  timeout?: number;
  retries?: number;
}

class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.config.retries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetriableError(error)) {
        await new Promise(resolve =>
          setTimeout(resolve, this.config.retryDelay)
        );
        return this.executeWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  private isRetriableError(error: unknown): boolean {
    if (error instanceof Response) {
      return error.status >= 500 || error.status === 429;
    }
    return error instanceof TypeError; // Network errors
  }

  private async enrichHeaders(headers: HeadersInit = {}): Promise<Headers> {
    const enriched = new Headers(headers);

    // Add default content type if not present
    if (!enriched.has('Content-Type')) {
      enriched.set('Content-Type', 'application/json');
    }

    // Add authentication token if available (client-side only)
    if (typeof window !== 'undefined' && !headers['skip-auth']) {
      try {
        const token = await auth().getToken();
        if (token) {
          enriched.set('Authorization', `Bearer ${token}`);
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error);
      }
    }

    return enriched;
  }

  private buildURL(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.config.baseURL || window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  async request<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      params,
      skipAuth,
      timeout = this.config.timeout,
      retries = this.config.retries,
      ...fetchOptions
    } = options;

    const url = this.buildURL(path, params);
    const headers = await this.enrichHeaders(fetchOptions.headers);

    if (skipAuth) {
      headers.delete('Authorization');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await this.executeWithRetry(
        async () => {
          const res = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
          });

          if (!res.ok) {
            const error = await this.parseError(res);
            throw new ApiError(error.message, res.status, error.details);
          }

          return res;
        },
        retries
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  }

  // Convenience methods
  get<T = any>(path: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T = any>(path: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  private async parseError(response: Response): Promise<{ message: string; details?: any }> {
    try {
      const data = await response.json();
      return {
        message: data.error || data.message || `HTTP ${response.status}`,
        details: data,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }
}

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Response type
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  status: number;
}

// Singleton instance
export const apiClient = new ApiClient();

// React hook wrapper
export function useApiClient() {
  return apiClient;
}
```

**Implementation Steps**:
1. Create `/lib/api-client.ts` with the unified client
2. Create migration wrapper that logs deprecation warnings
3. Update high-traffic endpoints first (dashboard, materials)
4. Gradually migrate all 35+ files over 2-3 sprints
5. Add monitoring for API performance metrics
6. Remove old fetch patterns once migration complete

---

### Issue 2: generateMaterial Function Complexity (164 lines)
**Location**: `/lib/services/ai-material.service.ts:478-642`
**Problem**: Single function handling request validation, quota checking, AI generation, quality validation, database operations, and error handling.
**Impact**:
- **Testing**: Difficult to unit test individual components
- **Debugging**: Hard to isolate issues in the generation pipeline
- **Maintainability**: High cognitive load for developers

**Current Implementation**:
```typescript
export async function generateMaterial(
  request: MaterialGenerationRequest
): Promise<{
  material: GeneratedMaterial;
  materialId: string;
  cost: number;
  qualityStatus?: QualityStatus;
  qualityMetadata?: {...};
}> {
  // Lines 478-642: 164 lines of mixed concerns
  // - Request validation
  // - User ID conversion
  // - Quota checking
  // - Prompt building
  // - OpenAI API call
  // - Response parsing
  // - ABC notation validation
  // - Quality gate checking
  // - Database insertion
  // - Usage tracking
}
```

**Recommended Solution**:
```typescript
// /lib/services/ai-material.service.ts - Refactored

// Step 1: Request validation and preparation
async function prepareGenerationRequest(
  request: MaterialGenerationRequest
): Promise<ValidatedRequest> {
  const validated = materialGenerationSchema.parse(request);
  const internalUserId = await getUserIdFromClerkId(validated.userId);

  return {
    ...validated,
    internalUserId,
  };
}

// Step 2: Quota management
async function validateQuota(userId: string): Promise<QuotaResult> {
  const quota = await checkMaterialQuota(userId);
  if (!quota.allowed) {
    throw new QuotaExceededError(
      `Material generation limit reached. You have ${quota.remaining}/${quota.limit} remaining this month.`,
      quota
    );
  }
  return quota;
}

// Step 3: AI generation
async function generateWithAI(
  validated: ValidatedRequest
): Promise<AIGenerationResult> {
  const prompt = buildPrompt(validated);

  const { completion, usage } = await createChatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    { /* options */ }
  );

  const content = extractContent(completion);
  const material = parseAIResponse(content);

  return { material, usage };
}

// Step 4: Quality validation
async function validateMaterialQuality(
  material: GeneratedMaterial,
  request: ValidatedRequest
): Promise<QualityValidationResult> {
  if (request.format !== 'music' || material.type !== 'music') {
    return { status: 'approved', metadata: {} };
  }

  const validationError = validateAbcSyntax(material.abcNotation);
  if (validationError) {
    throw new ValidationError(`Invalid ABC notation: ${validationError}`);
  }

  const instrument = request.instrument || 'piano';
  const qualityResult = checkQualityGate(material.abcNotation, instrument);

  return {
    status: qualityResult.status,
    metadata: {
      playabilityScore: qualityResult.playabilityScore,
      learningValueScore: qualityResult.learningValueScore,
      qualityMessage: qualityResult.message,
      canPublish: qualityResult.canPublish,
      suggestions: qualityResult.analysis
        ? suggestImprovements(qualityResult.analysis)
        : [],
    },
  };
}

// Step 5: Persistence
async function saveMaterial(
  material: GeneratedMaterial,
  request: ValidatedRequest,
  quality: QualityValidationResult,
  usage: UsageInfo
): Promise<SavedMaterial> {
  const [savedMaterial] = await db
    .insert(materials)
    .values({
      creatorId: request.internalUserId,
      title: `${request.subject}: ${request.topic}`,
      description: `${request.format} for ${request.difficulty} level`,
      content: JSON.stringify(material),
      type: request.format,
      difficulty: request.difficulty,
      isPublic: request.isPublic ?? false,
      qualityStatus: quality.status,
      metadata: {
        subject: request.subject,
        topic: request.topic,
        format: request.format,
        instrument: request.instrument,
        generationCost: usage.estimatedCost,
        model: usage.model,
        tokens: usage.totalTokens,
        ...quality.metadata,
      },
    })
    .returning();

  await incrementMaterialUsage(request.userId);

  return savedMaterial;
}

// Main orchestrator function - now only 30 lines
export async function generateMaterial(
  request: MaterialGenerationRequest
): Promise<MaterialGenerationResult> {
  try {
    // Step 1: Validate and prepare
    const validated = await prepareGenerationRequest(request);

    // Step 2: Check quota
    await validateQuota(validated.userId);

    // Step 3: Generate with AI
    const { material, usage } = await generateWithAI(validated);

    // Step 4: Validate quality
    const quality = await validateMaterialQuality(material, validated);

    // Step 5: Save to database
    const savedMaterial = await saveMaterial(
      material,
      validated,
      quality,
      usage
    );

    // Step 6: Build response
    return {
      material,
      materialId: savedMaterial.id,
      cost: usage.estimatedCost,
      qualityStatus: quality.status,
      qualityMetadata: Object.keys(quality.metadata).length > 0
        ? quality.metadata
        : undefined,
    };
  } catch (error) {
    // Centralized error handling
    throw enhanceError(error, { context: 'generateMaterial', request });
  }
}
```

**Implementation Steps**:
1. Create helper functions for each responsibility
2. Extract error classes for better error handling
3. Write unit tests for each helper function
4. Refactor main function to orchestrate helpers
5. Add integration tests for the full pipeline

---

## Medium Priority Issues

### Issue 3: UnifiedBookingPage Component (705 lines)
**Location**: `/app/dashboard/lessons/page.tsx:34-739`
**Problem**: Massive React component handling multiple tabs, state management, filtering, payments, and rendering.
**Impact**:
- **Performance**: Re-renders entire component on any state change
- **Testing**: Cannot test individual features in isolation
- **Reusability**: Logic cannot be reused elsewhere

**Current Implementation**:
```typescript
export default function UnifiedBookingPage() {
  // 20+ useState hooks
  // 10+ inline handlers
  // 3 tabs with separate logic
  // 700+ lines of mixed concerns
}
```

**Recommended Solution**:
```typescript
// Extract custom hooks
// /hooks/use-booking-filters.ts
export function useBookingFilters() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [timeSlot, setTimeSlot] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const resetFilters = () => {
    setSelectedDate(new Date());
    setSelectedMentors([]);
    setPriceRange([0, 15000]);
    setTimeSlot("all");
    setSelectedTags([]);
  };

  return {
    filters: { selectedDate, selectedMentors, priceRange, timeSlot, selectedTags },
    setters: { setSelectedDate, setSelectedMentors, setPriceRange, setTimeSlot, setSelectedTags },
    resetFilters,
  };
}

// Extract tab components
// /components/features/booking/BookingTab.tsx
export function BookingTab({ filters, onSlotSelect }: BookingTabProps) {
  // Booking-specific logic
}

// /components/features/booking/ReservationsTab.tsx
export function ReservationsTab({ reservations }: ReservationsTabProps) {
  // Reservations-specific logic
}

// /components/features/booking/AIMatchingTab.tsx
export function AIMatchingTab({ studentProfile }: AIMatchingTabProps) {
  // AI matching-specific logic
}

// Simplified main component
export default function UnifiedBookingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useTabState(); // Custom hook for URL sync
  const filters = useBookingFilters();
  const paymentState = usePaymentState();
  const { handleSlotBooking } = useBookingHandler();

  return (
    <div className="container mx-auto px-4 py-8">
      <BookingHeader />
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === 'booking' && (
          <BookingTab
            filters={filters}
            onSlotSelect={handleSlotBooking}
          />
        )}
        {activeTab === 'reservations' && (
          <ReservationsTab />
        )}
        {activeTab === 'ai-matching' && (
          <AIMatchingTab />
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Implementation Steps**:
1. Extract filter management to `use-booking-filters.ts`
2. Create separate components for each tab
3. Extract payment handling to `use-booking-handler.ts`
4. Create shared components for filters and cards
5. Add Storybook stories for isolated testing

---

### Issue 4: Webhook Handler Complexity
**Location**: `/app/api/webhooks/stripe/route.ts:1-471`
**Problem**: Single file handling multiple webhook event types with nested conditionals.
**Impact**:
- **Reliability**: Hard to ensure all edge cases are covered
- **Security**: Difficult to audit webhook validation
- **Scalability**: Adding new event types increases complexity

**Recommended Solution**:
```typescript
// /lib/webhooks/stripe/handlers/index.ts
const eventHandlers = new Map<string, WebhookHandler>([
  ['checkout.session.completed', handleCheckoutComplete],
  ['payment_intent.succeeded', handlePaymentSuccess],
  ['customer.subscription.created', handleSubscriptionCreated],
  // etc.
]);

export async function handleStripeWebhook(request: Request) {
  const body = await validateWebhookSignature(request);
  const event = stripe.webhooks.constructEvent(body, signature, secret);

  const handler = eventHandlers.get(event.type);
  if (!handler) {
    console.log(`Unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true });
  }

  try {
    await handler(event);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleWebhookError(error, event);
  }
}
```

---

## Low Priority Improvements

### Issue 5: Duplicate Error Handling Patterns
**Location**: Multiple files
**Problem**: Each component implements its own error handling logic.
**Impact**: Inconsistent user experience and error reporting.

**Recommended Solution**:
Create centralized error boundary and error handling utilities:
```typescript
// /lib/errors/error-handler.ts
export function handleApiError(error: unknown): UserFriendlyError {
  if (error instanceof ApiError) {
    return {
      title: getErrorTitle(error.status),
      message: error.message,
      recoverable: error.status < 500,
    };
  }
  // ... other error types
}

// /components/ui/error-boundary.tsx
export function ErrorBoundary({ children, fallback }: Props) {
  // Centralized error boundary with reporting
}
```

---

## Best Practices Violations

1. **No Request Deduplication**: Multiple components may fetch same data simultaneously
2. **Missing Request Cancellation**: No cleanup on component unmount
3. **Inconsistent Loading States**: Each component manages loading differently
4. **No Optimistic Updates**: All mutations wait for server response
5. **Missing TypeScript Strict Checks**: Some API responses use `any` type

---

## Architectural Recommendations

1. **Adopt React Query/TanStack Query**:
   - Automatic caching and deduplication
   - Built-in retry and error handling
   - Optimistic updates support

2. **Implement API Gateway Pattern**:
   - Centralize all API calls through single client
   - Add request/response interceptors
   - Implement circuit breaker for failing services

3. **Create Domain Services Layer**:
   - Separate business logic from components
   - Enable better testing and reusability
   - Implement repository pattern for data access

4. **Adopt Feature-Slice Architecture**:
   ```
   /features/
     /booking/
       /components/
       /hooks/
       /services/
       /types/
     /materials/
       /components/
       /hooks/
       /services/
       /types/
   ```

---

## Dependencies Analysis

### Outdated Packages
- None identified (would require package.json analysis)

### Unused Dependencies
- Check for unused imports with `npm run lint:unused`

### Missing Beneficial Dependencies
- **@tanstack/react-query**: Advanced data fetching and caching
- **axios**: More robust HTTP client with interceptors
- **zod**: Runtime type validation (already in use, expand usage)
- **react-error-boundary**: Better error handling
- **msw**: API mocking for testing

---

## Performance Opportunities

1. **API Response Caching**: Implement cache headers and client-side caching
2. **Request Batching**: Combine multiple API calls into single request
3. **Lazy Loading**: Split large components into lazy-loaded chunks
4. **Memoization**: Add React.memo to expensive components
5. **Virtual Scrolling**: For large lists (materials, lessons)

---

## Summary Statistics

- **Total files analyzed**: 116
- **Issues found by priority**:
  - Critical: 2
  - Medium: 2
  - Low: 1
- **Estimated lines of code that can be removed**: ~2,000
- **Estimated complexity reduction**: 40-60%
- **API client code duplication reduction**: ~60%
- **Function size reduction**: Average from 164 lines to 30 lines

---

## Implementation Roadmap

### Phase 1 (Week 1-2): Foundation
1. Implement unified API client
2. Create error handling utilities
3. Set up testing infrastructure

### Phase 2 (Week 3-4): Critical Refactoring
1. Refactor generateMaterial function
2. Start migrating high-traffic endpoints to new API client
3. Add monitoring and logging

### Phase 3 (Week 5-6): Component Optimization
1. Break down UnifiedBookingPage
2. Extract reusable hooks
3. Implement lazy loading

### Phase 4 (Week 7-8): Polish and Documentation
1. Complete API client migration
2. Add comprehensive testing
3. Update documentation
4. Performance testing and optimization

---

## Metrics for Success

1. **Code Quality**:
   - Reduce average function length from 100+ to <50 lines
   - Achieve 80%+ test coverage
   - Zero TypeScript `any` types in API layer

2. **Performance**:
   - 30% reduction in API response time (via caching)
   - 50% reduction in unnecessary re-renders
   - 25% improvement in Lighthouse scores

3. **Developer Experience**:
   - 60% reduction in boilerplate code
   - 40% faster feature development time
   - Consistent error handling across application

---

*Report generated: 2025-11-12*
*Analyzer: Claude Opus 4.1*