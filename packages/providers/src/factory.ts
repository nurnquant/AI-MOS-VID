/**
 * Env-driven provider selection (ADR-AIVS-009 §1). One resolver per
 * slot; unset, empty, or unknown values resolve to the mock so the
 * pipeline always has a working provider. Real adapters (PROV-009
 * phases A-D) register under their own key and must verify their API
 * key at construction — a selected real provider with a missing key
 * throws loudly at resolution time.
 */
import { AnthropicScriptProvider } from "./anthropic-script.ts";
import { AzureSpeechVoiceProvider } from "./azure-voice.ts";
import type { PublishingProvider, VideoGenerationProvider, VoiceProvider } from "./contracts.ts";
import { ElevenLabsVoiceProvider } from "./elevenlabs-voice.ts";
import { FalVideoProvider } from "./fal-video.ts";
import { LocalSynthVideoProvider, LocalSynthVoiceProvider } from "./local-synth.ts";
import { MockPublishingProvider } from "./mock-publishing.ts";
import { MockScriptProvider, type ScriptProvider } from "./script.ts";
import { YouTubePublishingProvider } from "./youtube-publishing.ts";

const MOCK_KEY = "mock";

type Registry<T> = Record<string, () => T>;

function resolveFromRegistry<T>(envVar: string, registry: Registry<T>): T {
  const requested = (process.env[envVar] ?? "").trim();
  const build = registry[requested];
  if (requested && requested !== MOCK_KEY && !build) {
    console.warn(`${envVar}="${requested}" is not a registered provider — using mock`);
  }
  return (build ?? registry[MOCK_KEY]!)();
}

const scriptRegistry: Registry<ScriptProvider> = {
  [MOCK_KEY]: () => new MockScriptProvider(),
  // PROV-009 Phase A (user-approved). Throws at resolution when
  // ANTHROPIC_API_KEY is missing — fail loud, never silent fallback.
  anthropic: () => new AnthropicScriptProvider(),
};

const videoRegistry: Registry<VideoGenerationProvider> = {
  [MOCK_KEY]: () => new LocalSynthVideoProvider(),
  // PROV-009 Phase C (user-approved). Throws at resolution when
  // FAL_API_KEY is missing — fail loud, never silent fallback.
  fal: () => new FalVideoProvider(),
};

const voiceRegistry: Registry<VoiceProvider> = {
  [MOCK_KEY]: () => new LocalSynthVoiceProvider(),
  // PROV-009 Phase B (user-approved). Throws at resolution when
  // ELEVENLABS_API_KEY is missing — fail loud, never silent fallback.
  elevenlabs: () => new ElevenLabsVoiceProvider(),
  // POLISH-013 Arabic bake-off candidate. Fail-loud without key/region.
  azure: () => new AzureSpeechVoiceProvider(),
};

const publishingRegistry: Registry<PublishingProvider> = {
  [MOCK_KEY]: () => new MockPublishingProvider(),
  // PROV-009 Phase D (user-approved, YouTube only). Throws at
  // resolution when the OAuth credentials are missing — fail loud.
  // Meta/Instagram/Pinterest/TikTok: placeholders, later phases.
  youtube: () => new YouTubePublishingProvider(),
};

export function resolveScriptProvider(): ScriptProvider {
  return resolveFromRegistry("SCRIPT_PROVIDER", scriptRegistry);
}

export function resolveVideoProvider(): VideoGenerationProvider {
  return resolveFromRegistry("VIDEO_PROVIDER", videoRegistry);
}

export function resolveVoiceProvider(): VoiceProvider {
  return resolveFromRegistry("VOICE_PROVIDER", voiceRegistry);
}

export function resolvePublishingProvider(): PublishingProvider {
  return resolveFromRegistry("PUBLISH_PROVIDER", publishingRegistry);
}
