'use client';

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Link,
  Send,
  Upload,
  Loader2,
} from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
}

export const IconPlay = ({ size = 14, className }: IconProps) => <Play size={size} className={className} />;
export const IconPause = ({ size = 14, className }: IconProps) => <Pause size={size} className={className} />;
export const IconSkipBack = ({ size = 12, className }: IconProps) => <SkipBack size={size} className={className} />;
export const IconSkipFwd = ({ size = 12, className }: IconProps) => <SkipForward size={size} className={className} />;
export const IconLoop = ({ size = 12, className }: IconProps) => <Repeat size={size} className={className} />;
export const IconMore = ({ size = 14, className }: IconProps) => <MoreHorizontal size={size} className={className} />;
export const IconLink = ({ size = 12, className }: IconProps) => <Link size={size} className={className} />;
export const IconSend = ({ size = 10, className }: IconProps) => <Send size={size} className={className} />;
export const IconUpload = ({ size = 14, className }: IconProps) => <Upload size={size} className={className} />;
export const IconSpinner = ({ size = 11, className }: IconProps) => (
  <Loader2 size={size} className={`spin ${className ?? ''}`} />
);

// Directional chevron — dir controls up/down
export const IconChevron = ({ size = 10, dir = 'down', className }: IconProps & { dir?: 'up' | 'down' }) =>
  dir === 'up'
    ? <ChevronUp size={size} className={className} />
    : <ChevronDown size={size} className={className} />;

// Custom: sparkle/star burst (used in ParamChangeCard header)
export const IconSparkle = ({ size = 10, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="currentColor"
    className={className}
  >
    <path d="M5 0 L5.6 3.8 L9 5 L5.6 6.2 L5 10 L4.4 6.2 L1 5 L4.4 3.8 Z" />
  </svg>
);

// Custom: waveform bars (used in ReferenceSlot)
export const IconWave = ({ size = 14, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="currentColor"
    className={className}
  >
    <rect x="0" y="4" width="2" height="6" rx="1" opacity="0.7" />
    <rect x="3" y="2" width="2" height="10" rx="1" />
    <rect x="6" y="5" width="2" height="4" rx="1" opacity="0.8" />
    <rect x="9" y="1" width="2" height="12" rx="1" />
    <rect x="12" y="3" width="2" height="8" rx="1" opacity="0.7" />
  </svg>
);
