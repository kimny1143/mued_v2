import type { Meta, StoryObj } from '@storybook/react';
import { ChatInput } from './ChatInput';
import { action } from '@storybook/addon-actions';

const meta: Meta<typeof ChatInput> = {
  title: 'Chat/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onSendMessage: { action: 'sendMessage' },
    isLoading: { control: 'boolean' }
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatInput>;

// デフォルトのストーリー
export const Default: Story = {
  args: {
    onSendMessage: action('sendMessage'),
    isLoading: false,
  },
};

// ローディング状態
export const Loading: Story = {
  args: {
    onSendMessage: action('sendMessage'),
    isLoading: true,
  },
}; 