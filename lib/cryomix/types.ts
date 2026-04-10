// ─── Configuration ──────────────────────────────────────────────────────────

export interface CryoMixConfig {
  apiKey: string;
  baseUrl?: string;
  /** Origin header value — must match a domain registered at platform.cryo-mix.com/integration-settings/domains */
  origin?: string;
}

// ─── Request Types ──────────────────────────────────────────────────────────

/** Mastering macro parameters. All optional, defaults to neutral values. */
export interface MasteringParams {
  /** Stereo Width Adjustment (-5 to 5, default: 0) */
  mwa?: number;
  /** EQ Correction (0 to 10, default: 5) */
  meq?: number;
  /** Highs Adjustment (-5 to 5, default: 0) */
  mha?: number;
  /** Mids Adjustment (-5 to 5, default: 0) */
  mma?: number;
  /** Lows Adjustment (-5 to 5, default: 0) */
  mla?: number;
  /** Loudness Adjustment (-5 to 5, default: 0) */
  mca?: number;
}

export interface UploadRequest {
  objectNames: string[];
  contentType: string;
  expirationSeconds?: number;
}

export interface PurchaseRequest {
  firstName: string;
  lastName: string;
  email: string;
  marketingConsent?: boolean;
}

// ─── Response Types ─────────────────────────────────────────────────────────

export interface CryoMixResponse<T = unknown> {
  data: T;
  message: string;
  status: string;
  code: number;
}

export interface UploadData {
  upload_folder_name: string;
  upload_object_names: Record<string, string>; // filename → signed URL
}

export type CryoMixStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ProgressData {
  status: CryoMixStatus;
  percentage_complete: number;
  processedFolderName?: string;
  processedObjectNames?: Record<string, string>;
}

export interface DownloadData {
  download_audio_urls: Record<string, string>; // filename → signed URL
}
