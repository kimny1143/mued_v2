'use client';

export const dynamic = 'force-dynamic';

import { PlayCircle, CheckCircle, Clock, XIcon, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from 'react';

import { ExerciseLogForm } from "@/app/components/ExerciseLogForm";
import { Button } from "@ui/button";
import { Card } from "@ui/card";

export default function MobileExercisePage() {
  const router = useRouter();
  const [showLogForm, setShowLogForm] = useState(false);
  
  const exercises = [
    {
      id: "basic-rhythm",
      title: "Basic Rhythm Exercise",
      description: "Learn fundamental rhythm patterns",
      duration: "15 min",
      status: "completed",
      image: "https://images.pexels.com/photos/4088009/pexels-photo-4088009.jpeg"
    },
    {
      id: "scale-practice",
      title: "Scale Practice",
      description: "Practice major and minor scales",
      duration: "20 min",
      status: "in_progress",
      image: "https://images.pexels.com/photos/4088801/pexels-photo-4088801.jpeg"
    },
    {
      id: "chord-progressions",
      title: "Chord Progressions",
      description: "Common chord progressions in popular music",
      duration: "25 min",
      status: "not_started",
      image: "https://images.pexels.com/photos/4087991/pexels-photo-4087991.jpeg"
    }
  ];

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
          <h1 className="text-lg font-semibold">Exercise</h1>
          <Button 
            size="sm"
            className="bg-black text-white px-3 py-1 text-sm"
            onClick={() => setShowLogForm(true)}
          >
            New
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <div className="space-y-4">
          {exercises.map((exercise, index) => (
            <Card 
              key={index} 
              className="overflow-hidden bg-white rounded-lg shadow-sm active:scale-95 transition-transform"
              onClick={() => router.push(`/m/dashboard/exercises/${exercise.id}`)}
            >
              {/* Image Section */}
              <div className="aspect-video w-full overflow-hidden bg-gray-100">
                <img 
                  src={exercise.image} 
                  alt={exercise.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Content Section */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold flex-1 mr-2">{exercise.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{exercise.duration}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>
                
                <div className="flex items-center justify-between">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {exercise.status === "completed" && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">Completed</span>
                      </div>
                    )}
                    {exercise.status === "in_progress" && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <PlayCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">In Progress</span>
                      </div>
                    )}
                    {exercise.status === "not_started" && (
                      <span className="text-xs text-gray-500 font-medium">Not Started</span>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <Button 
                    variant={exercise.status === "completed" ? "outline" : "default"}
                    size="sm"
                    className="text-xs px-3 py-1 h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/m/dashboard/exercises/${exercise.id}`);
                    }}
                  >
                    {exercise.status === "completed" ? "Review" : "Start"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}