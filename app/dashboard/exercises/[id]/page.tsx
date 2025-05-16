export const dynamic = 'force-dynamic';

'use client'

import { useState, useEffect } from "react";
import { Card } from "@ui/card";
import { Button } from "@ui/button";
import { Clock, PlayCircle, BarChart2, CheckCircle2, ClipboardEdit, XIcon, StopCircle } from "lucide-react";
import { ExerciseLogForm } from "../../../components/ExerciseLogForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import type { ExerciseLogFormData } from "@lib/validationSchemas";

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

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  const { id: _id } = params;
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* ページタイトル */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exercise Details</h1>
      </div>

      {/* Hero section */}
      <div className="relative h-[300px] rounded-lg overflow-hidden mb-6">
        <img
          src={exercise.image}
          alt={exercise.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center">
          {exerciseState === 'in_progress' && (
            <div className="mb-4 text-white text-4xl font-bold">
              {formatTime(elapsedTime)}
            </div>
          )}
          <Button 
            size="lg" 
            className={`gap-2 ${exerciseState === 'in_progress' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
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

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">{exercise.title}</h1>
            <p className="text-gray-600 mb-6">{exercise.description}</p>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>{exercise.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gray-500" />
                <span>{exercise.difficulty}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Steps to Complete</h2>
              <div className="space-y-3">
                {exercise.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          
          {/* Exercise log section */}
          {showLogForm ? (
            <Card className="p-6 relative overflow-hidden border-0 shadow-lg rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  練習を記録する
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
                  onClick={() => {
                    setShowLogForm(false);
                  }}
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>
              
              <ExerciseLogForm onSuccess={() => setShowLogForm(false)} />
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Exercise Records</h2>
                <Button 
                  onClick={() => setShowLogForm(true)}
                  className="gap-2"
                  disabled={exerciseState === 'in_progress'}
                >
                  <ClipboardEdit className="w-4 h-4" />
                  Record Exercise
                </Button>
              </div>
              <div className="text-gray-500 text-center py-6">
                No exercise records yet. Start recording your exercise sessions!
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
            <div className="space-y-4">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${exercise.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{exercise.progress}% Complete</span>
                <span>{exercise.duration} remaining</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Requirements</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                <span>Basic music theory knowledge</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                <span>Instrument or metronome</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                <span>Quiet practice space</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 完了時のモーダル */}
      <Dialog open={showLogModal} onOpenChange={(open) => setShowLogModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>お疲れ様でした！</DialogTitle>
          </DialogHeader>

          <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <p className="text-base">
              素晴らしい！{Math.round((autoLogData?.duration_minutes || 0))} 分のエクササイズが完了しました。
              <br />今日の練習はいかがでしたか？以下の情報を記録しましょう。
            </p>
          </div>

          <ExerciseLogForm initialData={autoLogData} onSuccess={handleLogSuccess} />

          <DialogFooter>
            <Button onClick={() => setShowLogModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 