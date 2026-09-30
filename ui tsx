// src/plugins/lucacAudio/ui.tsx
import { React, useState, useEffect, useRef } from "@webpack/common";
import { AudioState, pushParams, playAudioFile, stopAudioFile, PRESETS, VOICE_PRESETS } from "./audioEngine";
import { FakeCamState, clearFakeCamFile } from "./fakeCamera";
import { FixLagState, applyFixlag, restoreFixlag } from "./fixlag";

let _panelEl: HTMLDivElement | null = null;

function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
    return (
        <div className="lucac-row">
            <div className="lucac-rowlabel">
                <span>{label}</span>
                {value !== undefined && <span>{value}</span>}
            </div>
            {children}
        </div>
    );
}

function Slider({ id, min, max, step, value, onChange, color = "#ff0055" }: {
    id: string; min: number; max: number; step: number; value: number;
    onChange: (v: number) => void; color?: string;
}) {
    const pct = ((value - min) / (max - min) * 100).toFixed(1) + '%';
    return (
        <input
            type="range"
            id={id}
            min={min} max={max} step={step}
            value={value}
            style={{ ["--v" as any]: pct }}
            onChange={e => onChange(parseFloat(e.currentTarget.value))}
        />
    );
}

export function LucacPanel() {
    const [tab, setTab] = useState('gain');
    const [collapsed, setCollapsed] = useState(false);
    const [tick, setTick] = useState(0);
    const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });

    const [, force] = useState(0);
    const refresh = () => force(x => x + 1);

    useEffect(() => {
        // VU meter
        const vu = document.getElementById('lucac-vu-bar');
        let raf = 0;
        const data = new Uint8Array(32);
        const loop = () => {
            if (AudioState.analyser && vu && !collapsed) {
                AudioState.analyser.getByteFrequencyData(data);
                let s = 0; for (let i = 0; i < data.length; i++) s += data[i];
                vu.style.width = Math.min(100, (s / data.length / 140) * 100) + '%';
            }
            raf = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(raf);
    }, [collapsed]);

    const P = AudioState.params;
    const E = AudioState.echo;
    const up = () => { pushParams(); refresh(); };

    const handleMouseDown = (e: React.MouseEvent) => {
        const el = _panelEl!;
        const r = el.getBoundingClientRect();
        dragRef.current = { dragging: true, ox: e.clientX - r.left, oy: e.clientY - r.top };
        e.preventDefault();
    };

    useEffect(() => {
        const mm = (e: MouseEvent) => {
            if (!dragRef.current.dragging || !_panelEl) return;
            _panelEl.style.left = (e.clientX - dragRef.current.ox) + 'px';
            _panelEl.style.top = (e.clientY - dragRef.current.oy) + 'px';
            _panelEl.style.right = 'auto';
        };
        const mu = () => { dragRef.current.dragging = false; };
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup', mu);
        return () => {
            document.removeEventListener('mousemove', mm);
            document.removeEventListener('mouseup', mu);
        };
    }, []);

    const tabs = [
        ['gain', 'GAIN'], ['voice', 'VOICE'], ['eq', 'EQ'],
        ['track', 'TRACK'], ['media', 'MEDIA'], ['channel', 'CHANNEL'],
        ['fixlag', '⚡'], ['fakecam', '📷'], ['info', 'BIO']
    ] as const;

    return (
        <div id="lucac-root" ref={el => { _panelEl = el; }}>
            <div id="lucac-head" onMouseDown={handleMouseDown}>
                <div id="lucac-title">
                    <span style={{ fontSize: 14, color: '#ff0055' }}>🔥</span>
                    <span id="lucac-name">LUCAC</span>
                    <span id="lucac-tag">VENCORD</span>
                </div>
                <div id="lucac-right">
                    <div id="lucac-badge">
                        <span id="lucac-dot" />
                        <span id="lucac-st">READY</span>
                    </div>
                    <button id="lucac-col" onClick={() => setCollapsed(c => !c)}>
                        {collapsed ? '+' : '−'}
                    </button>
                </div>
            </div>
            <div id="lucac-vu-container"><div id="lucac-vu-bar" /></div>

            {!collapsed && (
                <>
                    <div id="lucac-tabs">
                        {tabs.map(([k, label]) => (
                            <button
                                key={k}
                                className={"lucac-tab-btn" + (tab === k ? " lucac-tab-on" : "")}
                                onClick={() => setTab(k)}
                            >{label}</button>
                        ))}
                    </div>
                    <div id="lucac-body">
                        {tab === 'gain' && <GainTab P={P} up={up} />}
                        {tab === 'voice' && <VoiceTab P={P} up={up} />}
                        {tab === 'eq' && <EqTab P={P} up={up} />}
                        {tab === 'track' && <TrackTab />}
                        {tab === 'media' && <MediaTab />}
                        {tab === 'channel' && <ChannelTab P={P} up={up} />}
                        {tab === 'fixlag' && <FixLagTab />}
                        {tab === 'fakecam' && <FakeCamTab />}
                        {tab === 'info' && <InfoTab />}
                    </div>
                </>
            )}
        </div>
    );
}

function GainTab({ P, up }: { P: any; up: () => void }) {
    return (
        <>
            <div className="lucac-presets">
                {Object.keys(PRESETS).map(k => (
                    <button key={k} className="lucac-kp-btn"
                        onClick={() => { Object.assign(P, PRESETS[k]); up(); }}
                    >{k}</button>
                ))}
            </div>
            <div className="lucac-sep" />
            <Row label="🔊 PRE GAIN" value={P.preGain.toFixed(1) + 'x'}>
                <Slider id="pg" min={1} max={5000} step={1} value={P.preGain}
                    onChange={v => { P.preGain = v; up(); }} />
            </Row>
            <Row label="🔥 DRIVE" value={(P.drive * 100).toFixed(0) + '%'}>
                <Slider id="dr" min={0} max={1} step={0.01} value={P.drive}
                    onChange={v => { P.drive = v; up(); }} />
            </Row>
            <Row label="💥 CRUSH" value={(P.crush * 100).toFixed(0) + '%'}>
                <Slider id="cr" min={0} max={1} step={0.01} value={P.crush}
                    onChange={v => { P.crush = v; up(); }} />
            </Row>
            <Row label="↔ WIDTH" value={(P.width * 100).toFixed(0) + '%'}>
                <Slider id="wd" min={0} max={2} step={0.01} value={P.width}
                    onChange={v => { P.width = v; up(); }} />
            </Row>
            <Row label="🔉 POSTGAIN" value={P.postGain.toFixed(1) + 'x'}>
                <Slider id="po" min={0.1} max={5000} step={0.1} value={P.postGain}
                    onChange={v => { P.postGain = v; up(); }} />
            </Row>
            <div className="lucac-sep" />
            <div className="lucac-section-title" style={{ color: '#00e5ff' }}>🎚 dB GAIN</div>
            <Row label="📥 INPUT dB" value={P.inputDb.toFixed(1) + ' dB'}>
                <Slider id="indb" min={-24} max={24} step={0.5} value={P.inputDb}
                    color="#00e5ff"
                    onChange={v => { P.inputDb = v; up(); }} />
            </Row>
            <Row label="📤 OUTPUT dB" value={P.outputDb.toFixed(1) + ' dB'}>
                <Slider id="outdb" min={-24} max={24} step={0.5} value={P.outputDb}
                    color="#00e5ff"
                    onChange={v => { P.outputDb = v; up(); }} />
            </Row>
            <button className="lucac-toggle-btn" style={{ marginTop: 8 }}
                onClick={() => { P.godMode = P.godMode ? 0 : 1; up(); }}
            >{P.godMode ? '⚡ GOD MODE: ON' : '⚡ GOD MODE: OFF'}</button>
            <button className="lucac-toggle-btn" style={{ marginTop: 8 }}
                onClick={() => { P.satMode = P.satMode ? 0 : 1; up(); }}
            >{P.satMode ? '🔥 DUYANH ENGINE: ON' : '🔥 DUYANH ENGINE: OFF'}</button>
        </>
    );
}

function VoiceTab({ P, up }: { P: any; up: () => void }) {
    return (
        <>
            <div className="lucac-presets">
                {Object.keys(VOICE_PRESETS).map(k => (
                    <button key={k} className="lucac-kp-btn"
                        onClick={() => {
                            const v = VOICE_PRESETS[k];
                            P.voicePitch = v.pitch;
                            P.voiceFormant = v.formant;
                            P.voiceMix = v.mix;
                            up();
                        }}
                    >{k}</button>
                ))}
            </div>
            <div className="lucac-sep" />
            <Row label="🎵 PITCH" value={P.voicePitch.toFixed(2) + 'x'}>
                <Slider id="vp" min={-1} max={2.5} step={0.01} value={P.voicePitch}
                    onChange={v => { P.voicePitch = v; up(); }} />
            </Row>
            <Row label="🎼 FORMANT" value={P.voiceFormant.toFixed(2) + 'x'}>
                <Slider id="vf" min={0.3} max={2} step={0.01} value={P.voiceFormant}
                    onChange={v => { P.voiceFormant = v; up(); }} />
            </Row>
            <Row label="🎚 MIX" value={(P.voiceMix * 100).toFixed(0) + '%'}>
                <Slider id="vm" min={0} max={1} step={0.01} value={P.voiceMix}
                    onChange={v => { P.voiceMix = v; up(); }} />
            </Row>
            <div className="lucac-sep" />
            <button className="lucac-toggle-btn"
                onClick={() => { P.autotuneOn = P.autotuneOn ? 0 : 1; up(); }}
            >{P.autotuneOn ? '🎵 AUTOTUNE: ON' : '🎵 AUTOTUNE: OFF'}</button>
            <Row label="⏱ SPEED" value={(P.autotuneSpeed * 100).toFixed(0) + '%'}>
                <Slider id="ats" min={0} max={1} step={0.01} value={P.autotuneSpeed}
                    onChange={v => { P.autotuneSpeed = v; up(); }} />
            </Row>
            <div className="lucac-sep" />
            <div className="lucac-section-title" style={{ color: '#ff0055' }}>🌊 REVERB</div>
            <Row label="🌊 Mix" value={(P.reverbMix * 100).toFixed(0) + '%'}>
                <Slider id="rvm" min={0} max={1} step={0.01} value={P.reverbMix}
                    onChange={v => { P.reverbMix = v; up(); }} />
            </Row>
            <Row label="⏱ Decay" value={(P.reverbDecay * 100).toFixed(0) + '%'}>
                <Slider id="rvd" min={0} max={0.99} step={0.01} value={P.reverbDecay}
                    onChange={v => { P.reverbDecay = v; up(); }} />
            </Row>
            <div className="lucac-sep" />
            <div className="lucac-section-title" style={{ color: '#00e5ff' }}>🌠 ECHO</div>
            <Row label="🌠 Mix" value={(AudioState.echo.mix * 100).toFixed(0) + '%'}>
                <Slider id="em" min={0} max={1} step={0.01} value={AudioState.echo.mix}
                    color="#00e5ff"
                    onChange={v => { AudioState.echo.mix = v; up(); }} />
            </Row>
            <Row label="⏱ Time" value={AudioState.echo.time.toFixed(2) + 's'}>
                <Slider id="et" min={0.05} max={1.5} step={0.01} value={AudioState.echo.time}
                    color="#00e5ff"
                    onChange={v => { AudioState.echo.time = v; up(); }} />
            </Row>
            <Row label="🔁 Feedback" value={(AudioState.echo.feedback * 100).toFixed(0) + '%'}>
                <Slider id="ef" min={0} max={0.9} step={0.01} value={AudioState.echo.feedback}
                    color="#00e5ff"
                    onChange={v => { AudioState.echo.feedback = v; up(); }} />
            </Row>
        </>
    );
}

function EqTab({ P, up }: { P: any; up: () => void }) {
    return (
        <>
            <div className="lucac-section-title" style={{ color: '#ff0055' }}>🎚 FREQUENCY</div>
            <Row label="🔊 LOW BASS" value={P.eqBass.toFixed(1) + ' dB'}>
                <Slider id="eqb" min={-12} max={12} step={0.5} value={P.eqBass}
                    onChange={v => { P.eqBass = v; up(); }} />
            </Row>
            <Row label="🎵 MID" value={P.eqMid.toFixed(1) + ' dB'}>
                <Slider id="eqm" min={-12} max={12} step={0.5} value={P.eqMid}
                    onChange={v => { P.eqMid = v; up(); }} />
            </Row>
            <Row label="✨ TREBLE" value={P.eqTreble.toFixed(1) + ' dB'}>
                <Slider id="eqt" min={-12} max={12} step={0.5} value={P.eqTreble}
                    onChange={v => { P.eqTreble = v; up(); }} />
            </Row>
            <div className="lucac-sep" />
            <div className="lucac-section-title" style={{ color: '#ff0055' }}>🚫 NOISE GATE</div>
            <button className="lucac-toggle-btn"
                onClick={() => { P.noiseGateOn = P.noiseGateOn ? 0 : 1; up(); }}
            >{P.noiseGateOn ? '🚫 GATE: ON' : '🚫 GATE: OFF'}</button>
            <Row label="🚫 Threshold" value={(P.noiseGateThreshold * 100).toFixed(1) + '%'}>
                <Slider id="ngt" min={0} max={0.3} step={0.005} value={P.noiseGateThreshold}
                    onChange={v => { P.noiseGateThreshold = v; up(); }} />
            </Row>
        </>
    );
}

function TrackTab() {
    const [info, setInfo] = useState('Music file not selected...');
    const fileRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <div className="lucac-section-title" style={{ color: '#ff0055' }}>🎵 PLAY MUSIC</div>
            <div style={{ background: '#000', border: '1px solid #222', padding: 12 }}>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="lucac-set-btn lucac-save" onClick={() => fileRef.current?.click()}>📁 Select</button>
                    <button className="lucac-set-btn" onClick={() => { stopAudioFile(); setInfo('Stopped.'); }}>⏹ Stop</button>
                </div>
                <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                    onChange={e => {
                        const f = e.currentTarget.files?.[0];
                        if (f) { playAudioFile(f); setInfo('🎵 ' + f.name); }
                    }}
                />
                <Row label="🎚 Volume" value={(AudioState.params.musicVol * 100).toFixed(0) + '%'}>
                    <Slider id="mv" min={0} max={1} step={0.01} value={AudioState.params.musicVol}
                        onChange={v => {
                            AudioState.params.musicVol = v;
                            if (AudioState.musicGain && AudioState.ctx)
                                AudioState.musicGain.gain.setValueAtTime(v, AudioState.ctx.currentTime);
                        }} />
                </Row>
            </div>
        </>
    );
}

function MediaTab() {
    const [cam, setCam] = useState(true);
    const [mic, setMic] = useState(true);
    const apply = (c: boolean, m: boolean) => {
        const st = AudioState.activeStream;
        if (st) {
            st.getVideoTracks().forEach(t => t.enabled = c);
            st.getAudioTracks().forEach(t => t.enabled = m);
        }
    };
    return (
        <>
            <div className="lucac-section-title" style={{ color: '#00ff88' }}>🎥 CAMERA / MICROPHONE</div>
            <div className="lucac-hint" style={{ marginBottom: 10 }}>
                Toggle track enabled = false. Không gửi dữ liệu.
            </div>
            <button className="lucac-toggle-btn" style={{ marginBottom: 8 }}
                onClick={() => { const v = !cam; setCam(v); apply(v, mic); }}
            >{cam ? '📷 CAMERA: ON' : '📷 CAMERA: OFF'}</button>
            <button className="lucac-toggle-btn"
                onClick={() => { const v = !mic; setMic(v); apply(cam, v); }}
            >{mic ? '🎤 MIC: ON' : '🎤 MIC: OFF'}</button>
        </>
    );
}

function ChannelTab({ P, up }: { P: any; up: () => void }) {
    return (
        <>
            <div className="lucac-section-title" style={{ color: '#ff0055' }}>🎛 CHANNEL CONTROL</div>
            <div className="lucac-hint" style={{ marginBottom: 10 }}>
                ⚠ Voice Discord là mono — L/R có thể không hiệu quả.
            </div>
            <Row label="⚖ Balance" value={(P.balance * 100).toFixed(0) + '%'}>
                <Slider id="bal" min={0} max={1} step={0.01} value={P.balance}
                    onChange={v => { P.balance = v; up(); }} />
            </Row>
            <Row label="↔ Pan" value={(P.pan * 100).toFixed(0) + '%'}>
                <Slider id="pan" min={-1} max={1} step={0.01} value={P.pan}
                    onChange={v => { P.pan = v; up(); }} />
            </Row>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="lucac-set-btn" onClick={() => { P.muteLeft = !P.muteLeft; up(); }}>
                    🔇 {P.muteLeft ? 'Unmute' : 'Mute'} L
                </button>
                <button className="lucac-set-btn" onClick={() => { P.muteRight = !P.muteRight; up(); }}>
                    🔇 {P.muteRight ? 'Unmute' : 'Mute'} R
                </button>
            </div>
        </>
    );
}

function FixLagTab() {
    const [state, setState] = useState({ ...FixLagState });
    const upd = (k: keyof typeof FixLagState, v: any) => {
        (FixLagState as any)[k] = v;
        applyFixlag();
        setState({ ...FixLagState });
    };
    const items: [keyof typeof FixLagState, string][] = [
        ['hideMessages', '💬 Hide messages'],
        ['hideNotifications', '🔔 Hide notifications'],
        ['hidePopups', '🪟 Hide popups'],
        ['hideAds', '📢 Hide ads'],
        ['hideIframes', '🖼 Hide iframes'],
        ['hideImages', '🖼 Hide images'],
        ['hideVideos', '🎬 Hide videos'],
        ['disableAnimations', '🎞 Disable animations'],
        ['disableTransitions', '🔄 Disable transitions'],
        ['disableBlur', '💧 Disable blur'],
        ['disableShadows', '🌑 Disable shadows'],
        ['pauseMedia', '⏸ Pause media'],
        ['muteAudio', '🔇 Mute audio'],
        ['throttleRAF', '⏱ Throttle RAF'],
        ['stopTimers', '🚫 Block fast timers'],
        ['aggressive', '💀 Aggressive']
    ];
    return (
        <>
            <div className="lucac-section-title" style={{ color: '#00e5ff' }}>⚡ FIXLAG</div>
            {items.map(([k, label]) => (
                <Row key={k} label={label}>
                    <input type="checkbox" checked={!!state[k]}
                        onChange={e => upd(k, e.currentTarget.checked)} />
                </Row>
            ))}
            <Row label="📉 FPS" value={state.rafFPS + ' FPS'}>
                <Slider id="fps" min={10} max={60} step={5} value={state.rafFPS}
                    color="#00e5ff"
                    onChange={v => upd('rafFPS', v)} />
            </Row>
            <div style={{ display: 'flex', gap: 6 }}>
                <button className="lucac-set-btn" onClick={() => { restoreFixlag(); setState({ ...FixLagState }); }}>↺ Restore</button>
                <button className="lucac-set-btn lucac-save" onClick={() => location.reload()}>🔄 Reload</button>
            </div>
        </>
    );
}

function FakeCamTab() {
    const [state, setState] = useState({ ...FakeCamState });
    const fileRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <div className="lucac-section-title" style={{ color: '#ff8800' }}>📷 FAKE CAMERA</div>
            <button className="lucac-toggle-btn" style={{ marginBottom: 10 }}
                onClick={() => {
                    if (!FakeCamState.type) { alert('Upload file first'); return; }
                    FakeCamState.enabled = !FakeCamState.enabled;
                    setState({ ...FakeCamState });
                }}
            >{state.enabled ? '📷 FAKE CAM: ON' : '📷 FAKE CAM: OFF'}</button>
            <Row label="📁 File">
                <input ref={fileRef} type="file" accept="image/*,video/*"
                    style={{ width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: 6, fontSize: 10 }}
                    onChange={e => {
                        const f = e.currentTarget.files?.[0];
                        if (!f) return;
                        if (f.type.startsWith('image/')) {
                            const r = new FileReader();
                            r.onload = ev => {
                                FakeCamState.type = 'image';
                                FakeCamState.imageDataUrl = ev.target!.result as string;
                                FakeCamState.fileName = f.name;
                                FakeCamState.enabled = true;
                                setState({ ...FakeCamState });
                            };
                            r.readAsDataURL(f);
                        } else if (f.type.startsWith('video/')) {
                            if (FakeCamState.videoUrl?.startsWith('blob:')) URL.revokeObjectURL(FakeCamState.videoUrl);
                            FakeCamState.type = 'video';
                            FakeCamState.videoUrl = URL.createObjectURL(f);
                            FakeCamState.imageDataUrl = null;
                            FakeCamState.fileName = f.name;
                            FakeCamState.enabled = true;
                            setState({ ...FakeCamState });
                        }
                    }} />
            </Row>
            <div className="lucac-hint">{state.fileName || 'Chưa chọn file...'}</div>
            <Row label="Fit">
                <select value={state.fit} style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #333', padding: 6 }}
                    onChange={e => { FakeCamState.fit = e.currentTarget.value; setState({ ...FakeCamState }); }}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                </select>
            </Row>
            <Row label="Resolution">
                <select value={state.width + 'x' + state.height}
                    style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #333', padding: 6 }}
                    onChange={e => {
                        const [w, h] = e.currentTarget.value.split('x').map(Number);
                        FakeCamState.width = w; FakeCamState.height = h;
                        setState({ ...FakeCamState });
                    }}>
                    <option value="640x480">640×480</option>
                    <option value="1280x720">1280×720</option>
                    <option value="1920x1080">1920×1080</option>
                </select>
            </Row>
            <Row label="🪞 Mirror">
                <input type="checkbox" checked={state.mirror}
                    onChange={e => { FakeCamState.mirror = e.currentTarget.checked; setState({ ...FakeCamState }); }} />
            </Row>
            <Row label="🎞 FPS" value={state.fps + ' FPS'}>
                <Slider id="fcfps" min={5} max={60} step={1} value={state.fps}
                    color="#ff8800"
                    onChange={v => { FakeCamState.fps = v; setState({ ...FakeCamState }); }} />
            </Row>
            <button className="lucac-set-btn" style={{ marginTop: 8, width: '100%' }}
                onClick={() => { clearFakeCamFile(); setState({ ...FakeCamState }); }}
            >🗑 Clear file</button>
        </>
    );
}

function InfoTab() {
    return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32 }}>🔥</div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, marginTop: 12 }}>LUCAC Audio</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 6, fontFamily: "'Share Tech Mono', monospace" }}>
                Vencord port · v1.0.0
            </div>
            <div className="lucac-hint" style={{ marginTop: 20, textAlign: 'left' }}>
                ⚠ Voice channel desktop dùng native engine → boost không áp dụng.
                Chỉ hoạt động với getUserMedia (stream / call / go live).
                Với voice thường, dùng Voicemeeter/Equalizer APO.
            </div>
        </div>
    );
}