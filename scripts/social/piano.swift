// Render a soft acoustic-piano bed to WAV using the Apple DLS sound bank.
//
//   swift scripts/social/piano.swift out.wav [seconds]
//
// Uses AVAudioUnitSampler with program 0 (Acoustic Grand Piano) from
// gs_instruments.dls and AVAudioEngine offline manual rendering, so this is
// real sampled piano rather than synthesised tones. No network, no credits.

import AVFoundation

let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: piano.swift <out.wav> [seconds]\n".data(using: .utf8)!)
    exit(2)
}
let outPath = args[1]
let duration = args.count >= 3 ? (Double(args[2]) ?? 11.0) : 11.0

struct Event { let t: Double; let on: Bool; let note: UInt8; let vel: UInt8 }
var events: [Event] = []

/// One note: soft velocity, released late so it rings under the next chord.
func note(_ t: Double, _ n: UInt8, _ vel: UInt8, hold: Double) {
    events.append(Event(t: t, on: true, note: n, vel: vel))
    events.append(Event(t: t + hold, on: false, note: n, vel: 0))
}

// Slow, sparse progression in D major — Dmaj / A / Bm / G.
// Bass note, then a rising arpeggio, with a simple melody note on top.
// Velocities kept low (36-52) so the touch stays gentle.
let bar = 2.75
let chords: [(bass: UInt8, arp: [UInt8], mel: UInt8?)] = [
    (50, [57, 62, 66], 69),   // D2 · A3 D4 F#4 · melody A4
    (45, [52, 57, 61], 66),   // A2 · E3 A3 C#4 · melody F#4
    (47, [54, 59, 62], 66),   // B2 · F#3 B3 D4 · melody F#4
    (43, [50, 55, 59], 62),   // G2 · D3 G3 B3 · melody D4
]

for (i, c) in chords.enumerated() {
    let t0 = Double(i) * bar
    let isLast = i == chords.count - 1
    // bass, held through the bar and into the next
    note(t0, c.bass, 44, hold: bar + (isLast ? 2.2 : 0.7))
    // arpeggio, gently rising
    for (j, n) in c.arp.enumerated() {
        note(t0 + 0.42 + Double(j) * 0.36, n, UInt8(40 - j * 2), hold: bar - 0.2)
    }
    // melody note lands after the arpeggio settles
    if let m = c.mel {
        note(t0 + 1.55, m, isLast ? 40 : 46, hold: isLast ? 2.6 : bar - 1.1)
    }
}
events.sort { $0.t < $1.t }

let engine = AVAudioEngine()
let sampler = AVAudioUnitSampler()
engine.attach(sampler)
engine.connect(sampler, to: engine.mainMixerNode, format: nil)

let dls = URL(fileURLWithPath:
    "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")

let sr = 44100.0
guard let format = AVAudioFormat(standardFormatWithSampleRate: sr, channels: 2) else {
    FileHandle.standardError.write("bad format\n".data(using: .utf8)!); exit(1)
}

do {
    // engine must be configured before the sound bank loads cleanly
    try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 512)
    try engine.start()
    try sampler.loadSoundBankInstrument(
        at: dls, program: 0,
        bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB),
        bankLSB: UInt8(kAUSampler_DefaultBankLSB))

    let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: sr,
        AVNumberOfChannelsKey: 2,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
    ]
    let outFile = try AVAudioFile(forWriting: URL(fileURLWithPath: outPath), settings: settings)

    guard let buffer = AVAudioPCMBuffer(
        pcmFormat: engine.manualRenderingFormat,
        frameCapacity: engine.manualRenderingMaximumFrameCount) else { exit(1) }

    let totalFrames = AVAudioFramePosition(sr * duration)
    var idx = 0
    while engine.manualRenderingSampleTime < totalFrames {
        let now = engine.manualRenderingSampleTime
        // fire every event whose time has arrived
        while idx < events.count && AVAudioFramePosition(events[idx].t * sr) <= now {
            let e = events[idx]
            if e.on {
                sampler.startNote(e.note, withVelocity: e.vel, onChannel: 0)
            } else {
                sampler.stopNote(e.note, onChannel: 0)
            }
            idx += 1
        }
        let remaining = totalFrames - now
        let toRender = min(AVAudioFrameCount(remaining), buffer.frameCapacity)
        let status = try engine.renderOffline(toRender, to: buffer)
        if status == .success {
            try outFile.write(from: buffer)
        } else if status == .cannotDoInCurrentContext {
            continue
        } else {
            break
        }
    }
    engine.stop()
    print("wrote \(outPath)  \(duration)s  \(events.count / 2) notes")
} catch {
    FileHandle.standardError.write("error: \(error)\n".data(using: .utf8)!)
    exit(1)
}
