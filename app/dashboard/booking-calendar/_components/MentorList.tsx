'use client';

import React, { useState, useEffect } from 'react';
import { MentorCard } from './MentorCard';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button'; 
import { Search, SlidersHorizontal } from 'lucide-react';

export interface Mentor {
  id: string;
  name: string | null;
  image: string | null;
  specialties?: string[];
  rating?: {
    avgRating: number;
    totalReviews: number;
  };
  availableSlotsCount?: number;
}

interface MentorListProps {
  mentors: Mentor[];
  selectedMentorId?: string;
  onMentorSelect: (mentorId: string) => void;
  isLoading?: boolean;
}

export const MentorList: React.FC<MentorListProps> = ({
  mentors,
  selectedMentorId,
  onMentorSelect,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMentors, setFilteredMentors] = useState(mentors);
  
  // 検索語句が変更されたときにフィルタリング
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMentors(mentors);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = mentors.filter(mentor => 
      mentor.name?.toLowerCase().includes(lowercasedSearch) ||
      mentor.specialties?.some(s => s.toLowerCase().includes(lowercasedSearch))
    );
    
    setFilteredMentors(filtered);
  }, [searchTerm, mentors]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-3">メンターを選択</h3>
        <div className="relative">
          <Input
            placeholder="メンターを検索..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-500">{filteredMentors.length} 人のメンター</p>
          <Button variant="outline" size="sm" className="text-xs">
            <SlidersHorizontal className="h-3 w-3 mr-1" /> 絞り込み
          </Button>
        </div>
      </div>
      
      <div className="overflow-auto max-h-[calc(100vh-220px)] scrollbar-thin">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">メンター情報を読み込み中...</p>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            メンターが見つかりませんでした
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {filteredMentors.map(mentor => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                isSelected={selectedMentorId === mentor.id}
                onSelect={onMentorSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 