// src/plugins/lucacAudio/fixlag.ts

export const FixLagState = {
    hideMessages: false, hideNotifications: false, hidePopups: false, hideAds: false,
    hideIframes: false, hideImages: false, hideVideos: false,
    disableAnimations: false, disableTransitions: false, disableBlur: false, disableShadows: false,
    pauseMedia: false, muteAudio: false, throttleRAF: false, rafFPS: 30,
    stopTimers: false, aggressive: false
};

let _origRAF: any = null, _origCAF: any = null;
let _origSetTimeout: any = null, _origSetInterval: any = null;

export function applyFixlag() {
    const old = document.getElementById('lucac-fixlag-style');
    if (old) old.remove();

    const F = FixLagState;
    const notPanel = ':not(#lucac-root *):not(#lucac-root)';
    let css = '';
    if (F.hideMessages) css += `[class*="message" i]${notPanel},[class*="chat" i]${notPanel},[id*="message" i]${notPanel},[id*="chat" i]${notPanel},[class*="msg-" i]${notPanel},[class*="comment" i]${notPanel},[class*="discussion" i]${notPanel},[aria-label*="chat" i]${notPanel}{display:none!important;}`;
    if (F.hideNotifications) css += `[class*="notif" i]${notPanel},[id*="notif" i]${notPanel},[class*="toast" i]${notPanel},[class*="alert-" i]${notPanel},[role="alert"]${notPanel}{display:none!important;}`;
    if (F.hidePopups) css += `[class*="popup" i]${notPanel},[class*="modal" i]${notPanel},[class*="overlay" i]${notPanel},[class*="dialog" i]${notPanel},[class*="banner" i]${notPanel},[role="dialog"]${notPanel}{display:none!important;}`;
    if (F.hideAds) css += `[class*="ad-" i]${notPanel},[class*="-ad" i]${notPanel},[class*="ads" i]${notPanel},[id*="google_ads" i]${notPanel},[id^="div-gpt-ad"]${notPanel},iframe[src*="doubleclick"]:not(#lucac-root *),iframe[src*="googlesyndication"]:not(#lucac-root *),iframe[src*="adservice"]:not(#lucac-root *){display:none!important;}`;
    if (F.hideIframes) css += `iframe:not(#lucac-root iframe):not(#lucac-root){display:none!important;}`;
    if (F.hideImages) css += `img:not(#lucac-root img):not(#lucac-root),picture:not(#lucac-root picture),svg:not(#lucac-root svg){display:none!important;} *{background-image:none!important;}`;
    if (F.hideVideos) css += `video:not(#lucac-root video):not(#lucac-root),[class*="video-" i]${notPanel},[class*="player" i]${notPanel}{display:none!important;}`;
    if (F.disableAnimations) css += `*,*::before,*::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;animation-play-state:paused!important;}`;
    if (F.disableTransitions) css += `*,*::before,*::after{transition-duration:.001ms!important;transition-delay:0s!important;transition-property:none!important;}`;
    if (F.disableBlur) css += `*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;}`;
    if (F.disableShadows) css += `*,*::before,*::after{box-shadow:none!important;text-shadow:none!important;-webkit-box-shadow:none!important;}`;
    if (F.aggressive) css += `html{scroll-behavior:auto!important;}*,*::before,*::after{will-change:auto!important;background-attachment:scroll!important;content-visibility:auto!important;contain:layout style paint!important;}video,audio,canvas,iframe{display:none!important;}`;

    if (css) {
        const st = document.createElement('style');
        st.id = 'lucac-fixlag-style';
        st.textContent = css;
        document.documentElement.appendChild(st);
    }

    if (F.pauseMedia) document.querySelectorAll('video,audio').forEach(m => { try { (m as HTMLMediaElement).pause(); } catch {} });
    if (F.muteAudio) document.querySelectorAll('video,audio').forEach(m => { try { (m as HTMLMediaElement).muted = true; (m as HTMLMediaElement).volume = 0; } catch {} });

    if (F.throttleRAF) {
        if (!_origRAF) { _origRAF = window.requestAnimationFrame.bind(window); _origCAF = window.cancelAnimationFrame.bind(window); }
        const minInt = 1000 / Math.max(10, F.rafFPS | 0);
        window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => { try { cb(performance.now()); } catch {} }, minInt) as unknown as number;
        window.cancelAnimationFrame = (id: number) => clearTimeout(id);
    } else if (_origRAF) {
        window.requestAnimationFrame = _origRAF;
        window.cancelAnimationFrame = _origCAF;
        _origRAF = null; _origCAF = null;
    }

    if (F.stopTimers) {
        if (!_origSetTimeout) { _origSetTimeout = window.setTimeout.bind(window); _origSetInterval = window.setInterval.bind(window); }
        window.setInterval = function (fn: any, ms?: number, ...args: any[]) {
            if ((ms ?? 0) < 500) return -1 as any;
            return _origSetInterval(fn, ms, ...args);
        } as any;
    } else if (_origSetTimeout) {
        window.setTimeout = _origSetTimeout;
        window.setInterval = _origSetInterval;
        _origSetTimeout = null; _origSetInterval = null;
    }
}

export function restoreFixlag() {
    Object.keys(FixLagState).forEach(k => {
        if (typeof (FixLagState as any)[k] === 'boolean') (FixLagState as any)[k] = false;
    });
    FixLagState.rafFPS = 30;
    applyFixlag();
}