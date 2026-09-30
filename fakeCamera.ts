// src/plugins/lucacAudio/fakeCamera.ts

export const FakeCamState = {
    enabled: false,
    type: null as 'image' | 'video' | null,
    imageDataUrl: null as string | null,
    videoUrl: null as string | null,
    fileName: null as string | null,
    fit: 'cover',
    mirror: false,
    width: 1280,
    height: 720,
    fps: 30
};

let _raf: number | null = null;
let _source: HTMLImageElement | HTMLVideoElement | null = null;

export async function buildFakeCameraStream(): Promise<MediaStream> {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_source && (_source as HTMLVideoElement).pause) {
        try { (_source as HTMLVideoElement).pause(); } catch {}
    }

    const W = FakeCamState.width || 1280;
    const H = FakeCamState.height || 720;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    let src: HTMLImageElement | HTMLVideoElement;
    if (FakeCamState.type === 'image') {
        if (!FakeCamState.imageDataUrl) throw new Error('No image');
        const img = new Image();
        img.src = FakeCamState.imageDataUrl;
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img load fail')); });
        src = img;
    } else if (FakeCamState.type === 'video') {
        if (!FakeCamState.videoUrl) throw new Error('No video');
        const v = document.createElement('video');
        v.src = FakeCamState.videoUrl;
        v.loop = true; v.muted = true; v.playsInline = true;
        v.setAttribute('playsinline', '');
        await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('video load fail')); });
        try { await v.play(); } catch {}
        src = v;
    } else {
        throw new Error('No fake cam source');
    }
    _source = src;

    const drawFrame = () => {
        const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || (src as any).width || W;
        const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || (src as any).height || H;
        ctx.save();
        if (FakeCamState.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
        let dx = 0, dy = 0, dw = W, dh = H;
        if (FakeCamState.fit === 'cover') {
            const s = Math.max(W / sw, H / sh);
            dw = sw * s; dh = sh * s;
            dx = (W - dw) / 2; dy = (H - dh) / 2;
        } else if (FakeCamState.fit === 'contain') {
            const s = Math.min(W / sw, H / sh);
            dw = sw * s; dh = sh * s;
            dx = (W - dw) / 2; dy = (H - dh) / 2;
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        }
        try { ctx.drawImage(src, dx, dy, dw, dh); } catch {}
        ctx.restore();
        _raf = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    const stream = canvas.captureStream(FakeCamState.fps || 30);
    const vt = stream.getVideoTracks()[0];
    if (vt) vt.addEventListener('ended', () => {
        if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
        if (_source && (_source as HTMLVideoElement).pause) {
            try { (_source as HTMLVideoElement).pause(); } catch {}
        }
    });
    return stream;
}

export function clearFakeCamFile() {
    if (FakeCamState.videoUrl?.startsWith('blob:')) {
        try { URL.revokeObjectURL(FakeCamState.videoUrl); } catch {}
    }
    FakeCamState.type = null;
    FakeCamState.imageDataUrl = null;
    FakeCamState.videoUrl = null;
    FakeCamState.fileName = null;
    FakeCamState.enabled = false;
}