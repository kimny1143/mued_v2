// Client
export { RoExClient, createRoExClient, isRoExDevKey, isRoExUpstreamError, RoExCommTimeoutError } from './client';

// Upload
export { getUploadUrl, uploadToSignedUrl } from './upload';

// Mixing
export {
  mixPreview,
  pollMixPreview,
  mixFinalBasic,
  mixFinalAdvanced,
  pollMixFinal,
} from './mixing';

// Mastering
export { masterPreview, pollMasterPreview, masterFinal } from './mastering';

// Analysis
export { analyzeMix, compareMixes } from './analysis';

// Mappings (UI → RoEx enum)
export {
  MUSICAL_STYLE_MAP,
  INSTRUMENT_GROUP_MAP,
  mapMusicalStyle,
  mapInstrumentGroup,
} from './mappings';

// Types & Enums
export type {
  RoExConfig,
  UploadUrlResponse,
  MixTrackInput,
  MixPreviewRequest,
  MixFinalRequest,
  MixAdvancedFinalRequest,
  MixResult,
  TrackGainAdjustment,
  AdvancedTrackAdjustment,
  EqBand,
  FxNode,
  FxNodeLowCut,
  FxNodeGain,
  FxNodeEq,
  FxNodeCompressor,
  FxNodePan,
  FxNodeReverb,
  FxNodeSidechain,
  FxChainWrapper,
  MasteringPreviewRequest,
  MasteringResult,
  AnalysisRequest,
  AnalysisResult,
  ComparisonResult,
} from './types';

export {
  MusicalStyle,
  InstrumentGroup,
  PresenceSetting,
  PanPreference,
  ReverbPreference,
  DesiredLoudness,
} from './types';
