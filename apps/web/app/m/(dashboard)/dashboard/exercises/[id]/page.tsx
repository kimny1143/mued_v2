'use client';

export const dynamic = 'force-dynamic';

import { Clock, PlayCircle, BarChart2, CheckCircle2, ClipboardEdit, ArrowLeft, StopCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { ExerciseLogForm } from "@/app/components/ExerciseLogForm";
import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@ui/dialog";
import type { ExerciseLogFormData } from "@/lib/validationSchemas";

// Helper function to format time
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

// 必要な型だけを定義
type ExerciseLogData = Pick<ExerciseLogFormData, 'date' | 'time' | 'duration_minutes'>;

export default function MobileExerciseDetailPage({ params }: { params: { id: string } }) {
  const { id: _id } = params;
  const router = useRouter();
  const [showLogForm, setShowLogForm] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  
  // Exercise state management
  const [exerciseState, setExerciseState] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoLogData, setAutoLogData] = useState<ExerciseLogData | undefined>(undefined);

  // Timer effect
  useEffect(() => {
    if (exerciseState === 'in_progress' && startTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [exerciseState, startTime, timerInterval]);

  // 実際のアプリではAPIから取得するデータ
  const exercise = {
    id: "basic-rhythm",
    title: "Basic Rhythm Exercise",
    description: "Master the fundamentals of rhythm with this comprehensive exercise. Perfect for beginners and intermediate students looking to strengthen their timing and rhythm skills.",
    duration: "15 min",
    difficulty: "Beginner",
    status: "in_progress",
    progress: 60,
    image: "https://images.pexels.com/photos/4088009/pexels-photo-4088009.jpeg",
    steps: [
      "Watch the introduction video",
      "Practice basic rhythm patterns",
      "Complete the rhythm recognition quiz",
      "Record your exercise session",
      "Submit for review"
    ]
  };

  const handleExerciseButtonClick = () => {
    if (exerciseState === 'not_started') {
      // Start exercise
      const currentTime = new Date();
      setStartTime(currentTime);
      setExerciseState('in_progress');
    } else if (exerciseState === 'in_progress') {
      // Complete exercise
      completeExercise();
    }
  };

  const completeExercise = () => {
    if (!startTime) return;
    
    // Stop timer
    setExerciseState('completed');
    
    // Calculate duration
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    
    // Prepare auto-filled log data
    setAutoLogData({
      date: startTime.toISOString().split('T')[0],
      time: startTime.toTimeString().split(' ')[0].substring(0, 5),
      duration_minutes: durationMinutes,
    });
    
    // Show log form in modal with pre-filled data
    setShowLogModal(true);
  };

  const handleLogSuccess = () => {
    setShowLogForm(false);
    setShowLogModal(false);
    setExerciseState('not_started');
    setElapsedTime(0);
    setStartTime(null);
    setAutoLogData(undefined);
  };

  if (showLogForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => setShowLogForm(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Record Exercise</h1>
            <div className="w-8"></div>
          </div>
        </header>

        {/* Form Content */}
        <main className="px-4 py-6">
          <Card className="p-4 border-0 shadow-lg rounded-xl">
            <ExerciseLogForm onSuccess={() => setShowLogForm(false)} />
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
          <h1 className="text-lg font-semibold">Exercise Details</h1>
          <div className="w-8"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Hero section */}
        <div className="relative h-[250px] rounded-lg overflow-hidden shadow-lg">
          <img
            src={exercise.image}
            alt={exercise.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center">
            {exerciseState === 'in_progress' && (
              <div className="mb-4 text-white text-3xl font-bold">
                {formatTime(elapsedTime)}
              </div>
            )}
            <Button 
              size="lg" 
              className={`gap-2 px-8 py-3 ${exerciseState === 'in_progress' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              onClick={handleExerciseButtonClick}
            >
              {exerciseState === 'in_progress' ? (
                <>
                  <StopCircle className="w-6 h-6" />
                  Complete Exercise
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6" />
                  Start Exercise
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Exercise Info */}
        <Card className="p-4">
          <h1 className="text-xl font-bold mb-3">{exercise.title}</h1>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">{exercise.description}</p>
          
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{exercise.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <span>{exercise.difficulty}</span>
            </div>
          </div>
        </Card>

        {/* Progress */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Your Progress</h2>
          <div className="space-y-3">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${exercise.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{exercise.progress}% Complete</span>
              <span>{exercise.duration} remaining</span>
            </div>
          </div>
        </Card>

        {/* Steps */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Steps to Complete</h2>
          <div className="space-y-3">
            {exercise.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600 flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <span className="text-sm leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Requirements */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Requirements</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Basic music theory knowledge</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Instrument or metronome</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Quiet practice space</span>
            </div>
          </div>
        </Card>

        {/* Exercise Records */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Exercise Records</h2>
            <Button 
              onClick={() => setShowLogForm(true)}
              size="sm"
              className="gap-2"
              disabled={exerciseState === 'in_progress'}
            >
              <ClipboardEdit className="w-4 h-4" />
              Record
            </Button>
          </div>
          <div className="text-gray-500 text-center py-6 text-sm">
            No exercise records yet. Start recording your exercise sessions!
          </div>
        </Card>
      </main>

      {/* 完了時のモーダル */}
      <Dialog open={showLogModal} onOpenChange={(open) => setShowLogModal(open)}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">お疲れ様でした！</DialogTitle>
          </DialogHeader>

          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <p className="text-sm">
              素晴らしい！{Math.round((autoLogData?.duration_minutes || 0))} 分のエクササイズが完了しました。
              <br />今日の練習はいかがでしたか？以下の情報を記録しましょう。
            </p>
          </div>

          <ExerciseLogForm initialData={autoLogData} onSuccess={handleLogSuccess} />

          <DialogFooter>
            <Button onClick={() => setShowLogModal(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}