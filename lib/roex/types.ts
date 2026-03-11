// ─── Enums ──────────────────────────────────────────────────────────────────

export const MusicalStyle = {
  ROCK_INDIE: 'ROCK_INDIE',
  POP: 'POP',
  ACOUSTIC: 'ACOUSTIC',
  HIPHOP_GRIME: 'HIPHOP_GRIME',
  ELECTRONIC: 'ELECTRONIC',
  REGGAE_DUB: 'REGGAE_DUB',
  ORCHESTRAL: 'ORCHESTRAL',
  METAL: 'METAL',
  OTHER: 'OTHER',
} as const;
export type MusicalStyle = (typeof MusicalStyle)[keyof typeof MusicalStyle];

export const InstrumentGroup = {
  VOCAL_GROUP: 'VOCAL_GROUP',
  BACKING_VOX_GROUP: 'BACKING_VOX_GROUP',
  BASS_GROUP: 'BASS_GROUP',
  DRUMS_GROUP: 'DRUMS_GROUP',
  KICK_GROUP: 'KICK_GROUP',
  SNARE_GROUP: 'SNARE_GROUP',
  CYMBALS_GROUP: 'CYMBALS_GROUP',
  PERCS_GROUP: 'PERCS_GROUP',
  E_GUITAR_GROUP: 'E_GUITAR_GROUP',
  ACOUSTIC_GUITAR_GROUP: 'ACOUSTIC_GUITAR_GROUP',
  KEYS_GROUP: 'KEYS_GROUP',
  STRINGS_GROUP: 'STRINGS_GROUP',
  BRASS_GROUP: 'BRASS_GROUP',
  SYNTH_GROUP: 'SYNTH_GROUP',
  FX_GROUP: 'FX_GROUP',
  BACKING_TRACK_GROUP: 'BACKING_TRACK_GROUP',
  MIDS_GROUP: 'MIDS_GROUP',
  UNKNOWN_GROUP: 'UNKNOWN_GROUP',
  OTHER_GROUP1: 'OTHER_GROUP1',
  OTHER_GROUP2: 'OTHER_GROUP2',
  OTHER_GROUP3: 'OTHER_GROUP3',
} as const;
export type InstrumentGroup = (typeof InstrumentGroup)[keyof typeof InstrumentGroup];

export const PresenceSetting = {
  NORMAL: 'NORMAL',
  LEAD: 'LEAD',
  BACKGROUND: 'BACKGROUND',
} as const;
export type PresenceSetting = (typeof PresenceSetting)[keyof typeof PresenceSetting];

export const PanPreference = {
  NO_PREFERENCE: 'NO_PREFERENCE',
  LEFT: 'LEFT',
  CENTRE: 'CENTRE',
  RIGHT: 'RIGHT',
} as const;
export type PanPreference = (typeof PanPreference)[keyof typeof PanPreference];

export const ReverbPreference = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type ReverbPreference = (typeof ReverbPreference)[keyof typeof ReverbPreference];

export const DesiredLoudness = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type DesiredLoudness = (typeof DesiredLoudness)[keyof typeof DesiredLoudness];

// ─── Config ─────────────────────────────────────────────────────────────────

export type RoExConfig = {
  apiKey: string;
  baseUrl?: string;
};

// ─── Upload ─────────────────────────────────────────────────────────────────

export type UploadUrlResponse = {
  signedUrl: string;
  readableUrl: string;
};

// ─── Mixing ─────────────────────────────────────────────────────────────────

export type MixTrackInput = {
  trackUrl: string;
  instrumentGroup: InstrumentGroup;
  presenceSetting?: PresenceSetting;
  panPreference?: PanPreference;
  reverbPreference?: ReverbPreference;
};

export type MixPreviewRequest = {
  tracks: MixTrackInput[];
  musicalStyle: MusicalStyle;
  returnStems?: boolean;
  sampleRate?: string;
  retrieveFxSettings?: boolean;
};

export type TrackGainAdjustment = {
  trackUrl: string;
  gainDb: number;
};

export type AdvancedTrackAdjustment = {
  trackUrl: string;
  gainDb: number;
  eqBands?: EqBand[];
  compressor?: {
    attack: number;
    release: number;
    threshold: number;
    ratio: number;
  };
  panAngleDegrees?: number;
};

export type MixFinalRequest = {
  taskId: string;
  trackData: TrackGainAdjustment[];
};

export type MixAdvancedFinalRequest = {
  taskId: string;
  trackData: AdvancedTrackAdjustment[];
};

export type MixResult = {
  taskId: string;
  status: string;
  previewUrl?: string;
  finalUrl?: string;
  stemsUrl?: Record<string, string>;
  fxSettings?: Record<string, FxChainWrapper>;
  error?: string;
};

// ─── FX Chain (9-node structure) ────────────────────────────────────────────

export type EqBand = {
  frequency: number;
  gain: number;
  q: number;
};

export type FxNodeLowCut = {
  type: 'LOW_CUT';
  order: 0;
  enabled: boolean;
  params: { frequency: number; slope: number };
};

export type FxNodeGain = {
  type: 'GAIN';
  subtype: 'PRE_GAIN' | 'POST_GAIN';
  order: 1 | 6;
  enabled: boolean;
  params: { gainDb: number; gainLinear: number };
};

export type FxNodeEq = {
  type: 'EQ';
  order: 2;
  enabled: boolean;
  bands: EqBand[];
};

export type FxNodeCompressor = {
  type: 'COMPRESSOR';
  subtype: 'CORRECTIVE' | 'CREATIVE';
  order: 3 | 4;
  enabled: boolean;
  params: {
    attack: number;
    release: number;
    threshold: number;
    ratio: number;
    makeupGain?: number;
  };
};

export type FxNodePan = {
  type: 'PAN';
  order: 5;
  enabled: boolean;
  params: { preference: string; angleDegrees: number };
};

export type FxNodeReverb = {
  type: 'REVERB';
  order: 7;
  enabled: boolean;
  params: { setting: string };
};

export type FxNodeSidechain = {
  type: 'SIDECHAIN_COMPRESSOR';
  order: 8;
  enabled: boolean;
};

export type FxNode =
  | FxNodeLowCut
  | FxNodeGain
  | FxNodeEq
  | FxNodeCompressor
  | FxNodePan
  | FxNodeReverb
  | FxNodeSidechain;

export type FxChainWrapper = {
  fxChain: FxNode[];
  trackId: number;
  trackName: string;
  presenceSetting: PresenceSetting;
  groupType: InstrumentGroup;
  musicalStyle: MusicalStyle;
  analysis?: {
    isLowCutApplied: boolean;
    isStem: boolean;
  };
};

// ─── Mastering ──────────────────────────────────────────────────────────────

export type MasteringPreviewRequest = {
  trackUrl: string;
  musicalStyle: MusicalStyle;
  desiredLoudness?: DesiredLoudness;
  sampleRate?: string;
};

export type MasteringResult = {
  taskId: string;
  status: string;
  previewUrl?: string;
  finalUrl?: string;
  error?: string;
};

// ─── Analysis ───────────────────────────────────────────────────────────────

export type AnalysisRequest = {
  audioUrl: string;
  musicalStyle: MusicalStyle;
  isMaster?: boolean;
};

export type AnalysisResult = {
  loudnessLufs: number;
  peakDbfs: number;
  stereoField: string;
  monoCompatible: boolean;
  clipping: boolean;
  tonalProfile: Record<string, number>;
  raw: Record<string, unknown>;
};
