/**
 * AI Mentor Matching Types
 * MVPフェーズ: ルールベースのマッチングシステム
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export type LearningGoal =
  | 'technique_improvement'
  | 'repertoire_expansion'
  | 'music_theory'
  | 'performance_preparation'
  | 'composition'
  | 'improvisation'
  | 'exam_preparation';

export type LearningStyle =
  | 'visual'
  | 'auditory'
  | 'kinesthetic'
  | 'reading_writing';

export type MusicGenre =
  | 'classical'
  | 'jazz'
  | 'pop'
  | 'rock'
  | 'folk'
  | 'contemporary'
  | 'world_music';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  day: DayOfWeek;
  startHour: number; // 0-23
  endHour: number;   // 0-23
}

export interface StudentProfile {
  id: string;
  skillLevel: SkillLevel;
  learningGoals: LearningGoal[];
  learningStyle: LearningStyle[];
  preferredGenres: MusicGenre[];
  availableTimeSlots: TimeSlot[];
  priceRange: {
    min: number;
    max: number;
  };
  previousMentorIds?: string[]; // 過去にレッスンを受けたメンターのID
}

export interface MentorProfile {
  id: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  skillLevel: SkillLevel;
  specializations: LearningGoal[];
  teachingStyles: LearningStyle[];
  genres: MusicGenre[];
  availableTimeSlots: TimeSlot[];
  pricePerHour: number;
  rating: number; // 0-5
  totalReviews: number;
  responseRate: number; // 0-1
  successfulMatches: number; // 過去のマッチング成功数
}

export interface MatchScore {
  mentorId: string;
  totalScore: number; // 0-100
  breakdown: {
    skillLevelMatch: number;    // 0-25
    goalAlignment: number;      // 0-20
    scheduleOverlap: number;    // 0-20
    priceCompatibility: number; // 0-15
    reviewScore: number;        // 0-10
    genreMatch: number;         // 0-10
  };
  reasoning: string[]; // マッチング理由の説明
}

export interface MatchResult {
  mentor: MentorProfile;
  score: MatchScore;
  isRecommended: boolean; // スコア80以上
  isPerfectMatch: boolean; // スコア90以上
}

export interface MatchingPreferences {
  prioritizeSchedule?: boolean; // スケジュール優先
  prioritizePrice?: boolean;    // 価格優先
  prioritizeExperience?: boolean; // 経験値優先
  excludePreviousMentors?: boolean; // 過去のメンターを除外
}
