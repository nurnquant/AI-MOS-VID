// Render a soft acoustic-piano bed to WAV using the Apple DLS sound bank.
//
//   clang -fobjc-arc -framework Foundation -framework AVFoundation \
//         -framework AudioToolbox -o /tmp/piano scripts/social/piano.m
//   /tmp/piano out.wav 11.5
//
// Real sampled piano (gs_instruments.dls program 0, Acoustic Grand) rendered
// offline through AVAudioEngine. Objective-C rather than Swift because the
// host's Swift CLI cannot build against the installed macOS SDK.

#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>

typedef struct { double t; int on; uint8_t note; uint8_t vel; } Event;

static Event gEvents[512];
static int gCount = 0;

static void addNote(double t, uint8_t n, uint8_t vel, double hold) {
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
            fprintf(stderr, "usage: piano <out.wav> [seconds]\n");
            return 2;
        }
        NSString *outPath = [NSString stringWithUTF8String:argv[1]];
        double duration = (argc >= 3) ? atof(argv[2]) : 11.0;

        // Slow sparse progression in D major: Dmaj / A / Bm / G.
        // Bass, gentle rising arpeggio, then one melody note. Soft velocities.
        const double bar = 2.75;
        uint8_t bass[4] = {50, 45, 47, 43};
        uint8_t arp[4][3] = {{57, 62, 66}, {52, 57, 61}, {54, 59, 62}, {50, 55, 59}};
        uint8_t mel[4] = {69, 66, 66, 62};

        for (int i = 0; i < 4; i++) {
            double t0 = i * bar;
            int last = (i == 3);
            addNote(t0, bass[i], 44, bar + (last ? 2.4 : 0.7));
            for (int j = 0; j < 3; j++) {
                addNote(t0 + 0.42 + j * 0.36, arp[i][j], (uint8_t)(40 - j * 2), bar - 0.2);
            }
            addNote(t0 + 1.55, mel[i], last ? 40 : 46, last ? 2.8 : bar - 1.1);
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
                                          program:0
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
        printf("wrote %s  %.1fs  %d notes\n", outPath.UTF8String, duration, gCount / 2);
    }
    return 0;
}
