// ==UserScript==
// @name         LUCAC
// @namespace    lucac
// @version      93
// @description  NgDuyAnhHw - Config share profiles (v93)
// @match        *://*/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
    'use strict';
    if (window.__LucacHellfire__) return;
    window.__LucacHellfire__ = true;

    const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const IS_ORION = /Orion/i.test(navigator.userAgent);
    const IOS_MIC_COMPENSATION = IS_IOS ? 4.5 : 1.0;
    const SINGLE_MIC_MODE = true;

    const LUCAC_DISCORD_INVITE = 'https://discord.gg/mVq4ytdyD3';
    // API ban/IP: de trong neu bot FastAPI public, vd 'http://IP_VPS:8000' (khong co / cuoi)
    // Co the ghi de bang localStorage.setItem('lucac_ban_api', 'http://...')
    const LUCAC_BAN_API_DEFAULT = '';
    const IP_STORAGE = 'lucac_client_ip';
    const BAN_STORAGE = 'lucac_ban_info';


    // ========== KEY / LICENSE SYSTEM (24h Discord *getkey) ==========
    // PHAI TRUNG SECRET VOI BOT (lucac_getkey / *getkey)
    const KEY_SECRET = 'LUCAC_KEY_SECRET_2026_NDA';
    const KEY_STORAGE = 'lucac_key_v1';
    const KEY_TTL_SEC = 24 * 3600;

    function _fnv1a(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i) & 255;
            h = Math.imul(h, 16777619) >>> 0;
        }
        return ('00000000' + h.toString(16)).slice(-8);
    }
    function _normKey(k) {
        return String(k || '').trim().toUpperCase().replace(/\s+/g, '').replace(/[_]/g, '-');
    }
    function _mac(parts) {
        // MAC nhe: FNV(SECRET | part1 | part2 | ...)
        return _fnv1a(KEY_SECRET + '|' + parts.join('|'));
    }

    // Owner / lifetime keys (hash) — van dung
    const VALID_KEY_HASHES = {};
    (function _seedKeys() {
        const raw = [
            'LUCAC-2026-NGDUY',
            'LUCAC-PREMIUM-ANH',
            'LUCAC-GLASS-V85',
            'NDA-LUCAC-OWNER',
            'VIP-LUCAC-FOREVER'
        ];
        raw.forEach(k => { VALID_KEY_HASHES[_fnv1a(_normKey(k))] = 1; });
    })();

    /**
     * Timed key format (tu bot *getkey):
     *   LC-<expHex>-<uidHex>-<sig8>
     * sig = FNV(SECRET|exp|uid)
     */
    function verifyTimedKey(input) {
        const n = _normKey(input);
        const m = /^LC-([0-9A-F]+)-([0-9A-F]+)-([0-9A-F]{8})$/.exec(n);
        if (!m) return { ok: false, msg: 'Sai định dạng key' };
        const exp = parseInt(m[1], 16);
        const uid = m[2];
        const sig = m[3].toLowerCase();
        if (!isFinite(exp) || exp < 0) return { ok: false, msg: 'Key hỏng' };
        const now = Math.floor(Date.now() / 1000);
        // exp === 0 => vĩnh viễn (admin *taokey)
        if (exp !== 0 && exp < now) return { ok: false, msg: 'Key hết hạn — gõ *getkey trên Discord' };
        // cho phép admin cấp key dài (tối đa ~10 năm)
        if (exp !== 0 && exp > now + 10 * 365 * 86400) return { ok: false, msg: 'Key không hợp lệ (time)' };
        const expect = _mac([String(exp), uid.toLowerCase()]);
        if (sig !== expect) return { ok: false, msg: 'Key không hợp lệ (sig)' };
        return { ok: true, msg: exp === 0 ? 'OK · vĩnh viễn' : 'OK', exp: exp, uid: uid, kind: exp === 0 ? 'perm' : 'timed' };
    }

    function verifyStaticKey(input) {
        const h = _fnv1a(_normKey(input));
        if (VALID_KEY_HASHES[h]) return { ok: true, msg: 'OK', kind: 'static', hash: h };
        return { ok: false, msg: 'Key không hợp lệ' };
    }

    function isKeyUnlocked() {
        try {
            const tok = localStorage.getItem(KEY_STORAGE);
            if (!tok) return false;
            const parts = tok.split('|');
            // timed: timed|exp|uid|sig
            if (parts[0] === 'timed' || parts[0] === 'perm') {
                const exp = parseInt(parts[1], 10);
                const uid = parts[2] || '';
                const sig = parts[3] || '';
                const now = Math.floor(Date.now() / 1000);
                if (exp !== 0 && (isNaN(exp) || exp < now)) return false;
                if (_mac([String(exp), uid.toLowerCase()]) !== sig) return false;
                return true;
            }
            // static: hash|ts
            return !!VALID_KEY_HASHES[parts[0]];
        } catch (e) { return false; }
    }

    function tryUnlockKey(input) {
        const n = _normKey(input);
        if (!n) return { ok: false, msg: 'Nhập key' };
        // Prefer timed LC-... keys
        if (n.startsWith('LC-')) {
            const r = verifyTimedKey(n);
            if (!r.ok) return r;
            try {
                const kind = (r.exp === 0) ? 'perm' : 'timed';
                localStorage.setItem(KEY_STORAGE, [kind, r.exp, r.uid, _mac([String(r.exp), r.uid.toLowerCase()])].join('|'));
            } catch (e) {}
            if (r.exp === 0) return { ok: true, msg: 'OK · vĩnh viễn' };
            return { ok: true, msg: 'OK · hết hạn ' + new Date(r.exp * 1000).toLocaleString() };
        }
        const r = verifyStaticKey(n);
        if (!r.ok) return r;
        try { localStorage.setItem(KEY_STORAGE, r.hash + '|' + Date.now()); } catch (e) {}
        return { ok: true, msg: 'OK (owner key)' };
    }

    function lockKey() {
        try { localStorage.removeItem(KEY_STORAGE); } catch (e) {}
    }

    function keyStatusText() {
        try {
            const tok = localStorage.getItem(KEY_STORAGE);
            if (!tok) return { text: 'LOCKED', color: '#fca5a5' };
            const parts = tok.split('|');
            if (parts[0] === 'timed' || parts[0] === 'perm') {
                const exp = parseInt(parts[1], 10);
                if (exp === 0) return { text: 'VĨNH VIỄN', color: '#86efac' };
                const left = exp - Math.floor(Date.now() / 1000);
                if (left <= 0) return { text: 'HẾT HẠN', color: '#fca5a5' };
                const h = Math.floor(left / 3600);
                const m = Math.floor((left % 3600) / 60);
                return { text: 'OK · còn ' + h + 'h' + m + 'm', color: '#86efac' };
            }
            if (VALID_KEY_HASHES[parts[0]]) return { text: 'OWNER', color: '#86efac' };
        } catch (e) {}
        return { text: 'LOCKED', color: '#fca5a5' };
    }


    function getBanApiBase() {
        try {
            const v = localStorage.getItem('lucac_ban_api');
            if (v && v.trim()) return v.trim().replace(/\/$/, '');
        } catch (e) {}
        return (typeof LUCAC_BAN_API_DEFAULT === 'string' ? LUCAC_BAN_API_DEFAULT : '').replace(/\/$/, '');
    }

    function formatBanUntil(until) {
        until = parseInt(until, 10) || 0;
        if (!until) return 'Vĩnh viễn';
        const now = Math.floor(Date.now() / 1000);
        const left = until - now;
        if (left <= 0) return 'Hết hạn';
        const d = Math.floor(left / 86400);
        const h = Math.floor((left % 86400) / 3600);
        const m = Math.floor((left % 3600) / 60);
        const end = new Date(until * 1000).toLocaleString();
        if (d > 0) return d + 'd ' + h + 'h ' + m + 'm (đến ' + end + ')';
        return h + 'h ' + m + 'm (đến ' + end + ')';
    }

    function saveBanInfo(info) {
        try { localStorage.setItem(BAN_STORAGE, JSON.stringify(info || {})); } catch (e) {}
    }
    function loadBanInfo() {
        try {
            const t = localStorage.getItem(BAN_STORAGE);
            if (!t) return null;
            const o = JSON.parse(t);
            if (!o || !o.banned) return null;
            const until = parseInt(o.until, 10) || 0;
            if (until && until < Math.floor(Date.now() / 1000)) {
                try { localStorage.removeItem(BAN_STORAGE); } catch (e) {}
                return null;
            }
            return o;
        } catch (e) { return null; }
    }
    function clearBanInfo() {
        try { localStorage.removeItem(BAN_STORAGE); } catch (e) {}
    }

    function fetchClientIP() {
        return new Promise(function (resolve) {
            try {
                const cached = localStorage.getItem(IP_STORAGE);
                if (cached && /^\d{1,3}(\.\d{1,3}){3}$/.test(cached)) {
                    resolve(cached);
                }
            } catch (e) {}
            const done = function (ip) {
                if (ip) {
                    try { localStorage.setItem(IP_STORAGE, ip); } catch (e) {}
                }
                resolve(ip || '');
            };
            // ipify
            fetch('https://api.ipify.org?format=json')
                .then(function (r) { return r.json(); })
                .then(function (j) { done(j && j.ip ? String(j.ip) : ''); })
                .catch(function () {
                    fetch('https://api64.ipify.org?format=json')
                        .then(function (r) { return r.json(); })
                        .then(function (j) { done(j && j.ip ? String(j.ip) : ''); })
                        .catch(function () { done(''); });
                });
        });
    }

    function checkRemoteBan(uid, ip) {
        const base = getBanApiBase();
        if (!base) return Promise.resolve(null);
        const q = 'uid=' + encodeURIComponent(uid || '') + '&ip=' + encodeURIComponent(ip || '');
        return fetch(base + '/lucac/check?' + q, { method: 'GET', mode: 'cors' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (j && j.banned) {
                    const info = { banned: true, kind: j.kind || 'user', until: j.until || 0, reason: j.reason || 'Banned' };
                    saveBanInfo(info);
                    return info;
                }
                return null;
            })
            .catch(function () { return null; });
    }

    function registerIPWithServer(uid, ip, key) {
        const base = getBanApiBase();
        if (!base || !uid || !ip) return;
        try {
            fetch(base + '/lucac/register', {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: String(uid), ip: String(ip), key: String(key || '').slice(0, 80) })
            }).catch(function () {});
        } catch (e) {}
    }

    function showBanGate(info) {
        try {
            const old = document.getElementById('kh-ban-gate');
            if (old) old.remove();
        } catch (e) {}
        const untilTxt = formatBanUntil(info && info.until);
        const reason = (info && info.reason) || 'Không có lý do';
        const kind = (info && info.kind) === 'ip' ? 'IP' : 'Tài khoản';
        const gate = document.createElement('div');
        gate.id = 'kh-ban-gate';
        gate.innerHTML = `
<style>
#kh-ban-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;
background:rgba(8,2,12,0.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-family:'Tomorrow',system-ui,sans-serif;}
#kh-ban-box{width:min(400px,94vw);padding:26px 20px 20px;border-radius:20px;text-align:center;color:#fce7f3;
background:radial-gradient(ellipse 120% 80% at 20% -10%,rgba(239,68,68,.35),transparent 55%),rgba(20,4,10,.95);
border:1px solid rgba(248,113,113,.45);box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 40px rgba(239,68,68,.2);}
#kh-ban-box h2{margin:0 0 8px;font-size:18px;letter-spacing:1px;font-weight:800;color:#fecaca;}
#kh-ban-box p{margin:8px 0;font-size:12px;line-height:1.5;color:#fca5a5;}
#kh-ban-box .kh-ban-reason{margin-top:12px;padding:12px;border-radius:12px;background:rgba(0,0,0,.35);
border:1px solid rgba(248,113,113,.3);font-size:13px;color:#fff;word-break:break-word;}
#kh-ban-box .kh-ban-meta{margin-top:10px;font-size:11px;color:#f9a8d4;}
a.kh-join-btn{display:inline-flex;margin-top:14px;padding:10px 16px;border-radius:12px;background:linear-gradient(135deg,#5865F2,#4752C4);color:#fff!important;text-decoration:none!important;font-weight:800;font-size:12px;}
</style>
<div id="kh-ban-box">
  <h2>⛔ BẠN ĐÃ BỊ BAN</h2>
  <p>Loại: <b>${kind}</b></p>
  <p class="kh-ban-meta">Thời hạn: <b>${untilTxt}</b></p>
  <div class="kh-ban-reason">📝 Lý do: ${reason.replace(/[<>]/g,'')}</div>
  <p style="margin-top:12px;font-size:11px;color:#9ca3af;">Liên hệ admin trên Discord nếu đây là nhầm lẫn.</p>
  <a class="kh-join-btn" href="${LUCAC_DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">discord Server</a>
</div>`;
        document.documentElement.appendChild(gate);
    }


    function showKeyGate(onSuccess) {
        if (document.getElementById('kh-key-gate')) return;
        const gate = document.createElement('div');
        gate.id = 'kh-key-gate';
        gate.innerHTML = `
<style>
#kh-key-gate{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;
background:rgba(4,2,12,0.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:'Tomorrow',system-ui,sans-serif;}
#kh-key-box{width:min(400px,94vw);padding:26px 20px 20px;border-radius:20px;
background:radial-gradient(ellipse 120% 80% at 20% -10%,rgba(168,85,247,.28),transparent 50%),rgba(8,6,20,.92);
border:1px solid rgba(180,140,255,.35);box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 40px rgba(168,85,247,.15);
color:#f0e6ff;text-align:center;}
#kh-key-box h2{margin:0 0 4px;font-size:15px;letter-spacing:1.5px;font-weight:800;}
#kh-key-box p{margin:0 0 14px;font-size:11px;color:#a78bfa;opacity:.9;line-height:1.45;}
#kh-key-input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;border:1px solid rgba(168,85,247,.4);
background:rgba(0,0,0,.45);color:#fff;font-family:monospace;font-size:12px;outline:none;letter-spacing:.3px;text-align:center;}
#kh-key-input:focus{border-color:#c084fc;box-shadow:0 0 0 2px rgba(168,85,247,.25);}
#kh-key-join.kh-join-btn,a.kh-join-btn{
display:flex;align-items:center;justify-content:center;gap:8px;
width:100%;box-sizing:border-box;margin:10px 0 0;padding:11px 12px;border-radius:12px;
background:linear-gradient(135deg,#5865F2,#4752C4);color:#fff!important;
font-family:'Tomorrow',sans-serif;font-weight:800;font-size:12px;letter-spacing:.6px;
text-decoration:none!important;border:1px solid rgba(255,255,255,.12);
box-shadow:0 0 16px rgba(88,101,242,.45);transition:filter .15s,transform .15s;
}
#kh-key-join.kh-join-btn:hover,a.kh-join-btn:hover{filter:brightness(1.12);transform:translateY(-1px);}
#kh-key-btn{width:100%;margin-top:12px;padding:11px;border:none;border-radius:12px;cursor:pointer;
font-family:'Tomorrow',sans-serif;font-weight:800;font-size:12px;letter-spacing:1px;
background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;box-shadow:0 0 18px rgba(168,85,247,.4);}
#kh-key-btn:hover{filter:brightness(1.1);}
#kh-key-err{min-height:16px;margin-top:10px;font-size:11px;color:#fca5a5;font-family:monospace;}
#kh-key-hint{margin-top:10px;font-size:9px;color:#6b7280;line-height:1.45;}
</style>
<div id="kh-key-box">
  <h2>🔐 LUCAC KEY</h2>
  <a id="kh-key-join" class="kh-join-btn" href="https://discord.gg/mVq4ytdyD3" target="_blank" rel="noopener noreferrer">discord Join Server</a>
  <p style="margin-top:12px;">Vào server rồi gõ <b style="color:#e9d5ff">*getkey</b> để lấy key 24h</p>
  <input id="kh-key-input" type="text" placeholder="LC-...." autocomplete="off" spellcheck="false">
  <button id="kh-key-btn" type="button">UNLOCK</button>
  <div id="kh-key-err"></div>
  <div id="kh-key-hint">Mỗi người 1 key · hết hạn sau 24 giờ</div>
</div>`;
        document.documentElement.appendChild(gate);
        const inp = document.getElementById('kh-key-input');
        const err = document.getElementById('kh-key-err');
        const btn = document.getElementById('kh-key-btn');
        const go = () => {
            const r = tryUnlockKey(inp.value);
            if (r.ok) {
                err.style.color = '#86efac';
                err.textContent = '✓ ' + r.msg;
                (async function () {
                    const ip = await fetchClientIP();
                    let uid = '';
                    try {
                        const tok = localStorage.getItem(KEY_STORAGE) || '';
                        const parts = tok.split('|');
                        if (parts[0] === 'timed' || parts[0] === 'perm') uid = parts[2] || '';
                        // uid may be hex — convert for API
                        if (uid && /^[0-9a-fA-F]+$/.test(uid)) {
                            try { uid = String(parseInt(uid, 16)); } catch (e) {}
                        }
                    } catch (e) {}
                    const ban = await checkRemoteBan(uid, ip);
                    if (ban) {
                        clearKey();
                        try { gate.remove(); } catch (e) {}
                        showBanGate(ban);
                        return;
                    }
                    registerIPWithServer(uid, ip, inp.value);
                    try { gate.remove(); } catch (e) {}
                    if (typeof onSuccess === 'function') onSuccess();
                })();
            } else {
                err.style.color = '#fca5a5';
                err.textContent = '✗ ' + r.msg;
            }
        };
        btn.onclick = go;
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        if (!document.getElementById('kh-key-anim')) {
            const st = document.createElement('style');
            st.id = 'kh-key-anim';
            st.textContent = '@keyframes khKeyShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
            document.head.appendChild(st);
        }
        // IP + ban check
        (async function () {
            const ip = await fetchClientIP();
            const hint = document.getElementById('kh-key-hint');
            if (hint && ip) {
                hint.innerHTML = 'IP của bạn: <b style="color:#c4b5fd">' + ip + '</b> · 1 key / 24h';
            }
            const localBan = loadBanInfo();
            if (localBan) {
                try { gate.remove(); } catch (e) {}
                showBanGate(localBan);
                return;
            }
            const ban = await checkRemoteBan('', ip);
            if (ban) {
                try { gate.remove(); } catch (e) {}
                showBanGate(ban);
                return;
            }
            try { inp.focus(); } catch (e) {}
        })();
    }


    console.log('[LUCAC] Platform:', { IS_IOS, IS_SAFARI, IS_ORION, IOS_MIC_COMPENSATION });

    const DEFAULT_LABELS = {
        appName:   'LUCACDZ',
        tag:       'LIMITED',
        tabMain:   'GAIN',
        tabVoice:  'VOICE',
        tabEq:     'EQ',
        tabMusic:  'TRACK',
        tabMedia:  'CONFIG',
        tabInfo:   'BIO',
        tabChannel: 'CHANNEL',
        tabSettings: '⚙',
        tabFixlag: '⚡',
        tabFakecam: '📷'
    };

    let LABELS = Object.assign({}, DEFAULT_LABELS);
    try {
        const saved = localStorage.getItem('lucac_labels_v7');
        if (saved) LABELS = Object.assign({}, DEFAULT_LABELS, JSON.parse(saved));
    } catch(e) {}

    function saveLabels() {
        try { localStorage.setItem('lucac_labels_v7', JSON.stringify(LABELS)); } catch(e) {}
    }

    // ---------- ICON ----------
    const DEFAULT_ICON = '🔥';
    let customIcon = null;

    function loadIcon() {
        try {
            const stored = localStorage.getItem('lucac_icon_v1');
            customIcon = (stored && stored.startsWith('data:image')) ? stored : null;
        } catch(e) { customIcon = null; }
        updateIconDisplay();
    }
    function saveIcon(dataUrl) {
        customIcon = dataUrl;
        try {
            if (dataUrl) localStorage.setItem('lucac_icon_v1', dataUrl);
            else localStorage.removeItem('lucac_icon_v1');
        } catch(e) {}
        updateIconDisplay();
    }
    function resetIcon() { saveIcon(null); }
    function updateIconDisplay() {
        const c = document.getElementById('kh-fire');
        if (!c) return;
        c.innerHTML = customIcon
            ? `<img src="${customIcon}" style="height:22px;width:auto;vertical-align:middle;border-radius:4px;display:inline-block;">`
            : DEFAULT_ICON;
    }

    // ---------- THEME ----------
    const DEFAULT_THEME = {
        bg: 'rgba(8,4,20,0.55)', accent: '#c44dff', border: 'rgba(180,120,255,0.35)',
        text: '#f0e6ff', textOpacity: 1, textBorder: '#a855f7',
        rainbow: false, radius: 14, bgImage: null, bgVideo: null, bgType: 'none'
    };

    function hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '255,255,255';
    }

    let THEME = Object.assign({}, DEFAULT_THEME);
    try {
        const saved = localStorage.getItem('lucac_theme_v1');
        if (saved) {
            THEME = Object.assign({}, DEFAULT_THEME, JSON.parse(saved));
            THEME.textRgb = (THEME.text && THEME.text.startsWith('#')) ? hexToRgb(THEME.text) : (THEME.text || '255,255,255');
        }
    } catch(e) {}

    function saveTheme() {
        try {
            localStorage.setItem('lucac_theme_v1', JSON.stringify({
                bg: THEME.bg, accent: THEME.accent, border: THEME.border,
                text: THEME.text, textOpacity: THEME.textOpacity, textBorder: THEME.textBorder,
                rainbow: THEME.rainbow, radius: THEME.radius,
                bgImage: THEME.bgImage, bgVideo: THEME.bgVideo, bgType: THEME.bgType
            }));
        } catch(e) {}
    }

    function applyTheme() {
        const root = document.getElementById('kh-root');
        if (!root) return;
        const old = root.querySelector('.kh-bg-media'); if (old) old.remove();
        root.style.setProperty('--kh-bg', THEME.bg);
        root.style.setProperty('--kh-accent', THEME.accent);
        root.style.setProperty('--kh-border', THEME.border);
        root.style.setProperty('--kh-radius', THEME.radius + 'px');
        const rgb = hexToRgb(THEME.text);
        THEME.textRgb = rgb;
        root.style.setProperty('--kh-text-rgb', rgb);
        root.style.setProperty('--kh-text-opacity', THEME.textOpacity);
        root.style.setProperty('--kh-text-border', THEME.textBorder);

        if (THEME.bgType === 'image' && THEME.bgImage) {
            const img = document.createElement('img');
            img.src = THEME.bgImage; img.className = 'kh-bg-media';
            img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;opacity:.8;border-radius:var(--kh-radius,0px);';
            root.prepend(img); root.style.background = 'transparent';
        } else if (THEME.bgType === 'video' && THEME.bgVideo) {
            const v = document.createElement('video');
            v.src = THEME.bgVideo; v.className = 'kh-bg-media';
            v.autoplay = v.loop = v.muted = true;
            v.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;opacity:.8;border-radius:var(--kh-radius,0px);';
            root.prepend(v); root.style.background = 'transparent';
        } else {
            root.style.background = ''; /* cosmic CSS handles base; only override if custom solid */ if (THEME.bgType === 'none' && THEME.bg && !String(THEME.bg).includes('rgba') && THEME.bg.startsWith('#')) { root.style.background = THEME.bg; }
        }

        const lb = document.getElementById('lb-textopacity'); if (lb) lb.textContent = Math.round(THEME.textOpacity*100)+'%';
        const lbr = document.getElementById('lb-radius'); if (lbr) lbr.textContent = THEME.radius+'px';
        const ci = { 'set-bg':THEME.bg, 'set-accent':THEME.accent, 'set-border':THEME.border, 'set-text':THEME.text, 'set-textborder':THEME.textBorder };
        Object.keys(ci).forEach(id => { const el = document.getElementById(id); if (el) el.value = ci[id]; });
        const r = document.getElementById('set-textopacity');
        if (r) { r.value = THEME.textOpacity; r.style.setProperty('--v', (THEME.textOpacity*100)+'%'); }
        const rr = document.getElementById('set-radius');
        if (rr) { rr.value = THEME.radius; rr.style.setProperty('--v', (THEME.radius/30*100)+'%'); }
        const rb = document.getElementById('set-rainbow-theme'); if (rb) rb.checked = THEME.rainbow || false;
        const bs = document.getElementById('set-bg-type'); if (bs) bs.value = THEME.bgType || 'none';
    }

    // ---------- EFFECT ----------
    const DEFAULT_EFFECT = {
        type: 'meteor', color: '#c44dff', count: 10, opacity: 0.45,
        autoLoop: false, loopInterval: 5, rainbow: false, speed: 1.0, scale: 1.0
    };
    const EFFECT_TYPES = ['meteor','sakura','snow','fire','lightning','rain','firefly'];
    const EFFECT_COLORS = { meteor:'#c44dff', sakura:'#ffb7c5', snow:'#e0f2fe', fire:'#fb923c', lightning:'#a5f3fc', rain:'#7dd3fc', firefly:'#f0abfc' };

    let EFFECT = Object.assign({}, DEFAULT_EFFECT);
    try {
        const saved = localStorage.getItem('lucac_effect_v1');
        if (saved) { EFFECT = Object.assign({}, DEFAULT_EFFECT, JSON.parse(saved)); if (!EFFECT_TYPES.includes(EFFECT.type)) EFFECT.type = DEFAULT_EFFECT.type; }
    } catch(e) {}
    function saveEffect() { try { localStorage.setItem('lucac_effect_v1', JSON.stringify(EFFECT)); } catch(e) {} }
    let effectLoopInterval = null;

    function hslToHex(h, s, l) {
        s/=100; l/=100;
        const k = n => (n + h/30) % 12;
        const a = s * Math.min(l, 1-l);
        const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
        const t = x => Math.round(255*x).toString(16).padStart(2,'0');
        return `#${t(f(0))}${t(f(8))}${t(f(4))}`;
    }
    let rainbowRAF = null, hue = 0;

    function startRainbow() {
        if (rainbowRAF) cancelAnimationFrame(rainbowRAF);
        hue = 0;
        function step() {
            if (!THEME.rainbow && !EFFECT.rainbow) { rainbowRAF = null; return; }
            hue = (hue + 0.4) % 360;
            const c = hslToHex(hue, 100, 50);
            if (THEME.rainbow) {
                THEME.accent = THEME.border = THEME.text = c;
                THEME.textRgb = hexToRgb(c);
                const e1 = document.getElementById('set-accent'); if (e1) e1.value = c;
                const e2 = document.getElementById('set-border'); if (e2) e2.value = c;
                const e3 = document.getElementById('set-text'); if (e3) e3.value = c;
                saveTheme(); applyTheme();
            }
            if (EFFECT.rainbow) {
                EFFECT.color = c;
                const el = document.getElementById('effect-color'); if (el) el.value = c;
                saveEffect();
            }
            rainbowRAF = requestAnimationFrame(step);
        }
        step();
    }

    function updateEffectLoop() {
        if (effectLoopInterval) { clearInterval(effectLoopInterval); effectLoopInterval = null; }
        if (EFFECT.autoLoop) {
            effectLoopInterval = setInterval(() => {
                if (UI.canvas && UI.ctx2d) { UI.particles = []; UI.initParticles(); }
                const msg = document.getElementById('set-saved-msg');
                if (msg) { msg.innerText = '✨ Refresh effect'; msg.style.opacity = '1'; setTimeout(() => { msg.style.opacity = '0'; }, 1000); }
            }, EFFECT.loopInterval * 1000);
        }
    }

    function applyEffectUI() {
        const s1 = document.getElementById('effect-type'); if (s1) s1.value = EFFECT.type;
        const s2 = document.getElementById('effect-color'); if (s2) s2.value = EFFECT.color;
        const c1 = document.getElementById('effect-count');
        if (c1) { c1.value = EFFECT.count; c1.style.setProperty('--v', ((EFFECT.count-5)/50*100)+'%'); document.getElementById('lb-effect-count').textContent = EFFECT.count; }
        const o1 = document.getElementById('effect-opacity');
        if (o1) { o1.value = EFFECT.opacity; o1.style.setProperty('--v', (EFFECT.opacity*100)+'%'); document.getElementById('lb-effect-opacity').textContent = Math.round(EFFECT.opacity*100)+'%'; }
        const a1 = document.getElementById('effect-auto'); if (a1) a1.checked = EFFECT.autoLoop;
        const i1 = document.getElementById('effect-interval');
        if (i1) { i1.value = EFFECT.loopInterval; i1.style.setProperty('--v', ((EFFECT.loopInterval-2)/20*100)+'%'); document.getElementById('lb-effect-interval').textContent = EFFECT.loopInterval+'s'; }
        const sp = document.getElementById('effect-speed');
        if (sp) { sp.value = EFFECT.speed; sp.style.setProperty('--v', ((EFFECT.speed-0.1)/(3-0.1)*100)+'%'); document.getElementById('lb-effect-speed').textContent = EFFECT.speed.toFixed(1)+'x'; }
        const sc = document.getElementById('effect-scale');
        if (sc) { sc.value = EFFECT.scale; sc.style.setProperty('--v', ((EFFECT.scale-0.3)/(3-0.3)*100)+'%'); document.getElementById('lb-effect-scale').textContent = EFFECT.scale.toFixed(1)+'x'; }
        const rb = document.getElementById('effect-rainbow'); if (rb) rb.checked = EFFECT.rainbow || false;
        if (UI.canvas && UI.ctx2d) { UI.particles = []; UI.initParticles(); }
        updateEffectLoop();
    }

    // ========== FIXLAG ==========
    const DEFAULT_FIXLAG = {
        hideMessages:false, hideNotifications:false, hidePopups:false, hideAds:false,
        hideIframes:false, hideImages:false, hideVideos:false,
        disableAnimations:false, disableTransitions:false, disableBlur:false, disableShadows:false,
        pauseMedia:false, muteAudio:false, throttleRAF:false, rafFPS:30,
        stopTimers:false, aggressive:false
    };
    let FIXLAG = Object.assign({}, DEFAULT_FIXLAG);
    try { const s = localStorage.getItem('lucac_fixlag_v1'); if (s) FIXLAG = Object.assign({}, DEFAULT_FIXLAG, JSON.parse(s)); } catch(e) {}
    function saveFixlag() { try { localStorage.setItem('lucac_fixlag_v1', JSON.stringify(FIXLAG)); } catch(e) {} }

    let _origRAF = null, _origCAF = null, _origSetTimeout = null, _origSetInterval = null;

    function applyFixlag() {
        const old = document.getElementById('kh-fixlag-style'); if (old) old.remove();
        let css = '';
        if (FIXLAG.hideMessages) css += `[class*="message" i]:not(#kh-root *):not(#kh-root),[class*="chat" i]:not(#kh-root *):not(#kh-root),[id*="message" i]:not(#kh-root *):not(#kh-root),[id*="chat" i]:not(#kh-root *):not(#kh-root),[class*="msg-" i]:not(#kh-root *):not(#kh-root),[class*="comment" i]:not(#kh-root *):not(#kh-root),[class*="discussion" i]:not(#kh-root *):not(#kh-root),[aria-label*="chat" i]:not(#kh-root *):not(#kh-root){display:none!important;}`;
        if (FIXLAG.hideNotifications) css += `[class*="notif" i]:not(#kh-root *):not(#kh-root),[id*="notif" i]:not(#kh-root *):not(#kh-root),[class*="toast" i]:not(#kh-root *):not(#kh-root),[class*="alert-" i]:not(#kh-root *):not(#kh-root),[role="alert"]:not(#kh-root *):not(#kh-root){display:none!important;}`;
        if (FIXLAG.hidePopups) css += `[class*="popup" i]:not(#kh-root *):not(#kh-root),[class*="modal" i]:not(#kh-root *):not(#kh-root),[class*="overlay" i]:not(#kh-root *):not(#kh-root),[class*="dialog" i]:not(#kh-root *):not(#kh-root),[class*="banner" i]:not(#kh-root *):not(#kh-root),[role="dialog"]:not(#kh-root *):not(#kh-root){display:none!important;}`;
        if (FIXLAG.hideAds) css += `[class*="ad-" i]:not(#kh-root *):not(#kh-root),[class*="-ad" i]:not(#kh-root *):not(#kh-root),[class*="ads" i]:not(#kh-root *):not(#kh-root),[id*="google_ads" i]:not(#kh-root *):not(#kh-root),[id^="div-gpt-ad"]:not(#kh-root *):not(#kh-root),iframe[src*="doubleclick"]:not(#kh-root *),iframe[src*="googlesyndication"]:not(#kh-root *),iframe[src*="adservice"]:not(#kh-root *){display:none!important;}`;
        if (FIXLAG.hideIframes) css += `iframe:not(#kh-root iframe):not(#kh-root){display:none!important;}`;
        if (FIXLAG.hideImages) css += `img:not(#kh-root img):not(#kh-root),picture:not(#kh-root picture),svg:not(#kh-root svg){display:none!important;} *{background-image:none!important;}`;
        if (FIXLAG.hideVideos) css += `video:not(#kh-root video):not(#kh-root),[class*="video-" i]:not(#kh-root *):not(#kh-root),[class*="player" i]:not(#kh-root *):not(#kh-root){display:none!important;}`;
        if (FIXLAG.disableAnimations) css += `*,*::before,*::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;animation-play-state:paused!important;}`;
        if (FIXLAG.disableTransitions) css += `*,*::before,*::after{transition-duration:.001ms!important;transition-delay:0s!important;transition-property:none!important;}`;
        if (FIXLAG.disableBlur) css += `*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;}`;
        if (FIXLAG.disableShadows) css += `*,*::before,*::after{box-shadow:none!important;text-shadow:none!important;-webkit-box-shadow:none!important;}`;
        if (FIXLAG.aggressive) css += `html{scroll-behavior:auto!important;}*,*::before,*::after{will-change:auto!important;background-attachment:scroll!important;content-visibility:auto!important;contain:layout style paint!important;}video,audio,canvas,iframe{display:none!important;}`;

        if (css) {
            const st = document.createElement('style');
            st.id = 'kh-fixlag-style'; st.textContent = css;
            document.documentElement.appendChild(st);
        }

        if (FIXLAG.pauseMedia) document.querySelectorAll('video,audio').forEach(m => { try { m.pause(); } catch(e) {} });
        if (FIXLAG.muteAudio) document.querySelectorAll('video,audio').forEach(m => { try { m.muted = true; m.volume = 0; } catch(e) {} });

        if (FIXLAG.throttleRAF) {
            if (!_origRAF) { _origRAF = window.requestAnimationFrame.bind(window); _origCAF = window.cancelAnimationFrame.bind(window); }
            const minInt = 1000 / Math.max(10, FIXLAG.rafFPS | 0);
            window.requestAnimationFrame = cb => setTimeout(() => { try { cb(performance.now()); } catch(e) {} }, minInt);
            window.cancelAnimationFrame = id => clearTimeout(id);
        } else if (_origRAF) {
            window.requestAnimationFrame = _origRAF; window.cancelAnimationFrame = _origCAF;
            _origRAF = null; _origCAF = null;
        }

        if (FIXLAG.stopTimers) {
            if (!_origSetTimeout) { _origSetTimeout = window.setTimeout.bind(window); _origSetInterval = window.setInterval.bind(window); }
            window.setInterval = function(fn, ms, ...a) { if (ms < 500) return -1; return _origSetInterval(fn, ms, ...a); };
        } else if (_origSetTimeout) {
            window.setTimeout = _origSetTimeout; window.setInterval = _origSetInterval;
            _origSetTimeout = null; _origSetInterval = null;
        }

        const root = document.getElementById('kh-root');
        if (root) { root.style.setProperty('content-visibility','visible','important'); root.style.setProperty('contain','none','important'); }
    }

    function restoreFixlag() {
        Object.keys(FIXLAG).forEach(k => { if (typeof FIXLAG[k] === 'boolean') FIXLAG[k] = false; });
        FIXLAG.rafFPS = 30; saveFixlag(); applyFixlag();
        document.querySelectorAll('.fixlag-check').forEach(cb => { cb.checked = false; });
        const lb = document.getElementById('lb-fixlag-fps'); if (lb) lb.textContent = '30 FPS';
        const sl = document.getElementById('sl-fixlag-fps'); if (sl) { sl.value = 30; sl.style.setProperty('--v','40%'); }
    }
    function syncFixlagUI() {
        document.querySelectorAll('.fixlag-check').forEach(cb => { const k = cb.dataset.key; if (k && k in FIXLAG) cb.checked = !!FIXLAG[k]; });
        const sl = document.getElementById('sl-fixlag-fps');
        if (sl) { sl.value = FIXLAG.rafFPS; sl.style.setProperty('--v', ((FIXLAG.rafFPS-10)/50*100)+'%'); }
        const lb = document.getElementById('lb-fixlag-fps'); if (lb) lb.textContent = FIXLAG.rafFPS + ' FPS';
    }

    // ========== 📷 FAKE CAMERA ==========
    const DEFAULT_FAKE_CAM = {
        enabled: false,
        type: null,
        imageDataUrl: null,
        videoUrl: null,
        fileName: null,
        fit: 'cover',
        mirror: false,
        width: 1280,
        height: 720,
        fps: 30
    };
    let FAKE_CAM = Object.assign({}, DEFAULT_FAKE_CAM);

    let _fakeCamRaf = null;
    let _fakeCamSource = null;
    let _fakeCamCanvas = null;

    function saveFakeCam() {
        try {
            const to = {
                enabled: FAKE_CAM.enabled,
                type: FAKE_CAM.type,
                fit: FAKE_CAM.fit,
                mirror: FAKE_CAM.mirror,
                width: FAKE_CAM.width,
                height: FAKE_CAM.height,
                fps: FAKE_CAM.fps,
                fileName: FAKE_CAM.fileName
            };
            if (FAKE_CAM.type === 'image' && FAKE_CAM.imageDataUrl && FAKE_CAM.imageDataUrl.length < 1500000) {
                to.imageDataUrl = FAKE_CAM.imageDataUrl;
            }
            localStorage.setItem('lucac_fakecam_v1', JSON.stringify(to));
        } catch(e) {}
    }

    function loadFakeCam() {
        try {
            const raw = localStorage.getItem('lucac_fakecam_v1');
            if (!raw) return;
            const p = JSON.parse(raw);
            Object.assign(FAKE_CAM, p);
            if (FAKE_CAM.type === 'video') { FAKE_CAM.type = null; FAKE_CAM.videoUrl = null; }
            if (FAKE_CAM.type === 'image' && !FAKE_CAM.imageDataUrl) FAKE_CAM.type = null;
        } catch(e) {}
    }

    async function buildFakeCameraStream() {
        if (_fakeCamRaf) { cancelAnimationFrame(_fakeCamRaf); _fakeCamRaf = null; }
        if (_fakeCamSource && _fakeCamSource.pause) { try { _fakeCamSource.pause(); } catch(e) {} }

        const W = FAKE_CAM.width || 1280;
        const H = FAKE_CAM.height || 720;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        _fakeCamCanvas = canvas;

        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

        let src;
        if (FAKE_CAM.type === 'image') {
            if (!FAKE_CAM.imageDataUrl) throw new Error('No image');
            src = new Image();
            src.src = FAKE_CAM.imageDataUrl;
            await new Promise((res, rej) => { src.onload = res; src.onerror = rej; });
        } else if (FAKE_CAM.type === 'video') {
            if (!FAKE_CAM.videoUrl) throw new Error('No video');
            src = document.createElement('video');
            src.src = FAKE_CAM.videoUrl;
            src.loop = true; src.muted = true; src.playsInline = true;
            src.setAttribute('playsinline', '');
            await new Promise((res, rej) => { src.onloadedmetadata = res; src.onerror = rej; });
            try { await src.play(); } catch(e) { console.warn('[LUCAC] Video play failed:', e); }
        } else {
            throw new Error('No fake cam source');
        }
        _fakeCamSource = src;

        const drawFrame = () => {
            const sw = src.videoWidth || src.naturalWidth || src.width || W;
            const sh = src.videoHeight || src.naturalHeight || src.height || H;
            ctx.save();
            if (FAKE_CAM.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
            let dx = 0, dy = 0, dw = W, dh = H;
            if (FAKE_CAM.fit === 'cover') {
                const s = Math.max(W / sw, H / sh);
                dw = sw * s; dh = sh * s;
                dx = (W - dw) / 2; dy = (H - dh) / 2;
            } else if (FAKE_CAM.fit === 'contain') {
                const s = Math.min(W / sw, H / sh);
                dw = sw * s; dh = sh * s;
                dx = (W - dw) / 2; dy = (H - dh) / 2;
                ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
            }
            try { ctx.drawImage(src, dx, dy, dw, dh); } catch(e) {}
            ctx.restore();
            _fakeCamRaf = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        if (!canvas.captureStream) throw new Error('captureStream unsupported');
        const stream = canvas.captureStream(FAKE_CAM.fps || 30);

        const vt = stream.getVideoTracks()[0];
        if (vt) vt.addEventListener('ended', () => {
            if (_fakeCamRaf) { cancelAnimationFrame(_fakeCamRaf); _fakeCamRaf = null; }
            if (src && src.pause) { try { src.pause(); } catch(e) {} }
        });

        return stream;
    }

    function updateFakeCamPreview() {
        const wrap = document.getElementById('fakecam-preview-wrap');
        const box = document.getElementById('fakecam-preview');
        if (!wrap || !box) return;
        box.innerHTML = '';
        if (FAKE_CAM.type === 'image' && FAKE_CAM.imageDataUrl) {
            const img = document.createElement('img');
            img.src = FAKE_CAM.imageDataUrl;
            img.style.cssText = 'width:100%;max-height:120px;object-fit:contain;background:#000;border:1px solid #333;display:block;';
            box.appendChild(img);
            wrap.style.display = 'block';
        } else if (FAKE_CAM.type === 'video' && FAKE_CAM.videoUrl) {
            const v = document.createElement('video');
            v.src = FAKE_CAM.videoUrl;
            v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
            v.setAttribute('playsinline','');
            v.style.cssText = 'width:100%;max-height:120px;object-fit:contain;background:#000;border:1px solid #333;display:block;';
            box.appendChild(v);
            wrap.style.display = 'block';
        } else {
            wrap.style.display = 'none';
        }
    }

    function updateFakeCamUI() {
        const btn = document.getElementById('fakecam-toggle');
        if (btn) {
            if (!FAKE_CAM.type) {
                btn.innerText = '📷 FAKE CAMERA: NO FILE';
                btn.classList.remove('fakecam-on');
                btn.style.color = '#666';
            } else if (FAKE_CAM.enabled) {
                btn.innerText = '📷 FAKE CAMERA: ON';
                btn.classList.add('fakecam-on');
                btn.style.color = '';
            } else {
                btn.innerText = '📷 FAKE CAMERA: OFF';
                btn.classList.remove('fakecam-on');
                btn.style.color = '';
            }
        }
        const info = document.getElementById('fakecam-info');
        if (info) {
            if (FAKE_CAM.fileName) info.innerText = '📁 ' + FAKE_CAM.fileName + ' (' + (FAKE_CAM.type || '?') + ')';
            else info.innerText = 'Chưa chọn file...';
        }
        const fit = document.getElementById('fakecam-fit'); if (fit) fit.value = FAKE_CAM.fit;
        const mir = document.getElementById('fakecam-mirror'); if (mir) mir.checked = !!FAKE_CAM.mirror;
        const res = document.getElementById('fakecam-res'); if (res) res.value = FAKE_CAM.width + 'x' + FAKE_CAM.height;
        const slf = document.getElementById('sl-fakecam-fps');
        if (slf) { slf.value = FAKE_CAM.fps; slf.style.setProperty('--v', ((FAKE_CAM.fps-5)/55*100)+'%'); }
        const lbf = document.getElementById('lb-fakecam-fps'); if (lbf) lbf.textContent = FAKE_CAM.fps + ' FPS';
        updateFakeCamPreview();
    }

    function clearFakeCamFile() {
        if (FAKE_CAM.videoUrl && FAKE_CAM.videoUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(FAKE_CAM.videoUrl); } catch(e) {}
        }
        FAKE_CAM.type = null;
        FAKE_CAM.imageDataUrl = null;
        FAKE_CAM.videoUrl = null;
        FAKE_CAM.fileName = null;
        FAKE_CAM.enabled = false;
        saveFakeCam();
        updateFakeCamUI();
    }

    // ========== 🔑 TOKEN MANAGER ==========
    let TOKEN_STATE = {
        currentToken: null,
        showToken: false
    };

    function getDiscordToken() {
        let token = null;
        try {
            token = localStorage.getItem('token');
            if (!token) {
                try {
                    const i = document.createElement('iframe');
                    document.body.appendChild(i);
                    token = i.contentWindow.localStorage.token;
                    i.remove();
                } catch(e) {}
            }
            if (!token && window.webpackChunkdiscord_app) {
                try {
                    let wpRequire;
                    window.webpackChunkdiscord_app.push([[Symbol()], {}, r => { wpRequire = r; }]);
                    window.webpackChunkdiscord_app.pop();
                    const modules = Object.values(wpRequire.c);
                    for (const mod of modules) {
                        if (!mod.exports) continue;
                        const found = Object.values(mod.exports).find(x =>
                            x && typeof x === 'object' && typeof x.getToken === 'function'
                        );
                        if (found) { token = found.getToken(); break; }
                    }
                } catch(e) {}
            }
        } catch(e) {
            console.error('[LUCAC] getDiscordToken error:', e);
        }
        if (token) token = token.replace(/^["']|["']$/g, '');
        TOKEN_STATE.currentToken = token;
        return token;
    }

    function renderTokenDisplay() {
        const el = document.getElementById('token-display');
        if (!el) return;
        if (!TOKEN_STATE.currentToken) {
            el.innerText = 'Chưa có token...';
            el.style.color = '#666';
            return;
        }
        const t = TOKEN_STATE.currentToken;
        if (TOKEN_STATE.showToken) {
            el.innerText = t;
            el.style.color = '#ffd700';
        } else {
            const head = t.substring(0, 18);
            const tail = t.substring(t.length - 8);
            el.innerText = head + '••••••••' + tail;
            el.style.color = '#888';
        }
    }

    function showTokenMsg(text, color) {
        const el = document.getElementById('token-msg');
        if (!el) return;
        el.innerText = text;
        el.style.color = color || '#00ff00';
        el.style.opacity = '1';
        clearTimeout(showTokenMsg._t);
        showTokenMsg._t = setTimeout(() => { el.style.opacity = '0'; }, 2200);
    }

    function copyDiscordToken() {
        const token = TOKEN_STATE.currentToken || getDiscordToken();
        if (!token) { showTokenMsg('❌ Không lấy được token!', '#ff3300'); return; }
        const done = () => showTokenMsg('✅ Đã copy token!', '#00ff00');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(token).then(done).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = token;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); done(); }
                catch(e) { showTokenMsg('❌ Copy fail!', '#ff3300'); }
                ta.remove();
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = token;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); }
            catch(e) { showTokenMsg('❌ Copy fail!', '#ff3300'); }
            ta.remove();
        }
    }

    function loginWithToken() {
        const input = document.getElementById('token-input');
        if (!input) return;
        let token = (input.value || '').trim();
        if (!token) { showTokenMsg('❌ Chưa nhập token!', '#ff3300'); return; }
        token = token.replace(/^["']|["']$/g, '').trim();
        if (token.length < 50) { showTokenMsg('❌ Token quá ngắn!', '#ff3300'); return; }
        const parts = token.split('.');
        if (parts.length < 3) { showTokenMsg('❌ Token sai định dạng!', '#ff3300'); return; }
        try {
            localStorage.setItem('token', '"' + token + '"');
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k && (k.startsWith('user_id_cache') || k === 'tokens')) localStorage.removeItem(k);
                }
            } catch(e) {}
            showTokenMsg('✅ Login thành công! Đang reload...', '#00ff00');
            setTimeout(() => location.reload(), 1200);
        } catch(e) {
            showTokenMsg('❌ Lỗi: ' + e.message, '#ff3300');
        }
    }

    function logoutToken() {
        try {
            localStorage.removeItem('token');
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k && (k === 'tokens' || k.startsWith('user_id_cache'))) localStorage.removeItem(k);
                }
            } catch(e) {}
            TOKEN_STATE.currentToken = null;
            showTokenMsg('✅ Đã logout! Đang reload...', '#00ff00');
            setTimeout(() => location.reload(), 1200);
        } catch(e) {
            showTokenMsg('❌ Lỗi: ' + e.message, '#ff3300');
        }
    }

    // ---------- MEDIA STATE ----------
    const MEDIA_STATE = {
        camOn: true,
        micOn: true
    };
    let _activeMediaStream = null;

    function _applyMediaState() {
        const streams = [];
        if (_activeMediaStream) streams.push(_activeMediaStream);
        document.querySelectorAll('video,audio').forEach(el => {
            if (el.srcObject && el.srcObject instanceof MediaStream) streams.push(el.srcObject);
        });
        // also scan RTC peer connections if any
        try {
            if (window.__lucac_pc_streams) {
                window.__lucac_pc_streams.forEach(st => streams.push(st));
            }
        } catch(e) {}
        const seen = new Set();
        streams.forEach(st => {
            if (!st || seen.has(st)) return;
            seen.add(st);
            try {
                st.getVideoTracks().forEach(t => { t.enabled = MEDIA_STATE.camOn; });
                st.getAudioTracks().forEach(t => { t.enabled = MEDIA_STATE.micOn; });
            } catch(e) {}
        });
        // silence worklet path when mic muted
        try {
            if (Core && Core.node && _ctx) {
                const mp = Core.node.parameters;
                const g = mp.get('micMute');
                if (g) g.setTargetAtTime(MEDIA_STATE.micOn ? 0 : 1, _ctx.currentTime, 0.01);
            }
        } catch(e) {}
    }

    function setMicOn(on) {
        MEDIA_STATE.micOn = !!on;
        _applyMediaState();
        syncMediaButtons();
        UI.badge(MEDIA_STATE.micOn ? (MEDIA_STATE.camOn ? 'LIVE' : 'MIC') : 'MUTED', MEDIA_STATE.micOn ? '#ff0055' : '#ff3300');
    }
    function setCamOn(on) {
        MEDIA_STATE.camOn = !!on;
        _applyMediaState();
        syncMediaButtons();
    }
    function toggleMic() { setMicOn(!MEDIA_STATE.micOn); }
    function toggleCam() { setCamOn(!MEDIA_STATE.camOn); }

    function syncMediaButtons() {
        const micOn = MEDIA_STATE.micOn;
        const camOn = MEDIA_STATE.camOn;
        const pairs = [
            ['mic-toggle', micOn, '🎤 MICROPHONE: ON', '🎤 MICROPHONE: OFF', 'mic-on', 'mic-off'],
            ['main-mute-mic', micOn, '🎤 MIC: ON', '🎤 MIC: OFF', 'mic-on', 'mic-off'],
            ['cam-toggle', camOn, '📷 CAMERA: ON', '📷 CAMERA: OFF', 'cam-on', 'cam-off'],
            ['main-mute-cam', camOn, '📷 CAM: ON', '📷 CAM: OFF', 'cam-on', 'cam-off']
        ];
        pairs.forEach(([id, on, tOn, tOff, cOn, cOff]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerText = on ? tOn : tOff;
            el.classList.toggle(cOn, on);
            el.classList.toggle(cOff, !on);
        });
    }

    // ---------- ECHO STATE ----------
    const ECHO = {
        mix: 0.0,
        time: 0.3,
        feedback: 0.35,
        gain: 1.0
    };

    // ---------- AUDIO PARAMS ----------
    const P = {
        preGain:1.0, drive:0.0, crush:0.0, width:0.0, postGain:1.0,
        inputDb:0.0, outputDb:0.0,
        eqBass:0.0, eqMid:0.0, eqTreble:0.0, musicVol:0.5,
        voicePitch:1.0, voiceFormant:1.0, voiceMix:0.0,
        autotuneOn:0, autotuneSpeed:0.3, autotuneScale:0,
        balance:0.5, pan:0, muteLeft:false, muteRight:false, soloLeft:false, soloRight:false,
        noiseGateOn:0, noiseGateThreshold:0.02,
        godMode:0, reverbMix:0.0, reverbDecay:0.5, reverbDelay:0.08, reverbGain:1.0, satMode:0, loudness:0.0, finalBoost:1.0
    };

    const VOICE_PRESETS = {
        'NORMAL':{pitch:1.00,formant:1.00,mix:0.00},
        'NAM':{pitch:0.92,formant:0.95,mix:0.55},
        'NU':{pitch:1.28,formant:1.22,mix:0.88},
        'TRE EM':{pitch:1.55,formant:1.35,mix:0.92},
        'GIA':{pitch:0.78,formant:0.82,mix:0.85},
        'LOLI':{pitch:1.92,formant:1.58,mix:0.98},
        'ANIME GIRL':{pitch:1.48,formant:1.38,mix:0.95},
        'KAWAII':{pitch:1.72,formant:1.48,mix:0.96},
        'MOE':{pitch:1.62,formant:1.42,mix:0.94},
        'TSUNDERE':{pitch:1.38,formant:1.28,mix:0.90},
        'YANDERE':{pitch:1.22,formant:1.15,mix:0.88},
        'ONEESAN':{pitch:1.18,formant:1.20,mix:0.86},
        'IMOUTO':{pitch:1.58,formant:1.40,mix:0.95},
        'ANIME BOY':{pitch:1.12,formant:1.08,mix:0.80},
        'SHONEN':{pitch:1.05,formant:1.05,mix:0.75},
        'SEINEN':{pitch:0.88,formant:0.92,mix:0.80},
        'IKEMEN':{pitch:0.95,formant:0.98,mix:0.70},
        'KUN':{pitch:1.08,formant:1.10,mix:0.82},
        'CHAN':{pitch:1.68,formant:1.45,mix:0.96},
        'SAMA':{pitch:0.82,formant:0.88,mix:0.85},
        'HELLS':{pitch:0.55,formant:0.68,mix:0.95},
        'DEMON':{pitch:0.48,formant:0.62,mix:0.98},
        'ROBOT':{pitch:1.15,formant:0.70,mix:0.90},
        'CHIPMUNK':{pitch:2.15,formant:1.70,mix:1.00},
        'GIANT':{pitch:0.52,formant:0.70,mix:0.95},
        'GHOST':{pitch:0.72,formant:1.35,mix:0.88},
        'RADIO':{pitch:1.08,formant:0.85,mix:0.70},
        'PHONE':{pitch:1.20,formant:0.75,mix:0.75},
        'HELIUM':{pitch:1.85,formant:1.55,mix:0.97},
        'SULFUR':{pitch:0.60,formant:0.72,mix:0.92},
        'BABY':{pitch:1.70,formant:1.42,mix:0.95},
        'WOMAN':{pitch:1.35,formant:1.25,mix:0.90},
        'DEEP':{pitch:0.62,formant:0.72,mix:0.95},
        'DARK':{pitch:0.70,formant:0.78,mix:0.90},
        'CUTE':{pitch:1.58,formant:1.40,mix:0.93},
        'SOFT GIRL':{pitch:1.42,formant:1.32,mix:0.90},
        'COOL GUY':{pitch:0.90,formant:0.95,mix:0.72},
        'WAIFU':{pitch:1.52,formant:1.36,mix:0.94},
        'HUSBANDO':{pitch:0.86,formant:0.90,mix:0.78},
        'NEKO':{pitch:1.78,formant:1.50,mix:0.97},
        'KITSUNE':{pitch:1.45,formant:1.30,mix:0.92},
        'ANGEL':{pitch:1.40,formant:1.45,mix:0.88},
        'DEVIL':{pitch:0.58,formant:0.65,mix:0.96}
    };

    const PRESETS = {
        'NORMAL':{preGain:1,drive:0,crush:0,width:0,postGain:1,eqBass:0,eqMid:0,eqTreble:0,satMode:0},
        'BIG':{preGain:10,drive:.02,crush:0,width:.65,postGain:1.4,eqBass:5,eqMid:-2,eqTreble:1,satMode:0},
        'LOUD':{preGain:500,drive:.55,crush:.35,width:0,postGain:25,eqBass:4,eqMid:4,eqTreble:2,satMode:0,loudness:0.8,finalBoost:20},
        'NORMAL LOUD':{preGain:150,drive:.75,crush:.7,width:0,postGain:6,eqBass:6,eqMid:6,eqTreble:-3,satMode:0},
        'VERY LOUD':{preGain:1500,drive:1,crush:.95,width:0,postGain:40,eqBass:8,eqMid:0,eqTreble:5,satMode:0},
        'MAX':{preGain:250000,drive:1,crush:1,width:0,postGain:250000,eqBass:18,eqMid:12,eqTreble:12,satMode:0,loudness:1.5,finalBoost:200},
        'GODMODE':{preGain:2200,drive:0,crush:0,width:0,postGain:55,eqBass:1,eqMid:1,eqTreble:1,satMode:0,loudness:0.85,finalBoost:15},
        'CLEAN':{preGain:4,drive:0,crush:0,width:0,postGain:1,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'WARM':{preGain:8,drive:0.3,crush:0,width:1,postGain:1.2,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'WHISTLE':{preGain:25,drive:0.55,crush:0.35,width:0,postGain:2,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'SUPER LOUD':{preGain:2000,drive:0.75,crush:0.7,width:0,postGain:40,eqBass:4,eqMid:4,eqTreble:4,satMode:1,loudness:1,finalBoost:50},
        'APO':{preGain:8000,drive:0.55,crush:0.4,width:0.2,postGain:80,eqBass:6,eqMid:3,eqTreble:4,satMode:1,loudness:1.2,finalBoost:80},
        'NUKE':{preGain:50000,drive:0.99,crush:0.98,width:0,postGain:500,eqBass:8,eqMid:6,eqTreble:6,satMode:1,loudness:1.5,finalBoost:300}
    };

    const WORKLET = `
    const SCALES=[
        [0,1,2,3,4,5,6,7,8,9,10,11],
        [0,2,4,5,7,9,11],
        [0,2,3,5,7,8,10],
        [0,2,4,7,9],
    ];
    class LucacEngine extends AudioWorkletProcessor {
        static get parameterDescriptors() {
            return [
                { name:'preGain',defaultValue:1,min:0.001,max:250000 },
                { name:'drive',defaultValue:0,min:0,max:1 },
                { name:'crush',defaultValue:0,min:0,max:1 },
                { name:'width',defaultValue:0,min:0,max:2 },
                { name:'postGain',defaultValue:1,min:0.001,max:250000 },
                { name:'eqBass',defaultValue:0,min:-24,max:24 },
                { name:'eqMid',defaultValue:0,min:-24,max:24 },
                { name:'eqTreble',defaultValue:0,min:-24,max:24 },
                { name:'voicePitch',defaultValue:1,min:0.4,max:2.5 },
                { name:'voiceFormant',defaultValue:1,min:0.3,max:2.0 },
                { name:'voiceMix',defaultValue:0,min:0,max:1 },
                { name:'autotuneOn',defaultValue:0,min:0,max:1 },
                { name:'autotuneSpeed',defaultValue:0.3,min:0,max:1 },
                { name:'autotuneScale',defaultValue:0,min:0,max:3 },
                { name:'balance',defaultValue:0.5,min:0,max:1 },
                { name:'pan',defaultValue:0,min:-1,max:1 },
                { name:'muteLeft',defaultValue:0,min:0,max:1 },
                { name:'muteRight',defaultValue:0,min:0,max:1 },
                { name:'soloLeft',defaultValue:0,min:0,max:1 },
                { name:'soloRight',defaultValue:0,min:0,max:1 },
                { name:'noiseGateOn',defaultValue:0,min:0,max:1 },
                { name:'noiseGateThreshold',defaultValue:0.02,min:0,max:0.5 },
                { name:'godMode',defaultValue:0,min:0,max:1 },
                { name:'reverbMix',defaultValue:0,min:0,max:1 },
                { name:'reverbDecay',defaultValue:0.5,min:0,max:0.99 },
                { name:'reverbDelay',defaultValue:0.08,min:0.01,max:0.6 },
                { name:'reverbGain',defaultValue:1,min:0.5,max:8 },
                { name:'satMode',defaultValue:0,min:0,max:1 },
                { name:'echoMix',defaultValue:0,min:0,max:1 },
                { name:'echoTime',defaultValue:0.3,min:0.05,max:1.5 },
                { name:'echoFeedback',defaultValue:0.35,min:0,max:0.9 },
                { name:'echoGain',defaultValue:1,min:0.5,max:8 },
                { name:'loudness',defaultValue:0,min:0,max:1.5 },
                { name:'finalBoost',defaultValue:1,min:1,max:500 },
                { name:'micMute',defaultValue:0,min:0,max:1 }
            ];
        }
        constructor(){
            super();
            this._limL=1;this._limR=1;this._sweepPhase=0;this._signalPhase=0;
            this._delayBufferL=new Float32Array(3000);this._delayBufferR=new Float32Array(3000);
            this._writePtr=0;this._lpL0=0;this._lpL1=0;this._lpR0=0;this._lpR1=0;this._subPhase=0;
            this._eqL={low:0,mid:0,high:0};this._eqR={low:0,mid:0,high:0};
            this._pitchBufferSize=8192;
            this._pitchBufferL=new Float32Array(this._pitchBufferSize);
            this._pitchBufferR=new Float32Array(this._pitchBufferSize);
            this._pWritePtr=0;this._pReadPtrL=0.0;this._pReadPtrR=0.0;
            this._atBufSize=2048;
            this._atBufL=new Float32Array(this._atBufSize);
            this._atBufR=new Float32Array(this._atBufSize);
            this._atWritePtr=0;this._atDetectedFreq=220;this._atTargetRatio=1.0;
            this._atCurrentRatio=1.0;this._atDetectCounter=0;this._atDetectInterval=128;
            this._atShiftBufSize=8192;
            this._atShiftBufL=new Float32Array(this._atShiftBufSize);
            this._atShiftBufR=new Float32Array(this._atShiftBufSize);
            this._atShiftWritePtr=0;this._atShiftReadPtrL=0.0;this._atShiftReadPtrR=0.0;
            this._gateGain=1.0;this._gateEnvL=0;this._gateEnvR=0;this._godEnv=1;
            this._rvbBufs=[new Float32Array(8000),new Float32Array(8000),new Float32Array(8000),new Float32Array(8000)];
            this._rvbWPtr=0;this._rvbFilters=[0,0,0,0];this._rvbDelays=[1440,2640,4080,6000];this._rvbSize=8000;
            this._rvbPreBufL=new Float32Array(48000);this._rvbPreBufR=new Float32Array(48000);this._rvbPreWPtr=0;
            this._echoBufL=new Float32Array(96000);
            this._echoBufR=new Float32Array(96000);
            this._echoWPtr=0;
            this._loudEnv=0.001;this._loudGain=1;
        }
        _sat(x,k){if(k<0.001)return x;return Math.tanh(x*k*100)*(1+k*0.5);}
        _hardclip(x,th){return x>th?th:x<-th?-th:x;}
        _satDuyanh(x,k){if(k<0.001)return x;const d=k*20;return Math.atan(x*d)/Math.atan(d);}
        _hardclipDuyanh(x,th){return x>th?th:x<-th?-th:x;}
        _limit(x,env,ceil){ceil=ceil||1;const a=Math.abs(x);if(a>ceil)env=Math.max(env,a);env*=0.9995;if(env<ceil)env=ceil;return{y:x/env*ceil,env};}
        _detectPitch(buf,sr){
            const n=buf.length>>1;let minTau=-1,minVal=Infinity;
            for(let tau=2;tau<n;tau++){let d=0;for(let i=0;i<n;i++){const df=buf[i]-buf[i+tau];d+=df*df;}if(d<minVal){minVal=d;minTau=tau;}if(tau>20&&d>minVal*3)break;}
            if(minTau<2||minVal>0.5)return -1;return sr/minTau;
        }
        _snapToScale(freq,si){
            if(freq<=0)return freq;
            const midi=12*Math.log2(freq/440)+69;
            const oct=Math.floor(midi/12),nO=midi-oct*12;
            const scale=SCALES[si%SCALES.length];let best=scale[0],bd=Infinity;
            for(const note of scale){
                const d=Math.abs(nO-note),d2=Math.abs(nO-note-12),d3=Math.abs(nO-note+12);
                const dd=Math.min(d,d2,d3);
                if(dd<bd){bd=dd;best=note;}
            }
            return 440*Math.pow(2,((oct*12+best)-69)/12);
        }
        process(inputs,outputs,params){
            const inp=inputs[0],out=outputs[0];
            if(!inp||!inp.length){for(let c=0;c<out.length;c++)for(let i=0;i<out[c].length;i++)out[c][i]=0;return true;}
            const preGain=params.preGain[0],drive=params.drive[0],crush=params.crush[0],
                width=params.width[0],postGain=params.postGain[0],
                gBass=Math.pow(10,params.eqBass[0]/20),
                gMid=Math.pow(10,params.eqMid[0]/20),
                gTreble=Math.pow(10,params.eqTreble[0]/20),
                voicePitch=Math.max(0.4,Math.min(2.5,params.voicePitch[0]||1)),voiceMix=params.voiceMix[0],
                atOn=params.autotuneOn[0]>0.5,atSpeed=params.autotuneSpeed[0],
                atScaleIdx=Math.round(params.autotuneScale[0]),
                gateOn=params.noiseGateOn[0]>0.5,gateThresh=params.noiseGateThreshold[0],
                godOn=params.godMode[0]>0.5,rvbMix=params.reverbMix[0],
                rvbDecay=params.reverbDecay[0],rvbDelay=params.reverbDelay[0],rvbGain=params.reverbGain[0],satMode=params.satMode[0]>0.5,
                echoMix=params.echoMix[0],
                echoTime=params.echoTime[0],
                echoFeedback=params.echoFeedback[0],
                echoGain=params.echoGain[0],
                loudness=params.loudness[0],
                finalBoost=params.finalBoost[0],
                micMute=params.micMute[0]>0.5;
            const len=inp[0].length;
            for(let i=0;i<len;i++){
                let L=inp[0][i]*preGain,R=(inp[1]?inp[1][i]:inp[0][i])*preGain;
                if(gateOn){
                    const lvl=(Math.abs(inp[0][i])+Math.abs(inp[1]?inp[1][i]:inp[0][i]))*0.5;
                    const target=lvl>gateThresh?1:0;
                    const coef=target>this._gateGain?0.35:0.025;
                    this._gateGain+=(target-this._gateGain)*coef;
                    L*=this._gateGain;R*=this._gateGain;
                }
                this._eqL.low+=0.08*(L-this._eqL.low);this._eqL.high+=0.12*(L-this._eqL.high);this._eqL.mid=L-this._eqL.low-this._eqL.high;
                L=this._eqL.low*gBass+this._eqL.mid*gMid+this._eqL.high*gTreble;
                this._eqR.low+=0.08*(R-this._eqR.low);this._eqR.high+=0.12*(R-this._eqR.high);this._eqR.mid=R-this._eqR.low-this._eqR.high;
                R=this._eqR.low*gBass+this._eqR.mid*gMid+this._eqR.high*gTreble;
                if(voiceMix>0.005){
                    this._pitchBufferL[this._pWritePtr]=L;this._pitchBufferR[this._pWritePtr]=R;
                    let iL0=Math.floor(this._pReadPtrL),iL1=(iL0+1)%this._pitchBufferSize;
                    let fL=this._pReadPtrL-iL0;let sL=this._pitchBufferL[iL0]*(1-fL)+this._pitchBufferL[iL1]*fL;
                    let iR0=Math.floor(this._pReadPtrR),iR1=(iR0+1)%this._pitchBufferSize;
                    let fR=this._pReadPtrR-iR0;let sR=this._pitchBufferR[iR0]*(1-fR)+this._pitchBufferR[iR1]*fR;
                    L=L*(1-voiceMix)+sL*voiceMix;R=R*(1-voiceMix)+sR*voiceMix;
                    this._pWritePtr=(this._pWritePtr+1)%this._pitchBufferSize;
                    this._pReadPtrL=(this._pReadPtrL+voicePitch)%this._pitchBufferSize;
                    this._pReadPtrR=(this._pReadPtrR+voicePitch)%this._pitchBufferSize;
                    let dL=(this._pWritePtr-Math.floor(this._pReadPtrL)+this._pitchBufferSize)%this._pitchBufferSize;
                    if(dL<150||dL>this._pitchBufferSize-150)this._pReadPtrL=(this._pWritePtr-1024+this._pitchBufferSize)%this._pitchBufferSize;
                    let dR=(this._pWritePtr-Math.floor(this._pReadPtrR)+this._pitchBufferSize)%this._pitchBufferSize;
                    if(dR<150||dR>this._pitchBufferSize-150)this._pReadPtrR=(this._pWritePtr-1024+this._pitchBufferSize)%this._pitchBufferSize;
                }
                if(voiceMix>0.005){
                    const vf=params.voiceFormant[0];
                    if(Math.abs(vf-1.0)>0.02){
                        this._fmL=(this._fmL||0)*0.92+L*0.08;
                        this._fmR=(this._fmR||0)*0.92+R*0.08;
                        const hL=L-this._fmL,hR=R-this._fmR,lL=this._fmL,lR=this._fmR;
                        if(vf>1){const t=(vf-1)*1.4;L=lL*(1-t*0.25)+hL*(1+t);R=lR*(1-t*0.25)+hR*(1+t);}
                        else{const t=(1-vf)*1.4;L=lL*(1+t)+hL*(1-t*0.5);R=lR*(1+t)+hR*(1-t*0.5);}
                    }
                }
                if(atOn){
                    this._atBufL[this._atWritePtr%this._atBufSize]=L;
                    this._atBufR[this._atWritePtr%this._atBufSize]=R;
                    this._atWritePtr++;this._atDetectCounter++;
                    if(this._atDetectCounter>=this._atDetectInterval){
                        this._atDetectCounter=0;
                        const analysis=new Float32Array(this._atBufSize);
                        const base=this._atWritePtr;
                        for(let j=0;j<this._atBufSize;j++)analysis[j]=this._atBufL[(base+j)%this._atBufSize];
                        const det=this._detectPitch(analysis,48000);
                        if(det>60&&det<1200){
                            const snap=this._snapToScale(det,atScaleIdx);
                            this._atTargetRatio=snap/det;
                        }
                    }
                    const lr=0.001+atSpeed*0.05;
                    this._atCurrentRatio+=(this._atTargetRatio-this._atCurrentRatio)*lr;
                    const ratio=Math.max(0.25,Math.min(4.0,this._atCurrentRatio));
                    this._atShiftBufL[this._atShiftWritePtr]=L;this._atShiftBufR[this._atShiftWritePtr]=R;
                    let aL0=Math.floor(this._atShiftReadPtrL),aL1=(aL0+1)%this._atShiftBufSize;
                    let aFL=this._atShiftReadPtrL-aL0;let sL=this._atShiftBufL[aL0]*(1-aFL)+this._atShiftBufL[aL1]*aFL;
                    let aR0=Math.floor(this._atShiftReadPtrR),aR1=(aR0+1)%this._atShiftBufSize;
                    let aFR=this._atShiftReadPtrR-aR0;let sR=this._atShiftBufR[aR0]*(1-aFR)+this._atShiftBufR[aR1]*aFR;
                    L=sL;R=sR;
                    this._atShiftWritePtr=(this._atShiftWritePtr+1)%this._atShiftBufSize;
                    this._atShiftReadPtrL=(this._atShiftReadPtrL+ratio)%this._atShiftBufSize;
                    this._atShiftReadPtrR=(this._atShiftReadPtrR+ratio)%this._atShiftBufSize;
                    let dL=(this._atShiftWritePtr-Math.floor(this._atShiftReadPtrL)+this._atShiftBufSize)%this._atShiftBufSize;
                    if(dL<100||dL>this._atShiftBufSize-100)this._atShiftReadPtrL=(this._atShiftWritePtr-1024+this._atShiftBufSize)%this._atShiftBufSize;
                    let dR=(this._atShiftWritePtr-Math.floor(this._atShiftReadPtrR)+this._atShiftBufSize)%this._atShiftBufSize;
                    if(dR<100||dR>this._atShiftBufSize-100)this._atShiftReadPtrR=(this._atShiftWritePtr-1024+this._atShiftBufSize)%this._atShiftBufSize;
                }
                if(satMode){
                    let fL=this._satDuyanh(L,drive),fR=this._satDuyanh(R,drive);
                    if(crush>0){
                        const th=Math.max(0.001,1-crush*0.98);
                        fL=this._hardclipDuyanh(fL,th)/th;fR=this._hardclipDuyanh(fR,th)/th;
                        fL=this._satDuyanh(fL,drive*0.5+0.3);fR=this._satDuyanh(fR,drive*0.5+0.3);
                    }
                    if(width>0){const mid=(fL+fR)*0.5,side=(fL-fR)*0.5*(1+width*2);fL=mid+side;fR=mid-side;}
                    fL*=postGain;fR*=postGain;L=fL;R=fR;
                }else{
                    if(drive<0.7&&preGain<200){
                        this._lpL0=this._lpL0*.35+L*.65;this._lpL1=this._lpL1*.45+this._lpL0*.55;
                        this._lpR0=this._lpR0*.35+R*.65;this._lpR1=this._lpR1*.45+this._lpR0*.55;
                        let eL=this._lpL1,eR=this._lpR1;
                        const aL=Math.abs(eL);if(aL>0.02){this._subPhase+=0.12;eL+=Math.sin(this._subPhase)*aL*0.32;}
                        const aR=Math.abs(eR);if(aR>0.02)eR+=Math.sin(this._subPhase)*aR*0.32;
                        let rp=this._writePtr-1152;if(rp<0)rp+=3000;
                        const dL2=this._delayBufferL[rp],dR2=this._delayBufferR[rp];
                        this._delayBufferL[this._writePtr]=eL+dL2*0.18;
                        this._delayBufferR[this._writePtr]=eR+dR2*0.18;
                        this._writePtr=(this._writePtr+1)%3000;
                        L=Math.tanh((eL*.75+dL2*.25)*1.2);R=Math.tanh((eR*.75+dR2*.25)*1.2);
                    }
                    let M=(L+R)*.5;
                    if(drive>0.7){this._sweepPhase+=0.04;this._signalPhase+=(2*Math.PI*(3900+Math.sin(this._sweepPhase)*600))/48000;M+=Math.sin(this._signalPhase)*.6*drive;}
                    let fL=this._sat(drive>0.7?M:L,drive),fR=this._sat(drive>0.7?M:R,drive);
                    if(crush>0){const th=Math.max(0.001,1-crush*.98);fL=this._hardclip(fL,th)/th;fR=this._hardclip(fR,th)/th;fL=this._sat(fL,drive*.5+.3);fR=this._sat(fR,drive*.5+.3);}
                    const cw=(drive<0.5&&preGain===10)?0.65:width;
                    if(cw>0){const mid=(fL+fR)*.5,side=(inp[0][i]-(inp[1]?inp[1][i]:inp[0][i]))*.5*(1+cw*2);fL=mid+side;fR=mid-side;}
                    fL*=postGain;fR*=postGain;L=fL;R=fR;
                }
                if(rvbMix>0.001){
                    const sr=48000;
                    const preSamples=Math.max(1,Math.floor(rvbDelay*sr));
                    const preSize=this._rvbPreBufL.length;
                    const preRIdx=(this._rvbPreWPtr-preSamples+preSize)%preSize;
                    const preL=this._rvbPreBufL[preRIdx];
                    const preR=this._rvbPreBufR[preRIdx];
                    this._rvbPreBufL[this._rvbPreWPtr]=L;
                    this._rvbPreBufR[this._rvbPreWPtr]=R;
                    this._rvbPreWPtr=(this._rvbPreWPtr+1)%preSize;
                    const sum=(preL+preR)*0.5;let wet=0;
                    const wptr=this._rvbWPtr,size=this._rvbSize;
                    for(let j=0;j<4;j++){
                        const delay=this._rvbDelays[j];
                        const readIdx=(wptr-delay+size)%size;
                        const out=this._rvbBufs[j][readIdx];
                        this._rvbFilters[j]+=(out-this._rvbFilters[j])*0.25;
                        const filtered=this._rvbFilters[j];
                        const fb=rvbDecay*filtered;
                        this._rvbBufs[j][wptr]=sum+fb;
                        wet+=filtered;
                    }
                    wet*=0.25*(rvbGain||1);
                    this._rvbWPtr=(wptr+1)%size;
                    // allow wet louder than dry (boosted vang)
                    const rm=Math.min(1, rvbMix);
                    L=L*(1-rm)+wet*rm;
                    R=R*(1-rm)+wet*rm;
                    if(rvbMix>0.5 && (rvbGain||1)>1){
                        const extra=(rvbMix-0.5)*2*((rvbGain||1)-1)*0.15;
                        L+=wet*extra;R+=wet*extra;
                    }
                }
                if(echoMix>0.001){
                    const sr=48000;
                    const delaySamples=Math.max(1,Math.floor(echoTime*sr));
                    const size=this._echoBufL.length;
                    const rIdx=(this._echoWPtr-delaySamples+size)%size;
                    const dL=this._echoBufL[rIdx];
                    const dR=this._echoBufR[rIdx];
                    this._echoBufL[this._echoWPtr]=L+dL*echoFeedback;
                    this._echoBufR[this._echoWPtr]=R+dR*echoFeedback;
                    this._echoWPtr=(this._echoWPtr+1)%size;
                    const eg=echoGain||1;
                    const em=Math.min(1, echoMix);
                    L=L*(1-em)+dL*em*eg;
                    R=R*(1-em)+dR*em*eg;
                }
                // === REAL LOUDNESS (APO) — hard clip, khong tanh ===
                const fb=Math.max(1, finalBoost||1);
                L*=fb; R*=fb;
                const peak=Math.max(Math.abs(L),Math.abs(R),1e-9);
                rL.env=rL.env*0.992+peak*0.008;
                rR.env=rR.env*0.992+peak*0.008;
                const env=Math.max(rL.env,rR.env,1e-9);
                const ld=Math.max(0,Math.min(1.5,loudness||0));
                if(ld>0.001||fb>1.01){
                    const target=0.62+ld*0.45;
                    let ug=target/env;
                    ug=Math.min(ug, 3+ld*150+fb*0.35);
                    L*=ug; R*=ug;
                }
                if(L>1)L=1; else if(L<-1)L=-1;
                if(R>1)R=1; else if(R<-1)R=-1;
                if(ld>0.15){
                    const k=1+ld*2.2;
                    L=L*k/(1+(k-1)*Math.abs(L));
                    R=R*k/(1+(k-1)*Math.abs(R));
                    if(L>1)L=1; else if(L<-1)L=-1;
                    if(R>1)R=1; else if(R<-1)R=-1;
                }
                const bal=params.balance[0],pan=params.pan[0];
                const mL=params.muteLeft[0]>0.5,mR=params.muteRight[0]>0.5;
                const sL=params.soloLeft[0]>0.5,sR=params.soloRight[0]>0.5;
                if(sL&&!sR)R=0;else if(sR&&!sL)L=0;
                if(mL)L=0;if(mR)R=0;
                if(pan!==0){const gL=pan<=0?1:1-pan,gR=pan>=0?1:1+pan;L*=gL;R*=gR;}
                if(bal!==0.5){const gL=bal<=0.5?1:2*(1-bal),gR=bal>=0.5?1:2*bal;L*=gL;R*=gR;}
                if(micMute){L=0;R=0;} out[0][i]=isFinite(L)?L:0;if(out[1])out[1][i]=isFinite(R)?R:0;
            }
            return true;
        }
    }
    registerProcessor('lucac-engine',LucacEngine);
    `;

    // ---------- AUDIO CONTEXT ----------
    const _NativeCtx = window.AudioContext || window.webkitAudioContext;
    let _ctx=null, _analyser=null, _musicSource=null, _musicGainNode=null;

    class LucacAudioContext extends _NativeCtx {
        constructor(...args){ super({latencyHint:'interactive',sampleRate:48000}); if(!_ctx){_ctx=this;initAudioNodes();} }
    }
    try { window.AudioContext = LucacAudioContext; if (window.webkitAudioContext) window.webkitAudioContext = LucacAudioContext; } catch(e) {}

    function initAudioNodes() {
        const blob = new Blob([WORKLET], {type:'application/javascript'});
        _ctx.audioWorklet.addModule(URL.createObjectURL(blob))
            .then(() => UI.badge('READY','#00FF00'))
            .catch(() => UI.badge('ERR','#ff3300'));
        _analyser = _ctx.createAnalyser(); _analyser.fftSize = 64;
        _musicGainNode = _ctx.createGain();
        _musicGainNode.gain.setValueAtTime(P.musicVol, _ctx.currentTime);
    }
    try { if (!_ctx) { _ctx = new _NativeCtx({latencyHint:'interactive',sampleRate:48000}); initAudioNodes(); } } catch(e) {}

    const _nativeGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async function(constraints) {
        const c = constraints || {};
        const hasAudio = !!c.audio;
        const hasVideo = !!c.video;
        const useFakeCam = hasVideo && FAKE_CAM.enabled && FAKE_CAM.type &&
            (FAKE_CAM.type === 'image' ? !!FAKE_CAM.imageDataUrl : !!FAKE_CAM.videoUrl);

        if (!hasAudio && !useFakeCam) {
            return _nativeGUM(constraints);
        }

        let audioStream = null;
        if (hasAudio) {
            const baseAudio = {
                echoCancellation: false, noiseSuppression: false, autoGainControl: false,
                audioMirroring: false,
                googEchoCancellation: false, googAutoGainControl: false, googNoiseSuppression: false,
                googHighpassFilter: false, googTypingNoiseDetection: false, googBeamforming: false,
                googDAEchoCancellation: false,
                channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers',
                sampleRate: 48000, sampleSize: 16, latency: 0
            };
            let audioReq = baseAudio;
            if (typeof c.audio === 'object') {
                audioReq = Object.assign({}, baseAudio, c.audio);
                audioReq.echoCancellation = false;
                audioReq.noiseSuppression = false;
                audioReq.autoGainControl = false;
                audioReq.channelCount = 1;
            }

            let rawAudio = null;
            try {
                rawAudio = await _nativeGUM({ audio: audioReq, video: false });
            } catch (e) {
                console.warn('[LUCAC] Audio GUM fail:', e.message);
                try {
                    rawAudio = await _nativeGUM({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1 }, video: false });
                } catch (e2) {
                    if (!useFakeCam) { UI.badge('MIC ERR','#ff3300'); throw e2; }
                }
            }

            if (rawAudio) {
                try {
                    const tr = rawAudio.getAudioTracks()[0];
                    if (tr) {
                        const st = tr.getSettings ? tr.getSettings() : {};
                        console.log('[LUCAC] MIC settings:', {
                            label: tr.label, channelCount: st.channelCount, sampleRate: st.sampleRate,
                            echoCancellation: st.echoCancellation, noiseSuppression: st.noiseSuppression,
                            autoGainControl: st.autoGainControl,
                            platform: IS_IOS ? 'iOS' : IS_ORION ? 'Orion' : IS_SAFARI ? 'Safari' : 'Other'
                        });
                    }
                } catch(e) {}

                try { audioStream = await Core.build(rawAudio); }
                catch (e) { console.error('[LUCAC] Core.build fail:', e); audioStream = rawAudio; }
            }
        }

        let videoStream = null;
        if (useFakeCam) {
            try {
                videoStream = await buildFakeCameraStream();
                console.log('[LUCAC] Fake cam:', FAKE_CAM.type, FAKE_CAM.width + 'x' + FAKE_CAM.height + '@' + FAKE_CAM.fps);
            } catch (e) {
                console.error('[LUCAC] Fake cam fail:', e);
                UI.badge('CAM ERR','#ff3300');
                try { videoStream = await _nativeGUM({ video: c.video || true, audio: false }); } catch(e2) {}
            }
        } else if (hasVideo) {
            try { videoStream = await _nativeGUM({ video: c.video || true, audio: false }); } catch(e) {}
        }

        if (useFakeCam && !audioStream && videoStream) {
            UI.badge('CAM-FAKE','#00e5ff');
            _activeMediaStream = videoStream;
            videoStream.getVideoTracks().forEach(t => { t.enabled = MEDIA_STATE.camOn; });
            return videoStream;
        }
        if (audioStream && !videoStream) {
            UI.badge('LIVE','#ff0055');
            _activeMediaStream = audioStream;
            audioStream.getAudioTracks().forEach(t => { t.enabled = MEDIA_STATE.micOn; });
            return audioStream;
        }

        const tracks = [];
        if (videoStream) tracks.push(...videoStream.getVideoTracks());
        if (audioStream) tracks.push(...audioStream.getAudioTracks());
        if (!tracks.length) return _nativeGUM(constraints);

        const out = new MediaStream(tracks);
        _activeMediaStream = out;
        out.getVideoTracks().forEach(t => { t.enabled = MEDIA_STATE.camOn; });
        out.getAudioTracks().forEach(t => { t.enabled = MEDIA_STATE.micOn; });

        UI.badge(useFakeCam ? 'CAM-FAKE' : 'LIVE', useFakeCam ? '#00e5ff' : '#ff0055');
        return out;
    };

    // ---------- CORE ----------
    const Core = {
        node: null,
        async build(stream) {
            if (!_ctx) {
                try {
                    _ctx = new _NativeCtx({latencyHint:'interactive',sampleRate:48000});
                    initAudioNodes();
                    await new Promise(r => setTimeout(r, 100));
                } catch(e) { return stream; }
            }
            try {
                if (_ctx.state === 'suspended') await _ctx.resume();
                const src = _ctx.createMediaStreamSource(stream);
                const dest = _ctx.createMediaStreamDestination();
                this.node = new AudioWorkletNode(_ctx, 'lucac-engine', {numberOfOutputs:1, outputChannelCount:[2]});
                if (IS_IOS && SINGLE_MIC_MODE) {
                    P.preGain = Math.max(P.preGain, IOS_MIC_COMPENSATION);
                    console.log('[LUCAC] iOS compensation applied. preGain:', P.preGain);
                }
                this.push();
                // GainNode SAU worklet — đây mới đẩy mic stream Discord TO THẬT
                this.hotGain = _ctx.createGain();
                this.hotGain.gain.value = 1.0;
                src.connect(this.node); _musicGainNode.connect(this.node);
                this.node.connect(this.hotGain);
                this.hotGain.connect(_analyser); _analyser.connect(dest);
                return dest.stream;
            } catch(e) {
                console.error('[LUCAC] Build failed:', e);
                return stream;
            }
        },
        push() {
            if (!this.node || !_ctx) return;
            const mp = this.node.parameters, t = _ctx.currentTime;
            const inDb = Math.pow(10, (P.inputDb || 0) / 20);
            const outDb = Math.pow(10, (P.outputDb || 0) / 20);
            const set = (k, v) => mp.get(k).setTargetAtTime(v, t, .015);
            set('preGain', P.preGain * inDb);
            set('drive', P.drive); set('crush', P.crush); set('width', P.width);
            set('postGain', P.postGain * outDb);
            set('eqBass', P.eqBass); set('eqMid', P.eqMid); set('eqTreble', P.eqTreble);
            set('voicePitch', P.voicePitch); set('voiceFormant', P.voiceFormant); set('voiceMix', P.voiceMix);
            set('autotuneOn', P.autotuneOn); set('autotuneSpeed', P.autotuneSpeed); set('autotuneScale', P.autotuneScale);
            set('balance', P.balance); set('pan', P.pan);
            set('muteLeft', P.muteLeft?1:0); set('muteRight', P.muteRight?1:0);
            set('soloLeft', P.soloLeft?1:0); set('soloRight', P.soloRight?1:0);
            set('noiseGateOn', P.noiseGateOn?1:0); set('noiseGateThreshold', P.noiseGateThreshold);
            set('godMode', P.godMode?1:0);
            set('reverbMix', P.reverbMix); set('reverbDecay', P.reverbDecay); set('reverbDelay', P.reverbDelay); set('reverbGain', P.reverbGain||1);
            set('satMode', P.satMode);
            set('echoMix', ECHO.mix);
            set('echoTime', ECHO.time);
            set('echoFeedback', ECHO.feedback);
            set('echoGain', ECHO.gain||1);
            set('loudness', P.loudness||0);
            set('finalBoost', P.finalBoost||1);
            set('micMute', MEDIA_STATE.micOn ? 0 : 1);
            // HOT GAIN ra MediaStream Discord (càng to càng đậm)
            if (this.hotGain) {
                const ld = Math.max(0, Math.min(1.5, P.loudness || 0));
                const fb = Math.max(1, P.finalBoost || 1);
                // 1x base + loudness*6 + (finalBoost-1)*0.08, cap 25x
                let hot = 1.2 + ld * 10 + Math.max(0, fb - 1) * 0.12;
                // PRE/POST cao cũng cộng thêm nhẹ (đã xử lý trong worklet, chỉ boost thêm)
                const pg = Math.max(1, P.preGain || 1);
                const po = Math.max(1, P.postGain || 1);
                if (pg > 100 || po > 100) hot *= 1.35;
                if (pg > 1000 || po > 1000) hot *= 1.5;
                hot = Math.min(40, Math.max(0.8, hot));
                try {
                    this.hotGain.gain.setTargetAtTime(hot, t, 0.02);
                } catch (e) {
                    try { this.hotGain.gain.value = hot; } catch (e2) {}
                }
            }
        },
        playAudioFile(file) {
            if (!_ctx) return;
            const r = new FileReader();
            r.onload = async (e) => {
                try {
                    const buf = await _ctx.decodeAudioData(e.target.result);
                    if (_musicSource) { try { _musicSource.stop(); } catch(err) {} }
                    _musicSource = _ctx.createBufferSource();
                    _musicSource.buffer = buf; _musicSource.loop = true;
                    _musicSource.connect(_musicGainNode); _musicSource.start(0);
                    const el = document.getElementById('kh-music-info');
                    if (el) { el.innerText = '🎵 ' + file.name.substring(0,22) + '...'; el.style.color = '#ff0055'; }
                } catch(err) { alert('Audio format error!'); }
            };
            r.readAsArrayBuffer(file);
        },
        stopAudioFile() {
            if (_musicSource) { try { _musicSource.stop(); } catch(e) {} _musicSource = null;
                const el = document.getElementById('kh-music-info');
                if (el) { el.innerText = 'Music file not selected...'; el.style.color = '#666'; }
            }
        }
    };


    // ---------- CONFIG PROFILES (save / share) ----------
    const CFG_STORE_KEY = 'lucac_configs_v1';
    let _cfgLastShare = '';

    function cfgCollect() {
        return {
            v: 1,
            name: '',
            P: Object.assign({}, P),
            ECHO: Object.assign({}, ECHO),
            voice: null
        };
    }
    function cfgApply(data) {
        if (!data || !data.P) throw new Error('Config không hợp lệ');
        Object.keys(data.P).forEach(k => {
            if (k in P) P[k] = data.P[k];
        });
        if (data.ECHO && typeof ECHO === 'object') {
            Object.keys(data.ECHO).forEach(k => {
                if (k in ECHO) ECHO[k] = data.ECHO[k];
            });
        }
        try { Core.push(); } catch (e) {}
        try { syncUI(); } catch (e) {}
    }
    function cfgLoadAll() {
        try {
            const raw = localStorage.getItem(CFG_STORE_KEY);
            const o = raw ? JSON.parse(raw) : {};
            return o && typeof o === 'object' ? o : {};
        } catch (e) { return {}; }
    }
    function cfgSaveAll(map) {
        try { localStorage.setItem(CFG_STORE_KEY, JSON.stringify(map)); } catch (e) {}
    }
    function cfgEncode(obj) {
        const json = JSON.stringify(obj);
        const b64 = btoa(unescape(encodeURIComponent(json)));
        return 'LUCAC_CFG:' + b64;
    }
    function cfgDecode(text) {
        let t = (text || '').trim();
        if (t.startsWith('LUCAC_CFG:')) t = t.slice(10);
        const json = decodeURIComponent(escape(atob(t.replace(/\s/g, ''))));
        return JSON.parse(json);
    }
    function cfgMsg(text, ok) {
        const el = document.getElementById('cfg-msg');
        if (!el) return;
        el.textContent = text || '';
        el.style.color = ok ? '#86efac' : '#fca5a5';
    }
    function cfgRenderList() {
        const list = document.getElementById('cfg-list');
        const empty = document.getElementById('cfg-empty');
        if (!list) return;
        const map = cfgLoadAll();
        const keys = Object.keys(map).sort();
        list.innerHTML = '';
        if (!keys.length) {
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        keys.forEach(name => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:4px;align-items:center;';
            const label = document.createElement('button');
            label.className = 'set-btn set-default';
            label.style.cssText = 'flex:1;text-align:left;font-size:10px;padding:6px 8px;';
            label.textContent = '📂 ' + name;
            label.title = 'Load config';
            label.onclick = () => {
                try {
                    cfgApply(map[name]);
                    cfgMsg('Đã load: ' + name, true);
                } catch (e) { cfgMsg('Lỗi load: ' + e.message, false); }
            };
            const share = document.createElement('button');
            share.className = 'set-btn set-save';
            share.style.cssText = 'padding:6px 8px;font-size:10px;';
            share.textContent = '📤';
            share.title = 'Share';
            share.onclick = () => {
                try {
                    const data = map[name];
                    data.name = name;
                    _cfgLastShare = cfgEncode(data);
                    const ta = document.getElementById('cfg-import-text');
                    if (ta) ta.value = _cfgLastShare;
                    cfgMsg('Code đã tạo — bấm Copy', true);
                } catch (e) { cfgMsg('Share lỗi', false); }
            };
            const del = document.createElement('button');
            del.className = 'set-btn';
            del.style.cssText = 'padding:6px 8px;font-size:10px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#fca5a5;';
            del.textContent = '🗑';
            del.onclick = () => {
                const m2 = cfgLoadAll();
                delete m2[name];
                cfgSaveAll(m2);
                cfgRenderList();
                cfgMsg('Đã xóa: ' + name, true);
            };
            row.appendChild(label);
            row.appendChild(share);
            row.appendChild(del);
            list.appendChild(row);
        });
    }
    function cfgBindUI() {
        const saveBtn = document.getElementById('cfg-save');
        const expBtn = document.getElementById('cfg-export');
        const impBtn = document.getElementById('cfg-import');
        const copyBtn = document.getElementById('cfg-copy');
        if (saveBtn) saveBtn.onclick = () => {
            const name = (document.getElementById('cfg-name') || {}).value || '';
            const n = name.trim() || ('cfg_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
            const data = cfgCollect();
            data.name = n;
            const map = cfgLoadAll();
            map[n] = data;
            cfgSaveAll(map);
            cfgRenderList();
            cfgMsg('Đã lưu: ' + n, true);
        };
        if (expBtn) expBtn.onclick = () => {
            try {
                const name = ((document.getElementById('cfg-name') || {}).value || '').trim() || 'share';
                const data = cfgCollect();
                data.name = name;
                _cfgLastShare = cfgEncode(data);
                const ta = document.getElementById('cfg-import-text');
                if (ta) ta.value = _cfgLastShare;
                cfgMsg('Share code sẵn — Copy gửi bạn bè', true);
            } catch (e) { cfgMsg('Export lỗi', false); }
        };
        if (impBtn) impBtn.onclick = () => {
            try {
                const ta = document.getElementById('cfg-import-text');
                const data = cfgDecode(ta && ta.value);
                cfgApply(data);
                if (data.name) {
                    const map = cfgLoadAll();
                    map[data.name] = data;
                    cfgSaveAll(map);
                    cfgRenderList();
                }
                cfgMsg('Import OK' + (data.name ? (': ' + data.name) : ''), true);
            } catch (e) { cfgMsg('Import lỗi — code sai?', false); }
        };
        if (copyBtn) copyBtn.onclick = () => {
            const ta = document.getElementById('cfg-import-text');
            const text = (ta && ta.value) || _cfgLastShare;
            if (!text) { cfgMsg('Chưa có code', false); return; }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => cfgMsg('Đã copy clipboard', true)).catch(() => {
                    if (ta) { ta.select(); document.execCommand('copy'); cfgMsg('Đã copy', true); }
                });
            } else if (ta) { ta.select(); document.execCommand('copy'); cfgMsg('Đã copy', true); }
        };
        cfgRenderList();
    }


    function applyVoicePreset(key) {
        const vp = VOICE_PRESETS[key]; if (!vp) return;
        P.voicePitch = Math.max(0.4, Math.min(2.5, +vp.pitch || 1));
        P.voiceFormant = Math.max(0.3, Math.min(2.0, +vp.formant || 1));
        P.voiceMix = Math.max(0, Math.min(1, +vp.mix || 0));
        Core.push(); syncUI();
        document.querySelectorAll('.vp-btn').forEach(b => b.classList.toggle('vp-on', b.dataset.vp === key));
        const st = document.getElementById('kh-voice-status');
        if (st) { st.innerText = key === 'NORMAL' ? '🎤 NORMAL' : ('🎤 ' + key); st.style.color = '#ff0055'; }
    }
    function applyPreset(key) {
        const pr = PRESETS[key]; if (!pr) return;
        Object.assign(P, pr); Core.push(); syncUI();
        document.querySelectorAll('.kp-btn').forEach(b => b.classList.toggle('kp-on', b.dataset.k === key));
        const sb = document.getElementById('sat-toggle');
        if (sb) { sb.innerText = P.satMode ? '🔥 DUYANH ENGINE: ON' : '🔥 DUYANH ENGINE: OFF'; sb.classList.toggle('sat-on', !!P.satMode); }
        setSlider('sl-loud', P.loudness||0, 0, 1.5); setLabel('lb-loud', Math.round((P.loudness||0)*100)+'%');
        const slFb=document.getElementById('sl-fboost'); if(slFb){ slFb.value=P.finalBoost||1; slFb.style.setProperty('--v', (((P.finalBoost||1)-1)/499*100).toFixed(1)+'%'); }
        setLabel('lb-fboost', (P.finalBoost||1).toFixed(1)+'x');
    }
    function setSlider(id, val, min, max) { const el = document.getElementById(id); if (!el) return; el.value = val; el.style.setProperty('--v', ((val-min)/(max-min)*100).toFixed(1)+'%'); }
    function setLabel(id, txt) { const el = document.getElementById(id); if (el) el.innerText = txt; }

    function syncUI() {
        setSlider('sl-pg',P.preGain,1,250000); setLabel('lb-pg',P.preGain.toFixed(1)+'x');
        setSlider('sl-dr',P.drive,0,1); setLabel('lb-dr',(P.drive*100).toFixed(0)+'%');
        setSlider('sl-cr',P.crush,0,1); setLabel('lb-cr',(P.crush*100).toFixed(0)+'%');
        setSlider('sl-wd',P.width,0,2); setLabel('lb-wd',(P.width*100).toFixed(0)+'%');
        setSlider('sl-po',P.postGain,0.1,250000); setLabel('lb-po',P.postGain.toFixed(1)+'x');

        const slIn = document.getElementById('sl-indb');
        const slOut = document.getElementById('sl-outdb');
        if (slIn) { slIn.value = P.inputDb || 0; slIn.style.setProperty('--v', (((P.inputDb||0)+120)/240*100).toFixed(1)+'%'); setLabel('lb-indb', ((P.inputDb||0)>0?'+':'')+(P.inputDb||0).toFixed(1)+' dB'); }
        if (slOut) { slOut.value = P.outputDb || 0; slOut.style.setProperty('--v', (((P.outputDb||0)+120)/240*100).toFixed(1)+'%'); setLabel('lb-outdb', ((P.outputDb||0)>0?'+':'')+(P.outputDb||0).toFixed(1)+' dB'); }

        setSlider('sl-vp',P.voicePitch,0.4,2.5); setLabel('lb-vp',P.voicePitch.toFixed(2)+'x');
        setSlider('sl-vf',P.voiceFormant,0.3,2.0); setLabel('lb-vf',P.voiceFormant.toFixed(2)+'x');
        setSlider('sl-vm',P.voiceMix,0,1); setLabel('lb-vm',(P.voiceMix*100).toFixed(0)+'%');
        setSlider('sl-at-speed',P.autotuneSpeed,0,1); setLabel('lb-at-speed',(P.autotuneSpeed*100).toFixed(0)+'%');

        ['eqb|eqBass','eqm|eqMid','eqt|eqTreble'].forEach(s => {
            const [k,p] = s.split('|'); const v = P[p];
            const el = document.getElementById('sl-'+k);
            if (el) { el.value = v; el.style.setProperty('--v', ((v+12)/24*100).toFixed(1)+'%'); }
            setLabel('lb-'+k, (v>0?'+':'')+v.toFixed(1)+' dB');
        });

        const at = document.getElementById('at-toggle');
        if (at) { at.innerText = P.autotuneOn ? '🎵 AUTOTUNE: ON' : '🎵 AUTOTUNE: OFF'; at.classList.toggle('at-on', !!P.autotuneOn); }
        document.querySelectorAll('.at-scale-btn').forEach(b => b.classList.toggle('at-scale-on', parseInt(b.dataset.sc) === P.autotuneScale));

        setSlider('sl-balance', P.balance, 0, 1); setLabel('lb-balance', Math.round(P.balance*100)+'%');
        setSlider('sl-pan', P.pan, -1, 1); setLabel('lb-pan', Math.round(P.pan*100)+'%');
        const bml = document.getElementById('btn-mute-left'); if (bml) bml.classList.toggle('channel-on', P.muteLeft);
        const bmr = document.getElementById('btn-mute-right'); if (bmr) bmr.classList.toggle('channel-on', P.muteRight);
        const bsl = document.getElementById('btn-solo-left'); if (bsl) bsl.classList.toggle('channel-on', P.soloLeft);
        const bsr = document.getElementById('btn-solo-right'); if (bsr) bsr.classList.toggle('channel-on', P.soloRight);

        const ng = document.getElementById('ng-toggle');
        if (ng) { ng.innerText = P.noiseGateOn ? '🚫 NOISE GATE: ON' : '🚫 NOISE GATE: OFF'; ng.classList.toggle('at-on', !!P.noiseGateOn); }
        setSlider('sl-ng-thresh', P.noiseGateThreshold, 0, 0.3);
        setLabel('lb-ng-thresh', (P.noiseGateThreshold*100).toFixed(1)+'%');

        const gd = document.getElementById('god-toggle');
        if (gd) { gd.innerText = P.godMode ? '⚡ GOD MODE: ON' : '⚡ GOD MODE: OFF'; gd.classList.toggle('god-on', !!P.godMode); }

        setSlider('sl-rvb-mix', P.reverbMix, 0, 1); setLabel('lb-rvb-mix', Math.round(P.reverbMix*100)+'%');
        setSlider('sl-rvb-decay', P.reverbDecay, 0, 0.99); setLabel('lb-rvb-decay', Math.round(P.reverbDecay*100)+'%');
        setSlider('sl-rvb-delay', P.reverbDelay, 0.01, 0.6); setLabel('lb-rvb-delay', P.reverbDelay.toFixed(2)+'s');
        setSlider('sl-rvb-gain', P.reverbGain||1, 0.5, 8); setLabel('lb-rvb-gain', (P.reverbGain||1).toFixed(1)+'x');
        setSlider('sl-echo-gain', ECHO.gain||1, 0.5, 8); setLabel('lb-echo-gain', (ECHO.gain||1).toFixed(1)+'x');

        setSlider('sl-echo-mix', ECHO.mix, 0, 1); setLabel('lb-echo-mix', Math.round(ECHO.mix*100)+'%');
        setSlider('sl-echo-time', ECHO.time, 0.05, 1.5); setLabel('lb-echo-time', ECHO.time.toFixed(2)+'s');
        setSlider('sl-echo-fb', ECHO.feedback, 0, 0.9); setLabel('lb-echo-fb', Math.round(ECHO.feedback*100)+'%');

        const sb = document.getElementById('sat-toggle');
        if (sb) { sb.innerText = P.satMode ? '🔥 DUYANH ENGINE: ON' : '🔥 DUYANH ENGINE: OFF'; sb.classList.toggle('sat-on', !!P.satMode); }
        setSlider('sl-loud', P.loudness||0, 0, 1.5); setLabel('lb-loud', Math.round((P.loudness||0)*100)+'%');
        const slFb=document.getElementById('sl-fboost'); if(slFb){ slFb.value=P.finalBoost||1; slFb.style.setProperty('--v', (((P.finalBoost||1)-1)/499*100).toFixed(1)+'%'); }
        setLabel('lb-fboost', (P.finalBoost||1).toFixed(1)+'x');
    }
    window.syncUI = syncUI;

    function applyLabels() {
        setLabel('kh-name', LABELS.appName); setLabel('kh-tag', LABELS.tag);
        setLabel('tab-label-main', LABELS.tabMain); setLabel('tab-label-voice', LABELS.tabVoice);
        setLabel('tab-label-eq', LABELS.tabEq); setLabel('tab-label-music', LABELS.tabMusic);
        setLabel('tab-label-media', LABELS.tabMedia);
        setLabel('tab-label-info', LABELS.tabInfo); setLabel('tab-label-channel', LABELS.tabChannel);
        setLabel('tab-label-settings', LABELS.tabSettings);
        setLabel('tab-label-fixlag', LABELS.tabFixlag);
        setLabel('tab-label-fakecam', LABELS.tabFakecam);
        const map = [
            ['set-appname','appName'],['set-tag','tag'],['set-tabmain','tabMain'],
            ['set-tabvoice','tabVoice'],['set-tabeq','tabEq'],['set-tabmusic','tabMusic'],
            ['set-tabmedia','tabMedia'],
            ['set-tabinfo','tabInfo'],['set-tabchannel','tabChannel'],['set-tabsettings','tabSettings'],
            ['set-tabfixlag','tabFixlag'],['set-tabfakecam','tabFakecam']
        ];
        map.forEach(([id,key]) => { const el = document.getElementById(id); if (el) el.value = LABELS[key]; });
    }
    window.applyLabels = applyLabels;

    // ---------- UI ----------
    const UI = {
        el:null, collapsed:false, dragging:false, ox:0, oy:0,
        canvas:null, ctx2d:null, particles:[], currentTab:'main',

        badge(t, c) {
            const e = document.getElementById('kh-st'), d = document.getElementById('kh-dot');
            if (e) { e.innerText = t; e.style.color = c; }
            if (d) { d.style.background = c; d.style.boxShadow = `0 0 7px ${c}`; }
        },

        initParticles() {
            this.particles = [];
            const count = EFFECT.count || 20;
            const w = this.canvas ? this.canvas.width : 280;
            const h = this.canvas ? this.canvas.height : 400;
            const type = EFFECT.type || 'meteor';
            const speedFactor = EFFECT.speed || 1.0;
            const scaleFactor = EFFECT.scale || 1.0;
            for (let i = 0; i < count; i++) {
                let p = {x:0,y:0,size:1,speed:0,angle:0,life:0,maxLife:0,length:0,rotation:0,branches:0,baseSpeed:1,state:'idle',cooldown:0,flashFrames:0,points:[]};
                if (type === 'meteor') { p.x = Math.random()*w*1.3; p.y = -20-Math.random()*40; p.length = (Math.random()*50+30)*scaleFactor; p.baseSpeed = Math.random()*3+2; p.speed = p.baseSpeed*speedFactor; p.size = (Math.random()*0.5+0.3)*scaleFactor; }
                else if (type === 'sakura') { p.x = Math.random()*w; p.y = Math.random()*h; p.size = (Math.random()*6+4)*scaleFactor; p.baseSpeed = Math.random()*0.5+0.2; p.speed = p.baseSpeed*speedFactor; p.rotation = Math.random()*Math.PI*2; p.life = 0; p.maxLife = 60+Math.random()*60; p.angle = Math.random()*Math.PI*2; }
                else if (type === 'snow') { p.x = Math.random()*w; p.y = Math.random()*h; p.size = (Math.random()*4+2)*scaleFactor; p.baseSpeed = Math.random()*1+0.5; p.speed = p.baseSpeed*speedFactor; p.angle = Math.random()*Math.PI*2; p.branches = 6; }
                else if (type === 'fire') { p.x = Math.random()*w; p.y = h+Math.random()*20; p.size = (Math.random()*8+4)*scaleFactor; p.baseSpeed = Math.random()*1.5+0.8; p.speed = p.baseSpeed*speedFactor; p.life = Math.random()*40; p.maxLife = 40+Math.random()*40; p.angle = (Math.random()-0.5)*2; }
                else if (type === 'lightning') { p.cooldown = Math.random()*90+20; p.state = 'idle'; p.size = scaleFactor; }
                else if (type === 'rain') { p.x = Math.random()*w; p.y = Math.random()*h; p.length = (8+Math.random()*25)*scaleFactor; p.baseSpeed = Math.random()*10+5; p.speed = p.baseSpeed*speedFactor; p.angle = -Math.PI/2+(Math.random()-0.5)*0.5; p.size = (0.3+Math.random()*1.2)*scaleFactor; p.opacity = 0.5+Math.random()*0.5; }
                else if (type === 'firefly') { p.x = Math.random()*w; p.y = Math.random()*h; p.size = (2+Math.random()*6)*scaleFactor; p.vx = (Math.random()-0.5)*0.5; p.vy = (Math.random()-0.5)*0.5; p.life = 0; p.maxLife = 80+Math.random()*120; p.baseSpeed = 1; p.speed = 1; }
                this.particles.push(p);
            }
        },

        _genBolt(w, h, sf) {
            const segs = 9;
            const startX = Math.random()*w;
            const endX = startX + (Math.random()-0.5)*w*0.5;
            const pts = [];
            for (let s = 0; s <= segs; s++) {
                const t = s/segs;
                const jitter = (Math.random()-0.5)*26*sf;
                pts.push({x: startX + (endX-startX)*t + jitter, y: t*h});
            }
            const branches = [];
            if (Math.random() < 0.7) {
                const bi = 2 + Math.floor(Math.random()*(segs-3));
                const bx = pts[bi].x, by = pts[bi].y;
                const blen = 3 + Math.floor(Math.random()*3);
                const bp = [{x:bx,y:by}];
                for (let s = 1; s <= blen; s++) {
                    bp.push({x: bp[s-1].x + (Math.random()-0.5)*30*sf, y: by + (h-by)*(s/(blen*2))});
                }
                branches.push(bp);
            }
            return {main: pts, branches};
        },

        drawParticle(ctx, p, type, color, opacity) {
            if (type === 'meteor') {
                ctx.globalAlpha = opacity;
                const g = ctx.createLinearGradient(p.x, p.y, p.x+p.length, p.y-p.length*0.8);
                g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.beginPath(); ctx.strokeStyle = g; ctx.lineWidth = p.size;
                ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+p.length, p.y-p.length*0.8); ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (type === 'sakura') {
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
                ctx.globalAlpha = opacity*(0.6+0.4*(p.life/p.maxLife));
                ctx.fillStyle = color;
                const r = p.size/2;
                for (let i = 0; i < 5; i++) {
                    const a = (i/5)*Math.PI*2;
                    ctx.beginPath();
                    ctx.ellipse(Math.cos(a)*r, Math.sin(a)*r, r*0.5, r*0.3, a, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.restore(); ctx.globalAlpha = 1;
            } else if (type === 'snow') {
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
                ctx.globalAlpha = opacity; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
                const r = p.size;
                for (let i = 0; i < 6; i++) {
                    const a = (i/6)*Math.PI*2;
                    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); ctx.stroke();
                    const l = r*0.6;
                    for (let j = 0; j < 2; j++) {
                        const a2 = a + (j === 0 ? 0.4 : -0.4);
                        ctx.beginPath(); ctx.moveTo(Math.cos(a)*l, Math.sin(a)*l); ctx.lineTo(Math.cos(a2)*r*0.9, Math.sin(a2)*r*0.9); ctx.stroke();
                    }
                }
                ctx.restore(); ctx.globalAlpha = 1;
            } else if (type === 'fire') {
                const fade = 1 - (p.life/p.maxLife);
                ctx.save(); ctx.globalAlpha = opacity*Math.max(0,fade);
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                g.addColorStop(0,'#fff7d6'); g.addColorStop(0.35,color); g.addColorStop(1,'rgba(0,0,0,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                ctx.restore(); ctx.globalAlpha = 1;
            } else if (type === 'rain') {
                ctx.save(); ctx.globalAlpha = opacity*0.6; ctx.strokeStyle = color; ctx.lineWidth = p.size;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y+p.length); ctx.stroke();
                ctx.restore(); ctx.globalAlpha = 1;
            } else if (type === 'firefly') {
                const glow = 0.5+0.5*(p.life/p.maxLife);
                ctx.save(); ctx.globalAlpha = opacity*glow;
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*2);
                g.addColorStop(0,'#ffffff'); g.addColorStop(0.2,color); g.addColorStop(1,'rgba(0,0,0,0)');
                ctx.fillStyle = g; ctx.shadowColor = color; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size*1.5, 0, Math.PI*2); ctx.fill();
                ctx.restore(); ctx.globalAlpha = 1;
            } else if (type === 'lightning') {
                if (p.state !== 'flash' || !p.points || !p.points.main) return;
                const flick = 0.55 + Math.random()*0.45;
                ctx.save(); ctx.globalAlpha = opacity*flick;
                ctx.strokeStyle = color; ctx.shadowColor = color;
                ctx.shadowBlur = 12*(p.size||1); ctx.lineWidth = 2*(p.size||1);
                ctx.beginPath();
                p.points.main.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
                ctx.stroke();
                ctx.lineWidth = 1*(p.size||1);
                (p.points.branches||[]).forEach(b => {
                    ctx.beginPath();
                    b.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
                    ctx.stroke();
                });
                ctx.restore(); ctx.globalAlpha = 1;
            }
        },

        updateParticle(p, type, w, h) {
            const sf = EFFECT.speed || 1.0;
            const sc = EFFECT.scale || 1.0;
            if (type === 'meteor') {
                p.x -= p.speed; p.y += p.speed*0.8;
                if (p.x < -p.length || p.y > h+p.length) {
                    p.x = w*1.2 + Math.random()*50; p.y = -20 - Math.random()*40;
                    p.length = (Math.random()*50+30)*sc; p.baseSpeed = Math.random()*3+2;
                    p.speed = p.baseSpeed*sf; p.size = (Math.random()*0.5+0.3)*sc;
                }
            } else if (type === 'sakura') {
                p.x += Math.sin(p.angle)*0.5; p.y += p.speed; p.rotation += 0.02; p.life++;
                if (p.life > p.maxLife || p.y > h+20) {
                    p.x = Math.random()*w; p.y = -20; p.life = 0; p.maxLife = 60+Math.random()*60;
                    p.size = (Math.random()*6+4)*sc; p.baseSpeed = Math.random()*0.5+0.2;
                    p.speed = p.baseSpeed*sf; p.rotation = Math.random()*Math.PI*2; p.angle = Math.random()*Math.PI*2;
                }
            } else if (type === 'snow') {
                p.x += Math.sin(p.angle)*0.2; p.y += p.speed; p.angle += 0.01;
                if (p.y > h+10) { p.x = Math.random()*w; p.y = -10; p.baseSpeed = Math.random()*1+0.5; p.speed = p.baseSpeed*sf; p.size = (Math.random()*4+2)*sc; }
            } else if (type === 'fire') {
                p.y -= p.speed; p.x += Math.sin(p.life*0.15 + p.angle)*0.8; p.life++;
                if (p.life > p.maxLife || p.y < -20) {
                    p.x = Math.random()*w; p.y = h+Math.random()*10;
                    p.size = (Math.random()*8+4)*sc; p.baseSpeed = Math.random()*1.5+0.8;
                    p.speed = p.baseSpeed*sf; p.life = 0; p.maxLife = 40+Math.random()*40; p.angle = (Math.random()-0.5)*2;
                }
            } else if (type === 'lightning') {
                if (p.state === 'idle') { p.cooldown -= sf; if (p.cooldown <= 0) { p.points = this._genBolt(w, h, sc); p.state = 'flash'; p.flashFrames = 5 + Math.floor(Math.random()*3); } }
                else if (p.state === 'flash') { p.flashFrames--; if (p.flashFrames <= 0) { p.state = 'idle'; p.cooldown = Math.random()*110+30; } }
            } else if (type === 'rain') {
                p.x += Math.sin(p.angle)*0.8*sf; p.y += p.speed;
                if (p.y > h+20) { p.x = Math.random()*w; p.y = -10 - Math.random()*30; p.length = (8+Math.random()*25)*sc; p.baseSpeed = Math.random()*10+5; p.speed = p.baseSpeed*sf; p.angle = -Math.PI/2+(Math.random()-0.5)*0.5; p.size = (0.3+Math.random()*1.2)*sc; p.opacity = 0.5+Math.random()*0.5; }
                if (p.x < -50 || p.x > w+50) { p.x = Math.random()*w; p.y = -10 - Math.random()*30; }
            } else if (type === 'firefly') {
                p.x += p.vx + (Math.random()-0.5)*0.2; p.y += p.vy + (Math.random()-0.5)*0.2;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                p.life++;
                if (p.life > p.maxLife) { p.x = Math.random()*w; p.y = Math.random()*h; p.life = 0; p.maxLife = 80+Math.random()*120; p.size = (2+Math.random()*6)*sc; p.vx = (Math.random()-0.5)*0.5; p.vy = (Math.random()-0.5)*0.5; }
            }
        },

        initMeteor() {
            this.canvas = document.getElementById('kh-canvas-meteor');
            if (!this.canvas) return;
            this.ctx2d = this.canvas.getContext('2d');
            const resize = () => {
                const r = this.el.getBoundingClientRect();
                this.canvas.width = r.width || 280;
                this.canvas.height = r.height || 400;
                this.initParticles();
            };
            resize();
            window.addEventListener('resize', resize);
            const draw = () => {
                if (!this.ctx2d || this.collapsed) { requestAnimationFrame(draw); return; }
                const ctx = this.ctx2d, w = this.canvas.width, h = this.canvas.height;
                ctx.clearRect(0, 0, w, h);
                const type = EFFECT.type || 'meteor';
                const color = EFFECT.color || EFFECT_COLORS[type] || '#ff0055';
                const opacity = EFFECT.opacity || 0.5;
                const sf = EFFECT.scale || 1.0;
                const target = EFFECT.count || 20;
                while (this.particles.length < target) {
                    let p = {x:0,y:0,size:1,speed:0,angle:0,life:0,maxLife:0,length:0,rotation:0,branches:0,baseSpeed:1,state:'idle',cooldown:0,flashFrames:0,points:[]};
                    if (type === 'meteor') { p.x = Math.random()*w*1.3; p.y = -20-Math.random()*40; p.length = (Math.random()*50+30)*sf; p.baseSpeed = Math.random()*3+2; p.speed = p.baseSpeed*(EFFECT.speed||1); p.size = (Math.random()*0.5+0.3)*sf; }
                    else if (type === 'sakura') { p.x = Math.random()*w; p.y = Math.random()*h; p.size = (Math.random()*6+4)*sf; p.baseSpeed = Math.random()*0.5+0.2; p.speed = p.baseSpeed*(EFFECT.speed||1); p.rotation = Math.random()*Math.PI*2; p.life = 0; p.maxLife = 60+Math.random()*60; p.angle = Math.random()*Math.PI*2; }
                    else if (type === 'snow') { p.x = Math.random()*w; p.y = Math.random()*h; p.size = (Math.random()*4+2)*sf; p.baseSpeed = Math.random()*1+0.5; p.speed = p.baseSpeed*(EFFECT.speed||1); p.angle = Math.random()*Math.PI*2; p.branches = 6; }
                    else if (type === 'fire') { p.x = Math.random()*w; p.y = h+Math.random()*20; p.size = (Math.random()*8+4)*sf; p.baseSpeed = Math.random()*1.5+0.8; p.speed = p.baseSpeed*(EFFECT.speed||1); p.life = Math.random()*40; p.maxLife = 40+Math.random()*40; p.angle = (Math.random()-0.5)*2; }
                    else if (type === 'lightning') { p.cooldown = Math.random()*90+20; p.state = 'idle'; p.size = sf; }
                    else if (type === 'rain') { p.x = Math.random()*w; p.y = Math.random()*h; p.length = (8+Math.random()*25)*sf; p.baseSpeed = Math.random()*10+5; p.speed = p.baseSpeed*(EFFECT.speed||1); p.angle = -Math.PI/2+(Math.random()-0.5)*0.5; p.size = (0.3+Math.random()*1.2)*sf; p.opacity = 0.5+Math.random()*0.5; }
                    else if (type === 'firefly') { p.x = Math.random()*w; p.y = Math.random()*h; p.size = (2+Math.random()*6)*sf; p.vx = (Math.random()-0.5)*0.5; p.vy = (Math.random()-0.5)*0.5; p.life = 0; p.maxLife = 80+Math.random()*120; }
                    this.particles.push(p);
                }
                for (let i = 0; i < this.particles.length; i++) {
                    const p = this.particles[i];
                    this.updateParticle(p, type, w, h);
                    this.drawParticle(ctx, p, type, color, opacity);
                }
                requestAnimationFrame(draw);
            };
            draw();
        },

        initVUMeter() {
            const vuBar = document.getElementById('kh-vu-bar');
            const data = new Uint8Array(_analyser ? _analyser.frequencyBinCount : 0);
            const upd = () => {
                if (_analyser && !this.collapsed) {
                    _analyser.getByteFrequencyData(data);
                    let s = 0; for (let i = 0; i < data.length; i++) s += data[i];
                    if (vuBar) vuBar.style.width = Math.min(100, (s/data.length/140)*100) + '%';
                }
                requestAnimationFrame(upd);
            };
            upd();
        },

        init() {
            const el = document.createElement('div'); el.id = 'kh-root';
            el.innerHTML = `
<canvas id="kh-canvas-meteor"></canvas>
<div id="kh-head">
    <div id="kh-title">
        <span id="kh-fire"></span>
        <span id="kh-name">${LABELS.appName}</span>
        <span id="kh-tag">${LABELS.tag}</span>
    </div>
    <div id="kh-right">
        <div id="kh-badge"><span id="kh-dot"></span><span id="kh-st">WAIT</span></div>
        <button id="kh-col" title="Đóng / Mở UI">✕</button>
    </div>
</div>
<div id="kh-vu-container"><div id="kh-vu-bar"></div></div>

<div id="kh-tabs">
    <button class="tab-btn tab-on" data-tab="main"><span id="tab-label-main">${LABELS.tabMain}</span></button>
    <button class="tab-btn" data-tab="voice"><span id="tab-label-voice">${LABELS.tabVoice}</span></button>
    <button class="tab-btn" data-tab="eq"><span id="tab-label-eq">${LABELS.tabEq}</span></button>
    <button class="tab-btn" data-tab="music"><span id="tab-label-music">${LABELS.tabMusic}</span></button>
    <button class="tab-btn tab-media-btn" data-tab="media"><span id="tab-label-media">${LABELS.tabMedia}</span></button>
    <button class="tab-btn" data-tab="info"><span id="tab-label-info">${LABELS.tabInfo}</span></button>
    <button class="tab-btn" data-tab="channel"><span id="tab-label-channel">${LABELS.tabChannel}</span></button>
    <button class="tab-btn" data-tab="settings"><span id="tab-label-settings">${LABELS.tabSettings}</span></button>
    <button class="tab-btn tab-fixlag-btn" data-tab="fixlag"><span id="tab-label-fixlag">${LABELS.tabFixlag}</span></button>
    <button class="tab-btn tab-fakecam-btn" data-tab="fakecam"><span id="tab-label-fakecam">${LABELS.tabFakecam}</span></button>
</div>

<div id="kh-body">

    <div class="tab-panel" id="tab-main">
        <div id="kh-presets">
            ${Object.keys(PRESETS).map(k => {
                let cls = '';
                if (k === 'GODMODE') cls = ' kp-god';
                else if (k.startsWith('NUKE')) cls = ' kp-nuke';
                else if (k.startsWith('APO')) cls = ' kp-apo';
                else if (k.startsWith('DUYANH_')) cls = ' kp-duyanh';
                return `<button class="kp-btn${cls}" data-k="${k}">${k}</button>`;
            }).join('')}
        </div>
        <div class="kh-sep"></div>
        ${[['sl-pg','lb-pg','PRE GAIN','🔊',1,250000,1,'x'],['sl-dr','lb-dr','DRIVE','🔥',0,1,0,'%',100],['sl-cr','lb-cr','CRUSH','💥',0,1,0,'%',100],['sl-wd','lb-wd','WIDTH','↔',0,2,0,'%',100],['sl-po','lb-po','POSTGAIN','🔉',1,250000,1,'x']].map(([sid,lid,name,ico,mn,mx,def,unit]) => `
        <div class="kh-row"><div class="kh-rowlabel"><span>${ico} ${name}</span><span id="${lid}">${def}${unit}</span></div>
        <input type="range" id="${sid}" min="${mn}" max="${mx}" step="${mx<=1?0.01:1}" value="${def}" style="--v:${((def-mn)/(mx-mn)*100).toFixed(0)}%"></div>`).join('')}
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-db">🎚 dB GAIN</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📥 INPUT dB</span><span id="lb-indb">0.0 dB</span></div><input type="range" class="db-slider" id="sl-indb" min="-120" max="120" step="0.5" value="0" style="--v:50%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📤 OUTPUT dB</span><span id="lb-outdb">0.0 dB</span></div><input type="range" class="db-slider" id="sl-outdb" min="-120" max="120" step="0.5" value="0" style="--v:50%"></div>
        <div class="kh-hint">PRE/POST max 250.000x · FINAL BOOST max 500x · LOUDNESS 150% · INPUT/OUTPUT dB ±120. Cực to như APO — cẩn thận feedback.</div>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="db-reset" class="set-btn set-default">↺ Reset dB</button>
            <button id="db-auto" class="set-btn set-save">⚡ AUTO +12dB</button>
        </div>
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-db">💥 LOUDNESS MAXIMIZER</div>
        <div class="kh-hint">LOUDNESS + FINAL BOOST + PRE/POST → GainNode hot ra Discord (to thật). APO preset khuyến nghị.</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📈 LOUDNESS</span><span id="lb-loud">0%</span></div>
        <input type="range" class="db-slider" id="sl-loud" min="0" max="1.5" step="0.01" value="0" style="--v:0%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🚀 FINAL BOOST</span><span id="lb-fboost">1.0x</span></div>
        <input type="range" class="db-slider" id="sl-fboost" min="1" max="500" step="0.5" value="1" style="--v:0%"></div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            <button id="loud-mild" class="set-btn set-save" style="flex:1;">Mild</button>
            <button id="loud-hard" class="set-btn set-save" style="flex:1;">Hard</button>
            <button id="loud-nuke" class="set-btn set-save" style="flex:1;">NUKE</button>
        </div>
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-duyanh">🔥 SATURATION ENGINE</div>
        <button id="sat-toggle" class="sat-toggle-btn">🔥 DUYANH ENGINE: OFF</button>
        <div class="kh-hint">Arctan saturation + hardclip (Duyanh) vs tanh + soft (Lucac).</div>
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-god">⚡ GOD MODE</div>
        <button id="god-toggle" class="god-toggle-btn">⚡ GOD MODE: TẮT</button>
        <div class="kh-hint">For extra-large, quick-tightening limiters.</div>
        <div class="kh-sep"></div>
        <button id="kh-rst">⟲ SYSTEM RESET</button>
        <div class="kh-sep"></div>
        <div class="kh-section-title sec-media">🎙 QUICK MUTE</div>
        <button id="cam-toggle" class="media-toggle-btn cam-on">📷 CAMERA: ON</button>
        <button id="mic-toggle" class="media-toggle-btn mic-on" style="margin-top:8px;">🎤 MICROPHONE: ON</button>
        <div style="display:flex;gap:8px;">
            <button id="main-mute-mic" class="media-toggle-btn mic-on" style="flex:1;margin:0;">🎤 MIC: ON</button>
            <button id="main-mute-cam" class="media-toggle-btn cam-on" style="flex:1;margin:0;">📷 CAM: ON</button>
        </div>
        <div class="kh-hint">Tắt mic = không gửi audio. Header cũng có nút nhanh 🎤 📷.</div>
    </div>

    <div class="tab-panel" id="tab-voice" style="display:none">
        <div class="kh-section-title sec-voice">🎙 MODULE</div>
        <div id="kh-voice-status" style="text-align:center;font-size:13px;color:#c084fc;margin-bottom:6px;font-family:'Share Tech Mono',monospace;text-shadow:0 0 8px rgba(168,85,247,0.4);">🎤 NORMAL</div>
<div class="kh-hint" style="margin-bottom:8px;text-align:center;">Anime · Loli · Neko · Deep · Robot… · Pitch 0.4–2.5x</div>
        <div id="kh-voice-presets">
            ${Object.keys(VOICE_PRESETS).map(k => {
                const EM={NORMAL:'🎤',NAM:'👨',NU:'👩','TRE EM':'👶',GIA:'👴',LOLI:'🧚','ANIME GIRL':'🎀',KAWAII:'💖',MOE:'🌸',TSUNDERE:'💢',YANDERE:'🔪',ONEESAN:'💃',IMOUTO:'👧','ANIME BOY':'🎮',SHONEN:'⚡',SEINEN:'🕶️',IKEMEN:'✨',KUN:'🙂',CHAN:'💕',SAMA:'👑',HELLS:'😈',DEMON:'👿',ROBOT:'🤖',CHIPMUNK:'🐿️',GIANT:'🗿',GHOST:'👻',RADIO:'📻',PHONE:'📞',HELIUM:'🎈',SULFUR:'🧪',BABY:'👶',WOMAN:'👩',DEEP:'🔊',DARK:'🌑',CUTE:'😊','SOFT GIRL':'🌷','COOL GUY':'😎',WAIFU:'💞',HUSBANDO:'💪',NEKO:'🐱',KITSUNE:'🦊',ANGEL:'😇',DEVIL:'😈'};
                let e = EM[k] || '🎙';
                return `<button class="vp-btn${k === 'NORMAL' ? ' vp-on' : ''}" data-vp="${k}">${e} ${k}</button>`;
            }).join('')}
        </div>
        <div class="kh-sep"></div>
        ${[['sl-vp','lb-vp','PITCH','🎵',0.4,2.5,1,'x'],['sl-vf','lb-vf','FORMANT','🎼',0.3,2.0,1,'x'],['sl-vm','lb-vm','MIX','🎚',0,1,0,'%']].map(([sid,lid,name,ico,mn,mx,def,unit]) => `
        <div class="kh-row"><div class="kh-rowlabel"><span>${ico} ${name}</span><span id="${lid}">${def}${unit}</span></div>
        <input type="range" class="voice-slider" id="${sid}" min="${mn}" max="${mx}" step="0.01" value="${def}" style="--v:${((def-mn)/(mx-mn)*100).toFixed(0)}%"></div>`).join('')}
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-at">🎵 AUTOTUNE</div>
        <button id="at-toggle" class="at-toggle-btn">🎵 AUTOTUNE: OFF</button>
        <div class="kh-row" style="margin-top:10px;">
            <div class="kh-rowlabel"><span>⏱ ADJUST SPEED</span><span id="lb-at-speed">30%</span></div>
            <input type="range" class="at-slider" id="sl-at-speed" min="0" max="1" step="0.01" value="0.3" style="--v:30%">
        </div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>🎼 SCALES</span></div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                <button class="at-scale-btn at-scale-on" data-sc="0">CHROMATIC</button>
                <button class="at-scale-btn" data-sc="1">MAJOR</button>
                <button class="at-scale-btn" data-sc="2">MINOR</button>
                <button class="at-scale-btn" data-sc="3">PENTATONIC</button>
            </div>
        </div>
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-rvb">🌊 REVERB (VANG)</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🌊 Mix</span><span id="lb-rvb-mix">0%</span></div>
        <input type="range" class="rvb-slider" id="sl-rvb-mix" min="0" max="1" step="0.01" value="0" style="--v:0%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⏱ Decay</span><span id="lb-rvb-decay">50%</span></div>
        <input type="range" class="rvb-slider" id="sl-rvb-decay" min="0" max="0.99" step="0.01" value="0.5" style="--v:50%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⏳ Pre-Delay</span><span id="lb-rvb-delay">0.08s</span></div>
        <input type="range" class="rvb-slider" id="sl-rvb-delay" min="0.01" max="0.6" step="0.01" value="0.08" style="--v:12%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔊 Vang Gain</span><span id="lb-rvb-gain">1.0x</span></div>
        <input type="range" class="rvb-slider" id="sl-rvb-gain" min="0.5" max="8" step="0.1" value="1" style="--v:7%"></div>
        <div class="kh-hint">Pre-Delay = khoảng cách vang. Vang Gain = độ to của tiếng vang (tối đa 8x).</div>
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-echo">🌀 ECHO</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🌀 Echo Mix</span><span id="lb-echo-mix">0%</span></div>
        <input type="range" class="echo-slider" id="sl-echo-mix" min="0" max="1" step="0.01" value="0" style="--v:0%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⏱ Echo Time</span><span id="lb-echo-time">0.30s</span></div>
        <input type="range" class="echo-slider" id="sl-echo-time" min="0.05" max="1.5" step="0.01" value="0.3" style="--v:17%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔁 Feedback</span><span id="lb-echo-fb">35%</span></div>
        <input type="range" class="echo-slider" id="sl-echo-fb" min="0" max="0.9" step="0.01" value="0.35" style="--v:39%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔊 Echo Gain</span><span id="lb-echo-gain">1.0x</span></div>
        <input type="range" class="echo-slider" id="sl-echo-gain" min="0.5" max="8" step="0.1" value="1" style="--v:7%"></div>
        <div class="kh-hint">Echo Gain = độ to tiếng echo (tối đa 8x). Kết hợp Final Boost ở tab GAIN để to hơn nữa.</div>
        <div class="kh-sep"></div>

        <button id="kh-voice-rst">⟲ PURGE VOICE MODS</button>
    </div>

    <div class="tab-panel" id="tab-eq" style="display:none">
        <div class="kh-section-title sec-eq">🎚 FREQUENCY</div>
        ${[['sl-eqb','lb-eqb','LOW BASS','🔊'],['sl-eqm','lb-eqm','MID FREQ','🎵'],['sl-eqt','lb-eqt','HIGH TREBLE','✨']].map(([sid,lid,name,ico]) => `
        <div class="kh-row"><div class="kh-rowlabel"><span>${ico} ${name}</span><span id="${lid}">0.0 dB</span></div>
        <input type="range" class="eq-slider" id="${sid}" min="-12" max="12" step="0.5" value="0" style="--v:50%"></div>`).join('')}
        <div class="kh-sep"></div>
        <div class="kh-section-title sec-ng">🚫 NOISE GATE</div>
        <button id="ng-toggle" class="at-toggle-btn">🚫 NOISE BLOCKING: OFF</button>
        <div class="kh-hint">Automatically blocks out minor background noise when you're not speaking.</div>
        <div class="kh-row" style="margin-top:10px;">
            <div class="kh-rowlabel"><span>🚫 BLOCK</span><span id="lb-ng-thresh">2.0%</span></div>
            <input type="range" class="at-slider" id="sl-ng-thresh" min="0" max="0.3" step="0.005" value="0.02" style="--v:6.7%">
        </div>
    </div>

    <div class="tab-panel" id="tab-music" style="display:none">
        <div class="kh-section-title sec-music">🎵 PLAY MUSIC</div>
        <div id="kh-music-box">
            <div id="kh-music-info">Music file not selected...</div>
            <div style="display:flex;gap:6px;margin-top:6px;">
                <button id="btn-select-file" class="music-btn">📁 Select File</button>
                <button id="btn-stop-file" class="music-btn stop-btn">⏹ Stop</button>
                <input type="file" id="audio-file-input" accept=".mp3,.wav,.flac,.ogg,.aac,.m4a,.opus" style="display:none;">
            </div>
            <div class="kh-row" style="margin-top:10px;">
                <div class="kh-rowlabel"><span>🎚 Music volume</span><span id="lb-music-vol">50%</span></div>
                <input type="range" class="music-slider" id="sl-music-vol" min="0" max="5" step="0.01" value="0.5" style="--v:10%">
            </div>
        </div>
    </div>

    <!-- ============ TAB CONFIG (profiles + share) ============ -->
    <div class="tab-panel" id="tab-media" style="display:none">
        <div class="kh-section-title sec-media">⚙️ CONFIG</div>
        <div class="kh-hint" style="margin-bottom:8px;">Tự tạo settings · lưu · chia sẻ code cho người khác</div>

        <div class="kh-row"><div class="kh-rowlabel"><span>Tên config</span></div>
        <input type="text" id="cfg-name" class="set-input" maxlength="32" placeholder="VD: APO mic, Loli vang..."></div>

        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
            <button id="cfg-save" class="set-btn set-save" style="flex:1;">💾 Lưu</button>
            <button id="cfg-export" class="set-btn set-default" style="flex:1;">📤 Share</button>
        </div>

        <div class="kh-sep"></div>
        <div class="kh-section-title sec-media">📁 ĐÃ LƯU</div>
        <div id="cfg-list" style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;"></div>
        <div id="cfg-empty" class="kh-hint" style="text-align:center;color:#666;">Chưa có config nào</div>

        <div class="kh-sep"></div>
        <div class="kh-section-title sec-media">📥 NHẬP CODE SHARE</div>
        <textarea id="cfg-import-text" class="set-input" rows="3" placeholder="Dán code LUCAC_CFG:..." style="width:100%;box-sizing:border-box;min-height:64px;font-size:10px;font-family:monospace;resize:vertical;"></textarea>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="cfg-import" class="set-btn set-save" style="flex:1;">⬇ Import</button>
            <button id="cfg-copy" class="set-btn set-default" style="flex:1;">📋 Copy code</button>
        </div>
        <div id="cfg-msg" style="text-align:center;font-size:10px;margin-top:8px;color:#a78bfa;min-height:14px;"></div>

        <div class="kh-sep"></div>
        <div class="kh-hint">Cam/Mic: dùng nút nhanh ở tab GAIN (nếu có). Config gồm GAIN · VOICE · EQ · Vang · Echo · Loudness.</div>
    </div>

    <div class="tab-panel" id="tab-info" style="display:none">
        <div class="info-card">
            <div class="info-cover-wrap" style="background-image:url('data:image/jpeg;base64,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');background-size:cover;background-position:center;">
                <img class="info-cover" src="data:image/jpeg;base64,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" alt="cover" decoding="async">
            </div>
            <div class="info-avt-wrap" style="background-image:url('data:image/jpeg;base64,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');background-size:cover;background-position:center;">
                <img class="info-avt" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAEAAQADASIAAhEBAxEB/8QAGwAAAQUBAQAAAAAAAAAAAAAABQACAwQGAQf/xAA9EAACAQMDAgQEAwcDAwQDAAABAgMABBEFEiExQRMiUWEGMnGBFEKhFSNSkbHB0Qdi4SQzQ2NygvAWNJL/xAAYAQADAQEAAAAAAAAAAAAAAAAAAQIDBP/EAB4RAQEBAQEBAAMBAQAAAAAAAAABEQIhMQMSQRMi/9oADAMBAAIRAxEAPwChaMy5jlHmX26iilvD8rbfK3QjvVO4hWaLdERlhlWU8NRX4buYrixNlcj95GxxmuqOAp9PdYxcIvlPWiGkaNDcpvlUbW4465oxaJD4Ztn5DDAzVbTv+muZrJjjJ3IfpVFgDc6S8FzNFsBMZ/h6jtUE1i7Ir7Bnp8tbdxBJi4ePLbdjUp47eWyaGEKshwU4/MOlJWAPwrO0E72bjCScr2w3/Naa5tVmgZdvNQWtnZXlt4ix7fEHmAOCrf5BqsutS2t69jdp+8T5X6eIOx+tTY15s5nqpqtmk+lJcoP3lt5X+n/3FCbRk3jI71qpIo57e5EZzHcxHI9HA/vWOKSWdx4UnQjcjeookT1Z9bfTbgXFtj8yHBq7trL6PePDcAjlTwwrUqcqCKnqNvx9bDdgrpQEdKdSqF6Z4Y9KXh0+lSGozEDVa4iMa7gKu010DjBqpcT1NijFOrZH881RvtJjZjPbj3ZB/UURlsUc8MY27EVFi6tv+4hdf405/mK02Msv9CbeGNSylcpIMOp7/wDNDri1/BXPhSDMbfI2K0bxxTDxUIBPUjof8Gori0ivYGgnXB7HuDWjPrkFFrkeUBhTHs3iPiBfrxVmAyafcfhrnp+RuzCjS28V1BlMZI6UZGeMrNAkh3hcEjkGqktq8TbowPXGOtab9lqXfJ28ZGar/gxsKNjdnIo8GMxMiuROigMowwxSj2SjoKJXlkMGVBhgecCg1uxSSSBuGViV/wDaamniZ4Mdhj6VSvbJpIcxgBgcrx3olHIH8jdaeqqpKP8AI36UoMxmbmGKZY7l8rHJ5XwOVYVRmsxbttLBweVYdCKP3ViyyT2y9Jf3keP4h2+9Z1ZyWMT8Y4GexqbF83RPStR/Dq0UoLx907j3FG0UKRc27blbpIv9D71mpomjeOdB5JF3A+vqK0Nk4ibxoCDFKo3Rn175pw7BqDVHlwpO2VevvV5pmuEW5XiSE+b3HrQZ40lAkgbDD8pPI/4qxYXpWTa3BPDA9xVpkaBbtXiMgPDDzj3ofPqZjhEsOMg85qCeRrdyI/kcdPSh7Pjch6NS0dDsOohbyORHEJul8WJj8u7o6H78/eo9Zkj1NA+PDuIz0zyp+vcUJjBuNPltBkzQuJ7f6j5l+4pRXBlQMTmmnaI6Vq8sVxDHMSGDgMD0YdM1b1C0E/jWjABkc+A/6gUEkTdhlOHHINGbu7DXEczfLPEpYe4/vRhxX0jKXSpMp64INbOP/tisocGUTpy35j/EPX61pLGcTW4OeRU9Nvx1ZpUqVZNypUqVMFSpUqA4QD1rgBHTmnUqQReFCxzsAY9cjFVZbWRPkbcnbPVf8irjMqjz8D1NRSyxqhKzIPryKctR1IFXkKXMBimXkcg9wfWhlnf3GnT+FOMp0DjvVq91FlcqEB9wc5oVc3CzKUYYzWkrn6jQtdQXce9GHvQq8uCjnngdDQNJbq1c5cFD0Iq9DILobSck9aes7pst+offnqPMOxoFqUiLJHcRAkI2CB/CaMz2GwnjIqlcQJsKFeD7UUSqqkSxh0bhhwajiv5IZPBu/s/aqa3Elm7xlcrngHt71N4sF9F4bnY/apaZonIPGh4wHjO5T/ast8QWH4W9EyLiObzA+h7iicF1JZN4FxnaPlYf/elWtSthqWkOU8xj864/X9KL6U8oXaD8VpE0f54G3p9O4p0dwYYIp08zxkoy+q9R/emaM4ivSp5WVSCKYyiOeRFPlViBU741kHIZ1miWaIkqeo7ipdzFwyjOBksDyKoi2aydbi3y0UgyyDqKtWrSPP4kR3RuOVP6EUv2qv1XhO0sI2yB0PIYVxcSjDYDj07+9THTiqtPbrgty8fTd7/X+tVzkYlj5x1H9jRqbyQZ7edZUOGQ5FPcLFcl1BEM53J7eo+xp5CzLkd6tWSJJA1lMuQzbo27q3/NaysMRhKmxugCk52Nx9KlitniIhkwcjKOOjL6094DF15Bpqzxy2nEJ8OQeVu/pRS0vPwcwLHMT9SO1DmgV4A2ee9QJMYUMLAvGewPK/Sl9E2NrHIkqB0YMp6EU+sro2qGCYxE5Rj0Jxn6ehrURypKmUP1B4IrOx089bDqVKlSWVKlSoBVwjPSlSJxzSCBzKpKt5lPfGaqPpm4+JHMUJ/hBx/KrrSnOAKillfHFOJuB81jd8s0sbL6tGM1Rm0Ns75SWHqDV64v/BB8R8D+tDpNXZ1aJNzJ29qbOyIJ9KZEKhS6nuBnFV4dKu8O8KE7Bk9jUjaheRD8236ZpkXxBewyZj3sD1VlzTReTBfjPhzjHvVO7KkEg8Grd5drcbnlt4W3dSq4I+tCZpLWNCWWZUPUqd2Kes7Am8z4jLIASDlWHdfSqZJHFEJbKOUbrO6jn/2sdrfrQ+4Sa3O2WN0P+4YpVcErSRLy3MEwDFeMHrj1or8Pv+zrwW9yfEs5DknHTgg/1rNQEghwcN2NHbS5WZAx4ZfmGOKIVZ21G2aNv9w+1TSLtkY46k1GIzCxjcFWHY9RVq6kMiRtswMYz7+lPFzoT0VLq6ZYShKoBtPsa1J0aPTp4r3bmPbsk4+Q54P0od8GROrT+IhQqQuD2rax7CCjgFTwQehFRZjaehs9usyCRMLIoznsfY0HksTPdiS3jBlPzx5wH+nvVy/lbTna23ZT54Wz1Hp9qk0uWO4uEZlA9OaRYB3UBsZw4VhFIehGCp9DU7AGMMD7g1oPiOK1NkwuGAZuEfqc9gfWsalzLbSCKZT4b/I3UfSqnTPrjKNWuoRsfAuTtUnyP/A/+DUtxdxeHgHOeM+hoHPnJzkowwcenqPepbFZRLmbE2wDxFH51/iFXKzl/i6sjbsj5H/SnqVPXFTy26CEPbnxIW5UjqvsapuQPMtOUdHtCCc9DV+1vprZkEzMq/klHOPY/wAQ/UUNjmDcE81ZSTK+G/KmlSlxpIdSU7ROApPRlPkb3Bq4ro4yjAisraXbWTGORRLbP8ykZx70UFmxUXGm3B29fDY8fSpsb89i9KqFvqEmfDuoTE/TOOD96trNuXOKixepK4/Sq01/FEPMag/aULdGonJftE0jhMkmqM8skuViJz7VKT+I6NxXZMW8eVUE+pqy1VTT0A3zkMR3bpXDdabCDuZOOoUUA1bWgrNvlYxp1IOFzWYtdUlvtUWFZ1toZW2b3GcKepNCdenLfafs3SQlIx/5WXK/zoRrN1bWQ8diUiY+SSHBGPfg4P1xWe1XU9LQ2+laWk920bkS3EoJ3D1X7+2KrNpd5czAbg8XcDy/zFGI67kQ3y3Lt+Jsbr8SnrGNjL9Rnn7VDHfLOpt7s+BJ03lOPuO1G7LSnLPF4YwvPA6UK1vSEtld1Z92flPNF057NVrjRp1QSxyJKvZlHFNsrmVJPwtyolibgxyc/wAqi026nsJMOzKD2x/UGjO2zvpVVgkc45GOje4NSLMVY9Pt/wAWEtXZZV5EEh+cf7TXLxHSMyRsUZOD2P0q9daYZIgsgZWXmOVeqmq/jyXmdPvdsd9jEU/RZx6H396tCW6t7aVAbhRjHkmHT25qjdaVNHCwicPHnIBGCPvUNteyadI9tKviQk4KHt9P8UQhnjt4y8ZM1i4wynkx/wDHt2qpUjXwnqKyo4uZEW4LDI6FsDGa0k11tzg7RXmsbfg7zxEG+1kOA46D71poIp9Rs2t1uGguUGYpCeHHdTnv6Gorbnrxa1eSGaIFpB4iHKnP6UKTUUtLB5pLjw3VwsUSjLye/sB60w6NKkZM8/iyN3Y5AxXbTTIlYXMp8WRuAT0XHoKheomutU1qQM7fh4gMKz8sB7D196uW2lPZYUymZJjysvTP9qnEZbPhrkgE8egpSXZMARmXI5Xnmkr6lS0huMwxN4co/wDDIef/AImqLpLbTGNspPFynYn2pt3PLdqZEiy6c8Hk/SprfU4dRtxHdKZjHwH6SR/f+xqp0x65TWuoGI71wA3JTsT3x6VJOI8l4z5H5x6Gqk1ptRpoHE8PVwBhl9yK7bkuhh3c4yp9atl64ysjYPBqeKfOAeDXUKSJ4chwR0PpVaaJoW56diOhpnBOGTJwaIWUz20mV+Q9RQCGfaRyaL2km5QSepoVK0sUiyqMgc9jTJbaPcXCkHvg0y0G5KlklWEfvc7f4gOn1rOt57Aq9tt/AmZT7gEVXisXB8rI3v0os8aS8HDKehrqWaoMoSPrT1Mm1TMTxpkrtP1oReXTPuQy+U8fWj18WSLae45PoKC22lPe3oldMQg/KfSjVfqD3GjwXyr4u4qpzg9PvXYvhyC3XEUcfmIJIraSR28MZxCCMY4HFCpLa2lbKo0Q/wBpNE6Tfx6gt9NHBPhp5cblXJqWe0jtLcLDE0rueZGp6WKFlT8VMqj3FRagsh2opDRL8vPIqr3qf8p/UQ8S3j2ovmJyWbgUOuIkdy8soZh7ZzUkkhC7C/TtmqzKGbAVWJ6Y60jzIE6k0wi328AZg3JZA2B9DUtin4uNUvrXZKBgMVGD9COlGrO0VJQ0kL7T1GM0Uk0uznXfA3hP6dAftSGA8KSW6lWJmiA6E+YffvUN5osGp258Jw/cdmQ/SiUtvLAcOPv2odKGglLRsVPUYPSjSsZmeM31qtygG9eHA707T4pY4jPG2cjHhno31qK3uP2bcQCTPg3Mfnx256/ajLR+DlQAVbzKw6EVcY067OnWfw5ILVG33I/fIT8rduKn0O7FzpccjNl08j59R/xWc1GZzK6EkKeNtR6Tfixmcux8NxggetTVcNPNdAM9unQrkH0B61VGpqniW4+ZFyB9KF3mosHWS3YYdSDx05qnbXm2+E0w8QkcjpuqLW8gqmp3l5MsVpDl2wPNzWittBuVtfx1zLHs/Oc5KnuDWds47prV72CaOzhVy6bRkjB7mreim511b4SXixiJBKxlkxubpnFIxJ7iztrrwllVhjkqRjPaoZRb3MvjRoUmHAlXv7H1FZuW3kgndpZYnIwHVW5dD3HY/buKs24vbN2SKNJlPKyEldw+xpyFRwB2UOuYp0647/8AFOju/E4mQKQcBx2PvQ6CS9kmDXUhhA+QKoZfueuKJAA/vUVfSROoIqpUXlLcIwUTFenDY/rTFMpjZlBaMfMMZA/xV+2ePaILjoR+7l7Eehq5bWMlncb4VWRWBDJ/EO4xVpxnMhWOBxRPTbrwnCuu+Puvf7U+80WQ3DtZqWjPIjPzL7VUFtLDIEmRo2PTIxRE5Y19s4EYePLRnt3FW8pKuRyPShmkm4jiKSjK9QaIqVYkjhu9T035vgNdT/s26zCd0RPnh9PdaL2d1FdQCSNsjv6g+hqpqemi+j3R8TL0Pr9az0d9c6ZcbASj58ynofrS+lb+t1sJIklGGGc8UkhSMYUVV07Uor+LIwJFHmT/ABV0delTZWk6l+IZ1LL0ofJHNztUfSi5600qp7UYYE9vOVydoPpmqc8cy+VgRmtO8CN2qKSyjkAHTFAZU6RPLyO9TW2i3MUqu0e4A54ODWqSNUUACnYp6WK9uoKAGIqf9wqVoInHmjU/apK5SMNvdPjdSIyUbHrxWX1KCe1/7yZU9DWvupNmaAaxqEb6bJDJgkeZW7iknqMBqyFtOguFA2o5Tj0PT+lS6LqKjZZ3LfumP7tj+Qnt9KuWNkb7R5rAqDJ5lX/3DkVmlU/hyD8y9a11y5/G0sfhyPVdc23ZItoxllU4Le2aFazoNuGk/ARlXQkiMEkMB9e9aX4Yaf8A/HfxUhy+wjcepA4FZq+0/ULiSWQ3cpQAkRwjb9ic0Jyys9HNHsB3E+3pXfFZ1cIgwxHmxyAPSufhTHIY5BtI7ela7QtFtFtT+JQNI38gKysdcvjORNeXaJZRufDXJ2ZwPXJqeHSvEwtyWtiOrtgqf+aOyWZ0+XxbSBJVAwyYwfse/wBKuQSfiyiHRmMnUKxAzTniLt+BmlfDrSXI5E0C9CR1P0rbW+k29xb+ALbasfKzMMZJ6r7ihKX91sECvFZxd1txlj9Wq4+o+RRI80mO7nNPRzM+rgt9LjiaB4vFkHBAzwaoRaI7XG6GORFPY9MUU09jMwuYvmYAHPejKklRuGDSbYzR042/7qRcg8rn+lXrSPenh724+Vh1Wik9vHcR7XHI6H0qtDA0UpUnP96qVFh2S42yr5l6OvWpFhWQYlAkHbcvSpCgOMinDpStORGkCx/ISB6U5owRleD60+lU6aAuU4ddp7eh+9CtVtobxT4sZVwOHXr9/WjEkqoQrrlTVC8UKNyHIPY9RV8p6msxDJNZTAhyCp4YVqdN1WO7QK52yDqOx+lArqESsexqrDK9rN34qvrGf81uc0qHWGoCdACcn1NEc1NjeXSpUqVJRUqVKgFSpUhjPNAVrxA8Z+lYf4hQokqjnynitvdNnisP8RTKDOc9ARST1Qu3d7XUJWBIy6uP/v2qDVNIDa0sluMW1/5unyN+YfY1zULrwdQXupQbh96M2F3HOiwHaQ/ysfyvj+4q+fWFnrR2FkIfhpLZMYKd+4FC721SK2RRkGRuaNQOZbGKNQcxLtYehoVqRZ5EgUHcSAPvTVmxl7jSYXvZHlPLBSBngD1q4GgtGREYtu6AZ6D+1XNVnSz1eJYnC+Inh9M7sVy+0lHtRdQ7hIuPFUjDLj27rUqkRJeSQxeMHKkkgEDk57VALkNcjcd20+Zd3JFMjSaQBSuCOOvB+lTmwdAZGUbiMZxzSsEKRNtyI0ctFwyMfQ0VgtJZ3RD9KFWaPJKqHnB4rdWmn+C0cjdcZpKkO02y/CR4PHpV6lSoWVcwK7SphylSpVNBUqVKpCK4gFxHtLFWHysOoNCm8cSeDcAFl6MOjD1o1UNxGsigMpJ7EdqqUgO5snZMpyP1FUgqu3hTDBHRqOjKPscYI/WuzWEV2nPDdmFWzvOh9pE1s4QnhuhozHK6+V159aEGKS2PhTcr2arlre+GRFMcr0V/SnRJgp2pU1enXI7U6paFSpUqDKuHpXaaxwtAD7qTa+T0xXnvxFJmGU+4/rW61Rio+1ec/ETnaV9Sc0X4z6vobHK17JDvbBxsZvX0NT2sklrdNBJkc7SB6+tQWIQoY3DDxMAYHIrSx6XFPHG77TKFALEcmnE1qPhy9N5Ztu5uYxh//UHY/X1q6LBWuWvZGy4HlUDgVl9MkOmX6SBiADg1r70Fbdpk9Muop0+LrJ3NuLj4n05WGRvbOa1F3polizF5ZFGUPv6Vlby4KX1vcRnzKdwrWaXqCXsO7ow4Zc9KFSxmzZm2uoLkpiKR9kiH/wAbd/tR2fTAbZsKORT9Wtg6EAALLyfZh3q9a/vbWMt1ChT9RStOTGPmtRp94spBC9RxnJ9K19hd/jLcOU2MOCKiv7GO6hK7RkVX0uX8P/0zKwBbCn0NSoXzikTmuUqQKu0qVOBylSpUqCpUqVLAVRyDK5zUlQyxsFLJz7UQB11BHI3lcxSe58prtqgXyS71b1DnB+hqXfHJlJF5rqWZUZicsv8AC1aSoxYMBMe0kyL2D81RmtGjz5SFq7E7x+VlOP54qwSCMYparAu1vGtz4cmTH2PdaKhgwBBBB6Gq01nHKCVAVqorPJp8hRwWj9PT3FE9L4L5rtRRzJNGHjYMDUinIpKjtMlO1CfSn1XuJVVCp70EDatOCv8AWvOfiZgszbTkYLCtzq88YTv3zXnWvXMDGVsnAGCf8U+mX9X7c2Zuwm8DhAhJ4rQXFnPa48p6dcdayliZ7LWoUEKyFZ1jYsuduSOa9pltIJ4jHLGHU9jT+CT9nnW6WVsBSD2zW2uGMmkwzOpRvDBYrztOO/qKm/ZFkq4aJWUdN3b7065gdIils6xuRgK/Kt7UbpznI87nDxz4LZA6EGr9tPNBPHcQHlagvrOa2nME8RRhyAf7V3TpDDNskHlNXnjLm++tlDexahZFhhZFxlau2ODb/c0CtI0lWUI+11QsMfSr3w5fi8scH/uBjn3qLHRKLYBqu0SpLkdzmrOKjmHAP2qMUkUkjNdqOFi0Sk9cc1JTBVGZo9zLuyV6+1QXc7DMMTYfGWb+Ef5oZEJWcKucE1Umsfy/k/TnYNpIHzin1VtHUvIgOSpANWqVP8XV64lpVyu0qTVyu0qVAV57VJeejeopkCSRnB5qxJnHFRxyAybc80gl5pYrtKlQ5jFRT28dzGVYDPY1NUDM8cpA5U859KJQDs8+lT8DKE8j1onBeJNH4sZzgZZK7OIrmMpJ/P0rOzC4026JjJC9iK0jO3GqMqmMMhBDDIIodeS4BodaavtfbJgRue35TUuoS4jLA54pyJvWs3rd0FV2Y4ABrznW5QItueWNa7XrkkbP4uTWA1e48W7wPyDFT0XM/rapq7SfFNlIsKQzTEJNEqkD5gB17969ggm3Yjk8sgHT1ryC4tvE+Pl2kLtkjOT9q9ee2Mm1pZCXXoV4xR1404+JmUMCrDIPBBrI6619BcpbrNgA5h3thXH8Oex9DWpM/gnEx+jdjQr4ktlutPaTG5VUncvb3qZ9Pr4yj6wb3bDeEq0ZwrnoD3Vh+U+/Q06VCqE48wrPSmW5UzLlLu3+dSPnX196u2GqMssa3SkRtwQe4/2nsfY8VtOnPY0OlXaWIM9w+d0T4HXkjirmjK0Wm/iYeAz7lI7eooBq1rNaWjtF51lw0LgcMpP9u9Ffha9CK2nTtlJvl9mpVpxa19pdLdQhhw2ORT7jPgOR1AzQeJ2sSrnOFba30oyrb19c1DXTYyGQOvQ84pTSiKIsevYeprqIIwQOnaql2+Z4FAJy9Iz47fZAQx3SSHc7eppRwbMkDmrG3JpszrbW8kzfLGhY/YU5WXXG/VDSMtPeP+USlQfpRWhHw2H/AGZ4kgw0kjOQffmi9LdXJkwqVKlTUVKlSoBknyUKu7xLWZGLc56Va1a/jsbNpHbB9KwsmovqVwWzkdsUiteixyLNEsinIYZp1UtIR4tNiR+uKu0qHCMioyroDgb89u9S0qUMNeQBty8D8ynqKrXcQuYiob6UUu7ZLhCM7X7MOooIWmt3aGT505Hoy+orWM6ATpJBK0bgqw/Wl+0WMBhdicdDRS9jhv4OSFkX5WrJ6iZYFyCQ6nqKGFgd8QTLH+8bspNYB5GklZ26sc1ofiPUTIwQgefg+1Zs+Y8VHTbn49VfTLib4ohundBi4iDDHzDIr1YY7V5rpN2b7UbKTaCJXVmx+UivSl+UGn0fHw2WJJ4mjkXcrDBFYb4nTUtChk8GSSWzlBHDfKD2I/vW7yM471lfju5WPSnjzyynj7Uorr48xl1JoZY3idsx8Dd1x6H1o3A8d/ZK7Lw/b0NZM5lbB6joaJ6Pctb7oW/+I9TVMWxtrmG30R7W8eQ2hdQJActCx6Eeo9RQqWLU9OvFkGJFzujlTlXA6Ef4pv41LrQ76HpKu2RU7naef0Nd+GtSYiS0lw8LDyhuQD6fenRPHo8N5bapZAhlDTxbwO+e/wCtN0e7e4gTJwqcEnvWZsTBcxC3JeHwZvmQ/KGHT+Yovo1kSkpiPiCJ+MttyPpSaStFM4WPOeM4pyIoUHAzVYnElurDq3I98VbqWpYoN8Vagtho7KV3vOwjVQevrRqsfrLftf4ghtwcxwNgeme5oS0mloyadDuGGZdxH1q3XFUIgUdAMCuikHaaxYDKru9s06lTNB+LhDbXfw3/AIX4qveatbWkRZnBIHrVqe3huYzHNGrqexrL6z8DreZa0vJov/TY5Wgqy2va9Lq10Yo3/d5xnPWjnwtopfbKwyinqR1paR8APBc+Lezq6L0VR1rbQwR28QjjUKoGABQUhygKoA6Cu0q4WAqcU7XCcCmPMiLuZgoHcnFUl1SG5mMcB8QL1YdKchats1CtYjLQ+MhxJFyDV7eaq3hDQsp7jFaJtZR7nbuJPJOazus6ssR8pA2jzE81a1e7EAljB8xJA9h61hNYvC4MYY89aVuMpFjUY0uYjLnIbkMO1AWXacelXtOvChFu5yp6Z7U3UbQxv4y8xt6djWbSR6P8Gf8A78bHoHIH8q9VhOYV+leU/D37nULnZwIpQwr1W3ObdCO4q6X43HJWeI9mJU/y4rzr/VEtElu6kjlu/tXo0vzwjvvz+hrGf6mwK2gu2AWHI4qY0ryK1vN74fhu3vRK2lYXCMvzA8VnQxVsg4INaPQpIXvIXucFPzYp6z65TStJHKzqWTJJBHFS6dKscVxlzuYLt577qMXkQks7jYoe28ItGR1D9sfWsyjFXKEFWHUHgihLaabclLe9lbI3hWX6DvWh+H9VSKzcgF2lIIxXnthPdXBFlBuZpvLgcketel6f8Nvptoi5DyBRn/bT1fP0bjbxChZSGBzzVsdKF20V3u3vk47e1EI5QUJY7SOuaTWqur3y2Fi8hbDEYUeprM/DObnWN55CAkn3qn8Sa4txqIQ5WFcrG3bNFfg6I7Jbn+Lihnb61lcpu8+1IN60VR1Kubh3qGa9t7dSZJAuPU0soT12g8nxJZocbxmoJvi7Tol5dt3oAKoD9VLvUra0UmVwMVkdT+OUjhJgYE9gDk1lrqbVNZkBmcwxHnaTyaMK9NlqHx/ptqzLG3iMOw5rPXX+pcrE+DblT7ms1eWMUcnhxMXYdSe1TafoDTSB5cque/U0sTo1YX+s/E9yHuJ2jtlOdiHAPt71vLC1S2t1RQAcc0G0i1itYQiLgCjkb4UVcLUzHCmhWoXWxSM1dllwKzXxBfrBA7nsKE2sN8SXIW7lbdxmsbPKZpCxPWiGs3rT3DKDnBOfrQus7VSOdOQaKWdwtxCYZAGYDBH8QoSzYOKmswxuIzGMtnpUrx6xoYjNxqBJGWIx+tejaVMJ9OhcfwgGvItK1JYblgW4kOCfQ16DoGrJb2cglICIRWv1lxcrR43TD/YP61l/jyI3GltEmCdrH+VG7O8E0fidGkO4j+n6UJ+MbVbrRXPR15BFLGtvjwcW8jysuACD3q7ZpJbnrg57VYv7ZRMD07giubfKDU0taHQfiI2F6pvn8SAAFVIwAftTNfv0+INQi/Ztq8kqhi3hpkkdhx6VnLtC9vleoP8AOjvwVcXVjqDQ2a5luU8PPpzShY1f+nOgyNctqVwuFj8qKRzuHWvSKqaXYpp9hHAgxgc+5q5VLhVl9V1RzBOkT7GmZlUjqoHGaP6hc/g9PuLnH/ajZv5CvIbn4kunl8RACm3AyvfPJoKrLOblJLG4I8aPo38Xoa2fwS+dJ2H5lbmvMLnVZJryO6KKjx9SCea1fw58YWtmzxy28oEmOVIODRqI9GdsZAoZd3GpQgmEROPRhXbbWrO7TKsyezjFOluIGHEi/wA6qC3WU1b4g+JVVkitETH5lbNY+91DWp3PjyzAnsMivTLkRSIfMp+9CLmGPqFHWnglxg4zcqMyI5HqSauJdWoQB7Tcw6ktWl8FG4IGKUukWp53RN3+Wlh6ARanFbNuisow3YkA4/SnrPe33QBEJ5I4/wCaLw2NmrHxEQDHGBXdkcfCAcdzTK2KEFlHFzgsfU1fgcIwHrVe4vIoV5bJ7Adafp4e5ZZNpAPakWtDZEnBzxRNXOOtUbOLamSKtEjFUlHdShIyxPavN/jDWeDCjdDz9e1a34g1VbW2cnrjAFeRape/jbsnJIz/ADNT1RzNqo2ZDuJ604Rbbd526LwB6mueG+VA/N0qzfp4UEEA54LN7ms2oaFLHPSrMBZW2RZ3Nxx3qHp0q1YjY7XDDiIce5oxWtJp8MlwzCMFmGfKO4rUWV1KPxFueFUrmsXp92Ib2PBbysC2K011v/ZC3tvLkyTbmA4K4qpWFmNfpupsHRCeCQKJa7N/0DrndkVkNDvVnMbv1VgHArUXkkV5C4U4BHSqVrAarpsSWUUqk7icH60GeJlHA4o5rDkTmA8CP9TQ9RkEdainKHMpZcCvQ/8ATfQQA+oyryeEyOgrFw2TT3KRrjLsAK9q0S0Sy0uGBABtQUouQRpVykSFBNUoD+L7gRfD12m8IWjIzXiUkhtyQG346ivQ/wDUa/YWqwq/zsMj2rys3ZEz5HA4FTan6uyXkRgLjn270c+HXgmkj3IjEjjd1rGt154NXLC/e0ZQOgPBHakMez2lnC8Ckwxj6E/5qZrCPHES/wD9sKzPwx8URTotvcMFkHTP5q2CSLKgZTWsrOwNlt0jBzbMT6iQ4qo7RsMeGV/+WaPMoYYqCSzifqoqk4z8pij6Mc+9QtMD0IP3ozPaLjaQCPpQu50e1lcZiBY+nekm3PTYoZJsFNpPpuGaqarMsCmC4cK+PlQjP6UReyj0WA7FX8Q/Y8lKxl3OzyMzkszHkk0M+er10IaTYQ6mzg3Do6t0xkEVq4LOWyUZRXUd0/xWP+H0nN9vgbBAyc9/atlDqDqQkgKn0ojfrxft7mKRPK446+1K7mEcBOeD3qpcpFcr4iHw5ezDv9fWsxrOtS2sMttKpWTHBB4x60I3QD4w1vxpmijbpkA/1rHDqKnupmuJmkY9TwKksLVrqYDGFB5NZW7W0mQ6QGKKAkYYAn9akvVZo45DzgYNFJNPW5bkfIMCqU8OUMYPTjmg9DoLVp5AAM/2q/cQBVjtIhnAy1OtpFgQxgr4ijnNcSSNCzK+6Q8s+aQV7JsOXJ6VoLG+bwlt2J8LJ3Ae/f7VlFOKMWVwA4f7EUQu540UdwtrcpIhwpGJAOn1/vWptrwNEDkYxWLguQqyK8aurrj3X3FFbGZktFLSKRg4wa0lZwy/t5Lq+ndOiLubNUzG0UaO2MSDK1x9YuE8VVI2ycHIqrLfPJFHG2MRg4pWrkENOkC6nAcjh69Ysr9WtkOR0FeKxXBEqsDgg5r0TTr4fhEO7qM1MXbjZi6QrnNUdR1NLeFmZ+nYd6BSau0aYBFZ3XdVlltyA3JOKrFSh3xHI+prNfb8iCQJt9j3/nWNntWaQupHmOcUXl1CRbSS1BAWRgW+1VFy4AHJqU3xTMMpXBZW4wMjkVEtuzIWzgjsRV5/IcEVJuQry2KRSoIpGwskbYNa7QPiya1AjuGLJ03elY5VCzsqEbW5FW0Uouc0S4Hr1jrFtexq0brz71d3rtzkV43ZajcWc+6KTBNek/D8tzf2iSXA2IRyM9a15uowU2NcHC4C9z6/SoZkW0m3k8qvkx2PvRCRlgjyMDA4oFfXIdiS3P1qis2YoahMZS5zuY+veshdR7ZWTcGIPJHTNF9WvvDJiibznkkdhQ/TbX8XdBT8q8tmlfUc8Tkf+GbPwIPFdcM/IJ9KMXSK8ee46GooiI1GMAAetMmuAFPPFEK+qs12LeNmdsBRzXnnxHrD3t0yqeOhweg9KK/E2rlXaONu+AKycSNOxJPuSajqtOZ/TI0LkKO9HrJBBEFHXuaEv4ce0Rglh1Jq5b3e5OTg9xUtfrS2NmTGtwWHhc8+9ZXU5SL51Q+UHjFG4b1zYiD8u7Oaz+oDbdtTRPKdOnirFMxC7hhjVaaVfljBCD16mpJHJtYgTxk1XODxUqj/2Q==" alt="avt" decoding="async">
            </div>
            <div class="info-name">Ngduyanh</div>
            <div class="info-sub">https://discord.gg/mVq4ytdyD3</div>
            <a class="kh-join-btn info-join-btn" href="https://discord.gg/mVq4ytdyD3" target="_blank" rel="noopener noreferrer" style="margin-top:12px;max-width:240px;">discord Join Server</a>
            <div class="kh-hint" style="margin-top:8px;text-align:center;">Vào server · gõ <b>*getkey</b> lấy key 24h</div>
            <div id="kh-client-ip" class="kh-hint" style="margin-top:6px;text-align:center;color:#a78bfa;">IP: …</div>
        </div>

        <!-- TOKEN section moved here -->
        <div class="kh-sep"></div>
        <div class="kh-section-title sec-token">🔑 DISCORD TOKEN</div>
        <div class="kh-hint" style="color:#888;margin-bottom:10px;">Lấy token hiện tại hoặc đăng nhập bằng token khác.</div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>Token</span></div>
            <div id="token-display" style="background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.25);padding:10px;font-family:'Share Tech Mono',monospace;font-size:11px;color:#c4b5fd;word-break:break-all;max-height:100px;overflow-y:auto;user-select:text;line-height:1.45;border-radius:10px;">Chưa có token...</div>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:12px;">
            <button id="token-get" class="set-btn set-save">🔍 GET TOKEN</button>
            <button id="token-copy" class="set-btn set-save">📋 COPY</button>
        </div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>👁 Hiện token đầy đủ</span></div>
            <input type="checkbox" id="token-show" style="width:auto;">
        </div>
        <div class="kh-sep"></div>
        <div class="kh-section-title" style="color:#ff8800;font-size:10px;font-weight:700;margin-bottom:10px;">🔐 LOGIN TOKEN</div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>Dán token mới</span></div>
            <input type="text" id="token-input" class="set-input" placeholder="Dán token tại đây..." style="font-size:10px;">
        </div>
        <div class="kh-hint" style="color:#666;">💡 Token có hoặc không có dấu nháy đều nhận. Sau khi login sẽ tự reload trang.</div>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="token-login" class="set-btn set-save">▶ LOGIN</button>
            <button id="token-logout" class="set-btn set-default">⏏ LOGOUT</button>
        </div>
        <div id="token-msg" style="text-align:center;font-size:10px;margin-top:10px;font-family:'Share Tech Mono',monospace;opacity:0;transition:opacity .3s;">OK</div>
    </div>

    <div class="tab-panel" id="tab-channel" style="display:none">
        <div class="kh-section-title sec-channel">🎛 CHANNEL CONTROL</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⚖ Balance</span><span id="lb-balance">50%</span></div><input type="range" class="channel-slider" id="sl-balance" min="0" max="1" step="0.01" value="0.5" style="--v:50%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>↔ Pan</span><span id="lb-pan">0%</span></div><input type="range" class="channel-slider" id="sl-pan" min="-1" max="1" step="0.01" value="0" style="--v:50%"></div>
        <div class="kh-sep"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="btn-mute-left" class="channel-btn">🔇 Mute L</button>
            <button id="btn-mute-right" class="channel-btn">🔇 Mute R</button>
            <button id="btn-solo-left" class="channel-btn">🎧 Solo L</button>
            <button id="btn-solo-right" class="channel-btn">🎧 Solo R</button>
        </div>
    </div>

    <div class="tab-panel" id="tab-settings" style="display:none">
        <div class="kh-section-title sec-settings">🔐 LICENSE KEY</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Status</span><span id="kh-key-status">—</span></div></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Đổi key</span></div>
        <input type="text" id="kh-key-change" class="set-input" placeholder="Nhập key mới..." autocomplete="off"></div>
        <div style="display:flex;gap:6px;margin-bottom:10px;">
            <button id="kh-key-apply" class="set-btn set-save" style="flex:1;">✓ APPLY KEY</button>
            <button id="kh-key-lock" class="set-btn set-default" style="flex:1;">🔒 LOCK</button>
        </div>
        <div id="kh-key-set-msg" style="text-align:center;font-size:10px;color:#a78bfa;margin-bottom:8px;font-family:'Share Tech Mono',monospace;min-height:14px;"></div>
        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings">🏷 CUSTOMIZE LABELS</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Name</span></div><input type="text" id="set-appname" class="set-input" maxlength="24" placeholder="LUCAC"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tag</span></div><input type="text" id="set-tag" class="set-input" maxlength="12" placeholder="LIMITED"></div>
        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings" style="margin-bottom:8px;">NAME TAB</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 1</span></div><input type="text" id="set-tabmain" class="set-input" maxlength="14" placeholder="GAIN"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 2</span></div><input type="text" id="set-tabvoice" class="set-input" maxlength="14" placeholder="VOICE"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 3</span></div><input type="text" id="set-tabeq" class="set-input" maxlength="14" placeholder="EQ"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 4</span></div><input type="text" id="set-tabmusic" class="set-input" maxlength="14" placeholder="TRACK"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 5 (Media)</span></div><input type="text" id="set-tabmedia" class="set-input" maxlength="14" placeholder="CONFIG"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 6</span></div><input type="text" id="set-tabinfo" class="set-input" maxlength="14" placeholder="BIO"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 7</span></div><input type="text" id="set-tabchannel" class="set-input" maxlength="14" placeholder="CHANNEL"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 8</span></div><input type="text" id="set-tabsettings" class="set-input" maxlength="14" placeholder="⚙ SETTINGS"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 9 (FixLag)</span></div><input type="text" id="set-tabfixlag" class="set-input" maxlength="14" placeholder="⚡"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 10 (FakeCam)</span></div><input type="text" id="set-tabfakecam" class="set-input" maxlength="14" placeholder="📷"></div>

        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings">🎨 INTERFACE</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>GUI background color</span></div><input type="color" id="set-bg" value="#110005"></div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>GUI primary color</span></div>
            <div style="display:flex;align-items:center;gap:8px;width:100%;">
                <input type="color" id="set-accent" value="#ff0055" style="flex:1;">
                <label style="font-size:11px;font-weight:600;color:#666;white-space:nowrap;display:flex;align-items:center;gap:4px;">
                    <input type="checkbox" id="set-rainbow-theme"> 🌈
                </label>
            </div>
        </div>
        <div class="kh-row"><div class="kh-rowlabel"><span>GUI border color</span></div><input type="color" id="set-border" value="#ff0055"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Text color</span></div><input type="color" id="set-text" value="#ffffff"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Text border color</span></div><input type="color" id="set-textborder" value="#ff0055"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Text clarity</span><span id="lb-textopacity">100%</span></div><input type="range" id="set-textopacity" min="0" max="1" step="0.05" value="1" style="--v:100%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>◻ Rounded corners</span><span id="lb-radius">0px</span></div><input type="range" id="set-radius" min="0" max="30" step="1" value="0" style="--v:0%"></div>

        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings">🖼 BACKGROUND MEDIA</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Background type</span></div>
            <select id="set-bg-type" class="set-input" style="width:100%;">
                <option value="none">None (color only)</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
            </select>
        </div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Select file</span></div><input type="file" id="bg-file-upload" accept="image/*,video/*" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.25);color:#e9d5ff;padding:8px;font-size:11px;box-sizing:border-box;border-radius:10px;"></div>
        <div class="kh-row"><button id="bg-reset" class="set-btn set-default">↺ Reset background</button></div>
        <div class="kh-hint" style="margin-bottom:10px;">Supported: PNG, JPG, GIF, MP4, WEBM.</div>

        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings">✨ BACKGROUND EFFECT</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Effect type</span></div>
            <select id="effect-type" class="set-input" style="width:100%;">
                <option value="meteor">☄ Bolide</option>
                <option value="sakura">🌸 Cherry blossom</option>
                <option value="snow">❄ Snowflake</option>
                <option value="fire">🔥 Fire</option>
                <option value="lightning">⚡ Lightning</option>
                <option value="rain">🌧 Rain</option>
                <option value="firefly">✨ Firefly</option>
            </select>
        </div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>Color</span></div>
            <div style="display:flex;align-items:center;gap:8px;width:100%;">
                <input type="color" id="effect-color" value="#ff0055" style="flex:1;">
                <label style="font-size:11px;font-weight:600;color:#666;white-space:nowrap;display:flex;align-items:center;gap:4px;">
                    <input type="checkbox" id="effect-rainbow"> 🌈
                </label>
            </div>
        </div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Quantity</span><span id="lb-effect-count">20</span></div><input type="range" id="effect-count" min="5" max="50" step="1" value="20" style="--v:33.3%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Transparency</span><span id="lb-effect-opacity">50%</span></div><input type="range" id="effect-opacity" min="0" max="1" step="0.05" value="0.5" style="--v:50%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⚡ Falling speed</span><span id="lb-effect-speed">1.0x</span></div><input type="range" id="effect-speed" min="0.1" max="3" step="0.1" value="1" style="--v:33.3%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📏 Size</span><span id="lb-effect-scale">1.0x</span></div><input type="range" id="effect-scale" min="0.3" max="3" step="0.1" value="1" style="--v:25.9%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔁 Auto-loop</span></div><input type="checkbox" id="effect-auto" style="width:auto;margin:0;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⏱ Distance (second)</span><span id="lb-effect-interval">5s</span></div><input type="range" id="effect-interval" min="2" max="20" step="1" value="5" style="--v:20%"></div>

        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings">🖼 ICON</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Select a photo (small)</span></div><input type="file" id="icon-upload" accept="image/*" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.25);color:#e9d5ff;padding:8px;font-size:11px;box-sizing:border-box;border-radius:10px;"></div>
        <div class="kh-row"><button id="icon-reset" class="set-btn set-default">↺ Reset to default settings</button></div>

        <div class="kh-sep"></div>
        <div style="display:flex;gap:6px;">
            <button id="set-save" class="set-btn set-save">💾 SAVE</button>
            <button id="set-default" class="set-btn set-default">↺ DEFAULT</button>
        </div>
        <div id="set-saved-msg" style="text-align:center;font-size:10px;color:#0f0;margin-top:8px;font-family:'Share Tech Mono',monospace;opacity:0;transition:opacity .3s;">✓ Đã lưu!</div>
    </div>

    <div class="tab-panel" id="tab-fixlag" style="display:none">
        <div class="kh-section-title sec-fixlag">⚡ FIXLAG OPTIMIZER</div>
        <div class="kh-hint" style="color:#888;margin-bottom:10px;">Bật càng nhiều càng đỡ lag. Tắt để hoàn tác ngay.</div>

        <div class="kh-section-title" style="color:#ff8800;">🙈 HIDE ELEMENTS</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>💬 Ẩn tin nhắn / chat</span></div><input type="checkbox" class="fixlag-check" data-key="hideMessages" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔔 Ẩn thông báo</span></div><input type="checkbox" class="fixlag-check" data-key="hideNotifications" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🪟 Ẩn popup / modal / banner</span></div><input type="checkbox" class="fixlag-check" data-key="hidePopups" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📢 Ẩn quảng cáo</span></div><input type="checkbox" class="fixlag-check" data-key="hideAds" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🖼 Ẩn iframe</span></div><input type="checkbox" class="fixlag-check" data-key="hideIframes" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🖼 Ẩn ảnh & background-image</span></div><input type="checkbox" class="fixlag-check" data-key="hideImages" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🎬 Ẩn video / player</span></div><input type="checkbox" class="fixlag-check" data-key="hideVideos" style="width:auto;"></div>

        <div class="kh-sep"></div>
        <div class="kh-section-title" style="color:#00e5ff;">🎨 DISABLE EFFECTS</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🎞 Tắt CSS animation</span></div><input type="checkbox" class="fixlag-check" data-key="disableAnimations" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔄 Tắt transition</span></div><input type="checkbox" class="fixlag-check" data-key="disableTransitions" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>💧 Tắt blur / filter</span></div><input type="checkbox" class="fixlag-check" data-key="disableBlur" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🌑 Tắt box-shadow / text-shadow</span></div><input type="checkbox" class="fixlag-check" data-key="disableShadows" style="width:auto;"></div>

        <div class="kh-sep"></div>
        <div class="kh-section-title" style="color:#ff0055;">⚙ SYSTEM OPTIMIZE</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⏸ Pause toàn bộ media</span></div><input type="checkbox" class="fixlag-check" data-key="pauseMedia" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🔇 Mute toàn bộ audio</span></div><input type="checkbox" class="fixlag-check" data-key="muteAudio" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>⏱ Throttle requestAnimationFrame</span></div><input type="checkbox" class="fixlag-check" data-key="throttleRAF" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📉 Giới hạn FPS</span><span id="lb-fixlag-fps">30 FPS</span></div><input type="range" id="sl-fixlag-fps" min="10" max="60" step="5" value="30" style="--v:40%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🚫 Chặn setInterval nhanh (&lt;500ms)</span></div><input type="checkbox" class="fixlag-check" data-key="stopTimers" style="width:auto;"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>💀 AGGRESSIVE MODE (cực mạnh)</span></div><input type="checkbox" class="fixlag-check" data-key="aggressive" style="width:auto;"></div>
        <div class="kh-hint" style="color:#ff5555;">⚠️ Aggressive sẽ ẩn video/audio/canvas/iframe và có thể phá layout.</div>

        <div class="kh-sep"></div>
        <div style="display:flex;gap:6px;">
            <button id="fixlag-restore" class="set-btn set-default">↺ RESTORE ALL</button>
            <button id="fixlag-reload" class="set-btn set-save">🔄 RELOAD PAGE</button>
        </div>
        <div id="fixlag-msg" style="text-align:center;font-size:10px;color:#0f0;margin-top:8px;font-family:'Share Tech Mono',monospace;opacity:0;transition:opacity .3s;">OK</div>
    </div>

    <div class="tab-panel" id="tab-fakecam" style="display:none">
        <div class="kh-section-title sec-fakecam">📷 FAKE CAMERA</div>
        <div class="kh-hint" style="color:#888;margin-bottom:10px;">Upload ảnh/video và nó sẽ được phát qua webcam khi trang yêu cầu camera. Reload trang sau khi bật để áp dụng cho cuộc gọi đang chạy.</div>

        <button id="fakecam-toggle" class="fakecam-toggle-btn">📷 FAKE CAMERA: OFF</button>

        <div class="kh-sep"></div>
        <div class="kh-row">
            <div class="kh-rowlabel"><span>📁 Upload file</span></div>
            <input type="file" id="fakecam-file" accept="image/*,video/*" style="width:100%;background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.25);color:#e9d5ff;padding:8px;font-size:11px;box-sizing:border-box;border-radius:10px;">
        </div>
        <div id="fakecam-info" style="font-size:10px;color:#666;font-family:'Share Tech Mono',monospace;margin-bottom:8px;">Chưa chọn file...</div>

        <div id="fakecam-preview-wrap" style="display:none;margin-bottom:10px;">
            <div class="kh-rowlabel"><span>Preview</span></div>
            <div id="fakecam-preview"></div>
        </div>

        <div class="kh-sep"></div>
        <div class="kh-section-title" style="color:#00e5ff;font-size:10px;font-weight:700;margin-bottom:10px;">🎨 RENDER OPTIONS</div>

        <div class="kh-row">
            <div class="kh-rowlabel"><span>Fit mode</span></div>
            <select id="fakecam-fit" class="set-input">
                <option value="cover">Cover (fill, crop)</option>
                <option value="contain">Contain (fit, black bars)</option>
                <option value="fill">Fill (stretch)</option>
            </select>
        </div>

        <div class="kh-row">
            <div class="kh-rowlabel"><span>Resolution</span></div>
            <select id="fakecam-res" class="set-input">
                <option value="640x480">640 × 480</option>
                <option value="1280x720" selected>1280 × 720 (HD)</option>
                <option value="1920x1080">1920 × 1080 (Full HD)</option>
            </select>
        </div>

        <div class="kh-row"><div class="kh-rowlabel"><span>🪞 Mirror (lật ngang)</span></div><input type="checkbox" id="fakecam-mirror" style="width:auto;"></div>

        <div class="kh-row">
            <div class="kh-rowlabel"><span>🎞 FPS</span><span id="lb-fakecam-fps">30 FPS</span></div>
            <input type="range" id="sl-fakecam-fps" min="5" max="60" step="1" value="30" style="--v:45%">
        </div>

        <div class="kh-sep"></div>
        <div style="display:flex;gap:6px;">
            <button id="fakecam-clear" class="set-btn set-default">🗑 Clear file</button>
        </div>
        <div class="kh-hint" style="margin-top:8px;color:#ff8800;">⚠ Sau khi bật và chọn file → **F5 reload** trang để fake camera áp dụng cho các cuộc gọi mới. Nếu đang trong cuộc gọi, hãy tắt/bật lại camera.</div>
    </div>

</div>`;
            document.body.appendChild(el);
            this.el = el;
            applyTheme();
            this.css();
            this.events();
            this.badge('WAIT', '#444');
            this.initMeteor();
            this.initVUMeter();
            applyLabels();
            applyEffectUI();
            loadIcon();
            syncFixlagUI();
            applyFixlag();
            updateFakeCamUI();

            if (THEME.rainbow || EFFECT.rainbow) startRainbow();
        },

        switchTab(tab) {
            this.currentTab = tab;
            document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-on', b.dataset.tab === tab));
            const panel = document.getElementById('tab-' + tab);
            if (panel) panel.style.display = 'block';
        },

        events() {
            document.getElementById('kh-col').onclick = (e) => {
                e.stopPropagation();
                this.setCollapsed(!this.collapsed);
            };
            // Tap Dynamic Island pill to expand
            document.getElementById('kh-head').addEventListener('click', (e) => {
                if (!this.collapsed) return;
                if (e.target && e.target.id === 'kh-col') return;
                this.setCollapsed(false);
            });

            this.setCollapsed = (collapse) => {
                this.collapsed = !!collapse;
                const root = this.el;
                if (!root) return;
                const body = document.getElementById('kh-body');
                const tabs = document.getElementById('kh-tabs');
                const vu = document.getElementById('kh-vu-container');
                const head = document.getElementById('kh-head');
                const col = document.getElementById('kh-col');
                const canvas = document.getElementById('kh-canvas-meteor');

                if (this.collapsed) {
                    root.classList.remove('kh-island-open', 'kh-island-opening');
                    root.classList.add('kh-island-closing');
                    // start morph to pill immediately
                    requestAnimationFrame(() => {
                        root.classList.add('kh-island');
                    });
                    setTimeout(() => {
                        if (!this.collapsed) return;
                        if (body) body.style.display = 'none';
                        if (tabs) tabs.style.display = 'none';
                        if (vu) vu.style.display = 'none';
                        if (canvas) canvas.style.opacity = '0';
                        root.classList.remove('kh-island-closing');
                    }, 200);
                    if (col) { col.innerText = ''; col.title = 'Mở UI'; col.classList.add('kh-col-island'); }
                } else {
                    root.classList.remove('kh-island');
                    root.classList.add('kh-island-opening');
                    if (body) body.style.display = 'block';
                    if (tabs) tabs.style.display = 'grid';
                    if (vu) vu.style.display = 'block';
                    if (canvas) canvas.style.opacity = '';
                    if (col) { col.innerText = '✕'; col.title = 'Đóng UI'; col.classList.remove('kh-col-island'); }
                    setTimeout(() => {
                        root.classList.remove('kh-island-opening');
                        root.classList.add('kh-island-open');
                    }, 320);
                }
            };

            document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => this.switchTab(b.dataset.tab));

            [['sl-pg','lb-pg','preGain',1,250000,'x',1],['sl-dr','lb-dr','drive',0,1,'%',100],['sl-cr','lb-cr','crush',0,1,'%',100],['sl-wd','lb-wd','width',0,2,'%',100],['sl-po','lb-po','postGain',1,250000,'x',0.1]].forEach(([sid,lid,param,mn,mx,unit,sc]) => {
                const sl = document.getElementById(sid);
                if (!sl) return;
                sl.oninput = () => {
                    const v = parseFloat(sl.value);
                    P[param] = v;
                    setLabel(lid, (v*sc).toFixed(sc === 100 ? 0 : 1) + unit);
                    sl.style.setProperty('--v', ((v-mn)/(mx-mn)*100).toFixed(1)+'%');
                    Core.push();
                };
            });

            const slIn = document.getElementById('sl-indb');
            const slOut = document.getElementById('sl-outdb');
            if (slIn) slIn.oninput = () => {
                const v = parseFloat(slIn.value); P.inputDb = v;
                setLabel('lb-indb', (v>0?'+':'') + v.toFixed(1) + ' dB');
                slIn.style.setProperty('--v', ((v+96)/192*100).toFixed(1)+'%');
                Core.push();
            };
            if (slOut) slOut.oninput = () => {
                const v = parseFloat(slOut.value); P.outputDb = v;
                setLabel('lb-outdb', (v>0?'+':'') + v.toFixed(1) + ' dB');
                slOut.style.setProperty('--v', ((v+96)/192*100).toFixed(1)+'%');
                Core.push();
            };
            document.getElementById('db-reset').onclick = () => {
                P.inputDb = 0; P.outputDb = 0;
                if (slIn) { slIn.value = 0; slIn.style.setProperty('--v','50%'); }
                if (slOut) { slOut.value = 0; slOut.style.setProperty('--v','50%'); }
                setLabel('lb-indb','0.0 dB'); setLabel('lb-outdb','0.0 dB');
                Core.push();
            };
            document.getElementById('db-auto').onclick = () => {
                P.inputDb = 6; P.outputDb = 6;
                if (slIn) { slIn.value = 6; slIn.style.setProperty('--v',((6+96)/192*100)+'%'); }
                if (slOut) { slOut.value = 6; slOut.style.setProperty('--v',((6+96)/192*100)+'%'); }
                setLabel('lb-indb','+6.0 dB'); setLabel('lb-outdb','+6.0 dB');
                Core.push();
            };

            const slLoud = document.getElementById('sl-loud');
            if (slLoud) slLoud.oninput = () => {
                const v = parseFloat(slLoud.value); P.loudness = v;
                setLabel('lb-loud', Math.round(v*100)+'%');
                slLoud.style.setProperty('--v', (v*100).toFixed(1)+'%');
                Core.push();
            };
            const slFboost = document.getElementById('sl-fboost');
            if (slFboost) slFboost.oninput = () => {
                const v = parseFloat(slFboost.value); P.finalBoost = v;
                setLabel('lb-fboost', v.toFixed(1)+'x');
                slFboost.style.setProperty('--v', ((v-1)/99*100).toFixed(1)+'%');
                Core.push();
            };
            const applyLoudPreset = (loud, boost) => {
                P.loudness = loud; P.finalBoost = boost;
                if (slLoud) { slLoud.value = loud; slLoud.style.setProperty('--v', (loud*100)+'%'); }
                if (slFboost) { slFboost.value = boost; slFboost.style.setProperty('--v', ((boost-1)/99*100)+'%'); }
                setLabel('lb-loud', Math.round(loud*100)+'%');
                setLabel('lb-fboost', boost.toFixed(1)+'x');
                Core.push();
            };
            const bMild = document.getElementById('loud-mild');
            if (bMild) bMild.onclick = () => applyLoudPreset(0.35, 3);
            const bHard = document.getElementById('loud-hard');
            if (bHard) bHard.onclick = () => applyLoudPreset(0.7, 12);
            const bNuke = document.getElementById('loud-nuke');
            if (bNuke) bNuke.onclick = () => applyLoudPreset(1.0, 40);

            [['sl-vp','lb-vp','voicePitch',0.4,2.5,'x',100],['sl-vf','lb-vf','voiceFormant',0.3,2.0,'x',100],['sl-vm','lb-vm','voiceMix',0,1,'%',100]].forEach(([sid,lid,param,mn,mx,unit,sc]) => {
                const sl = document.getElementById(sid);
                if (!sl) return;
                sl.oninput = () => {
                    const v = parseFloat(sl.value); P[param] = v;
                    setLabel(lid, (v*sc).toFixed(sc === 100 ? 0 : 2) + unit);
                    sl.style.setProperty('--v', ((v-mn)/(mx-mn)*100).toFixed(1)+'%');
                    Core.push();
                    document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('vp-on'));
                    const st = document.getElementById('kh-voice-status');
                    if (st) { st.innerText = '🎚 COUPLING'; st.style.color = '#ff0055'; }
                };
            });

            document.querySelectorAll('.vp-btn').forEach(b => b.onclick = () => applyVoicePreset(b.dataset.vp));

            document.getElementById('at-toggle').onclick = () => {
                P.autotuneOn = P.autotuneOn ? 0 : 1;
                Core.push(); syncUI();
            };
            const slAt = document.getElementById('sl-at-speed');
            if (slAt) slAt.oninput = () => {
                const v = parseFloat(slAt.value); P.autotuneSpeed = v;
                setLabel('lb-at-speed', (v*100).toFixed(0)+'%');
                slAt.style.setProperty('--v', (v*100).toFixed(1)+'%');
                Core.push();
            };
            document.querySelectorAll('.at-scale-btn').forEach(b => b.onclick = () => {
                P.autotuneScale = parseInt(b.dataset.sc);
                document.querySelectorAll('.at-scale-btn').forEach(x => x.classList.remove('at-scale-on'));
                b.classList.add('at-scale-on');
                Core.push();
            });

            [['sl-eqb','lb-eqb','eqBass'],['sl-eqm','lb-eqm','eqMid'],['sl-eqt','lb-eqt','eqTreble']].forEach(([sid,lid,param]) => {
                const sl = document.getElementById(sid);
                if (!sl) return;
                sl.oninput = () => {
                    const v = parseFloat(sl.value); P[param] = v;
                    setLabel(lid, (v>0?'+':'') + v.toFixed(1) + ' dB');
                    sl.style.setProperty('--v', ((v+12)/24*100).toFixed(1)+'%');
                    Core.push();
                };
            });

            document.getElementById('ng-toggle').onclick = () => { P.noiseGateOn = P.noiseGateOn ? 0 : 1; Core.push(); syncUI(); };
            const slNg = document.getElementById('sl-ng-thresh');
            if (slNg) slNg.oninput = () => {
                const v = parseFloat(slNg.value); P.noiseGateThreshold = v;
                setLabel('lb-ng-thresh', (v*100).toFixed(1)+'%');
                slNg.style.setProperty('--v', ((v)/0.3*100).toFixed(1)+'%');
                Core.push();
            };

            document.getElementById('god-toggle').onclick = () => { P.godMode = P.godMode ? 0 : 1; Core.push(); syncUI(); };
            document.getElementById('sat-toggle').onclick = function() {
                P.satMode = P.satMode ? 0 : 1;
                Core.push(); syncUI();
            };

            const fileInp = document.getElementById('audio-file-input');
            document.getElementById('btn-select-file').onclick = () => fileInp.click();
            fileInp.onchange = e => { if (e.target.files[0]) Core.playAudioFile(e.target.files[0]); };
            document.getElementById('btn-stop-file').onclick = () => Core.stopAudioFile();
            const slM = document.getElementById('sl-music-vol');
            if (slM) slM.oninput = () => {
                const v = parseFloat(slM.value); P.musicVol = v;
                setLabel('lb-music-vol', v <= 1 ? (v*100).toFixed(0)+'%' : v.toFixed(2)+'x');
                slM.style.setProperty('--v', (v/5*100).toFixed(1)+'%');
                if (_musicGainNode) _musicGainNode.gain.setValueAtTime(v, _ctx.currentTime);
            };

            document.querySelectorAll('.kp-btn').forEach(b => b.onclick = () => applyPreset(b.dataset.k));
            document.getElementById('kh-rst').onclick = () => {
                applyPreset('CLEAN'); P.loudness=0; P.finalBoost=1; Core.stopAudioFile();
                document.querySelectorAll('.kp-btn').forEach(b => b.classList.remove('kp-on'));
            };
            document.getElementById('kh-voice-rst').onclick = () => {
                applyVoicePreset('NORMAL');
                P.autotuneOn = 0; P.autotuneSpeed = 0.3; P.autotuneScale = 0;
                P.reverbMix = 0; P.reverbDecay = 0.5; P.reverbDelay = 0.08; P.reverbGain = 1;
                ECHO.mix = 0; ECHO.time = 0.3; ECHO.feedback = 0.35; ECHO.gain = 1;
                Core.push(); syncUI();
                document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('vp-on'));
                const nb = document.querySelector('.vp-btn[data-vp="NORMAL"]');
                if (nb) nb.classList.add('vp-on');
                const st = document.getElementById('kh-voice-status');
                if (st) { st.innerText = '🎤 NORMAL'; st.style.color = '#555'; }
            };

            const slBal = document.getElementById('sl-balance');
            if (slBal) slBal.oninput = function() {
                P.balance = parseFloat(this.value);
                setLabel('lb-balance', Math.round(P.balance*100)+'%');
                this.style.setProperty('--v', P.balance*100 + '%');
                Core.push();
            };
            const slPan = document.getElementById('sl-pan');
            if (slPan) slPan.oninput = function() {
                P.pan = parseFloat(this.value);
                setLabel('lb-pan', Math.round(P.pan*100)+'%');
                this.style.setProperty('--v', ((P.pan+1)/2*100) + '%');
                Core.push();
            };
            const bml = document.getElementById('btn-mute-left');
            if (bml) bml.onclick = function() { P.muteLeft = !P.muteLeft; this.classList.toggle('channel-on', P.muteLeft); Core.push(); };
            const bmr = document.getElementById('btn-mute-right');
            if (bmr) bmr.onclick = function() { P.muteRight = !P.muteRight; this.classList.toggle('channel-on', P.muteRight); Core.push(); };
            const bsl = document.getElementById('btn-solo-left');
            if (bsl) bsl.onclick = function() {
                P.soloLeft = !P.soloLeft;
                this.classList.toggle('channel-on', P.soloLeft);
                if (P.soloLeft) { P.soloRight = false; document.getElementById('btn-solo-right').classList.remove('channel-on'); }
                Core.push();
            };
            const bsr = document.getElementById('btn-solo-right');
            if (bsr) bsr.onclick = function() {
                P.soloRight = !P.soloRight;
                this.classList.toggle('channel-on', P.soloRight);
                if (P.soloRight) { P.soloLeft = false; document.getElementById('btn-solo-left').classList.remove('channel-on'); }
                Core.push();
            };

            [['sl-rvb-mix','lb-rvb-mix','reverbMix',0,1,'%',100],['sl-rvb-decay','lb-rvb-decay','reverbDecay',0,0.99,'%',100]].forEach(([sid,lid,param,mn,mx,unit,sc]) => {
                const sl = document.getElementById(sid);
                if (!sl) return;
                sl.oninput = () => {
                    const v = parseFloat(sl.value); P[param] = v;
                    setLabel(lid, Math.round(v*sc) + unit);
                    sl.style.setProperty('--v', ((v-mn)/(mx-mn)*100).toFixed(1)+'%');
                    Core.push();
                };
            });
            const slRvbD = document.getElementById('sl-rvb-delay');
            if (slRvbD) slRvbD.oninput = () => {
                const v = parseFloat(slRvbD.value); P.reverbDelay = v;
                setLabel('lb-rvb-delay', v.toFixed(2)+'s');
                slRvbD.style.setProperty('--v', ((v-0.01)/0.59*100).toFixed(1)+'%');
                Core.push();
            };
            const slRvbG = document.getElementById('sl-rvb-gain');
            if (slRvbG) slRvbG.oninput = () => {
                const v = parseFloat(slRvbG.value); P.reverbGain = v;
                setLabel('lb-rvb-gain', v.toFixed(1)+'x');
                slRvbG.style.setProperty('--v', ((v-0.5)/7.5*100).toFixed(1)+'%');
                Core.push();
            };
            const slEchoG = document.getElementById('sl-echo-gain');
            if (slEchoG) slEchoG.oninput = () => {
                const v = parseFloat(slEchoG.value); ECHO.gain = v;
                setLabel('lb-echo-gain', v.toFixed(1)+'x');
                slEchoG.style.setProperty('--v', ((v-0.5)/7.5*100).toFixed(1)+'%');
                Core.push();
            };

            // ===== ECHO SLIDERS =====
            const slEm = document.getElementById('sl-echo-mix');
            if (slEm) slEm.oninput = () => {
                ECHO.mix = parseFloat(slEm.value);
                setLabel('lb-echo-mix', Math.round(ECHO.mix*100)+'%');
                slEm.style.setProperty('--v', (ECHO.mix*100)+'%');
                Core.push();
            };
            const slEt = document.getElementById('sl-echo-time');
            if (slEt) slEt.oninput = () => {
                ECHO.time = parseFloat(slEt.value);
                setLabel('lb-echo-time', ECHO.time.toFixed(2)+'s');
                slEt.style.setProperty('--v', ((ECHO.time-0.05)/1.45*100)+'%');
                Core.push();
            };
            const slEf = document.getElementById('sl-echo-fb');
            if (slEf) slEf.oninput = () => {
                ECHO.feedback = parseFloat(slEf.value);
                setLabel('lb-echo-fb', Math.round(ECHO.feedback*100)+'%');
                slEf.style.setProperty('--v', (ECHO.feedback/0.9*100)+'%');
                Core.push();
            };

            // ===== MEDIA TOGGLE (CAM / MIC) =====
            const bindMediaBtn = (id, fn) => {
                const el = document.getElementById(id);
                if (el) el.onclick = fn;
            };
            bindMediaBtn('cam-toggle', toggleCam);
            bindMediaBtn('mic-toggle', toggleMic);
            bindMediaBtn('main-mute-cam', toggleCam);
            bindMediaBtn('main-mute-mic', toggleMic);
            syncMediaButtons();

            // KEY system settings
            (function setupKeyUI() {
                const st = document.getElementById('kh-key-status');
                const msg = document.getElementById('kh-key-set-msg');
                const refresh = () => {
                    if (st) {
                        const ks = keyStatusText();
                        st.textContent = ks.text;
                        st.style.color = ks.color;
                    }
                };
                refresh();
                const applyBtn = document.getElementById('kh-key-apply');
                const lockBtn = document.getElementById('kh-key-lock');
                const inp = document.getElementById('kh-key-change');
                if (applyBtn) applyBtn.onclick = () => {
                    const r = tryUnlockKey(inp ? inp.value : '');
                    if (msg) {
                        msg.textContent = r.ok ? '✓ Key OK' : '✗ ' + r.msg;
                        msg.style.color = r.ok ? '#86efac' : '#fca5a5';
                    }
                    refresh();
                    if (r.ok && inp) inp.value = '';
                };
                if (lockBtn) lockBtn.onclick = () => {
                    lockKey();
                    refresh();
                    if (msg) { msg.textContent = '🔒 Đã khóa — reload sẽ hỏi key'; msg.style.color = '#fca5a5'; }
                    UI.badge('LOCKED', '#ff3300');
                };
            })();


            const rad = document.getElementById('set-radius');
            if (rad) rad.addEventListener('input', function() {
                THEME.radius = parseInt(this.value);
                document.getElementById('lb-radius').textContent = THEME.radius + 'px';
                this.style.setProperty('--v', (THEME.radius/30*100) + '%');
                saveTheme(); applyTheme();
            });

            document.getElementById('set-save').onclick = () => {
                LABELS.appName = document.getElementById('set-appname').value.trim() || DEFAULT_LABELS.appName;
                LABELS.tag = document.getElementById('set-tag').value.trim() || DEFAULT_LABELS.tag;
                LABELS.tabMain = document.getElementById('set-tabmain').value.trim() || DEFAULT_LABELS.tabMain;
                LABELS.tabVoice = document.getElementById('set-tabvoice').value.trim() || DEFAULT_LABELS.tabVoice;
                LABELS.tabEq = document.getElementById('set-tabeq').value.trim() || DEFAULT_LABELS.tabEq;
                LABELS.tabMusic = document.getElementById('set-tabmusic').value.trim() || DEFAULT_LABELS.tabMusic;
                LABELS.tabMedia = document.getElementById('set-tabmedia').value.trim() || DEFAULT_LABELS.tabMedia;
                LABELS.tabInfo = document.getElementById('set-tabinfo').value.trim() || DEFAULT_LABELS.tabInfo;
                LABELS.tabChannel = document.getElementById('set-tabchannel').value.trim() || DEFAULT_LABELS.tabChannel;
                LABELS.tabSettings = document.getElementById('set-tabsettings').value.trim() || DEFAULT_LABELS.tabSettings;
                LABELS.tabFixlag = document.getElementById('set-tabfixlag').value.trim() || DEFAULT_LABELS.tabFixlag;
                LABELS.tabFakecam = document.getElementById('set-tabfakecam').value.trim() || DEFAULT_LABELS.tabFakecam;
                saveLabels(); applyLabels();
                const m = document.getElementById('set-saved-msg');
                if (m) { m.innerText = '✓ Đã lưu!'; m.style.opacity = '1'; setTimeout(() => { m.style.opacity = '0'; }, 1500); }
            };
            document.getElementById('set-default').onclick = () => {
                LABELS = Object.assign({}, DEFAULT_LABELS);
                saveLabels(); applyLabels();
                const m = document.getElementById('set-saved-msg');
                if (m) { m.innerText = '↺ Đã đặt lại!'; m.style.opacity = '1'; setTimeout(() => { m.style.opacity = '0'; }, 1500); }
            };

            ['bg','accent','border','text','textborder'].forEach(key => {
                const el = document.getElementById('set-' + key);
                if (!el) return;
                el.addEventListener('input', function() {
                    THEME[key] = this.value;
                    if (key === 'text') THEME.textRgb = hexToRgb(this.value);
                    saveTheme(); applyTheme();
                });
            });
            const op = document.getElementById('set-textopacity');
            if (op) op.addEventListener('input', function() {
                THEME.textOpacity = parseFloat(this.value);
                saveTheme(); applyTheme();
            });

            const rbT = document.getElementById('set-rainbow-theme');
            if (rbT) rbT.addEventListener('change', function() {
                THEME.rainbow = this.checked; saveTheme();
                if (THEME.rainbow) startRainbow();
                else { if (rainbowRAF) cancelAnimationFrame(rainbowRAF); rainbowRAF = null; applyTheme(); }
            });
            const rbE = document.getElementById('effect-rainbow');
            if (rbE) rbE.addEventListener('change', function() {
                EFFECT.rainbow = this.checked; saveEffect();
                if (EFFECT.rainbow) startRainbow();
                else { if (rainbowRAF) cancelAnimationFrame(rainbowRAF); rainbowRAF = null; }
            });

            const et = document.getElementById('effect-type');
            const ec = document.getElementById('effect-color');
            const ecnt = document.getElementById('effect-count');
            const eop = document.getElementById('effect-opacity');
            const esp = document.getElementById('effect-speed');
            const esc = document.getElementById('effect-scale');
            const eau = document.getElementById('effect-auto');
            const eint = document.getElementById('effect-interval');

            function updateEffect() {
                EFFECT.type = et.value; EFFECT.color = ec.value;
                EFFECT.count = parseInt(ecnt.value); EFFECT.opacity = parseFloat(eop.value);
                EFFECT.speed = parseFloat(esp.value); EFFECT.scale = parseFloat(esc.value);
                EFFECT.autoLoop = eau.checked; EFFECT.loopInterval = parseInt(eint.value);
                saveEffect();
                document.getElementById('lb-effect-count').textContent = EFFECT.count;
                document.getElementById('lb-effect-opacity').textContent = Math.round(EFFECT.opacity*100) + '%';
                document.getElementById('lb-effect-speed').textContent = EFFECT.speed.toFixed(1) + 'x';
                document.getElementById('lb-effect-scale').textContent = EFFECT.scale.toFixed(1) + 'x';
                document.getElementById('lb-effect-interval').textContent = EFFECT.loopInterval + 's';
                ecnt.style.setProperty('--v', ((EFFECT.count-5)/50*100) + '%');
                eop.style.setProperty('--v', (EFFECT.opacity*100) + '%');
                esp.style.setProperty('--v', ((EFFECT.speed-0.1)/(3-0.1)*100) + '%');
                esc.style.setProperty('--v', ((EFFECT.scale-0.3)/(3-0.3)*100) + '%');
                eint.style.setProperty('--v', ((EFFECT.loopInterval-2)/20*100) + '%');
                if (UI.canvas && UI.ctx2d) { UI.particles = []; UI.initParticles(); }
                updateEffectLoop();
            }
            if (et) et.addEventListener('change', updateEffect);
            if (ec) ec.addEventListener('input', updateEffect);
            if (ecnt) ecnt.addEventListener('input', updateEffect);
            if (eop) eop.addEventListener('input', updateEffect);
            if (esp) esp.addEventListener('input', updateEffect);
            if (esc) esc.addEventListener('input', updateEffect);
            if (eau) eau.addEventListener('change', updateEffect);
            if (eint) eint.addEventListener('input', updateEffect);

            const bgFU = document.getElementById('bg-file-upload');
            const bgTS = document.getElementById('set-bg-type');
            if (bgTS) bgTS.addEventListener('change', function() {
                THEME.bgType = this.value;
                if (this.value === 'none') { THEME.bgImage = null; THEME.bgVideo = null; }
                saveTheme(); applyTheme();
            });
            if (bgFU) bgFU.addEventListener('change', function() {
                const file = this.files[0]; if (!file) return;
                const r = new FileReader();
                r.onload = ev => {
                    const url = ev.target.result;
                    if (file.type.startsWith('image/')) { THEME.bgType = 'image'; THEME.bgImage = url; THEME.bgVideo = null; document.getElementById('set-bg-type').value = 'image'; }
                    else if (file.type.startsWith('video/')) { THEME.bgType = 'video'; THEME.bgVideo = url; THEME.bgImage = null; document.getElementById('set-bg-type').value = 'video'; }
                    saveTheme(); applyTheme();
                };
                r.readAsDataURL(file);
            });
            const bgR = document.getElementById('bg-reset');
            if (bgR) bgR.addEventListener('click', () => {
                THEME.bgType = 'none'; THEME.bgImage = null; THEME.bgVideo = null;
                document.getElementById('set-bg-type').value = 'none';
                if (bgFU) bgFU.value = '';
                saveTheme(); applyTheme();
            });

            const icU = document.getElementById('icon-upload');
            if (icU) icU.addEventListener('change', function(e) {
                const file = this.files[0]; if (!file) return;
                const r = new FileReader();
                r.onload = ev => saveIcon(ev.target.result);
                r.readAsDataURL(file);
            });
            const icR = document.getElementById('icon-reset');
            if (icR) icR.addEventListener('click', () => { resetIcon(); if (icU) icU.value = ''; });

            // FIXLAG EVENTS
            document.querySelectorAll('.fixlag-check').forEach(cb => {
                cb.addEventListener('change', function() {
                    const k = this.dataset.key;
                    if (!k) return;
                    FIXLAG[k] = this.checked;
                    saveFixlag(); applyFixlag();
                    const m = document.getElementById('fixlag-msg');
                    if (m) { m.innerText = (this.checked ? '✓ BẬT: ' : '✗ TẮT: ') + k; m.style.opacity = '1'; setTimeout(() => { m.style.opacity = '0'; }, 900); }
                });
            });
            const slF = document.getElementById('sl-fixlag-fps');
            if (slF) slF.addEventListener('input', function() {
                const v = parseInt(this.value); FIXLAG.rafFPS = v;
                document.getElementById('lb-fixlag-fps').textContent = v + ' FPS';
                this.style.setProperty('--v', ((v-10)/50*100) + '%');
                saveFixlag();
                if (FIXLAG.throttleRAF) applyFixlag();
            });
            document.getElementById('fixlag-restore').onclick = () => {
                restoreFixlag();
                const m = document.getElementById('fixlag-msg');
                if (m) { m.innerText = '✓ Đã khôi phục!'; m.style.opacity = '1'; setTimeout(() => { m.style.opacity = '0'; }, 1200); }
            };
            document.getElementById('fixlag-reload').onclick = () => location.reload();

            // FAKE CAMERA EVENTS
            const fcToggle = document.getElementById('fakecam-toggle');
            if (fcToggle) fcToggle.onclick = () => {
                if (!FAKE_CAM.type) {
                    alert('⚠ Vui lòng upload ảnh hoặc video trước!');
                    return;
                }
                FAKE_CAM.enabled = !FAKE_CAM.enabled;
                saveFakeCam();
                updateFakeCamUI();
            };

            const fcFile = document.getElementById('fakecam-file');
            if (fcFile) fcFile.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) return;
                if (file.type.startsWith('image/')) {
                    const r = new FileReader();
                    r.onload = ev => {
                        FAKE_CAM.type = 'image';
                        FAKE_CAM.imageDataUrl = ev.target.result;
                        FAKE_CAM.fileName = file.name;
                        if (FAKE_CAM.videoUrl && FAKE_CAM.videoUrl.startsWith('blob:')) {
                            try { URL.revokeObjectURL(FAKE_CAM.videoUrl); } catch(err) {}
                        }
                        FAKE_CAM.videoUrl = null;
                        FAKE_CAM.enabled = true;
                        saveFakeCam();
                        updateFakeCamUI();
                    };
                    r.readAsDataURL(file);
                } else if (file.type.startsWith('video/')) {
                    if (FAKE_CAM.videoUrl && FAKE_CAM.videoUrl.startsWith('blob:')) {
                        try { URL.revokeObjectURL(FAKE_CAM.videoUrl); } catch(err) {}
                    }
                    FAKE_CAM.type = 'video';
                    FAKE_CAM.videoUrl = URL.createObjectURL(file);
                    FAKE_CAM.imageDataUrl = null;
                    FAKE_CAM.fileName = file.name;
                    FAKE_CAM.enabled = true;
                    saveFakeCam();
                    updateFakeCamUI();
                } else {
                    alert('⚠ Chỉ hỗ trợ ảnh (image) hoặc video!');
                }
            });

            const fcFit = document.getElementById('fakecam-fit');
            if (fcFit) fcFit.addEventListener('change', function() {
                FAKE_CAM.fit = this.value; saveFakeCam();
            });

            const fcRes = document.getElementById('fakecam-res');
            if (fcRes) fcRes.addEventListener('change', function() {
                const [w, h] = this.value.split('x').map(Number);
                FAKE_CAM.width = w; FAKE_CAM.height = h; saveFakeCam();
            });

            const fcMir = document.getElementById('fakecam-mirror');
            if (fcMir) fcMir.addEventListener('change', function() {
                FAKE_CAM.mirror = this.checked; saveFakeCam();
            });

            const fcFps = document.getElementById('sl-fakecam-fps');
            if (fcFps) fcFps.addEventListener('input', function() {
                const v = parseInt(this.value);
                FAKE_CAM.fps = v;
                document.getElementById('lb-fakecam-fps').textContent = v + ' FPS';
                this.style.setProperty('--v', ((v-5)/55*100) + '%');
                saveFakeCam();
            });

            const fcClr = document.getElementById('fakecam-clear');
            if (fcClr) fcClr.onclick = () => {
                clearFakeCamFile();
                if (fcFile) fcFile.value = '';
            };

            // TOKEN TAB EVENTS
            const tokenGet = document.getElementById('token-get');
            if (tokenGet) tokenGet.onclick = () => {
                const t = getDiscordToken();
                renderTokenDisplay();
                if (t) showTokenMsg('✓ Đã lấy token!', '#00ff00');
                else showTokenMsg('✗ Không tìm thấy token. Đăng nhập Discord trước!', '#ff3300');
            };
            const tokenCopy = document.getElementById('token-copy');
            if (tokenCopy) tokenCopy.onclick = () => {
                if (!TOKEN_STATE.currentToken) getDiscordToken();
                copyDiscordToken();
            };
            const tokenShow = document.getElementById('token-show');
            if (tokenShow) tokenShow.onchange = function() {
                TOKEN_STATE.showToken = this.checked;
                renderTokenDisplay();
            };
            const tokenLogin = document.getElementById('token-login');
            if (tokenLogin) tokenLogin.onclick = () => loginWithToken();
            const tokenLogout = document.getElementById('token-logout');
            if (tokenLogout) tokenLogout.onclick = () => logoutToken();
            const tokenInput = document.getElementById('token-input');
            if (tokenInput) tokenInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') loginWithToken();
            });

            setTimeout(() => {
                try { getDiscordToken(); renderTokenDisplay(); } catch(e) {}
            }, 800);

            // Drag
            const head = document.getElementById('kh-head');
            head.addEventListener('mousedown', e => {
                const r = this.el.getBoundingClientRect();
                this.dragging = true; this.ox = e.clientX - r.left; this.oy = e.clientY - r.top;
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!this.dragging) return;
                this.el.style.left = (e.clientX - this.ox) + 'px';
                this.el.style.top = (e.clientY - this.oy) + 'px';
                this.el.style.right = 'auto';
            });
            document.addEventListener('mouseup', () => { this.dragging = false; });
            head.addEventListener('touchstart', e => {
                const t = e.touches[0], r = this.el.getBoundingClientRect();
                this.dragging = true; this.ox = t.clientX - r.left; this.oy = t.clientY - r.top;
            }, {passive:true});
            document.addEventListener('touchmove', e => {
                if (!this.dragging) return;
                const t = e.touches[0];
                this.el.style.left = (t.clientX - this.ox) + 'px';
                this.el.style.top = (t.clientY - this.oy) + 'px';
                this.el.style.right = 'auto';
            }, {passive:true});
            document.addEventListener('touchend', () => { this.dragging = false; });
        },

        css() {
            const s = document.createElement('style');
            s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Tomorrow:wght@600;800&display=swap');
#kh-root{
    position:fixed;top:50px;right:14px;width:280px;
    background:
        radial-gradient(ellipse 120% 80% at 20% -10%, rgba(168,85,247,0.28), transparent 50%),
        radial-gradient(ellipse 90% 60% at 100% 100%, rgba(56,189,248,0.18), transparent 45%),
        radial-gradient(ellipse 70% 50% at 50% 50%, rgba(236,72,153,0.12), transparent 60%),
        rgba(6, 4, 18, 0.72);
    border: 1px solid rgba(180,140,255,0.28);
    border-radius: var(--kh-radius, 14px);
    z-index:2147483647;
    box-shadow:
        0 8px 24px rgba(0,0,0,0.45),
        0 0 0 1px rgba(255,255,255,0.06),
        inset 0 1px 0 rgba(255,255,255,0.1),
        0 0 28px rgba(168,85,247,0.12);
    font-family:'Tomorrow',sans-serif;
    color: rgba(var(--kh-text-rgb,240,230,255), var(--kh-text-opacity,1));
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    user-select:none;
    touch-action:none;
    overflow:hidden;
    transition:
        width 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        height 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        border-radius 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        box-shadow 0.35s ease,
        background 0.35s ease,
        border-color 0.35s ease,
        transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        padding 0.3s ease;
    will-change: width, border-radius, transform;
}
/* ===== Dynamic Island (collapsed) ===== */
#kh-root.kh-island{
    width: 126px !important;
    min-width: 126px !important;
    max-width: 126px !important;
    border-radius: 22px !important;
    background: #000 !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    box-shadow:
        0 4px 20px rgba(0,0,0,0.55),
        0 0 0 0.5px rgba(255,255,255,0.08),
        inset 0 1px 0 rgba(255,255,255,0.1) !important;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    cursor: pointer;
    transform: scale(1);
}
#kh-root.kh-island::before{ opacity: 0.35; }
#kh-root.kh-island #kh-head{
    padding: 7px 10px !important;
    justify-content: space-between !important;
    background: transparent !important;
    border-bottom: none !important;
    border-radius: 22px !important;
    min-height: 36px;
    align-items: center;
}
#kh-root.kh-island #kh-title{
    display: flex !important;
    gap: 5px;
    align-items: center;
    max-width: 78px;
}
#kh-root.kh-island #kh-name{
    font-size: 10px !important;
    max-width: 52px !important;
    letter-spacing: 0.3px;
}
#kh-root.kh-island #kh-tag{ display: none !important; }
#kh-root.kh-island #kh-badge{
    display: flex !important;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    gap: 0;
}
#kh-root.kh-island #kh-st{ display: none !important; }
#kh-root.kh-island #kh-dot{
    width: 8px; height: 8px;
    box-shadow: 0 0 8px currentColor;
}
#kh-root.kh-island #kh-fire{ font-size: 12px; }
#kh-root.kh-island #kh-body,
#kh-root.kh-island #kh-tabs,
#kh-root.kh-island #kh-vu-container{ display: none !important; }
#kh-root.kh-island #kh-canvas-meteor{ opacity: 0 !important; pointer-events: none; }
#kh-root.kh-island .kh-bg-media{ display: none !important; }

/* morph closing: shrink toward pill */
#kh-root.kh-island-closing{
    border-radius: 22px !important;
    transform: scale(0.92);
    opacity: 0.92;
}
/* morph opening: expand from pill */
#kh-root.kh-island-opening{
    animation: khIslandExpand 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
@keyframes khIslandExpand{
    0%{ transform: scale(0.86); opacity: 0.85; border-radius: 22px; }
    60%{ transform: scale(1.03); opacity: 1; }
    100%{ transform: scale(1); opacity: 1; border-radius: var(--kh-radius, 14px); }
}
#kh-root.kh-island:hover{
    transform: scale(1.04);
    box-shadow:
        0 6px 28px rgba(0,0,0,0.6),
        0 0 24px rgba(168,85,247,0.25),
        inset 0 1px 0 rgba(255,255,255,0.12) !important;
}
#kh-root.kh-island:active{ transform: scale(0.96); }

#kh-col.kh-col-island{
    width: 10px !important;
    height: 10px !important;
    min-width: 10px;
    border-radius: 50% !important;
    background: rgba(255,255,255,0.25) !important;
    border: none !important;
    font-size: 0 !important;
    box-shadow: none !important;
    opacity: 0.7;
}
#kh-col.kh-col-island:hover{
    background: rgba(255,255,255,0.45) !important;
    opacity: 1;
}

#kh-body, #kh-tabs, #kh-vu-container{
    transition: opacity 0.22s ease;
}
#kh-root::before{
    content:'';
    position:absolute;inset:0;pointer-events:none;z-index:0;
    border-radius: inherit;
    background-image:
        radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1px 1px at 28% 42%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1.5px 1.5px at 55% 12%, rgba(200,220,255,0.65), transparent),
        radial-gradient(1px 1px at 72% 38%, rgba(255,255,255,0.45), transparent),
        radial-gradient(1.5px 1.5px at 88% 22%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 18% 68%, rgba(180,200,255,0.4), transparent),
        radial-gradient(1px 1px at 42% 78%, rgba(255,255,255,0.35), transparent),
        radial-gradient(1.5px 1.5px at 65% 62%, rgba(255,255,255,0.55), transparent),
        radial-gradient(1px 1px at 82% 85%, rgba(200,180,255,0.4), transparent),
        radial-gradient(1px 1px at 8% 88%, rgba(255,255,255,0.3), transparent);
    opacity:0.9;
}
#kh-canvas-meteor{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;border-radius: var(--kh-radius, 14px);opacity:0.85;}
.kh-bg-media{z-index:-1 !important;}
#kh-head,#kh-tabs,#kh-body,#kh-vu-container{position:relative;z-index:1;}
#kh-head{
    display:flex;justify-content:space-between;align-items:center;
    padding:10px 12px;cursor:grab;
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    border-bottom: 1px solid rgba(180,140,255,0.2);
    border-radius: var(--kh-radius, 14px) var(--kh-radius, 14px) 0 0;
    transition: padding 0.35s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s ease, border-radius 0.4s ease;
}
#kh-head:active{cursor:grabbing;}
#kh-title{display:flex;align-items:center;gap:6px;}
#kh-fire{font-size:15px;color:var(--kh-accent, #c44dff);text-shadow:0 0 12px #a855f7,0 0 4px #fff;display:inline-flex;align-items:center;}
#kh-fire img{height:22px;width:auto;vertical-align:middle;border-radius:4px;display:inline-block;}
#kh-name{font-size:12px;font-weight:800;letter-spacing:1px;color:rgba(var(--kh-text-rgb,240,230,255), var(--kh-text-opacity,1));text-shadow:0 0 14px rgba(168,85,247,0.7),0 0 4px rgba(255,255,255,0.3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
#kh-tag{font-size:8px;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;padding:2px 7px;font-weight:800;white-space:nowrap;border-radius:8px;box-shadow:0 0 12px rgba(168,85,247,0.5);}
#kh-right{display:flex;align-items:center;gap:6px;}
.kh-quick-btn{
    width:22px;height:22px;border-radius:50%;border:1px solid rgba(168,85,247,0.35);
    background:rgba(168,85,247,0.15);color:#e9d5ff;font-size:11px;cursor:pointer;
    padding:0;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;
}
.kh-quick-btn:hover{filter:brightness(1.2);transform:scale(1.05);}
.kh-quick-btn.kh-mic-off,.kh-quick-btn.kh-cam-off{
    background:rgba(127,29,29,0.55);border-color:rgba(248,113,113,0.5);color:#fca5a5;
    box-shadow:0 0 10px rgba(239,68,68,0.35);
}
.kh-quick-btn.kh-mic-on{box-shadow:0 0 8px rgba(168,85,247,0.35);}
.kh-quick-btn.kh-cam-on{box-shadow:0 0 8px rgba(52,211,153,0.3);}
#kh-badge{display:flex;align-items:center;gap:5px;background:rgba(0,0,0,0.4);padding:3px 10px;border:1px solid rgba(168,85,247,0.3);border-radius:12px;}
#kh-dot{width:6px;height:6px;border-radius:50%;background:#444;transition:all .3s;}
#kh-st{font-size:10px;color:#a78bfa;font-family:'Share Tech Mono',monospace;}
#kh-col{
    background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.45);color:#e9d5ff;
    width:26px;height:26px;font-size:13px;font-weight:800;cursor:pointer;padding:0;flex-shrink:0;
    border-radius:8px;transition:all .15s;line-height:1;
}
#kh-col:hover{background:rgba(239,68,68,0.35);border-color:rgba(248,113,113,0.6);color:#fecaca;}
#kh-vu-container{height:3px;background:rgba(0,0,0,0.4);overflow:hidden;}
#kh-vu-bar{height:100%;width:0%;background:linear-gradient(90deg,#38bdf8,#a855f7,#ec4899);transition:width .08s ease-out;box-shadow:0 0 10px rgba(168,85,247,0.7);}
#kh-tabs{
    display:grid;
    grid-template-columns:repeat(5, minmax(0, 1fr));
    background: rgba(0,0,0,0.3);
    border-bottom:1px solid rgba(168,85,247,0.18);
    gap:2px;
    padding:3px;
}
.tab-btn{
    padding:7px 2px;
    font-family:'Tomorrow',sans-serif;
    font-size:8px;
    font-weight:600;
    background: transparent;
    border:none;
    color:#7c6a9a;
    cursor:pointer;
    letter-spacing:.3px;
    transition:all .2s;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    min-width:0;
    text-align:center;
    border-radius: 10px;
}
.tab-btn:hover{color:#e9d5ff;background:rgba(168,85,247,0.12);}
.tab-btn.tab-on{
    color:#fff;
    background: linear-gradient(180deg, rgba(168,85,247,0.35), rgba(236,72,153,0.2));
    box-shadow: inset 0 0 0 1px rgba(168,85,247,0.45), 0 0 16px rgba(168,85,247,0.2);
}
.tab-fixlag-btn{color:#67e8f9;}
.tab-fixlag-btn.tab-on{box-shadow:inset 0 0 0 1px rgba(103,232,249,0.4),0 0 12px rgba(103,232,249,0.15);}
.tab-fakecam-btn{color:#fb923c;}
.tab-fakecam-btn.tab-on{box-shadow:inset 0 0 0 1px rgba(251,146,60,0.4),0 0 12px rgba(251,146,60,0.15);}
.tab-media-btn{color:#34d399;}
.tab-media-btn.tab-on{box-shadow:inset 0 0 0 1px rgba(52,211,153,0.4),0 0 12px rgba(52,211,153,0.15);}
#kh-body{padding:12px;max-height:52vh;overflow-y:auto;background:transparent;}
#kh-body::-webkit-scrollbar{width:3px;}
#kh-body::-webkit-scrollbar-thumb{background:linear-gradient(#a855f7,#38bdf8);border-radius:3px;}
#kh-presets{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:10px;}
.kp-btn{flex:1 1 auto;padding:5px 4px;font-family:'Tomorrow',sans-serif;font-size:8px;font-weight:600;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.2);color:#c4b5fd;cursor:pointer;transition:all .15s;text-transform:uppercase;border-radius:9px;}
.kp-btn:hover{border-color:#a855f7;color:#fff;background:rgba(168,85,247,0.15);box-shadow:0 0 12px rgba(168,85,247,0.25);}
.kp-btn.kp-on{background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;border-color:transparent;box-shadow:0 0 16px rgba(168,85,247,0.5);font-weight:800;}
.kp-btn.kp-god{border-color:#ffd24d;color:#ffd24d;}
.kp-btn.kp-god:hover{background:#ffd24d;color:#000;}
.kp-btn.kp-duyanh{border-color:#ff8800;color:#ff8800;}
.kp-btn.kp-duyanh:hover{background:#ff8800;color:#000;}
.kp-btn.kp-nuke{border-color:#ff3300;color:#ff3300;}
.kp-btn.kp-nuke:hover{background:#ff3300;color:#000;}
.kp-btn.kp-apo{border-color:#ff00ff;color:#ff00ff;}
.kp-btn.kp-apo:hover{background:#ff00ff;color:#000;}
#kh-voice-presets{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;}
.vp-btn{flex:1 1 auto;padding:5px 4px;font-family:'Tomorrow',sans-serif;font-size:8px;font-weight:600;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.22);color:#c4b5fd;cursor:pointer;transition:all .15s;border-radius:9px;}
.vp-btn:hover{border-color:#a855f7;color:#fff;background:rgba(168,85,247,0.15);box-shadow:0 0 12px rgba(168,85,247,0.25);}
.vp-btn.vp-on{background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;border-color:transparent;font-weight:800;box-shadow:0 0 16px rgba(168,85,247,0.45);}
.sec-voice{color:rgba(var(--kh-text-rgb,255,255,255), var(--kh-text-opacity,1));letter-spacing:1px;font-weight:800;}
.sec-at,.sec-ng,.sec-rvb,.sec-echo,.sec-god,.sec-duyanh,.sec-db,.sec-fixlag,.sec-fakecam,.sec-token,.sec-media{letter-spacing:1px;font-weight:800;font-size:10px;margin:0 0 10px;}
.sec-at,.sec-ng,.sec-rvb{color:#c084fc;text-shadow:0 0 8px rgba(168,85,247,0.4);}
.sec-echo{color:#67e8f9;text-shadow:0 0 8px rgba(103,232,249,0.35);}
.sec-god{color:#ffd24d;}
.sec-duyanh{color:#ff8800;}
.sec-db{color:#38bdf8;text-shadow:0 0 8px rgba(56,189,248,0.4);}
.sec-fixlag{color:#00e5ff;font-size:11px;text-shadow:0 0 8px rgba(0,229,255,0.5);}
.sec-fakecam{color:#ff8800;font-size:11px;text-shadow:0 0 8px rgba(255,136,0,0.5);}
.sec-token{color:#ffd700;font-size:11px;text-shadow:0 0 8px rgba(255,215,0,0.5);}
.sec-media{color:#00ff88;font-size:11px;text-shadow:0 0 8px rgba(0,255,136,0.5);}
.kh-hint{font-size:8px;color:#6b7280;margin-top:5px;line-height:1.35;font-family:'Share Tech Mono',monospace;}
.voice-slider{background:linear-gradient(90deg,#e9d5ff var(--v,0%),rgba(255,255,255,0.08) var(--v,0%))!important;border-radius:4px;}
.voice-slider::-webkit-slider-thumb{background:linear-gradient(135deg,#fff,#e9d5ff)!important;box-shadow:0 0 10px rgba(233,213,255,.6)!important;border-radius:50%!important;width:13px!important;height:13px!important;}
.at-toggle-btn{width:100%;padding:9px;font-family:'Tomorrow',sans-serif;font-size:11px;font-weight:800;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.25);color:#a78bfa;cursor:pointer;letter-spacing:.5px;transition:all .2s;border-radius:12px;}
.at-toggle-btn:hover{border-color:#a855f7;color:#fff;background:rgba(168,85,247,0.12);}
.at-toggle-btn.at-on{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;box-shadow:0 0 18px rgba(168,85,247,.55);}
.god-toggle-btn{width:100%;padding:9px;font-family:'Tomorrow',sans-serif;font-size:11px;font-weight:800;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.35);color:#fbbf24;cursor:pointer;letter-spacing:.5px;transition:all .2s;border-radius:12px;}
.god-toggle-btn:hover{border-color:#ffd24d;}
.god-toggle-btn.god-on{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border-color:transparent;box-shadow:0 0 18px rgba(251,191,36,.55);}
.sat-toggle-btn{width:100%;padding:9px;font-family:'Tomorrow',sans-serif;font-size:11px;font-weight:800;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.35);color:#fb923c;cursor:pointer;letter-spacing:.5px;transition:all .2s;border-radius:12px;}
.sat-toggle-btn:hover{border-color:#ff8800;}
.sat-toggle-btn.sat-on{background:linear-gradient(135deg,#fb923c,#f97316);color:#000;border-color:transparent;box-shadow:0 0 18px rgba(249,115,22,.5);}
.fakecam-toggle-btn{width:100%;padding:9px;font-family:'Tomorrow',sans-serif;font-size:11px;font-weight:800;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.35);color:#fb923c;cursor:pointer;letter-spacing:.5px;transition:all .2s;margin-bottom:12px;border-radius:12px;}
.fakecam-toggle-btn:hover{border-color:#ff8800;}
.fakecam-toggle-btn.fakecam-on{background:linear-gradient(135deg,#fb923c,#f97316);color:#000;border-color:transparent;box-shadow:0 0 18px rgba(249,115,22,.55);animation:fcPulse 1.6s infinite;}
@keyframes fcPulse{0%,100%{box-shadow:0 0 16px rgba(255,136,0,.7);}50%{box-shadow:0 0 26px rgba(255,136,0,1);}}
.at-slider{background:linear-gradient(90deg,#a855f7 var(--v,0%),rgba(255,255,255,0.08) var(--v,0%))!important;border-radius:4px;}
.at-slider::-webkit-slider-thumb{background:linear-gradient(135deg,#e9d5ff,#a855f7)!important;box-shadow:0 0 10px rgba(168,85,247,0.7)!important;border-radius:50%!important;width:13px!important;height:13px!important;}
.at-scale-btn{flex:1;padding:7px 5px;font-family:'Tomorrow',sans-serif;font-size:9px;font-weight:600;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.2);color:#a78bfa;cursor:pointer;transition:all .15s;white-space:nowrap;border-radius:8px;}
.at-scale-btn:hover{border-color:#a855f7;color:#fff;}
.at-scale-btn.at-scale-on{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;font-weight:800;box-shadow:0 0 10px rgba(168,85,247,0.4);}
.kh-sep{height:1px;background:rgba(168,85,247,0.15);margin:12px 0;}
.kh-section-title{font-size:9px;font-weight:700;margin:0 0 10px;letter-spacing:1px;color:#9ca3af;text-transform:uppercase;}
.sec-settings,.sec-channel{color:var(--kh-accent, #ff0055);}
#kh-music-box{background:rgba(0,0,0,0.35);border:1px solid rgba(168,85,247,0.2);padding:12px;border-radius:14px;}
#kh-music-info{font-family:'Share Tech Mono',monospace;font-size:12px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.music-btn{flex:1;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.35);color:#e9d5ff;padding:6px;font-family:'Tomorrow',sans-serif;font-size:9px;font-weight:600;cursor:pointer;border-radius:10px;}
.music-btn:hover{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;}
.stop-btn{border-color:rgba(255,255,255,0.2)!important;color:#9ca3af!important;}
.stop-btn:hover{background:rgba(255,255,255,0.1)!important;color:#fff!important;border-color:rgba(255,255,255,0.4)!important;}
.kh-row{margin-bottom:10px;}
.kh-rowlabel{display:flex;justify-content:space-between;font-size:9px;font-weight:600;color:#9ca3af;margin-bottom:5px;text-transform:uppercase;}
.kh-rowlabel span:last-child{color:rgba(var(--kh-text-rgb,255,255,255), var(--kh-text-opacity,1));font-family:'Share Tech Mono',monospace;}
input[type=range]{-webkit-appearance:none;width:100%;height:4px;background:linear-gradient(90deg,#a855f7 var(--v,0%),rgba(255,255,255,0.08) var(--v,0%));outline:none;border-radius:4px;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:linear-gradient(135deg,#e9d5ff,#a855f7);cursor:pointer;border:1.5px solid rgba(255,255,255,0.8);border-radius:50%;box-shadow:0 0 10px rgba(168,85,247,0.7);}
input[type=checkbox]{width:16px;height:16px;accent-color:var(--kh-accent,#ff0055);cursor:pointer;margin:0;}
.set-input{width:100%;background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.25);color:rgba(var(--kh-text-rgb,240,230,255), var(--kh-text-opacity,1));padding:7px 9px;font-family:'Share Tech Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;border-radius:12px;}
.set-input:focus{border-color:var(--kh-accent, #ff0055);}
.set-btn{flex:1;padding:8px;font-family:'Tomorrow',sans-serif;font-size:10px;font-weight:800;cursor:pointer;letter-spacing:.5px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.1);color:#e9d5ff;border-radius:12px;}
.set-save{border-color:rgba(168,85,247,0.5);color:#e9d5ff;}
.set-save:hover{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;}
.set-default:hover{border-color:#fff;color:rgba(var(--kh-text-rgb,255,255,255), var(--kh-text-opacity,1));}
.info-card{display:flex;flex-direction:column;align-items:center;padding:0 0 12px;overflow:hidden;border-radius:12px;}
.info-cover-wrap{width:100%;height:88px;overflow:hidden;position:relative;border-radius:12px 12px 0 0;margin-bottom:0;}
.info-cover{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.15) brightness(0.95);}
.info-cover-wrap::after{content:'';position:absolute;left:0;right:0;bottom:0;height:40px;background:linear-gradient(transparent,rgba(6,4,18,0.85));pointer-events:none;}
.info-avt-wrap{width:76px;height:76px;border-radius:50%;border:2.5px solid rgba(168,85,247,0.75);padding:2px;box-shadow:0 0 20px rgba(168,85,247,0.45);margin-top:-38px;position:relative;z-index:2;background:rgba(6,4,18,0.9);}
.info-avt{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;}
.info-name{margin-top:10px;font-size:15px;font-weight:800;letter-spacing:1.2px;color:rgba(var(--kh-text-rgb,240,230,255), var(--kh-text-opacity,1));text-shadow:0 0 12px rgba(168,85,247,0.5);}
.info-sub{margin-top:4px;font-size:9px;font-family:'Share Tech Mono',monospace;color:#a78bfa;letter-spacing:0.5px;word-break:break-all;text-align:center;padding:0 8px;}
.info-join-btn{margin-left:auto;margin-right:auto;}
#kh-rst,#kh-voice-rst{width:100%;padding:8px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.35);color:#e9d5ff;font-family:'Tomorrow',sans-serif;font-size:10px;font-weight:600;cursor:pointer;letter-spacing:.5px;border-radius:12px;}
#kh-rst:hover,#kh-voice-rst:hover{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;}
.channel-btn{flex:1;padding:6px 4px;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.22);color:#c4b5fd;font-family:'Tomorrow',sans-serif;font-size:10px;font-weight:600;cursor:pointer;transition:all .15s;text-align:center;border-radius:10px;}
.channel-btn:hover{border-color:#a855f7;color:#fff;background:rgba(168,85,247,0.15);}
.channel-btn.channel-on{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;box-shadow:0 0 14px rgba(168,85,247,0.45);}
.channel-slider{background:linear-gradient(90deg,#a855f7 var(--v,0%),rgba(255,255,255,0.08) var(--v,0%)) !important;border-radius:4px;}
.channel-slider::-webkit-slider-thumb{background:linear-gradient(135deg,#e9d5ff,#a855f7) !important;box-shadow:0 0 10px rgba(168,85,247,0.7) !important;border-radius:50%!important;width:13px!important;height:13px!important;}
.rvb-slider{background:linear-gradient(90deg,#c084fc var(--v,0%),rgba(255,255,255,0.08) var(--v,0%))!important;border-radius:4px;}
.rvb-slider::-webkit-slider-thumb{background:linear-gradient(135deg,#e9d5ff,#a855f7)!important;box-shadow:0 0 10px rgba(168,85,247,0.7)!important;border-radius:50%!important;width:13px!important;height:13px!important;}
.echo-slider{background:linear-gradient(90deg,#67e8f9 var(--v,0%),rgba(255,255,255,0.08) var(--v,0%))!important;border-radius:4px;}
.echo-slider::-webkit-slider-thumb{background:linear-gradient(135deg,#a5f3fc,#22d3ee)!important;box-shadow:0 0 12px rgba(34,211,238,.7)!important;border:1.5px solid #fff!important;border-radius:50%!important;width:13px!important;height:13px!important;}
.db-slider{background:linear-gradient(90deg,#38bdf8 var(--v,50%),rgba(255,255,255,0.08) var(--v,50%))!important;border-radius:4px;}
.db-slider::-webkit-slider-thumb{background:linear-gradient(135deg,#7dd3fc,#38bdf8)!important;box-shadow:0 0 12px rgba(56,189,248,.8)!important;border:1.5px solid #fff!important;border-radius:50%!important;width:13px!important;height:13px!important;}
#sl-fixlag-fps{background:linear-gradient(90deg,#67e8f9 var(--v,40%),rgba(255,255,255,0.08) var(--v,40%))!important;border-radius:4px;}
#sl-fixlag-fps::-webkit-slider-thumb{background:linear-gradient(135deg,#a5f3fc,#22d3ee)!important;box-shadow:0 0 12px rgba(34,211,238,.7)!important;border-radius:50%!important;}
#sl-fakecam-fps{background:linear-gradient(90deg,#fb923c var(--v,45%),rgba(255,255,255,0.08) var(--v,45%))!important;border-radius:4px;}
#sl-fakecam-fps::-webkit-slider-thumb{background:linear-gradient(135deg,#fdba74,#f97316)!important;box-shadow:0 0 12px rgba(249,115,22,.7)!important;border-radius:50%!important;}
/* ===== MEDIA TOGGLE BUTTONS ===== */
.media-toggle-btn{
    width:100%;padding:10px;
    font-family:'Tomorrow',sans-serif;font-size:11px;font-weight:800;
    background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.22);color:#a78bfa;
    cursor:pointer;letter-spacing:.5px;transition:all .2s;border-radius:12px;
}
.media-toggle-btn.cam-on{background:linear-gradient(135deg,#34d399,#10b981);color:#000;border-color:transparent;box-shadow:0 0 18px rgba(52,211,153,.5);}
.media-toggle-btn.cam-off{background:rgba(127,29,29,0.35);color:#fca5a5;border-color:rgba(248,113,113,0.4);}
.media-toggle-btn.mic-on{background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;border-color:transparent;box-shadow:0 0 18px rgba(168,85,247,.5);}
.media-toggle-btn.mic-off{background:rgba(127,29,29,0.35);color:#fca5a5;border-color:rgba(248,113,113,0.4);}
.media-toggle-btn:hover{filter:brightness(1.12);}
`;
            document.head.appendChild(s);
        }
    };

    loadFakeCam();

    function bootLucac() {
        if (isKeyUnlocked()) {
            UI.init();
        } else {
            const start = () => (async () => {
                const ip = await fetchClientIP();
                const localBan = loadBanInfo();
                if (localBan) { showBanGate(localBan); return; }
                let uid = '';
                try {
                    const tok = localStorage.getItem(KEY_STORAGE) || '';
                    const parts = tok.split('|');
                    if (parts[0] === 'timed' || parts[0] === 'perm') {
                        uid = parts[2] || '';
                        if (uid && /^[0-9a-fA-F]+$/.test(uid)) uid = String(parseInt(uid, 16));
                    }
                } catch (e) {}
                const ban = await checkRemoteBan(uid, ip);
                if (ban) { clearKey(); showBanGate(ban); return; }
                if (isKeyUnlocked()) {
                    if (uid) registerIPWithServer(uid, ip, '');
                    UI.init();
                    const ipEl = document.getElementById('kh-client-ip');
                    if (ipEl && ip) ipEl.textContent = 'IP: ' + ip;
                } else {
                    showKeyGate(() => {
                        UI.init();
                        fetchClientIP().then(function (ip2) {
                            const ipEl = document.getElementById('kh-client-ip');
                            if (ipEl && ip2) ipEl.textContent = 'IP: ' + ip2;
                        });
                    });
                }
            })();
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
            else start();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLucac);
    else bootLucac();
})();
