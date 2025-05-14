import React from 'react';
import { ReservationPage as ReservationContent } from '../../components/reservation/page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'レッスン予約 | MUED LMS',
  description: 'オンラインレッスンの予約ページです。利用可能な空き枠から希望の時間帯を選択して予約できます。',
};

export default function ReservationPage() {
  return <ReservationContent />;
} 