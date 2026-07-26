/**
 * Env-driven provider selection (ADR-AIVS-009 §1). One resolver per
 * slot; unset, empty, or unknown values resolve to the mock so the
 * pipeline always has a working provider. Real adapters (PROV-009
 * phases A-D) register under their own key and must verify their API
 * key at construction — a selected real provider with a missing key
 * throws loudly at resolution time.
 */
import type { PublishingProvider, VideoGenerationProvider, VoiceProvider } from "./contracts.ts";
import { LocalSynthVideoProvider, LocalSynthVoiceProvider } from "./local-synth.ts";
import { MockPublishingProvider } from "./mock-publishing.ts";
import { MockScriptProvider, type ScriptProvider } from "./script.ts";

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
};

const videoRegistry: Registry<VideoGenerationProvider> = {
  [MOCK_KEY]: () => new LocalSynthVideoProvider(),
};

const voiceRegistry: Registry<VoiceProvider> = {
  [MOCK_KEY]: () => new LocalSynthVoiceProvider(),
};

const publishingRegistry: Registry<PublishingProvider> = {
  [MOCK_KEY]: () => new MockPublishingProvider(),
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
