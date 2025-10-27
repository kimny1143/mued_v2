/**
 * Music Material Types and Constants
 * 音楽教材の型定義と定数
 */

export interface MusicMaterialType {
  id: string;
  label: string;
  icon: string;
  description: string;
  promptTemplate: string;
}

export interface Instrument {
  id: string;
  label: string;
  icon: string;
  category: 'keyboard' | 'strings' | 'brass' | 'woodwind' | 'percussion' | 'vocal';
}

export interface Genre {
  id: string;
  label: string;
  color: string;
}

export interface DifficultyLevel {
  value: string;
  label: string;
  color: string;
  description: string;
}

export interface PracticeDuration {
  value: number; // in minutes
  label: string;
  icon: string;
}

// Music Material Types
export const MUSIC_MATERIAL_TYPES: MusicMaterialType[] = [
  {
    id: 'sheet_music',
    label: 'Sheet Music',
    icon: '🎼',
    description: 'Musical notation and scores',
    promptTemplate: 'Create detailed sheet music notation for {instrument} at {level} level focusing on {topic}. Include proper clefs, key signatures, tempo markings, dynamics, and fingering suggestions where appropriate.'
  },
  {
    id: 'practice_routine',
    label: 'Practice Routine',
    icon: '🎯',
    description: 'Structured practice schedules',
    promptTemplate: 'Design a comprehensive {duration}-minute practice routine for {instrument} at {level} level focusing on {topic}. Structure it with: warm-up exercises, technical drills, musical pieces, and cool-down activities. Include time allocations for each section.'
  },
  {
    id: 'technique_exercises',
    label: 'Technique Exercises',
    icon: '💪',
    description: 'Skill-building exercises',
    promptTemplate: 'Create {level} technique exercises for {instrument} targeting {topic}. Provide step-by-step instructions, common mistakes to avoid, progress milestones, and practice tips. Make exercises progressive in difficulty.'
  },
  {
    id: 'theory_lesson',
    label: 'Music Theory',
    icon: '📖',
    description: 'Theoretical concepts',
    promptTemplate: 'Explain {topic} in music theory at {level} level. Include clear definitions, examples with {instrument} where relevant, visual diagrams if applicable, and practical exercises to reinforce understanding.'
  },
  {
    id: 'ear_training',
    label: 'Ear Training',
    icon: '👂',
    description: 'Listening exercises',
    promptTemplate: 'Design ear training exercises for {level} students focusing on {topic}. Include progressive listening exercises, recognition drills, and methods to practice without an instrument. Relate exercises to {genre} music where possible.'
  },
  {
    id: 'rhythm_exercises',
    label: 'Rhythm Exercises',
    icon: '🥁',
    description: 'Timing and groove practice',
    promptTemplate: 'Create rhythm exercises for {instrument} at {level} level focusing on {topic}. Include notation, counting methods, metronome practice suggestions, and gradual tempo progressions. Incorporate {genre} rhythmic patterns.'
  },
  {
    id: 'chord_progressions',
    label: 'Chord Progressions',
    icon: '🎹',
    description: 'Harmonic patterns',
    promptTemplate: 'Present chord progressions for {instrument} in {genre} style at {level} level, focusing on {topic}. Include chord diagrams/voicings, Roman numeral analysis, suggested strumming/accompaniment patterns, and song examples.'
  },
  {
    id: 'scale_patterns',
    label: 'Scale Patterns',
    icon: '🎵',
    description: 'Scale exercises and fingerings',
    promptTemplate: 'Create scale pattern exercises for {instrument} at {level} level focusing on {topic}. Include fingering diagrams, practice patterns in different positions, sequences for technical development, and musical application examples in {genre}.'
  },
  {
    id: 'improvisation_guide',
    label: 'Improvisation Guide',
    icon: '🎸',
    description: 'Creative expression exercises',
    promptTemplate: 'Design an improvisation guide for {instrument} in {genre} style at {level} level focusing on {topic}. Include scale choices, chord tone approaches, rhythmic ideas, phrasing concepts, and listening recommendations.'
  },
  {
    id: 'sight_reading',
    label: 'Sight Reading',
    icon: '👀',
    description: 'Reading exercises',
    promptTemplate: 'Create sight reading exercises for {instrument} at {level} level focusing on {topic}. Provide progressively challenging passages, key signatures and time signatures appropriate for the level, and strategies for improving reading fluency.'
  },
];

// Instruments
export const INSTRUMENTS: Instrument[] = [
  // Keyboard
  { id: 'piano', label: 'Piano', icon: '🎹', category: 'keyboard' },
  { id: 'keyboard', label: 'Keyboard/Synth', icon: '🎹', category: 'keyboard' },
  { id: 'organ', label: 'Organ', icon: '🎹', category: 'keyboard' },

  // Strings
  { id: 'guitar', label: 'Guitar', icon: '🎸', category: 'strings' },
  { id: 'bass', label: 'Bass Guitar', icon: '🎸', category: 'strings' },
  { id: 'violin', label: 'Violin', icon: '🎻', category: 'strings' },
  { id: 'viola', label: 'Viola', icon: '🎻', category: 'strings' },
  { id: 'cello', label: 'Cello', icon: '🎻', category: 'strings' },
  { id: 'ukulele', label: 'Ukulele', icon: '🎸', category: 'strings' },

  // Brass
  { id: 'trumpet', label: 'Trumpet', icon: '🎺', category: 'brass' },
  { id: 'trombone', label: 'Trombone', icon: '🎺', category: 'brass' },
  { id: 'french_horn', label: 'French Horn', icon: '🎺', category: 'brass' },
  { id: 'tuba', label: 'Tuba', icon: '🎺', category: 'brass' },

  // Woodwind
  { id: 'flute', label: 'Flute', icon: '🎶', category: 'woodwind' },
  { id: 'clarinet', label: 'Clarinet', icon: '🎶', category: 'woodwind' },
  { id: 'saxophone', label: 'Saxophone', icon: '🎷', category: 'woodwind' },
  { id: 'oboe', label: 'Oboe', icon: '🎶', category: 'woodwind' },

  // Percussion
  { id: 'drums', label: 'Drums', icon: '🥁', category: 'percussion' },
  { id: 'percussion', label: 'Percussion', icon: '🥁', category: 'percussion' },

  // Vocal
  { id: 'vocal', label: 'Vocals', icon: '🎤', category: 'vocal' },
];

// Genres
export const GENRES: Genre[] = [
  { id: 'classical', label: 'Classical', color: 'purple' },
  { id: 'jazz', label: 'Jazz', color: 'blue' },
  { id: 'pop', label: 'Pop', color: 'pink' },
  { id: 'rock', label: 'Rock', color: 'red' },
  { id: 'blues', label: 'Blues', color: 'indigo' },
  { id: 'rnb', label: 'R&B/Soul', color: 'amber' },
  { id: 'hiphop', label: 'Hip-Hop', color: 'orange' },
  { id: 'electronic', label: 'Electronic', color: 'cyan' },
  { id: 'country', label: 'Country', color: 'yellow' },
  { id: 'folk', label: 'Folk', color: 'green' },
  { id: 'metal', label: 'Metal', color: 'gray' },
  { id: 'funk', label: 'Funk', color: 'lime' },
  { id: 'latin', label: 'Latin', color: 'rose' },
  { id: 'gospel', label: 'Gospel', color: 'violet' },
];

// Difficulty Levels
export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    value: 'beginner',
    label: '🌱 Beginner',
    color: 'green',
    description: 'Just starting out, learning fundamentals'
  },
  {
    value: 'intermediate',
    label: '🌿 Intermediate',
    color: 'blue',
    description: 'Comfortable with basics, building proficiency'
  },
  {
    value: 'advanced',
    label: '🌳 Advanced',
    color: 'purple',
    description: 'Strong technical skills, refining artistry'
  },
  {
    value: 'professional',
    label: '🏆 Professional',
    color: 'amber',
    description: 'Performance-ready, mastery level'
  },
];

// Practice Durations
export const PRACTICE_DURATIONS: PracticeDuration[] = [
  { value: 5, label: '5 minutes', icon: '⚡' },
  { value: 15, label: '15 minutes', icon: '🎯' },
  { value: 30, label: '30 minutes', icon: '⏱️' },
  { value: 60, label: '1 hour', icon: '⏰' },
  { value: 90, label: '90 minutes', icon: '🎵' },
  { value: 120, label: '2 hours', icon: '🎼' },
];

// Helper function to generate music-specific prompts
export function generateMusicPrompt(
  materialType: string,
  instrument: string,
  level: string,
  topic: string,
  genre?: string,
  duration?: number
): string {
  const materialTemplate = MUSIC_MATERIAL_TYPES.find(t => t.id === materialType);
  if (!materialTemplate) return topic;

  let prompt = materialTemplate.promptTemplate
    .replace(/{instrument}/g, instrument)
    .replace(/{level}/g, level)
    .replace(/{topic}/g, topic);

  if (genre) {
    prompt = prompt.replace(/{genre}/g, genre);
  }

  if (duration) {
    prompt = prompt.replace(/{duration}/g, duration.toString());
  }

  return prompt;
}

// Get color class for genre
export function getGenreColorClass(genreId: string): string {
  const genre = GENRES.find(g => g.id === genreId);
  if (!genre) return 'bg-gray-100 text-gray-700';

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    pink: 'bg-pink-100 text-pink-700',
    red: 'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    amber: 'bg-amber-100 text-amber-700',
    orange: 'bg-orange-100 text-orange-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
    lime: 'bg-lime-100 text-lime-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
  };

  return colorMap[genre.color] || 'bg-gray-100 text-gray-700';
}

// Get color class for difficulty
export function getDifficultyColorClass(difficulty: string): string {
  const level = DIFFICULTY_LEVELS.find(l => l.value === difficulty);
  if (!level) return 'bg-gray-100 text-gray-700';

  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return colorMap[level.color] || 'bg-gray-100 text-gray-700';
}
