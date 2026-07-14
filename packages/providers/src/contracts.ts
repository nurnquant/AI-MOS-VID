/**
 * Provider contracts for future integrations (Veo, Kling, Runway, ElevenLabs,
 * Meta, YouTube, TikTok, S3/GCS...). Environment-setup phase ships mocks only —
 * no live API calls.
 */

export type ProviderJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface VideoGenerationRequest {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  referenceAssetIds?: string[];
}

export interface VideoGenerationJob {
  jobId: string;
  status: ProviderJobStatus;
  outputUrl?: string;
  error?: string;
}

export interface VideoGenerationProvider {
  readonly name: string;
  submit(request: VideoGenerationRequest): Promise<VideoGenerationJob>;
  getJob(jobId: string): Promise<VideoGenerationJob>;
}

export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string;
  language: string;
}

export interface VoiceProvider {
  readonly name: string;
  synthesize(request: VoiceSynthesisRequest): Promise<{ audioUrl: string }>;
}

export interface MusicRequest {
  mood: string;
  durationSeconds: number;
}

export interface MusicProvider {
  readonly name: string;
  generate(request: MusicRequest): Promise<{ audioUrl: string }>;
}

export interface StorageProvider {
  readonly name: string;
  putObject(key: string, body: Uint8Array, contentType: string): Promise<{ key: string }>;
  getObject(key: string): Promise<Uint8Array>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export interface PublishRequest {
  platform: "facebook" | "instagram" | "tiktok" | "youtube" | "whatsapp";
  assetKey: string;
  caption: string;
}

export interface PublishingProvider {
  readonly name: string;
  publish(request: PublishRequest): Promise<{ publicationId: string; status: ProviderJobStatus }>;
}
