import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Button } from './button';

// カードコンポーネントのメタデータ
const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なカードの例
export const Basic: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>カードタイトル</CardTitle>
        <CardDescription>カードの説明文がここに入ります</CardDescription>
      </CardHeader>
      <CardContent>
        <p>カードのコンテンツ部分です。ここにはテキストや画像などを配置できます。</p>
      </CardContent>
      <CardFooter>
        <p>カードのフッター部分</p>
      </CardFooter>
    </Card>
  ),
};

// 講座カードの例
export const CourseCard: Story = {
  render: () => (
    <Card className="w-[350px] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1513883049090-d0b7439799bf?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=4800"
        alt="音楽レッスン"
        className="h-[200px] w-full object-cover"
      />
      <CardHeader>
        <CardTitle>ピアノ基礎講座</CardTitle>
        <CardDescription>初心者から中級者向けのピアノ講座</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          基本的な演奏技術から表現力までを学べる4週間のコースです。
          オンラインレッスンとオフラインレッスンを組み合わせた効果的な学習プログラムを提供します。
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="text-lg font-bold">¥15,000</span>
        <Button>詳細を見る</Button>
      </CardFooter>
    </Card>
  ),
};

// 横型レイアウトのカード
export const HorizontalCard: Story = {
  render: () => (
    <Card className="flex flex-row w-[600px] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=4800"
        alt="音楽イメージ"
        className="w-1/3 h-auto object-cover"
      />
      <div className="flex flex-col w-2/3">
        <CardHeader>
          <CardTitle>ギターマスタークラス</CardTitle>
          <CardDescription>上級者向けの集中講座</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">プロのギタリストから直接学ぶ特別講座です。テクニックと表現力を磨きます。</p>
        </CardContent>
        <CardFooter className="mt-auto">
          <Button>申し込む</Button>
        </CardFooter>
      </div>
    </Card>
  ),
}; 