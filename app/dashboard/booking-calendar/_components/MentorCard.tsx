'use client';

import Image from 'next/image';
import React from 'react';
import { Badge } from '@/app/components/ui/badge';

export interface MentorCardProps {
  mentor: {
    id: string;
    name: string | null;
    image: string | null;
    specialties?: string[];
    rating?: {
      avgRating: number;
      totalReviews: number;
    };
    availableSlotsCount?: number;
  };
  isSelected: boolean;
  onSelect: (mentorId: string) => void;
}

export const MentorCard: React.FC<MentorCardProps> = ({ 
  mentor, 
  isSelected, 
  onSelect 
}) => {
  return (
    <div
      className={`p-4 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/10 border-2 border-primary'
          : 'bg-white border border-gray-200 hover:border-primary/50'
      }`}
      onClick={() => onSelect(mentor.id)}
    >
      <div className="flex items-start gap-3">
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
          {mentor.image ? (
            <Image 
              src={mentor.image} 
              alt={mentor.name || '名前なし'} 
              fill 
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-lg font-medium">
              {mentor.name ? mentor.name.charAt(0) : '?'}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-medium">{mentor.name || '名前なし'}</h3>
          
          {mentor.rating && (
            <div className="flex items-center mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg 
                    key={star} 
                    className={`w-4 h-4 ${
                      star <= Math.round(mentor.rating?.avgRating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="ml-1 text-sm text-gray-600">
                ({mentor.rating.totalReviews}件)
              </span>
            </div>
          )}
          
          {mentor.specialties && mentor.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {mentor.specialties.map((specialty, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
          
          {mentor.availableSlotsCount !== undefined && (
            <p className="text-sm mt-2">
              <span className="font-medium text-green-600">
                {mentor.availableSlotsCount}
              </span> 
              <span className="text-gray-600"> 枠の空きあり</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 