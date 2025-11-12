/**
 * Integration tests for /api/ai/intent endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/ai/intent/route';
import { NextRequest } from 'next/server';

// Mock OpenAI
const mockCreateChatCompletion = vi.fn();
const mockExtractToolCalls = vi.fn();
const mockRequiresToolExecution = vi.fn();

vi.mock('@/lib/openai', () => ({
  createChatCompletion: mockCreateChatCompletion,
  extractToolCalls: mockExtractToolCalls,
  requiresToolExecution: mockRequiresToolExecution,
}));

// Mock AI tools
const mockExecuteTool = vi.fn();
const mockAllTools = [
  {
    type: 'function',
    function: {
      name: 'searchAvailableSlots',
      description: 'Search for available lesson slots',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          subject: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createReservation',
      description: 'Create a reservation',
      parameters: {
        type: 'object',
        properties: {
          slotId: { type: 'string' },
        },
      },
    },
  },
];

vi.mock('@/lib/ai/tools', () => ({
  ALL_TOOLS: mockAllTools,
  executeTool: mockExecuteTool,
}));

// Mock auth middleware
const mockWithAuth = vi.fn((handler: any) => async (request: NextRequest) => {
  // Simulate auth by adding user context
  return handler({
    request,
    user: {
      id: 'test-user-id',
      clerkId: 'test-clerk-id',
      role: 'student'
    }
  });
});

vi.mock('@/lib/middleware/with-auth', () => ({
  withAuth: mockWithAuth,
}));

// Mock API response helpers
vi.mock('@/lib/api-response', () => ({
  apiSuccess: (data: any) => new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
  apiValidationError: (message: string, errors: any) => new Response(
    JSON.stringify({ error: message, details: errors }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  ),
  apiServerError: (error: Error) => new Response(
    JSON.stringify({ error: 'Internal server error', message: error.message }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  ),
}));

describe('AI Intent API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/intent', () => {
    it('should process a lesson search intent', async () => {
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: 'I found 3 available Mathematics lessons for tomorrow.',
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'searchAvailableSlots',
                  arguments: JSON.stringify({
                    date: '2025-10-16',
                    subject: 'Mathematics',
                  }),
                },
              }],
            },
          }],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
        },
      });

      mockRequiresToolExecution.mockReturnValueOnce(true);
      mockExtractToolCalls.mockReturnValueOnce([{
        id: 'call_1',
        type: 'function',
        function: {
          name: 'searchAvailableSlots',
          arguments: JSON.stringify({
            date: '2025-10-16',
            subject: 'Mathematics',
          }),
        },
      }]);

      mockExecuteTool.mockResolvedValueOnce({
        success: true,
        slots: [
          { id: 'slot1', startTime: '10:00', mentorName: 'John Doe' },
          { id: 'slot2', startTime: '14:00', mentorName: 'Jane Smith' },
          { id: 'slot3', startTime: '16:00', mentorName: 'Bob Johnson' },
        ],
      });

      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: 'I found 3 available Mathematics lessons for October 16, 2025:\n\n1. 10:00 AM with John Doe\n2. 2:00 PM with Jane Smith\n3. 4:00 PM with Bob Johnson\n\nWould you like to book one of these slots?',
            },
          }],
        },
        usage: {
          promptTokens: 150,
          completionTokens: 60,
          totalTokens: 210,
          estimatedCost: 0.002,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Find me available math lessons for tomorrow',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('3 available Mathematics lessons');
      expect(data.toolsUsed).toEqual(['searchAvailableSlots']);
      expect(data.usage.total.totalTokens).toBe(360);
    });

    it('should process a reservation creation intent', async () => {
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call_2',
                type: 'function',
                function: {
                  name: 'createReservation',
                  arguments: JSON.stringify({ slotId: 'slot_123' }),
                },
              }],
            },
          }],
        },
        usage: {
          promptTokens: 80,
          completionTokens: 30,
          totalTokens: 110,
          estimatedCost: 0.0008,
        },
      });

      mockRequiresToolExecution.mockReturnValueOnce(true);
      mockExtractToolCalls.mockReturnValueOnce([{
        id: 'call_2',
        type: 'function',
        function: {
          name: 'createReservation',
          arguments: JSON.stringify({ slotId: 'slot_123' }),
        },
      }]);

      mockExecuteTool.mockResolvedValueOnce({
        success: true,
        reservationId: 'res_456',
        confirmationMessage: 'Reservation confirmed for October 15 at 10:00 AM',
      });

      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: "I've successfully booked your lesson for October 15 at 10:00 AM. Your reservation ID is res_456.",
            },
          }],
        },
        usage: {
          promptTokens: 120,
          completionTokens: 40,
          totalTokens: 160,
          estimatedCost: 0.001,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Book the first available slot',
          conversationHistory: [{
            role: 'assistant',
            content: 'I found several available slots...',
          }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('successfully booked');
      expect(data.toolsUsed).toEqual(['createReservation']);
    });

    it('should handle direct responses without tool execution', async () => {
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: 'MUED is an online learning management system that helps you book lessons, generate study materials, and track your learning progress.',
            },
          }],
        },
        usage: {
          promptTokens: 50,
          completionTokens: 30,
          totalTokens: 80,
          estimatedCost: 0.0005,
        },
      });

      mockRequiresToolExecution.mockReturnValueOnce(false);

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What is MUED?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('online learning management system');
      expect(data.toolsUsed).toEqual([]);
      expect(data.usage.total.totalTokens).toBe(80);
    });

    it('should handle multiple tool calls in sequence', async () => {
      // First call with multiple tools
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'call_3',
                  type: 'function',
                  function: {
                    name: 'searchAvailableSlots',
                    arguments: JSON.stringify({ date: '2025-10-20' }),
                  },
                },
                {
                  id: 'call_4',
                  type: 'function',
                  function: {
                    name: 'getSubscriptionStatus',
                    arguments: JSON.stringify({}),
                  },
                },
              ],
            },
          }],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
        },
      });

      mockRequiresToolExecution.mockReturnValueOnce(true);
      mockExtractToolCalls.mockReturnValueOnce([
        {
          id: 'call_3',
          type: 'function',
          function: {
            name: 'searchAvailableSlots',
            arguments: JSON.stringify({ date: '2025-10-20' }),
          },
        },
        {
          id: 'call_4',
          type: 'function',
          function: {
            name: 'getSubscriptionStatus',
            arguments: JSON.stringify({}),
          },
        },
      ]);

      // Mock tool executions
      mockExecuteTool
        .mockResolvedValueOnce({
          success: true,
          slots: [
            { id: 'slot1', startTime: '10:00' },
            { id: 'slot2', startTime: '14:00' },
          ],
        })
        .mockResolvedValueOnce({
          success: true,
          tier: 'basic',
          usage: { reservations: 3 },
          limits: { reservations: 5 },
        });

      // Final response
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: 'I found 2 available slots and you can book 2 more lessons this month.',
            },
          }],
        },
        usage: {
          promptTokens: 200,
          completionTokens: 60,
          totalTokens: 260,
          estimatedCost: 0.002,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Show me available slots and how many I can book',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.toolsUsed).toHaveLength(2);
      expect(data.toolsUsed).toContain('searchAvailableSlots');
      expect(data.toolsUsed).toContain('getSubscriptionStatus');
    });

    it('should handle tool execution errors gracefully', async () => {
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call_5',
                type: 'function',
                function: {
                  name: 'createReservation',
                  arguments: JSON.stringify({ slotId: 'invalid_slot' }),
                },
              }],
            },
          }],
        },
        usage: {
          promptTokens: 80,
          completionTokens: 30,
          totalTokens: 110,
          estimatedCost: 0.0008,
        },
      });

      mockRequiresToolExecution.mockReturnValueOnce(true);
      mockExtractToolCalls.mockReturnValueOnce([{
        id: 'call_5',
        type: 'function',
        function: {
          name: 'createReservation',
          arguments: JSON.stringify({ slotId: 'invalid_slot' }),
        },
      }]);

      // Tool execution fails
      mockExecuteTool.mockRejectedValueOnce(new Error('Slot not found'));

      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: 'I apologize, but I could not book that slot. The slot may no longer be available.',
            },
          }],
        },
        usage: {
          promptTokens: 120,
          completionTokens: 40,
          totalTokens: 160,
          estimatedCost: 0.001,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Book slot invalid_slot',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('could not book');
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required 'message' field
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(1001);

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: longMessage,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('should maintain conversation context', async () => {
      mockCreateChatCompletion.mockResolvedValueOnce({
        completion: {
          choices: [{
            message: {
              content: 'Based on our previous discussion, I\'ll book the morning slot for you.',
            },
          }],
        },
        usage: {
          promptTokens: 150,
          completionTokens: 40,
          totalTokens: 190,
          estimatedCost: 0.0015,
        },
      });

      mockRequiresToolExecution.mockReturnValueOnce(false);

      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Book the first one',
          conversationHistory: [
            {
              role: 'user',
              content: 'Show me morning slots',
            },
            {
              role: 'assistant',
              content: 'I found 3 morning slots available.',
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('morning slot');

      // Verify that conversation history was passed to OpenAI
      expect(mockCreateChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Show me morning slots' }),
          expect.objectContaining({ role: 'assistant', content: 'I found 3 morning slots available.' }),
          expect.objectContaining({ role: 'user', content: 'Book the first one' }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/ai/intent', () => {
    it('should return health check information', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/intent', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.endpoint).toBe('/api/ai/intent');
      expect(data.availableTools).toEqual(['searchAvailableSlots', 'createReservation']);
    });
  });
});