// src/plugins/lucacAudio/index.tsx
import definePlugin from "@utils/types";
import { settings } from "./settings";
import { AudioState, buildProcessedStream, ensureContext } from "./audioEngine";
import { FakeCamState, buildFakeCameraStream } from "./fakeCamera";
import { LucacPanel } from "./ui";
import { applyFixlag } from "./fixlag";
import "./styles.css";

const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

let _nativeGUM: typeof navigator.mediaDevices.getUserMedia | null = null;
let _panelRoot: HTMLDivElement | null = null;

export default definePlugin({
    name: "LucacAudio",
    description: "LUCAC audio engine port — mic boost (getUserMedia only), fake cam, EQ, fixlag. Voice channel desktop không hỗ trợ.",
    authors: [{ name: "you", id: 0n }],
    settings,

    start() {
        if (!settings.store.enabled) return;
        _nativeGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

        navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            const c = constraints || {};
            const hasAudio = !!c.audio;
            const hasVideo = !!c.video;
            const useFakeCam = hasVideo && FakeCamState.enabled && FakeCamState.type;

            if (!hasAudio && !useFakeCam) {
                return _nativeGUM!(constraints);
            }

            let audioStream: MediaStream | null = null;
            if (hasAudio) {
                const baseAudio: MediaTrackConstraints & Record<string, any> = {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 48000
                };
                const audioReq = typeof c.audio === 'object'
                    ? Object.assign({}, baseAudio, c.audio,
                        { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 })
                    : baseAudio;

                let raw: MediaStream | null = null;
                try {
                    raw = await _nativeGUM!({ audio: audioReq, video: false });
                } catch {
                    try {
                        raw = await _nativeGUM!({
                            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
                            video: false
                        });
                    } catch {
                        if (!useFakeCam) throw new Error('Mic failed');
                    }
                }

                if (raw) {
                    if (IS_IOS && settings.store.singleMicMode) {
                        AudioState.params.preGain = Math.max(
                            AudioState.params.preGain,
                            settings.store.iosCompensation
                        );
                    }
                    try {
                        audioStream = await buildProcessedStream(raw);
                    } catch (e) {
                        console.error('[Lucac] build failed:', e);
                        audioStream = raw;
                    }
                }
            }

            let videoStream: MediaStream | null = null;
            if (useFakeCam) {
                try {
                    videoStream = await buildFakeCameraStream();
                } catch (e) {
                    console.error('[Lucac] fake cam failed:', e);
                    try { videoStream = await _nativeGUM!({ video: c.video || true, audio: false }); } catch {}
                }
            } else if (hasVideo) {
                try { videoStream = await _nativeGUM!({ video: c.video || true, audio: false }); } catch {}
            }

            const tracks: MediaStreamTrack[] = [];
            if (videoStream) tracks.push(...videoStream.getVideoTracks());
            if (audioStream) tracks.push(...audioStream.getAudioTracks());
            if (!tracks.length) return _nativeGUM!(constraints);

            const out = new MediaStream(tracks);
            AudioState.activeStream = out;
            return out;
        };

        // Warm up context early (unlock on user gesture)
        const unlock = () => {
            ensureContext().then(() => {
                if (AudioState.ctx?.state === 'suspended') AudioState.ctx.resume();
            }).catch(() => {});
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock, { once: true });

        // Panel
        if (settings.store.showPanel) {
            _panelRoot = document.createElement('div');
            _panelRoot.id = 'lucac-portal';
            document.body.appendChild(_panelRoot);
            // Render panel via simple DOM (Vencord's React is available but for portal simplicity use direct mount)
            import("@webpack/common").then(({ React, ReactDOM }) => {
                ReactDOM.createRoot(_panelRoot!).render(React.createElement(LucacPanel));
            }).catch(err => console.error('[Lucac] panel mount failed:', err));
        }

        // Apply fixlag
        applyFixlag();
    },

    stop() {
        if (_nativeGUM) navigator.mediaDevices.getUserMedia = _nativeGUM;
        _nativeGUM = null;
        if (_panelRoot) { _panelRoot.remove(); _panelRoot = null; }
        const fl = document.getElementById('lucac-fixlag-style');
        if (fl) fl.remove();
    }
});