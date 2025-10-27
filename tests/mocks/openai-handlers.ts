/**
 * MSW Handlers for OpenAI API Mocking
 *
 * Mock handlers for OpenAI API calls to ensure deterministic testing
 */

import { http, HttpResponse } from 'msw';

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

/**
 * Get appropriate mocked response based on the request content
 */
function getMockedResponse(request: ChatCompletionRequest): string {
  const lastMessage = request.messages[request.messages.length - 1]?.content || '';

  // Quick Test Generation
  if (lastMessage.includes('quick test') || lastMessage.includes('練習問題')) {
    return JSON.stringify({
      problems: [
        {
          title: 'Problem 1: Scale Practice',
          abc: `X:1\nT:C Major Scale Practice\nM:4/4\nL:1/4\nQ:1/4=100\nK:Cmaj\nC D E F | G A B c |`,
          focusArea: 'Scale passages',
          barRange: '1-2',
          difficulty: 'beginner',
          instructions: 'Practice slowly with even rhythm',
        },
        {
          title: 'Problem 2: Interval Jumps',
          abc: `X:2\nT:Interval Practice\nM:4/4\nL:1/4\nQ:1/4=90\nK:Cmaj\nC E G c | G E C2 |`,
          focusArea: 'Chord arpeggios',
          barRange: '3-4',
          difficulty: 'intermediate',
          instructions: 'Focus on clean jumps between notes',
        },
        {
          title: 'Problem 3: Rhythm Patterns',
          abc: `X:3\nT:Rhythm Exercise\nM:4/4\nL:1/8\nQ:1/4=80\nK:Cmaj\nC2 CD EF G2 | A2 AG FE D2 |`,
          focusArea: 'Rhythmic accuracy',
          barRange: '5-6',
          difficulty: 'intermediate',
          instructions: 'Maintain steady tempo throughout',
        },
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        targetInstrument: 'piano',
        estimatedDuration: '5 minutes',
        focusAreas: ['Scale passages', 'Chord arpeggios', 'Rhythmic accuracy'],
      },
    });
  }

  // Weak Drill Generation
  if (lastMessage.includes('weak drill') || lastMessage.includes('苦手克服')) {
    return JSON.stringify({
      easier: {
        title: 'Simplified Version',
        abc: `X:1\nT:Easier Drill\nM:4/4\nL:1/2\nQ:1/4=80\nK:Cmaj\nC D | E F | G2 |`,
        tempo: 80,
        instructions: 'Simplified rhythm and slower tempo',
        focusPoints: ['Basic note reading', 'Steady tempo'],
      },
      same: {
        title: 'Same Level Practice',
        abc: `X:1\nT:Same Level Drill\nM:4/4\nL:1/4\nQ:1/4=100\nK:Cmaj\nC D E F | G F E D | C E G c |`,
        tempo: 100,
        instructions: 'Similar difficulty with slight variations',
        focusPoints: ['Maintain original challenge', 'Reinforce patterns'],
      },
      harder: {
        title: 'Challenge Version',
        abc: `X:1\nT:Harder Drill\nM:4/4\nL:1/8\nQ:1/4=120\nK:Cmaj\nC2 DE FG AB | c2 BA GF ED | C2 EG c2 GE |`,
        tempo: 120,
        instructions: 'Increased tempo and added rhythmic complexity',
        focusPoints: ['Advanced technique', 'Speed building'],
      },
    });
  }

  // Material Generation
  if (lastMessage.includes('generate') || lastMessage.includes('create')) {
    return JSON.stringify({
      title: 'Generated Practice Material',
      content: `# Practice Material\n\n## Instructions\nPractice this exercise daily.\n\n## ABC Notation\n\`\`\`abc\nX:1\nT:Daily Exercise\nM:4/4\nL:1/4\nQ:1/4=120\nK:Cmaj\nC D E F | G A B c | c B A G | F E D C |\n\`\`\`\n\n## Focus Points\n- Maintain steady tempo\n- Even tone quality\n- Smooth transitions`,
      difficulty: 'intermediate',
      estimatedTime: '10 minutes',
      tags: ['scales', 'technique', 'daily practice'],
    });
  }

  // Intent Analysis
  if (lastMessage.includes('intent') || lastMessage.includes('意図')) {
    return JSON.stringify({
      intent: 'practice_material',
      confidence: 0.95,
      entities: {
        instrument: 'piano',
        level: 'intermediate',
        duration: '15 minutes',
      },
      suggestedAction: 'generate_material',
    });
  }

  // Default response
  return JSON.stringify({
    message: 'Test response from mocked OpenAI API',
    timestamp: new Date().toISOString(),
  });
}

/**
 * OpenAI API mock handlers
 */
export const openAIHandlers = [
  // Chat Completions endpoint
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as ChatCompletionRequest;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return HttpResponse.json({
      id: 'chatcmpl-mock-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: getMockedResponse(body),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 150,
        total_tokens: 250,
      },
    });
  }),

  // Rate limit simulation
  http.post('https://api.openai.com/v1/chat/completions/rate-limited', () => {
    return HttpResponse.json(
      {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      },
      { status: 429 }
    );
  }),

  // Error simulation
  http.post('https://api.openai.com/v1/chat/completions/error', () => {
    return HttpResponse.json(
      {
        error: {
          message: 'Internal server error',
          type: 'server_error',
          code: 'internal_error',
        },
      },
      { status: 500 }
    );
  }),

  // Timeout simulation
  http.post('https://api.openai.com/v1/chat/completions/timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 30000));
    return HttpResponse.json({});
  }),
];

/**
 * Helper function to override default response for specific tests
 */
export function createCustomOpenAIHandler(customResponse: any) {
  return http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-custom-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: typeof customResponse === 'string'
              ? customResponse
              : JSON.stringify(customResponse),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150,
      },
    });
  });
}

/**
 * Predefined responses for common test scenarios
 */
export const mockResponses = {
  quickTest: {
    valid: {
      problems: [
        {
          title: 'Test Problem 1',
          abc: 'X:1\nK:C\nCDEF|',
          focusArea: 'Test',
          barRange: '1-2',
          difficulty: 'beginner',
          instructions: 'Test instructions',
        },
      ],
      metadata: {
        generatedAt: '2024-01-01T00:00:00Z',
        targetInstrument: 'piano',
        estimatedDuration: '5 minutes',
        focusAreas: ['Test'],
      },
    },
    empty: {
      problems: [],
      metadata: {
        generatedAt: '2024-01-01T00:00:00Z',
        targetInstrument: 'piano',
        estimatedDuration: '0 minutes',
        focusAreas: [],
      },
    },
    invalid: {
      error: 'Failed to generate test',
    },
  },
  weakDrill: {
    valid: {
      easier: {
        title: 'Easy',
        abc: 'X:1\nK:C\nC2D2|',
        tempo: 80,
        instructions: 'Go slow',
        focusPoints: ['Basics'],
      },
      same: {
        title: 'Same',
        abc: 'X:1\nK:C\nCDEF|',
        tempo: 100,
        instructions: 'Same level',
        focusPoints: ['Practice'],
      },
      harder: {
        title: 'Hard',
        abc: 'X:1\nK:C\nCDEFGABc|',
        tempo: 120,
        instructions: 'Challenge',
        focusPoints: ['Advanced'],
      },
    },
    invalid: {
      error: 'Failed to generate drill',
    },
  },
  material: {
    valid: {
      title: 'Test Material',
      content: '# Test\n\n```abc\nX:1\nK:C\nCDEF|\n```',
      difficulty: 'beginner',
      estimatedTime: '5 minutes',
      tags: ['test'],
    },
    invalid: {
      error: 'Failed to generate material',
    },
  },
};