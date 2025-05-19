'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card } from "@ui/card";
import { Button } from "@ui/button";
import { PlayCircle, CheckCircle, Clock, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExerciseLogForm } from "@/app/components/ExerciseLogForm";

export default function ExercisePage() {
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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exercise</h1>
        <Button 
          className="bg-black text-white w-full sm:w-auto"
          onClick={() => setShowLogForm(!showLogForm)}
        >
          {showLogForm ? "Back to Exercises" : "New Exercise"}
        </Button>
      </div>

      {showLogForm ? (
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 relative overflow-hidden border-0 shadow-lg rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Record Your Exercise</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
                onClick={() => setShowLogForm(false)}
              >
                <XIcon className="h-5 w-5" />
              </Button>
            </div>
            <ExerciseLogForm onSuccess={() => setShowLogForm(false)} />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise, index) => (
            <Card 
              key={index} 
              className="overflow-hidden cursor-pointer transition-transform hover:scale-105"
              onClick={() => router.push(`/dashboard/exercises/${exercise.id}`)}
            >
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={exercise.image} 
                  alt={exercise.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{exercise.title}</h3>
                <p className="text-gray-600 mb-4">{exercise.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{exercise.duration}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {exercise.status === "completed" && (
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Completed</span>
                      </div>
                    )}
                    {exercise.status === "in_progress" && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <PlayCircle className="w-4 h-4" />
                        <span className="text-sm">In Progress</span>
                      </div>
                    )}
                    <Button 
                      variant={exercise.status === "completed" ? "outline" : "default"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/exercises/${exercise.id}`);
                      }}
                    >
                      {exercise.status === "completed" ? "Review" : "Start"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
} 