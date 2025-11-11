import { vi } from 'vitest';

/**
 * Mock OpenAI client and responses for testing
 */

export interface MockOpenAIOptions {
  defaultModel?: string;
  defaultResponse?: string;
  throwError?: boolean;
  streamResponse?: boolean;
}

export class MockOpenAI {
  private options: MockOpenAIOptions;

  constructor(options: MockOpenAIOptions = {}) {
    this.options = {
      defaultModel: 'gpt-5-mini',
      defaultResponse: 'Mock AI response',
      throwError: false,
      streamResponse: false,
      ...options,
    };
  }

  // Mock chat completions
  chat = {
    completions: {
      create: vi.fn().mockImplementation(async (params) => {
        if (this.options.throwError) {
          throw new Error('Mock OpenAI error');
        }

        if (params.stream) {
          return this.createMockStream(params);
        }

        return this.createMockCompletion(params);
      }),
    },
  };

  // Create mock completion response
  private createMockCompletion(params: any) {
    const hasTools = params.tools && params.tools.length > 0;
    const response = {
      id: 'chatcmpl-mock-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: params.model || this.options.defaultModel,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
      choices: [
        {
          index: 0,
          message: hasTools
            ? this.createFunctionCallingResponse(params)
            : {
                role: 'assistant',
                content: this.options.defaultResponse,
              },
          finish_reason: 'stop',
        },
      ],
    };

    return Promise.resolve(response);
  }

  // Create function calling response
  private createFunctionCallingResponse(params: any) {
    const tool = params.tools[0];

    // Map common function names to mock responses
    const functionResponses: Record<string, any> = {
      searchAvailableSlots: {
        slots: [
          {
            id: 'slot_1',
            startTime: '2025-10-15T10:00:00Z',
            endTime: '2025-10-15T11:00:00Z',
            mentorName: 'Test Mentor',
            isAvailable: true,
          },
          {
            id: 'slot_2',
            startTime: '2025-10-15T14:00:00Z',
            endTime: '2025-10-15T15:00:00Z',
            mentorName: 'Test Mentor 2',
            isAvailable: true,
          },
        ],
      },
      createReservation: {
        success: true,
        reservationId: 'res_mock_123',
        message: 'Reservation created successfully',
      },
      generateStudyMaterial: {
        material: {
          id: 'material_mock_123',
          title: 'Mock Study Material',
          content: '# Mock Study Material\n\nThis is a mock study material for testing.',
          subject: 'Mathematics',
          difficulty: 'intermediate',
        },
      },
      getSubscriptionStatus: {
        tier: 'basic',
        usage: {
          aiMaterials: 2,
          reservations: 3,
        },
        limits: {
          aiMaterials: 5,
          reservations: 5,
        },
      },
      upgradeSubscription: {
        success: true,
        checkoutUrl: 'https://checkout.stripe.com/mock',
      },
    };

    const functionName = tool.function?.name || 'unknown';
    const mockArguments = functionResponses[functionName] || { result: 'Mock function result' };

    return {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_mock_' + Date.now(),
          type: 'function',
          function: {
            name: functionName,
            arguments: JSON.stringify(mockArguments),
          },
        },
      ],
    };
  }

  // Create mock stream
  private createMockStream(params: any) {
    const chunks = [
      'This ',
      'is ',
      'a ',
      'streaming ',
      'response ',
      'for ',
      'testing.',
    ];

    let index = 0;

    return {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield {
            id: 'chatcmpl-mock-stream',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: params.model || 'gpt-5-mini',
            choices: [
              {
                index: 0,
                delta: {
                  content: chunk,
                },
                finish_reason: index === chunks.length - 1 ? 'stop' : null,
              },
            ],
          };
          index++;
        }
      },
    };
  }
}

// Factory function for creating mock OpenAI instances
export function createMockOpenAI(options?: MockOpenAIOptions) {
  return new MockOpenAI(options);
}

// Mock OpenAI error responses
export const mockOpenAIErrors = {
  rateLimitError: {
    error: {
      message: 'Rate limit exceeded',
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded',
    },
  },
  invalidApiKey: {
    error: {
      message: 'Incorrect API key provided',
      type: 'invalid_request_error',
      code: 'invalid_api_key',
    },
  },
  quotaExceeded: {
    error: {
      message: 'You exceeded your current quota',
      type: 'insufficient_quota',
      code: 'insufficient_quota',
    },
  },
};

// Preset mock responses for common scenarios
export const mockResponses = {
  lessonSearch: {
    role: 'assistant',
    content: 'I found 3 available lesson slots for you. Would you like to book one?',
  },
  materialGeneration: {
    role: 'assistant',
    content: 'I\'ve generated a study material on calculus for intermediate level.',
  },
  generalQuery: {
    role: 'assistant',
    content: 'How can I help you with your learning journey today?',
  },
};

// Helper function to mock fetch for OpenAI API
export function mockOpenAIFetch() {
  global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
    if (url.includes('openai.com')) {
      const body = JSON.parse(options.body);
      const mockClient = new MockOpenAI();
      const response = mockClient.chat.completions.create(body);

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => response,
        text: () => Promise.resolve(JSON.stringify(response)),
      });
    }

    return Promise.reject(new Error('Not an OpenAI endpoint'));
  });
}