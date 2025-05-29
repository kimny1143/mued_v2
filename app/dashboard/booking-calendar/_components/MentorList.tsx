'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MentorCard } from './MentorCard';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button'; 
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Mentor } from '@/lib/types';

// Mentor型を他のコンポーネントからも利用できるよう再エクスポート
export type { Mentor } from '@/lib/types';

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
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleKeyNavigation = (e: React.KeyboardEvent, index: number) => {
    // 現在のメンターインデックスを見つける
    const currentIndex = filteredMentors.findIndex(m => m.id === selectedMentorId);
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      // 次のメンターに移動
      const nextIndex = (currentIndex + 1) % filteredMentors.length;
      onMentorSelect(filteredMentors[nextIndex].id);
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      // 前のメンターに移動
      const prevIndex = currentIndex <= 0 ? filteredMentors.length - 1 : currentIndex - 1;
      onMentorSelect(filteredMentors[prevIndex].id);
      e.preventDefault();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b" aria-label="メンター検索">
        <h3 className="text-xl font-semibold mb-4 text-gray-900" id="mentor-list-heading">メンターを選択</h3>
        <div className="relative">
          <Input
            placeholder="メンターを検索..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 w-full h-11"
            aria-label="メンターを名前または専門分野で検索"
            ref={searchInputRef}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden="true" />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 hover:text-gray-700"
              onClick={clearSearch}
              aria-label="検索をクリア"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600 font-medium" aria-live="polite">
            {filteredMentors.length} 人のメンター
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs px-3"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" aria-hidden="true" /> 絞り込み
          </Button>
        </div>
        
        {/* フィルターパネル（トグルで表示/非表示） */}
        {showFilters && (
          <div id="filter-panel" className="mt-3 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium mb-2">専門分野</h4>
            <div className="flex flex-wrap gap-2">
              {['ピアノ', 'ギター', 'ドラム', '歌唱', '作曲'].map((specialty) => (
                <Button
                  key={specialty}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white"
                >
                  {specialty}
                </Button>
              ))}
            </div>
            
            <h4 className="text-sm font-medium mb-2 mt-3">評価</h4>
            <div className="flex gap-2">
              {[5, 4, 3].map((rating) => (
                <Button
                  key={rating}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white"
                >
                  {rating}★以上
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-auto flex-1 h-0 min-h-[250px] max-h-[calc(100vh-280px)] scrollbar-thin" role="listbox" aria-labelledby="mentor-list-heading">
        {isLoading ? (
          <div className="p-6 text-center" aria-live="polite" aria-busy="true">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">メンター情報を読み込み中...</p>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="p-6 text-center text-gray-500" aria-live="polite">
            <p className="text-sm">メンターが見つかりませんでした</p>
            {searchTerm && (
              <p className="text-xs mt-1">検索条件を変更してお試しください</p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredMentors.map((mentor, index) => (
              <div
                key={mentor.id}
                role="option"
                aria-selected={selectedMentorId === mentor.id}
                tabIndex={selectedMentorId === mentor.id ? 0 : -1}
                onKeyDown={(e) => handleKeyNavigation(e, index)}
              >
                <MentorCard
                  mentor={mentor}
                  isSelected={selectedMentorId === mentor.id}
                  onSelect={onMentorSelect}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 