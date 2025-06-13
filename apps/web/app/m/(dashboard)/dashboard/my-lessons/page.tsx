'use client';

export const dynamic = 'force-dynamic';

import { format, isWithinInterval, subMinutes, addMinutes } from "date-fns";
import { ja } from "date-fns/locale";
import { formatJst } from '@/lib/utils/timezone';
import { 
  PlayCircleIcon, 
  CalendarIcon,
  UserIcon,
  BookOpenIcon,
  MessageSquareIcon,
  AlertCircleIcon,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";

import { useToast } from "@/app/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartSession, useEndSession, useSubmitFeedback } from "@/lib/hooks/mutations/useSessionMutations";
import { useSessions } from "@/lib/hooks/queries/useSessions";
import type { LessonSession } from "@/lib/hooks/queries/useSessions";
import { useUser } from "@/lib/hooks/use-user";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@ui/dialog";
import { Label } from "@ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs";
import { Textarea } from "@ui/textarea";

export default function MobileMyLessonsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'in_progress' | 'completed'>('scheduled');
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<LessonSession | null>(null);
  const [endLessonDialog, setEndLessonDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [lessonNotes, setLessonNotes] = useState('');
  const [homework, setHomework] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const { sessions, isLoading, isError, mutate } = useSessions({
    userId: user?.id
  });

  const { startSession, isLoading: isStarting } = useStartSession();
  const { endSession, isLoading: isEnding } = useEndSession();
  const { submitFeedback, isLoading: isSubmitting } = useSubmitFeedback();

  const categorizedSessions = useMemo(() => {
    if (!sessions) return { scheduled: [], in_progress: [], completed: [] };
    
    return {
      scheduled: sessions.filter(s => s.status === 'SCHEDULED'),
      in_progress: sessions.filter(s => s.status === 'IN_PROGRESS'),
      completed: sessions.filter(s => s.status === 'COMPLETED')
    };
  }, [sessions]);

  const isStudent = user?.roleName === 'student';
  const isMentor = user?.roleName === 'teacher' || user?.roleName === 'mentor';

  const handleStartLesson = useCallback(async (session: LessonSession) => {
    try {
      await startSession(session.id);
      toast({
        title: "レッスンを開始しました",
        description: "レッスンが開始されました。",
      });
      mutate();
    } catch (error) {
      toast({
        title: "エラー",
        description: "レッスンの開始に失敗しました。",
        variant: "destructive",
      });
    }
  }, [startSession, mutate, toast]);

  const handleEndLesson = useCallback(async () => {
    if (!selectedSession) return;
    
    try {
      await endSession(selectedSession.id, {
        lesson_notes: lessonNotes,
        homework: homework,
      });
      toast({
        title: "レッスンを終了しました",
        description: "レッスンが正常に終了しました。",
      });
      setEndLessonDialog(false);
      setLessonNotes('');
      setHomework('');
      setSelectedSession(null);
      mutate();
    } catch (error) {
      toast({
        title: "エラー",
        description: "レッスンの終了に失敗しました。",
        variant: "destructive",
      });
    }
  }, [selectedSession, lessonNotes, homework, endSession, mutate, toast]);

  const handleSubmitFeedback = useCallback(async () => {
    if (!selectedSession) return;
    
    try {
      await submitFeedback(selectedSession.id, {
        feedback: feedback,
        role: isStudent ? 'student' : 'mentor',
      });
      toast({
        title: "フィードバックを送信しました",
        description: "フィードバックが正常に送信されました。",
      });
      setFeedbackDialog(false);
      setFeedback('');
      setSelectedSession(null);
      mutate();
    } catch (error) {
      toast({
        title: "エラー",
        description: "フィードバックの送信に失敗しました。",
        variant: "destructive",
      });
    }
  }, [selectedSession, feedback, isStudent, submitFeedback, mutate, toast]);

  const canStartLesson = (session: LessonSession) => {
    if (!isMentor) return false;
    if (session.status !== 'SCHEDULED') return false;
    
    const now = new Date();
    const scheduledStart = new Date(session.scheduled_start);
    const thirtyMinutesBefore = subMinutes(scheduledStart, 30);
    const thirtyMinutesAfter = addMinutes(scheduledStart, 30);
    
    return isWithinInterval(now, { start: thirtyMinutesBefore, end: thirtyMinutesAfter });
  };

  const formatSessionTime = (start: string, end: string) => {
    return `${formatJst(start, 'M月d日 HH:mm')} - ${formatJst(end, 'HH:mm')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">予定</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-green-600 text-white text-xs">進行中</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="text-xs">完了</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">マイレッスン</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </Card>
          ))}
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">マイレッスン</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="px-4 py-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircleIcon className="w-5 h-5" />
              <p className="text-sm">レッスンの読み込みに失敗しました。</p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">マイレッスン</h1>
          <div className="w-8"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        {/* タブ */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scheduled' | 'in_progress' | 'completed')} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="scheduled" className="text-xs">
              予定 ({categorizedSessions.scheduled.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">
              進行中 ({categorizedSessions.in_progress.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              完了 ({categorizedSessions.completed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-3">
              {categorizedSessions[activeTab].length === 0 ? (
                <Card className="p-6">
                  <p className="text-center text-gray-500 text-sm">
                    {activeTab === 'scheduled' && '予定されているレッスンはありません'}
                    {activeTab === 'in_progress' && '進行中のレッスンはありません'}
                    {activeTab === 'completed' && '完了したレッスンはありません'}
                  </p>
                </Card>
              ) : (
                categorizedSessions[activeTab].map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="space-y-3">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold">
                              {isStudent ? session.teacher.name : session.student.name}
                            </h3>
                            {getStatusBadge(session.status)}
                          </div>
                          <p className="text-xs text-gray-600">
                            レッスン
                          </p>
                        </div>
                      </div>

                      {/* 詳細情報 */}
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          <span>{formatSessionTime(session.scheduled_start, session.scheduled_end)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span>
                            {isStudent ? `メンター: ${session.teacher.name}` : `生徒: ${session.student.name}`}
                          </span>
                        </div>
                      </div>

                      {/* レッスンメモ・宿題 */}
                      {session.status === 'COMPLETED' && (
                        <div className="space-y-2 pt-2 border-t">
                          {session.lesson_notes && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs font-medium">
                                <BookOpenIcon className="w-3 h-3" />
                                <span>レッスンメモ</span>
                              </div>
                              <p className="text-xs text-gray-600 pl-4">{session.lesson_notes}</p>
                            </div>
                          )}
                          {session.homework && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs font-medium">
                                <BookOpenIcon className="w-3 h-3" />
                                <span>宿題</span>
                              </div>
                              <p className="text-xs text-gray-600 pl-4">{session.homework}</p>
                            </div>
                          )}
                          {(session.student_feedback || session.mentor_feedback) && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs font-medium">
                                <MessageSquareIcon className="w-3 h-3" />
                                <span>フィードバック</span>
                              </div>
                              {session.student_feedback && isStudent && (
                                <p className="text-xs text-gray-600 pl-4">あなた: {session.student_feedback}</p>
                              )}
                              {session.mentor_feedback && isMentor && (
                                <p className="text-xs text-gray-600 pl-4">あなた: {session.mentor_feedback}</p>
                              )}
                              {session.student_feedback && isMentor && (
                                <p className="text-xs text-gray-600 pl-4">生徒: {session.student_feedback}</p>
                              )}
                              {session.mentor_feedback && isStudent && (
                                <p className="text-xs text-gray-600 pl-4">メンター: {session.mentor_feedback}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* アクションボタン */}
                      <div className="flex flex-col gap-2 pt-2">
                        {session.status === 'SCHEDULED' && canStartLesson(session) && (
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStartLesson(session)}
                            disabled={isStarting}
                            size="sm"
                          >
                            <PlayCircleIcon className="w-4 h-4 mr-2" />
                            レッスンを開始
                          </Button>
                        )}
                        {session.status === 'IN_PROGRESS' && isMentor && (
                          <Button 
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => {
                              setSelectedSession(session);
                              setEndLessonDialog(true);
                            }}
                            size="sm"
                          >
                            レッスンを終了
                          </Button>
                        )}
                        {session.status === 'COMPLETED' && !session[isStudent ? 'student_feedback' : 'mentor_feedback'] && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setSelectedSession(session);
                              setFeedbackDialog(true);
                            }}
                            size="sm"
                            className="w-full"
                          >
                            <MessageSquareIcon className="w-4 h-4 mr-2" />
                            フィードバックを書く
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* レッスン終了ダイアログ */}
      <Dialog open={endLessonDialog} onOpenChange={setEndLessonDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">レッスンを終了</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-notes" className="text-sm">レッスンメモ（必須）</Label>
              <Textarea
                id="lesson-notes"
                placeholder="今日のレッスンの内容をメモしてください..."
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework" className="text-sm">宿題（任意）</Label>
              <Textarea
                id="homework"
                placeholder="次回までの宿題や課題があれば記入してください..."
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button 
              onClick={handleEndLesson} 
              disabled={!lessonNotes.trim() || isEnding}
              className="w-full"
            >
              レッスンを終了
            </Button>
            <Button variant="outline" onClick={() => setEndLessonDialog(false)} className="w-full">
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* フィードバックダイアログ */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">フィードバックを送信</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-sm">フィードバック</Label>
              <Textarea
                id="feedback"
                placeholder="レッスンの感想や改善点などを記入してください..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <Button 
              onClick={handleSubmitFeedback} 
              disabled={!feedback.trim() || isSubmitting}
              className="w-full"
            >
              送信
            </Button>
            <Button variant="outline" onClick={() => setFeedbackDialog(false)} className="w-full">
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}