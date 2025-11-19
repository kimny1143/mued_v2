import { Metadata } from 'next';
import { TimelineContainer } from '@/components/features/muednote/TimelineContainer';

export const metadata: Metadata = {
  title: 'タイムライン - MUEDnote',
  description: 'これまでの音楽活動記録を振り返る',
};

export default function TimelinePage() {
  return (
    <div className="container mx-auto min-h-screen p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">タイムライン</h1>
        <p className="text-sm text-muted-foreground mt-2">
          これまでの音楽活動記録を振り返りましょう
        </p>
      </header>
      <TimelineContainer />
    </div>
  );
}
