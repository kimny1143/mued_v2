/**
 * ModeIcon - フォーカスモードアイコン
 *
 * 各モードに対応するアイコンを表示する共通コンポーネント
 */

import React from 'react';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { FocusModeId } from '../api/types';

// モードアイコンマッピング
const MODE_ICONS: Record<FocusModeId, { family: 'ionicons' | 'feather' | 'material'; name: string }> = {
  pomodoro: { family: 'ionicons', name: 'timer-outline' },
  standard: { family: 'feather', name: 'coffee' },
  deepwork: { family: 'material', name: 'brain' },
  custom: { family: 'ionicons', name: 'options-outline' },
};

interface ModeIconProps {
  modeId: FocusModeId;
  size: number;
  color: string;
}

export function ModeIcon({ modeId, size, color }: ModeIconProps) {
  const config = MODE_ICONS[modeId];
  switch (config.family) {
    case 'ionicons':
      return <Ionicons name={config.name as any} size={size} color={color} />;
    case 'feather':
      return <Feather name={config.name as any} size={size} color={color} />;
    case 'material':
      return <MaterialCommunityIcons name={config.name as any} size={size} color={color} />;
    default:
      return null;
  }
}
