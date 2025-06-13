import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessage as ChatMessageType } from '@lib/types';

import { ChatMessage } from './ChatMessage';

const meta: Meta<typeof ChatMessage> = {
  title: 'Chat/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    isOwnMessage: { control: 'boolean' },
    message: { control: 'object' }
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto bg-gray-50 p-4 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatMessage>;

const exampleMessage: ChatMessageType = {
  id: '1',
  content: 'こんにちは！何かお手伝いできることはありますか？',
  sender_id: 'instructor-1',
  sender_type: 'instructor',
  room_id: 'room-1',
  timestamp: new Date().toISOString(),
};

const exampleMessageWithHTML: ChatMessageType = {
  id: '2',
  content: '<p>こんにちは！<strong>何か</strong>お手伝いできることはありますか？</p><p>リストがあります：</p><ul><li>項目1</li><li>項目2</li></ul>',
  sender_id: 'instructor-1',
  sender_type: 'instructor',
  room_id: 'room-1',
  timestamp: new Date().toISOString(),
};

const exampleMessageWithYouTube: ChatMessageType = {
  id: '3',
  content: '<div data-youtube-video><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen="true" class="w-full aspect-video"></iframe></div><p>動画を参考にしてください</p>',
  sender_id: 'instructor-1',
  sender_type: 'instructor',
  room_id: 'room-1',
  timestamp: new Date().toISOString(),
};

const exampleMessageWithAttachments: ChatMessageType = {
  id: '4',
  content: 'ファイルを添付しています。確認してください。',
  sender_id: 'instructor-1',
  sender_type: 'instructor',
  room_id: 'room-1',
  timestamp: new Date().toISOString(),
  files: [
    {
      id: 'file-1',
      file_name: 'document.pdf',
      file_url: '#',
      file_type: 'application/pdf',
      file_size: 1024 * 1024 * 2.5, // 2.5MB
    },
    {
      id: 'file-2',
      file_name: 'image.jpg',
      file_url: '#',
      file_type: 'image/jpeg',
      file_size: 1024 * 500, // 500KB
    }
  ]
};

// インストラクターのメッセージ
export const InstructorMessage: Story = {
  args: {
    message: exampleMessage,
    isOwnMessage: false,
  },
};

// 自分のメッセージ
export const OwnMessage: Story = {
  args: {
    message: exampleMessage,
    isOwnMessage: true,
  },
};

// HTMLコンテンツを含むメッセージ
export const MessageWithHTML: Story = {
  args: {
    message: exampleMessageWithHTML,
    isOwnMessage: false,
  },
};

// YouTube動画を含むメッセージ
export const MessageWithYouTube: Story = {
  args: {
    message: exampleMessageWithYouTube,
    isOwnMessage: false,
  },
};

// 添付ファイルを含むメッセージ
export const MessageWithAttachments: Story = {
  args: {
    message: exampleMessageWithAttachments,
    isOwnMessage: false,
  },
};

// 添付ファイルを含む自分のメッセージ
export const OwnMessageWithAttachments: Story = {
  args: {
    message: exampleMessageWithAttachments,
    isOwnMessage: true,
  },
}; 