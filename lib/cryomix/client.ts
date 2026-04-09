import type {
  CryoMixConfig,
  CryoMixResponse,
  DownloadData,
  MasteringParams,
  ProgressData,
  PurchaseRequest,
  UploadData,
  UploadRequest,
} from './types';

const DEFAULT_BASE_URL = 'https://platform.cryo-mix.com';
const SOURCE_HEADER = 'Mastering API';

export class CryoMixClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  private sessionId: string | null = null;

  constructor(config: CryoMixConfig) {
    if (!config.apiKey) {
      throw new Error('Cryo Mix API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /** Set the session ID returned from upload for subsequent requests. */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      'Source': SOURCE_HEADER,
    };
    if (this.sessionId) {
      headers['Session-Id'] = this.sessionId;
    }
    return headers;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<CryoMixResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.getHeaders(),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cryo Mix API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<CryoMixResponse<T>>;
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  /**
   * Get signed upload URL(s) for audio files.
   * Sets sessionId from the upload_folder_name in the response.
   */
  async upload(req: UploadRequest): Promise<CryoMixResponse<UploadData>> {
    const body = {
      object_names: req.objectNames,
      content_type: req.contentType,
      ...(req.expirationSeconds && { expiration_seconds: req.expirationSeconds }),
    };
    const res = await this.request<UploadData>('POST', '/api/signed-url/multi-upload', body);
    // Session-Id for subsequent calls is the upload_folder_name
    if (res.data?.upload_folder_name) {
      this.setSessionId(res.data.upload_folder_name);
    }
    return res;
  }

  /**
   * PUT file content to a signed upload URL.
   * Call this after upload() with the signed URL from the response.
   */
  async uploadToSignedUrl(signedUrl: string, fileBuffer: ArrayBuffer, contentType: string): Promise<void> {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: fileBuffer,
    });
    if (!res.ok) {
      throw new Error(`Cryo Mix upload PUT failed (${res.status})`);
    }
  }

  // ─── Mastering ────────────────────────────────────────────────────────────

  /** Start mastering with optional macro parameters. */
  async runMastering(params?: MasteringParams): Promise<CryoMixResponse<unknown>> {
    this.requireSessionId();
    return this.request('POST', '/api/mastering', params ?? {});
  }

  /** Poll mastering progress. Returns status and percentage_complete. */
  async pollProgress(): Promise<CryoMixResponse<ProgressData>> {
    this.requireSessionId();
    return this.request<ProgressData>('GET', '/api/percentage');
  }

  /** Cancel an in-progress mastering job. */
  async cancelMastering(): Promise<CryoMixResponse<null>> {
    this.requireSessionId();
    return this.request<null>('POST', '/api/mastering/cancel');
  }

  // ─── Purchase & Download ──────────────────────────────────────────────────

  /** Purchase the mastered file (required before WAV download). */
  async purchase(req: PurchaseRequest): Promise<CryoMixResponse<unknown>> {
    this.requireSessionId();
    return this.request('POST', '/api/api-checkout', {
      first_name: req.firstName,
      last_name: req.lastName,
      email: req.email,
      ...(req.marketingConsent !== undefined && { marketing_consent: req.marketingConsent }),
    });
  }

  /** Get signed download URLs for mastered files (MP3, WAV after purchase, report). */
  async download(expirationSeconds?: number): Promise<CryoMixResponse<DownloadData>> {
    this.requireSessionId();
    const body = expirationSeconds ? { expiration_seconds: expirationSeconds } : {};
    return this.request<DownloadData>('POST', '/api/signed-url/multi-download', body);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private requireSessionId(): void {
    if (!this.sessionId) {
      throw new Error('Session ID is not set. Call upload() or setSessionId() first.');
    }
  }
}

/** Create a CryoMixClient from environment variables. */
export function createCryoMixClient(): CryoMixClient {
  const apiKey = process.env.CRYOMIX_API_KEY;
  if (!apiKey) {
    throw new Error('CRYOMIX_API_KEY environment variable is not set');
  }
  return new CryoMixClient({ apiKey });
}
