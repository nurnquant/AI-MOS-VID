# Connections

What this workspace can reach, as of 2026-08-12. Update when a connector is
added or authorised.

## Live and working

| Connection                        | Kind | Used for                                                                                                                                                                    |
| --------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **claude.ai HField** (Higgsfield) | MCP  | Everything generated: `nano_banana_pro` images, `veo3_1` video, `seed_audio` TTS. Also `sandbox_exec`, which is where whisper verification runs. Ultra plan, credit-billed. |
| **claude.ai Google Drive**        | MCP  | Read/search Drive files. Available but not used in any production yet.                                                                                                      |

## Connected but needs authorising before use

| Connection                | Kind | Note                                                                                                         |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| claude.ai Hugging Face    | MCP  | Model/dataset search. Authorise via claude.ai connector settings.                                            |
| claude.ai HubSpot         | MCP  | CRM. Would matter if trial bookings ever route through HubSpot.                                              |
| `higgsfield` (standalone) | MCP  | A second, separate Higgsfield server. Redundant with HField — no need to authorise unless HField is retired. |

Authorising is done in claude.ai connector settings, or `claude mcp` / `/mcp`
in an interactive session. Cannot be done from a non-interactive session.

## Local tooling (no connector, no credits)

| Tool                                              | Used for                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ffmpeg` / `ffprobe`                              | All assembly, trimming, concat, overlays, audio mixing, RMS checks. **No `drawtext`, no libass** — text is rendered as Pillow PNGs and composited. |
| Pillow + `arabic_reshaper` + `python-bidi`        | Every text overlay, Arabic calligraphy card, end card. Harakat must be stripped (no raqm on this host).                                            |
| Apple DLS sound bank via `scripts/social/piano.m` | Real sampled piano beds. Obj-C + clang, because the host's Swift CLI cannot build against the installed SDK.                                       |
| `faster-whisper`                                  | Dialogue and recitation verification. Runs inside HField's `sandbox_exec`, not locally.                                                            |
| `openpyxl`                                        | Reading and writing `costTracker/social-media-tracker.xlsx`.                                                                                       |

## Not connected on purpose

**Social platforms.** No Facebook, Instagram, Pinterest, X, TikTok or YouTube
API is connected, and live accounts are never scanned. Platform publication is
recorded only from what the user states — see `_platform_note` in
`productions/registry.json`.

The AIVS platform in this repo _does_ have a YouTube publishing provider
(`PUBLISH_PROVIDER=youtube`, OAuth refresh flow, resumable upload) built and
live-smoked in module PUB-008/PROV-009 Phase D. It is not wired to the content
production tree.

## Paid providers in the AIVS platform (separate from content work)

These belong to the studio app, not the `productions/` workflow, but they exist
and are live in production:

| Slot    | Provider                    | Env flag                    |
| ------- | --------------------------- | --------------------------- |
| Script  | Anthropic (`claude-opus-5`) | `SCRIPT_PROVIDER=anthropic` |
| Voice   | ElevenLabs · Azure Speech   | `VOICE_PROVIDER`            |
| Video   | fal.ai (Kling) · slideshow  | `VIDEO_PROVIDER`            |
| Image   | fal.ai (flux-schnell)       | `IMAGE_PROVIDER`            |
| Publish | YouTube                     | `PUBLISH_PROVIDER`          |

All are budget-gated and fail closed; mocks are the default. Runbook:
`docs/operations/PROVIDER-ENABLEMENT.md`.

## Adding a connection

1. Authorise it in claude.ai connector settings (or `claude mcp`).
2. Add a row to the table above.
3. If it generates billable output, add its per-unit cost to the notes in
   `costTracker/` so spend stays traceable.
