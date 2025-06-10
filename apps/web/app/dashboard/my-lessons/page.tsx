'use client';

export const dynamic = 'force-dynamic';

import { format, isWithinInterval, subMinutes, addMinutes } from "date-fns";
import { ja } from "date-fns/locale";
import { 
  PlayCircleIcon, 
  CalendarIcon,
  UserIcon,
  BookOpenIcon,
  MessageSquareIcon,
  AlertCircleIcon
} from "lucide-react";
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

export default function Page() {
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
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${format(startDate, 'M月d日 HH:mm', { locale: ja })} - ${format(endDate, 'HH:mm', { locale: ja })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">予定</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-green-600 text-white">進行中</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">完了</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">マイレッスン</h1>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">マイレッスン</h1>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircleIcon className="w-5 h-5" />
            <p>レッスンの読み込みに失敗しました。</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* ページタイトル */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">マイレッスン</h1>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scheduled' | 'in_progress' | 'completed')} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">
            予定 ({categorizedSessions.scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            進行中 ({categorizedSessions.in_progress.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            完了 ({categorizedSessions.completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            {categorizedSessions[activeTab].length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-gray-500">
                  {activeTab === 'scheduled' && '予定されているレッスンはありません'}
                  {activeTab === 'in_progress' && '進行中のレッスンはありません'}
                  {activeTab === 'completed' && '完了したレッスンはありません'}
                </p>
              </Card>
            ) : (
              categorizedSessions[activeTab].map((session) => (
                <Card key={session.id} className="p-6">
                  <div className="space-y-4">
                    {/* ヘッダー */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {isStudent ? session.teacher.name : session.student.name}
                          </h3>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          レッスン
                        </p>
                      </div>
                    </div>

                    {/* 詳細情報 */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatSessionTime(session.scheduled_start, session.scheduled_end)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        <span>
                          {isStudent ? `メンター: ${session.teacher.name}` : `生徒: ${session.student.name}`}
                        </span>
                      </div>
                    </div>

                    {/* レッスンメモ・宿題 */}
                    {session.status === 'COMPLETED' && (
                      <div className="space-y-3 pt-3 border-t">
                        {session.lesson_notes && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <BookOpenIcon className="w-4 h-4" />
                              <span>レッスンメモ</span>
                            </div>
                            <p className="text-sm text-gray-600 pl-5">{session.lesson_notes}</p>
                          </div>
                        )}
                        {session.homework && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <BookOpenIcon className="w-4 h-4" />
                              <span>宿題</span>
                            </div>
                            <p className="text-sm text-gray-600 pl-5">{session.homework}</p>
                          </div>
                        )}
                        {(session.student_feedback || session.mentor_feedback) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <MessageSquareIcon className="w-4 h-4" />
                              <span>フィードバック</span>
                            </div>
                            {session.student_feedback && isStudent && (
                              <p className="text-sm text-gray-600 pl-5">あなた: {session.student_feedback}</p>
                            )}
                            {session.mentor_feedback && isMentor && (
                              <p className="text-sm text-gray-600 pl-5">あなた: {session.mentor_feedback}</p>
                            )}
                            {session.student_feedback && isMentor && (
                              <p className="text-sm text-gray-600 pl-5">生徒: {session.student_feedback}</p>
                            )}
                            {session.mentor_feedback && isStudent && (
                              <p className="text-sm text-gray-600 pl-5">メンター: {session.mentor_feedback}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex gap-2 pt-2">
                      {session.status === 'SCHEDULED' && canStartLesson(session) && (
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleStartLesson(session)}
                          disabled={isStarting}
                        >
                          <PlayCircleIcon className="w-4 h-4 mr-2" />
                          レッスンを開始
                        </Button>
                      )}
                      {session.status === 'IN_PROGRESS' && isMentor && (
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => {
                            setSelectedSession(session);
                            setEndLessonDialog(true);
                          }}
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

      {/* レッスン終了ダイアログ */}
      <Dialog open={endLessonDialog} onOpenChange={setEndLessonDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>レッスンを終了</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-notes">レッスンメモ（必須）</Label>
              <Textarea
                id="lesson-notes"
                placeholder="今日のレッスンの内容をメモしてください..."
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homework">宿題（任意）</Label>
              <Textarea
                id="homework"
                placeholder="次回までの宿題や課題があれば記入してください..."
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndLessonDialog(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleEndLesson} 
              disabled={!lessonNotes.trim() || isEnding}
            >
              レッスンを終了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* フィードバックダイアログ */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>フィードバックを送信</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">フィードバック</Label>
              <Textarea
                id="feedback"
                placeholder="レッスンの感想や改善点などを記入してください..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmitFeedback} 
              disabled={!feedback.trim() || isSubmitting}
            >
              送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}