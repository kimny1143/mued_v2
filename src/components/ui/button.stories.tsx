import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

// Metaオブジェクト：コンポーネントの基本情報を定義
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'ghost', 'link', 'outline'],
      description: 'ボタンのスタイルバリエーション',
    },
    size: {
      control: 'select', 
      options: ['sm', 'md', 'lg'],
      description: 'ボタンのサイズバリエーション',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態の切り替え',
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// デフォルトのストーリー
export const Default: Story = {
  args: {
    children: 'ボタン',
    variant: 'default',
    size: 'md',
  },
};

// プライマリボタン
export const Primary: Story = {
  args: {
    children: 'プライマリ',
    variant: 'primary',
    size: 'md',
  },
};

// セカンダリボタン
export const Secondary: Story = {
  args: {
    children: 'セカンダリ',
    variant: 'secondary',
    size: 'md',
  },
};

// アウトラインボタン
export const Outline: Story = {
  args: {
    children: 'アウトライン',
    variant: 'outline',
    size: 'md',
  },
};

// 無効状態のボタン
export const Disabled: Story = {
  args: {
    children: '無効ボタン',
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
};

// サイズバリエーション
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Button size="sm">小</Button>
      <Button size="md">中</Button>
      <Button size="lg">大</Button>
    </div>
  ),
}; 