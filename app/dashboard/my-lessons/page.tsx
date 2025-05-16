export const dynamic = 'force-dynamic';

'use client';

import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { PlayCircleIcon, ClockIcon, CheckCircleIcon } from "lucide-react";

export default function Page() {
  const lessons = [
    {
      title: "Introduction to Music Theory",
      progress: 75,
      duration: "45 min",
      status: "In Progress",
      lastAccessed: "2 days ago",
      image: "https://images.pexels.com/photos/4087991/pexels-photo-4087991.jpeg"
    },
    {
      title: "Basic Piano Techniques",
      progress: 100,
      duration: "60 min",
      status: "Completed",
      lastAccessed: "1 week ago",
      image: "https://images.pexels.com/photos/1246437/pexels-photo-1246437.jpeg"
    },
    {
      title: "Understanding Rhythm",
      progress: 0,
      duration: "30 min",
      status: "Not Started",
      lastAccessed: "-",
      image: "https://images.pexels.com/photos/4088012/pexels-photo-4088012.jpeg"
    }
  ];

  return (
    <>
      {/* ページタイトルとアクション */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <Button className="bg-black text-white w-full sm:w-auto">
          Start New Lesson
        </Button>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 gap-4">
        {lessons.map((lesson, index) => (
          <Card key={index} className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Lesson Image */}
              <div className="w-full sm:w-48 h-48 sm:h-32 flex-shrink-0 overflow-hidden rounded-lg">
                <img 
                  src={lesson.image} 
                  alt={lesson.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Lesson Content */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                  <div className="space-y-2 w-full sm:w-auto">
                    <h3 className="text-lg font-semibold">{lesson.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{lesson.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {lesson.status === "Completed" ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : lesson.status === "In Progress" ? (
                          <PlayCircleIcon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ClockIcon className="w-4 h-4 text-gray-500" />
                        )}
                        <span>{lesson.status}</span>
                      </div>
                      <div>Last accessed: {lesson.lastAccessed}</div>
                    </div>
                  </div>
                  <Button 
                    variant={lesson.status === "Completed" ? "outline" : "default"}
                    className="w-full sm:w-auto"
                  >
                    {lesson.status === "Completed" ? "Review" : "Continue"}
                  </Button>
                </div>
                {lesson.status === "In Progress" && (
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${lesson.progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 text-right">
                      {lesson.progress}% Complete
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}