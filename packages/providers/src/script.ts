/**
 * Script generation provider contract (ADR-AIVS-005 §3). Environment ships
 * a deterministic local mock — real LLM providers are a later,
 * user-approved integration.
 */

export interface ScriptGenerationRequest {
  brief: string;
  language: "ar" | "en";
  /** 3-5 when omitted (derived from the brief). */
  sceneCount?: number;
}

export interface GeneratedScene {
  narration: string;
  visualDescription: string;
  durationTargetSeconds: number;
}

export interface ScriptProvider {
  readonly name: string;
  generate(request: ScriptGenerationRequest): Promise<{ scenes: GeneratedScene[] }>;
}

/** FNV-1a — tiny, stable hash so mock output is a pure function of input. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

interface SceneTemplate {
  narration: (brief: string, index: number) => string;
  visual: (brief: string, index: number) => string;
}

const TEMPLATES: Record<"ar" | "en", SceneTemplate[]> = {
  en: [
    {
      narration: (b) => `Welcome, young friends! Today we learn about: ${b}.`,
      visual: () => "Warm animated title card, soft colors, cheerful intro music cue.",
    },
    {
      narration: (b, i) => `Let's look closer at ${b} — step ${i} of our journey.`,
      visual: (_b, i) => `Illustrated storybook scene ${i}, simple shapes, gentle motion.`,
    },
    {
      narration: (b) => `Can you think of an example of ${b} in your own day?`,
      visual: () => "Question mark animation, child-friendly pause screen for reflection.",
    },
    {
      narration: (b) => `Great thinking! Remember what we learned about ${b}.`,
      visual: () => "Recap montage of earlier scenes with key words on screen.",
    },
    {
      narration: () => "Thank you for learning with us — see you next time!",
      visual: () => "Closing card with sun and stars, wave goodbye animation.",
    },
  ],
  ar: [
    {
      narration: (b) => `أهلاً بكم أصدقائي الصغار! درس اليوم عن: ${b}.`,
      visual: () => "بطاقة عنوان متحركة بألوان هادئة مع موسيقى افتتاحية مبهجة.",
    },
    {
      narration: (b, i) => `هيا نتأمل معاً في ${b} — الخطوة ${i} من رحلتنا.`,
      visual: (_b, i) => `مشهد قصصي مرسوم رقم ${i} بأشكال بسيطة وحركة لطيفة.`,
    },
    {
      narration: (b) => `هل تستطيع أن تذكر مثالاً على ${b} من يومك؟`,
      visual: () => "علامة استفهام متحركة وشاشة توقف مناسبة للأطفال للتفكير.",
    },
    {
      narration: (b) => `أحسنتم! تذكروا ما تعلمناه عن ${b}.`,
      visual: () => "مراجعة سريعة للمشاهد السابقة مع الكلمات المفتاحية على الشاشة.",
    },
    {
      narration: () => "شكراً لتعلمكم معنا — إلى اللقاء في الدرس القادم!",
      visual: () => "بطاقة ختامية مع شمس ونجوم وتلويح بالوداع.",
    },
  ],
};

const DURATIONS = [8, 12, 15, 10, 6];

/**
 * Deterministic: identical request → identical scenes. Emits neutral,
 * child-friendly educational placeholders; Arabic output is real Arabic
 * so RTL paths get exercised.
 */
export class MockScriptProvider implements ScriptProvider {
  readonly name = "mock-script";

  async generate(request: ScriptGenerationRequest): Promise<{ scenes: GeneratedScene[] }> {
    const brief = request.brief.trim();
    if (!brief) throw new Error("brief must not be empty");
    const hash = fnv1a(`${request.language}:${brief}`);
    const count = request.sceneCount ?? 3 + (hash % 3);
    const templates = TEMPLATES[request.language];

    const scenes: GeneratedScene[] = [];
    for (let i = 0; i < count; i++) {
      const template = templates[(hash + i) % templates.length]!;
      scenes.push({
        narration: template.narration(brief, i + 1),
        visualDescription: template.visual(brief, i + 1),
        durationTargetSeconds: DURATIONS[(hash + i) % DURATIONS.length]!,
      });
    }
    return { scenes };
  }
}
