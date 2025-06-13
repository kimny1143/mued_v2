// @mued/shared/api/endpoints/chat - Chat endpoints

import type { ApiClient } from '../client';
import type { 
  ChatMessage,
  ChatRoom,
  GetMessagesResponse,
  SendMessageRequest,
  PaginatedResponse,
  PaginationParams
} from '../../types';

export class ChatEndpoints {
  constructor(private client: ApiClient) {}

  async getRooms(params?: PaginationParams) {
    return this.client.get<PaginatedResponse<ChatRoom>>('/api/chat/rooms', { params });
  }

  async getRoom(roomId: string) {
    return this.client.get<ChatRoom>(`/api/chat/rooms/${roomId}`);
  }

  async createRoom(participantIds: string[], name?: string) {
    return this.client.post<ChatRoom>('/api/chat/rooms', { participantIds, name });
  }

  async getMessages(roomId: string, cursor?: string, limit?: number) {
    return this.client.get<GetMessagesResponse>(`/api/chat/rooms/${roomId}/messages`, {
      params: { cursor, limit }
    });
  }

  async sendMessage(data: SendMessageRequest) {
    const { files, ...messageData } = data;
    
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('content', messageData.content);
      formData.append('room_id', messageData.room_id);
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
      return this.client.post<ChatMessage>('/api/chat/messages', formData);
    }
    
    return this.client.post<ChatMessage>('/api/chat/messages', messageData);
  }

  async markAsRead(roomId: string, messageId?: string) {
    return this.client.post<void>(`/api/chat/rooms/${roomId}/read`, { messageId });
  }

  async deleteMessage(messageId: string) {
    return this.client.delete<void>(`/api/chat/messages/${messageId}`);
  }

  async editMessage(messageId: string, content: string) {
    return this.client.patch<ChatMessage>(`/api/chat/messages/${messageId}`, { content });
  }

  async addParticipant(roomId: string, userId: string) {
    return this.client.post<ChatRoom>(`/api/chat/rooms/${roomId}/participants`, { userId });
  }

  async removeParticipant(roomId: string, userId: string) {
    return this.client.delete<ChatRoom>(`/api/chat/rooms/${roomId}/participants/${userId}`);
  }

  async getUnreadCount() {
    return this.client.get<{ total: number; byRoom: Record<string, number> }>('/api/chat/unread');
  }

  async searchMessages(query: string, roomId?: string, params?: PaginationParams) {
    return this.client.get<PaginatedResponse<ChatMessage>>('/api/chat/search', {
      params: { query, roomId, ...params }
    });
  }

  async typing(roomId: string, isTyping: boolean) {
    return this.client.post<void>(`/api/chat/rooms/${roomId}/typing`, { isTyping });
  }

  async getTypingStatus(roomId: string) {
    return this.client.get<Array<{ userId: string; isTyping: boolean }>>(`/api/chat/rooms/${roomId}/typing`);
  }

  async archiveRoom(roomId: string) {
    return this.client.post<ChatRoom>(`/api/chat/rooms/${roomId}/archive`);
  }

  async unarchiveRoom(roomId: string) {
    return this.client.post<ChatRoom>(`/api/chat/rooms/${roomId}/unarchive`);
  }

  async muteRoom(roomId: string, duration?: number) {
    return this.client.post<void>(`/api/chat/rooms/${roomId}/mute`, { duration });
  }

  async unmuteRoom(roomId: string) {
    return this.client.delete<void>(`/api/chat/rooms/${roomId}/mute`);
  }
}