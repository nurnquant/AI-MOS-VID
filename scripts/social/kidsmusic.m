// Render a bouncy children's sing-along bed to WAV using the Apple DLS bank.
//
//   clang -fobjc-arc -framework Foundation -framework AVFoundation \
//         -framework AudioToolbox -o /tmp/kidsmusic scripts/social/kidsmusic.m
//   /tmp/kidsmusic out.wav 55 12     # 55 seconds, GM program 12 = Marimba
//
// Companion to piano.m, which renders the slow reverent bed for style 1. This
// one is for style 7: bright C major I-V-vi-IV, fast 1.6s bars, a repeating
// four-bar melodic hook children can latch onto, plus a marimba/piano bass.
//
// General MIDI programs worth trying: 0 Acoustic Grand, 11 Vibraphone,
// 12 Marimba, 13 Xylophone, 9 Glockenspiel. Marimba reads as playful without
// being shrill on phone speakers.
//
// Objective-C rather than Swift because the host's Swift CLI cannot build
// against the installed macOS SDK.

#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>

typedef struct { double t; int on; uint8_t note; uint8_t vel; } Event;

static Event gEvents[8192];
static int gCount = 0;

static void addNote(double t, uint8_t n, uint8_t vel, double hold) {
    if (gCount + 2 >= (int)(sizeof(gEvents) / sizeof(gEvents[0]))) return;
    gEvents[gCount++] = (Event){t, 1, n, vel};
    gEvents[gCount++] = (Event){t + hold, 0, n, 0};
}

static int cmpEvent(const void *a, const void *b) {
    double d = ((const Event *)a)->t - ((const Event *)b)->t;
    return d < 0 ? -1 : (d > 0 ? 1 : 0);
}

int main(int argc, char **argv) {
    @autoreleasepool {
        if (argc < 2) {
            fprintf(stderr, "usage: kidsmusic <out.wav> [seconds] [gm-program]\n");
            return 2;
        }
        NSString *outPath = [NSString stringWithUTF8String:argv[1]];
        double duration = (argc >= 3) ? atof(argv[2]) : 55.0;
        int program = (argc >= 4) ? atoi(argv[3]) : 12;   // Marimba

        // C major, I-V-vi-IV: C / G / Am / F. Bar = 1.6s, so ~150bpm in 4/4 —
        // brisk enough to clap along to without rushing a spoken rhyme.
        const double bar = 1.6;
        const double eighth = bar / 8.0;
        uint8_t bass[4] = {36, 43, 45, 41};             // C2 G2 A2 F2
        uint8_t chord[4][3] = {
            {60, 64, 67},   // C  E  G
            {59, 62, 67},   // B  D  G
            {60, 64, 69},   // C  E  A
            {60, 65, 69},   // C  F  A
        };
        // Four-bar hook, eight eighth-notes per bar. 0 = rest.
        uint8_t hook[4][8] = {
            {72, 0, 76, 0, 79, 0, 76, 0},
            {74, 0, 71, 0, 74, 0, 79, 0},
            {76, 0, 72, 0, 69, 0, 72, 0},
            {77, 0, 74, 0, 72, 0,  0, 0},
        };

        int bars = (int)(duration / bar) + 1;
        for (int b = 0; b < bars; b++) {
            double t0 = b * bar;
            int c = b % 4;
            int lastBar = (b >= bars - 1);

            // bass on beats 1 and 3, an octave apart for lift
            addNote(t0, bass[c], 62, bar * 0.45);
            addNote(t0 + bar * 0.5, (uint8_t)(bass[c] + 12), 52, bar * 0.35);

            // chord on the off-beats, quiet, just to hold the harmony
            for (int j = 0; j < 3; j++) {
                addNote(t0 + bar * 0.25, chord[c][j], 34, bar * 0.22);
                addNote(t0 + bar * 0.75, chord[c][j], 30, bar * 0.22);
            }

            // the hook, slightly softer on repeats so it never nags
            uint8_t vel = (b < 4) ? 70 : 64;
            for (int e = 0; e < 8; e++) {
                uint8_t n = hook[c][e];
                if (!n) continue;
                if (lastBar && e > 3) continue;
                addNote(t0 + e * eighth, n, vel, eighth * 1.8);
            }
        }
        qsort(gEvents, gCount, sizeof(Event), cmpEvent);

        AVAudioEngine *engine = [[AVAudioEngine alloc] init];
        AVAudioUnitSampler *sampler = [[AVAudioUnitSampler alloc] init];
        [engine attachNode:sampler];
        [engine connect:sampler to:engine.mainMixerNode format:nil];

        double sr = 44100.0;
        AVAudioFormat *fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:sr channels:2];
        NSError *err = nil;

        if (![engine enableManualRenderingMode:AVAudioEngineManualRenderingModeOffline
                                       format:fmt
                            maximumFrameCount:512
                                        error:&err]) {
            fprintf(stderr, "manual mode failed: %s\n", err.localizedDescription.UTF8String);
            return 1;
        }
        if (![engine startAndReturnError:&err]) {
            fprintf(stderr, "engine start failed: %s\n", err.localizedDescription.UTF8String);
            return 1;
        }

        NSURL *dls = [NSURL fileURLWithPath:@"/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls"];
        if (![sampler loadSoundBankInstrumentAtURL:dls
                                          program:(UInt8)program
                                          bankMSB:kAUSampler_DefaultMelodicBankMSB
                                          bankLSB:kAUSampler_DefaultBankLSB
                                            error:&err]) {
            fprintf(stderr, "sound bank failed: %s\n", err.localizedDescription.UTF8String);
            return 1;
        }

        NSDictionary *settings = @{
            AVFormatIDKey: @(kAudioFormatLinearPCM),
            AVSampleRateKey: @(sr),
            AVNumberOfChannelsKey: @2,
            AVLinearPCMBitDepthKey: @16,
            AVLinearPCMIsFloatKey: @NO,
            AVLinearPCMIsBigEndianKey: @NO,
        };
        AVAudioFile *outFile = [[AVAudioFile alloc] initForWriting:[NSURL fileURLWithPath:outPath]
                                                         settings:settings
                                                            error:&err];
        if (!outFile) {
            fprintf(stderr, "open out failed: %s\n", err.localizedDescription.UTF8String);
            return 1;
        }

        AVAudioPCMBuffer *buf = [[AVAudioPCMBuffer alloc]
            initWithPCMFormat:engine.manualRenderingFormat
                frameCapacity:engine.manualRenderingMaximumFrameCount];

        AVAudioFramePosition total = (AVAudioFramePosition)(sr * duration);
        int idx = 0;
        while (engine.manualRenderingSampleTime < total) {
            AVAudioFramePosition now = engine.manualRenderingSampleTime;
            while (idx < gCount && (AVAudioFramePosition)(gEvents[idx].t * sr) <= now) {
                Event e = gEvents[idx++];
                if (e.on) {
                    [sampler startNote:e.note withVelocity:e.vel onChannel:0];
                } else {
                    [sampler stopNote:e.note onChannel:0];
                }
            }
            AVAudioFramePosition remain = total - now;
            AVAudioFrameCount toRender = (AVAudioFrameCount)MIN((AVAudioFramePosition)buf.frameCapacity, remain);
            AVAudioEngineManualRenderingStatus st = [engine renderOffline:toRender toBuffer:buf error:&err];
            if (st == AVAudioEngineManualRenderingStatusSuccess) {
                if (![outFile writeFromBuffer:buf error:&err]) {
                    fprintf(stderr, "write failed: %s\n", err.localizedDescription.UTF8String);
                    return 1;
                }
            } else if (st == AVAudioEngineManualRenderingStatusCannotDoInCurrentContext) {
                continue;
            } else {
                break;
            }
        }
        [engine stop];
        printf("wrote %s  %.1fs  program %d  %d notes\n",
               outPath.UTF8String, duration, program, gCount / 2);
    }
    return 0;
}
