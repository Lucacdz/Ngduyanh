// ==UserScript==
// @name         LUCAC
// @namespace    lucac
// @version      112
// @description  NgDuyAnhHw - v83 + full key (v112)
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
    const DEVICE_STORAGE = 'lucac_device_id';
    const KEY_RAW_STORAGE = 'lucac_key_raw';

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
            'LUCAC-ADMIN-NDA-2026'
        ];
        raw.forEach(k => { VALID_KEY_HASHES[_fnv1a(_normKey(k))] = 1; });
    })();

    // ========== ADMIN KEY (mo console GUI) ==========
    // Chi luu HASH. Key mac dinh: LUCAC-ADMIN-NDA-2026  -> DOI key rieng cua ban:
    // mo console, chay _fnv1a(_normKey('KEY_MOI')) roi thay hash ben duoi.
    const ADMIN_KEY_HASHES = { 'd1e111fe': 1 };
    Object.keys(ADMIN_KEY_HASHES).forEach(h => { VALID_KEY_HASHES[h] = 1; });

    function isAdmin() {
        try {
            const tok = localStorage.getItem(KEY_STORAGE) || '';
            return !!ADMIN_KEY_HASHES[tok.split('|')[0]];
        } catch (e) { return false; }
    }
    // Bat console tu som (ring buffer) de admin xem duoc log truoc khi mo
    const _conBuf = [];
    const _conSubs = [];
    (function _hookConsole() {
        ['log', 'info', 'warn', 'error', 'debug'].forEach(function (lv) {
            const orig = console[lv];
            if (typeof orig !== 'function') return;
            console[lv] = function () {
                try {
                    const text = Array.prototype.map.call(arguments, function (a) {
                        if (typeof a === 'string') return a;
                        if (a instanceof Error) return a.stack || a.message;
                        try { return JSON.stringify(a); } catch (e) { return String(a); }
                    }).join(' ');
                    const e = { lv: lv, t: Date.now(), text: text };
                    _conBuf.push(e);
                    if (_conBuf.length > 500) _conBuf.shift();
                    _conSubs.forEach(function (fn) { try { fn(e); } catch (x) {} });
                } catch (x) {}
                return orig.apply(console, arguments);
            };
        });
        window.addEventListener('error', function (ev) {
            console.error('[window.onerror]', ev.message, (ev.filename || '') + ':' + (ev.lineno || ''));
        });
    })();

    function openAdminConsole() {
        if (!isAdmin()) return;
        if (document.getElementById('kh-admin-con')) return;
        const wrap = document.createElement('div');
        wrap.id = 'kh-admin-con';
        wrap.innerHTML = `
<style>
#kh-admin-con{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;height:42vh;min-height:220px;display:flex;flex-direction:column;
background:rgba(8,6,20,.96);border-top:1px solid rgba(168,85,247,.5);box-shadow:0 -8px 30px rgba(0,0,0,.55);
font-family:monospace;color:#e9d5ff;font-size:11px;}
#kh-admin-con.min{height:auto;min-height:0;}
#kh-admin-con.min #kh-ac-log,#kh-admin-con.min #kh-ac-row{display:none;}
#kh-ac-bar{display:flex;gap:6px;align-items:center;padding:6px 8px;background:rgba(168,85,247,.16);}
#kh-ac-bar b{flex:1;letter-spacing:1px;font-size:11px;}
#kh-ac-bar button,#kh-ac-run{border:1px solid rgba(168,85,247,.45);background:rgba(168,85,247,.2);color:#f0e6ff;
border-radius:8px;padding:4px 9px;font-family:monospace;font-size:11px;font-weight:700;cursor:pointer;}
#kh-ac-log{flex:1;overflow:auto;padding:6px 8px;white-space:pre-wrap;word-break:break-word;-webkit-overflow-scrolling:touch;}
#kh-ac-log div{padding:1px 0;border-bottom:1px solid rgba(255,255,255,.04);}
#kh-ac-log .warn{color:#fcd34d;} #kh-ac-log .error{color:#fca5a5;} #kh-ac-log .cmd{color:#93c5fd;} #kh-ac-log .res{color:#86efac;}
#kh-ac-row{display:flex;gap:6px;padding:6px 8px;border-top:1px solid rgba(168,85,247,.25);}
#kh-ac-in{flex:1;min-width:0;background:rgba(0,0,0,.5);border:1px solid rgba(168,85,247,.4);border-radius:8px;color:#fff;
padding:7px 9px;font-family:monospace;font-size:12px;outline:none;}
</style>
<div id="kh-ac-bar"><b>🛠 ADMIN CONSOLE</b>
<button id="kh-ac-clear" type="button">Xóa</button><button id="kh-ac-copy" type="button">Copy</button>
<button id="kh-ac-min" type="button">_</button><button id="kh-ac-x" type="button">✕</button></div>
<div id="kh-ac-log"></div>
<div id="kh-ac-row"><input id="kh-ac-in" type="text" placeholder="Gõ lệnh JS, vd: localStorage.length" autocomplete="off" spellcheck="false" autocapitalize="off"><button id="kh-ac-run" type="button">Chạy</button></div>`;
        document.documentElement.appendChild(wrap);
        const logEl = wrap.querySelector('#kh-ac-log');
        const inp = wrap.querySelector('#kh-ac-in');
        const add = function (e) {
            const d = document.createElement('div');
            d.className = e.lv;
            const tm = new Date(e.t).toLocaleTimeString();
            d.textContent = '[' + tm + '] ' + e.text;
            logEl.appendChild(d);
            while (logEl.childNodes.length > 500) logEl.removeChild(logEl.firstChild);
            logEl.scrollTop = logEl.scrollHeight;
        };
        _conBuf.forEach(add);
        _conSubs.push(add);
        const run = function () {
            const code = inp.value.trim();
            if (!code) return;
            inp.value = '';
            add({ lv: 'cmd', t: Date.now(), text: '> ' + code });
            try {
                const r = (0, eval)(code);
                Promise.resolve(r).then(function (v) {
                    let out;
                    try { out = (typeof v === 'string') ? v : JSON.stringify(v, null, 1); } catch (e) { out = String(v); }
                    add({ lv: 'res', t: Date.now(), text: '← ' + (out === undefined ? 'undefined' : out) });
                }, function (er) { add({ lv: 'error', t: Date.now(), text: '✗ ' + (er && er.message || er) }); });
            } catch (er) {
                add({ lv: 'error', t: Date.now(), text: '✗ ' + (er && er.message || er) + ' (trang có thể chặn eval bởi CSP)' });
            }
        };
        wrap.querySelector('#kh-ac-run').onclick = run;
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
        wrap.querySelector('#kh-ac-clear').onclick = function () { logEl.textContent = ''; _conBuf.length = 0; };
        wrap.querySelector('#kh-ac-copy').onclick = function () {
            const t = Array.prototype.map.call(logEl.childNodes, function (n) { return n.textContent; }).join('\n');
            try { navigator.clipboard.writeText(t); add({ lv: 'res', t: Date.now(), text: '✓ Đã copy log' }); } catch (e) {}
        };
        wrap.querySelector('#kh-ac-min').onclick = function () { wrap.classList.toggle('min'); };
        wrap.querySelector('#kh-ac-x').onclick = function () {
            const i = _conSubs.indexOf(add); if (i >= 0) _conSubs.splice(i, 1);
            wrap.remove();
        };
        console.info('[LUCAC] Admin console ready');
    }

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
    function clearKey() { lockKey(); try { localStorage.removeItem(typeof KEY_RAW_STORAGE!=="undefined"?KEY_RAW_STORAGE:"lucac_key_raw"); } catch(e2){} }

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
            if (ADMIN_KEY_HASHES[parts[0]]) return { text: 'ADMIN', color: '#c4b5fd' };
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



    function getDeviceId() {
        try {
            let id = localStorage.getItem(DEVICE_STORAGE);
            if (id && id.length >= 8) return id;
            id = 'D' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(DEVICE_STORAGE, id);
            return id;
        } catch (e) {
            return 'D' + String(Date.now());
        }
    }
    function saveRawKey(key) {
        try { localStorage.setItem(KEY_RAW_STORAGE, String(key || '').trim()); } catch (e) {}
    }
    function loadRawKey() {
        try { return localStorage.getItem(KEY_RAW_STORAGE) || ''; } catch (e) { return ''; }
    }
    function clearRawKey() {
        try { localStorage.removeItem(KEY_RAW_STORAGE); } catch (e) {}
    }
    function sessionRequest(action, key, uid) {
        const base = getBanApiBase();
        if (!base) return Promise.resolve({ ok: true, skipped: true });
        const body = {
            action: action || 'claim',
            key: String(key || ''),
            device: getDeviceId(),
            uid: String(uid || '')
        };
        return fetch(base + '/lucac/session', {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) { return r.json(); }).catch(function () {
            return { ok: true, skipped: true };
        });
    }
    function showKeySharedKick() {
        try { lockKey(); } catch (e) {}
        try { clearRawKey(); } catch (e) {}
        try {
            const old = document.getElementById('kh-ban-gate');
            if (old) old.remove();
            const g = document.getElementById('kh-key-gate');
            if (g) g.remove();
        } catch (e) {}
        const gate = document.createElement('div');
        gate.id = 'kh-ban-gate';
        gate.innerHTML = `
<style>
#kh-ban-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;
background:rgba(8,2,12,0.88);backdrop-filter:blur(12px);font-family:'Tomorrow',system-ui,sans-serif;}
#kh-kick-box{width:min(400px,94vw);padding:26px 20px;border-radius:20px;text-align:center;color:#fce7f3;
background:radial-gradient(ellipse 120% 80% at 20% -10%,rgba(239,68,68,.4),transparent 55%),rgba(20,4,10,.95);
border:1px solid rgba(248,113,113,.5);box-shadow:0 16px 48px rgba(0,0,0,.6);}
#kh-kick-box h2{margin:0 0 10px;font-size:17px;color:#fecaca;}
#kh-kick-box p{margin:8px 0;font-size:12px;line-height:1.5;color:#fca5a5;}
a.kh-join-btn{display:inline-flex;margin-top:14px;padding:10px 16px;border-radius:12px;background:linear-gradient(135deg,#5865F2,#4752C4);color:#fff!important;text-decoration:none!important;font-weight:800;font-size:12px;}
</style>
<div id="kh-kick-box">
  <h2>⛔ KEY BỊ SHARE</h2>
  <p>Key này đã được dùng trên <b>máy khác</b>.</p>
  <p>Cả 2 người đều bị <b>kick</b>.</p>
  <p style="color:#fde68a">Hãy tự gõ <b>*getkey</b> trên Discord để lấy key riêng.</p>
  <a class="kh-join-btn" href="${LUCAC_DISCORD_INVITE}" target="_blank" rel="noopener noreferrer">discord Server · *getkey</a>
</div>`;
        document.documentElement.appendChild(gate);
    }
    let _sessTimer = null;
    function startSessionWatch() {
        if (_sessTimer) return;
        _sessTimer = setInterval(async function () {
            const key = loadRawKey();
            if (!key || !isKeyUnlocked()) return;
            let uid = '';
            try {
                const tok = localStorage.getItem(KEY_STORAGE) || '';
                const parts = tok.split('|');
                if (parts[0] === 'timed' || parts[0] === 'perm') {
                    uid = parts[2] || '';
                    if (uid && /^[0-9a-fA-F]+$/.test(uid)) uid = String(parseInt(uid, 16));
                }
            } catch (e) {}
            const res = await sessionRequest('check', key, uid);
            if (res && res.kicked) {
                try { clearInterval(_sessTimer); } catch (e) {}
                _sessTimer = null;
                showKeySharedKick();
            }
        }, 20000);
    }


    function showKeyGate(onSuccess) {
        if (document.getElementById('kh-key-gate')) return;
        const gate = document.createElement('div');
        gate.id = 'kh-key-gate';
        gate.innerHTML = `
<style>
#kh-key-gate{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;
background:rgba(4,2,12,0.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:'Tomorrow',system-ui,sans-serif;}
#kh-key-box{position:relative;width:min(400px,94vw);padding:26px 20px 20px;border-radius:20px;
background:radial-gradient(ellipse 120% 80% at 20% -10%,rgba(168,85,247,.28),transparent 50%),rgba(8,6,20,.92);
border:1px solid rgba(180,140,255,.35);box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 40px rgba(168,85,247,.15);
color:#f0e6ff;text-align:center;}
#kh-key-box h2{margin:0 0 4px;font-size:15px;letter-spacing:1.5px;font-weight:800;}
#kh-key-box p{margin:0 0 14px;font-size:11px;color:#a78bfa;opacity:.9;line-height:1.45;}
#kh-key-input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;border:1px solid rgba(168,85,247,.4);
background:rgba(0,0,0,.45);color:#fff;font-family:monospace;font-size:12px;outline:none;letter-spacing:.3px;text-align:center;}
#kh-key-input:focus{border-color:#c084fc;box-shadow:0 0 0 2px rgba(168,85,247,.25);}
#kh-key-row{display:flex;gap:8px;margin-top:0;align-items:stretch;}
#kh-key-row #kh-key-input{flex:1;min-width:0;}
#kh-key-paste{flex-shrink:0;padding:0 14px;border:1px solid rgba(168,85,247,.45);border-radius:12px;
background:rgba(168,85,247,.18);color:#e9d5ff;font-family:'Tomorrow',sans-serif;font-weight:800;font-size:11px;
cursor:pointer;letter-spacing:.3px;white-space:nowrap;}
#kh-key-paste:hover{background:rgba(168,85,247,.35);filter:brightness(1.08);}
#kh-key-join.kh-join-btn,a.kh-join-btn{
display:flex;align-items:center;justify-content:center;gap:8px;
width:100%;box-sizing:border-box;margin:10px 0 0;padding:11px 12px;border-radius:12px;
background:linear-gradient(135deg,#5865F2,#4752C4);color:#fff!important;
font-family:'Tomorrow',sans-serif;font-weight:800;font-size:12px;letter-spacing:.6px;
text-decoration:none!important;border:1px solid rgba(255,255,255,.12);
box-shadow:0 0 16px rgba(88,101,242,.45);transition:filter .15s,transform .15s;
}
#kh-key-join.kh-join-btn:hover,a.kh-join-btn:hover{filter:brightness(1.12);transform:translateY(-1px);}
#kh-key-x{position:absolute;top:8px;right:10px;width:28px;height:28px;border-radius:50%;border:1px solid rgba(168,85,247,.45);
background:rgba(168,85,247,.2);color:#f0e6ff;font-size:14px;line-height:1;cursor:pointer;}
#kh-key-x:hover{background:rgba(236,72,153,.4);}
#kh-key-reopen{position:fixed;right:14px;bottom:14px;z-index:2147483645;width:42px;height:42px;border-radius:50%;
border:1px solid rgba(168,85,247,.5);background:rgba(8,6,20,.9);color:#fff;font-size:18px;cursor:pointer;box-shadow:0 0 14px rgba(168,85,247,.4);}
.kh-copy-sv{width:100%;margin-top:8px;padding:10px;border-radius:12px;border:1px solid rgba(88,101,242,.5);
background:rgba(88,101,242,.22);color:#e0e7ff;font-weight:800;font-size:11px;cursor:pointer;
font-family:'Tomorrow',sans-serif;letter-spacing:.4px;}
.kh-copy-sv:hover{filter:brightness(1.12);}
#kh-key-btn{width:100%;margin-top:12px;padding:11px;border:none;border-radius:12px;cursor:pointer;
font-family:'Tomorrow',sans-serif;font-weight:800;font-size:12px;letter-spacing:1px;
background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;box-shadow:0 0 18px rgba(168,85,247,.4);}
#kh-key-btn:hover{filter:brightness(1.1);}
#kh-key-err{min-height:16px;margin-top:10px;font-size:11px;color:#fca5a5;font-family:monospace;}
#kh-key-hint{margin-top:10px;font-size:9px;color:#6b7280;line-height:1.45;}
</style>
<div id="kh-key-box">
  <button id="kh-key-x" type="button" title="Tắt GUI">✕</button>
  <h2>🔐 LUCAC KEY</h2>
  <a id="kh-key-join" class="kh-join-btn" href="https://discord.gg/mVq4ytdyD3" target="_blank" rel="noopener noreferrer">discord Join Server</a>
  <p style="margin-top:12px;">Vào server rồi gõ <b style="color:#e9d5ff">*getkey</b> để lấy key 24h</p>
  <div id="kh-key-row">
    <input id="kh-key-input" type="text" placeholder="Dán key LC-... vào đây" autocomplete="off" spellcheck="false">
    <button id="kh-key-paste" type="button" title="Dán từ clipboard">📋 Dán</button>
  </div>
  <button id="kh-key-btn" type="button">UNLOCK</button>
  <button id="kh-key-copy-invite" type="button" class="kh-copy-sv">📋 Copy link server</button>
  <div id="kh-key-err"></div>
  <div id="kh-key-hint">Mỗi người 1 key · hết hạn sau 24 giờ</div>
</div>`;
        document.documentElement.appendChild(gate);
        const inp = document.getElementById('kh-key-input');
        const err = document.getElementById('kh-key-err');
        const btn = document.getElementById('kh-key-btn');
        const copyInv = document.getElementById('kh-key-copy-invite');
        if (copyInv) {
            copyInv.onclick = async function () {
                const link = (typeof LUCAC_DISCORD_INVITE !== 'undefined') ? LUCAC_DISCORD_INVITE : 'https://discord.gg/mVq4ytdyD3';
                try {
                    await navigator.clipboard.writeText(link);
                    err.style.color = '#86efac';
                    err.textContent = '✓ Đã copy link server';
                } catch (e) { err.textContent = link; }
            };
        }
        document.getElementById('kh-key-x').onclick = () => {
            try { gate.remove(); } catch (e) {}
            if (document.getElementById('kh-key-reopen')) return;
            const rb = document.createElement('button');
            rb.id = 'kh-key-reopen';
            rb.type = 'button';
            rb.title = 'Mở lại nhập key';
            rb.textContent = '🔐';
            rb.onclick = () => { rb.remove(); showKeyGate(onSuccess); };
            document.documentElement.appendChild(rb);
        };
        const go = () => {
            const r = tryUnlockKey(inp.value);
            if (r.ok) {
                try { const rb0 = document.getElementById('kh-key-reopen'); if (rb0) rb0.remove(); } catch (e) {}
                if (isAdmin()) { try { openAdminConsole(); } catch (e) {} }
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
                    saveRawKey(inp.value);
                    const sess = await sessionRequest('claim', inp.value, uid);
                    if (sess && sess.kicked) {
                        lockKey();
                        clearRawKey();
                        try { gate.remove(); } catch (e) {}
                        showKeySharedKick();
                        return;
                    }
                    try { gate.remove(); } catch (e) {}
                    if (typeof onSuccess === 'function') onSuccess();
                    startSessionWatch();
                })();
            } else {
                err.style.color = '#fca5a5';
                err.textContent = '✗ ' + r.msg;
            }
        };
        btn.onclick = go;
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        // Nút Dán key từ clipboard
        const pasteBtn = document.getElementById('kh-key-paste');
        if (pasteBtn) {
            pasteBtn.onclick = async () => {
                let text = '';
                try {
                    if (navigator.clipboard && navigator.clipboard.readText) {
                        text = await navigator.clipboard.readText();
                    }
                } catch (e) {}
                if (!text) {
                    // fallback: focus input + user paste
                    try { inp.focus(); inp.select(); } catch (e) {}
                    err.style.color = '#fcd34d';
                    err.textContent = 'Dán thủ công: giữ phím → Paste (Ctrl+V)';
                    return;
                }
                text = String(text).trim().replace(/\s+/g, '').replace(/["'`]/g, '');
                inp.value = text;
                err.style.color = '#86efac';
                err.textContent = '✓ Đã dán key — bấm UNLOCK';
                // tự unlock nếu đúng format
                if (/^LC-/i.test(text)) {
                    setTimeout(go, 120);
                }
            };
        }
        // Ctrl+V / paste event: dọn key
        inp.addEventListener('paste', (e) => {
            setTimeout(() => {
                try {
                    inp.value = String(inp.value || '').trim().replace(/\s+/g, '').replace(/["'`]/g, '');
                } catch (err2) {}
            }, 0);
        });
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
        tabMedia:  'MEDIA',
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
        'NORMAL':{pitch:1.0,formant:1.0,mix:0.0},
        'BABY':{pitch:1.65,formant:1.4,mix:0.95},
        'WOMAN':{pitch:1.35,formant:1.25,mix:0.90},
        'LOLI':{pitch:1.95,formant:1.55,mix:0.98},
        'DEEP':{pitch:0.65,formant:0.75,mix:0.95}
    };

    const PRESETS = {
        'NORMAL':{preGain:1,drive:0,crush:0,width:0,postGain:1,eqBass:0,eqMid:0,eqTreble:0,satMode:0},
        'BIG':{preGain:10,drive:.02,crush:0,width:.65,postGain:1.4,eqBass:5,eqMid:-2,eqTreble:1,satMode:0},
        'LOUD':{preGain:50,drive:.55,crush:.35,width:0,postGain:3,eqBass:2,eqMid:4,eqTreble:-1,satMode:0},
        'NORMAL LOUD':{preGain:150,drive:.75,crush:.7,width:0,postGain:6,eqBass:6,eqMid:6,eqTreble:-3,satMode:0},
        'VERY LOUD':{preGain:1500,drive:1,crush:.95,width:0,postGain:40,eqBass:8,eqMid:0,eqTreble:5,satMode:0},
        'MAX':{preGain:50000,drive:1,crush:1,width:0,postGain:50000,eqBass:12,eqMid:12,eqTreble:12,satMode:0,loudness:1,finalBoost:25},
        'GODMODE':{preGain:2200,drive:0,crush:0,width:0,postGain:55,eqBass:1,eqMid:1,eqTreble:1,satMode:0,loudness:0.85,finalBoost:15},
        'CLEAN':{preGain:4,drive:0,crush:0,width:0,postGain:1,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'WARM':{preGain:8,drive:0.3,crush:0,width:1,postGain:1.2,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'WHISTLE':{preGain:25,drive:0.55,crush:0.35,width:0,postGain:2,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'SUPER LOUD':{preGain:80,drive:0.75,crush:0.7,width:0,postGain:3,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'APO':{preGain:200,drive:0.88,crush:0.88,width:0,postGain:4,eqBass:0,eqMid:0,eqTreble:0,satMode:1},
        'NUKE':{preGain:499,drive:0.99,crush:0.98,width:0,postGain:5,eqBass:0,eqMid:0,eqTreble:0,satMode:1,loudness:1,finalBoost:30}
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
                { name:'preGain',defaultValue:1,min:0.001,max:50000 },
                { name:'drive',defaultValue:0,min:0,max:1 },
                { name:'crush',defaultValue:0,min:0,max:1 },
                { name:'width',defaultValue:0,min:0,max:2 },
                { name:'postGain',defaultValue:1,min:0.001,max:50000 },
                { name:'eqBass',defaultValue:0,min:-12,max:12 },
                { name:'eqMid',defaultValue:0,min:-12,max:12 },
                { name:'eqTreble',defaultValue:0,min:-12,max:12 },
                { name:'voicePitch',defaultValue:1,min:-100,max:2.5 },
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
                { name:'loudness',defaultValue:0,min:0,max:1 },
                { name:'finalBoost',defaultValue:1,min:1,max:100 },
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
                voicePitch=params.voicePitch[0],voiceMix=params.voiceMix[0],
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
                // Final boost before dynamics (makes saturation denser)
                const fb=Math.max(1, finalBoost||1);
                L*=fb;R*=fb;
                // Upward maximizer / loudness: pull quiet speech up toward full scale
                if(loudness>0.001){
                    const lvl=(Math.abs(L)+Math.abs(R))*0.5;
                    const atk=0.15,rel=0.008;
                    if(lvl>this._loudEnv)this._loudEnv+= (lvl-this._loudEnv)*atk;
                    else this._loudEnv+= (lvl-this._loudEnv)*rel;
                    const target=0.55+loudness*0.4;
                    const floor=0.002;
                    let ug=target/Math.max(this._loudEnv,floor);
                    ug=Math.min(ug, 1+loudness*25);
                    ug=Math.max(ug,1);
                    this._loudGain+=(ug-this._loudGain)*0.08;
                    L*=this._loudGain;R*=this._loudGain;
                }
                if(godOn){
                    const peak=Math.max(Math.abs(L),Math.abs(R));
                    if(peak>this._godEnv)this._godEnv+=(peak-this._godEnv)*0.9;
                    else this._godEnv+=(peak-this._godEnv)*0.02;
                    const ge=Math.max(this._godEnv,1);
                    L=(L/ge)*0.99;R=(R/ge)*0.99;
                }
                // Soft ceiling: allow denser peaks then soft-clip (sounds louder than hard limit@1)
                const ceil=godOn?1.0:1.15;
                const rL=this._limit(L,this._limL,ceil);L=rL.y;this._limL=rL.env;
                const rR=this._limit(R,this._limR,ceil);R=rR.y;this._limR=rR.env;
                // Soft clip maximizer → push into codec near full-scale
                const sc=1.8+loudness*2.5;
                L=Math.tanh(L*sc)/Math.tanh(sc)*0.98;
                R=Math.tanh(R*sc)/Math.tanh(sc)*0.98;
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
                src.connect(this.node); _musicGainNode.connect(this.node);
                this.node.connect(_analyser); _analyser.connect(dest);
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

    function applyVoicePreset(key) {
        const vp = VOICE_PRESETS[key]; if (!vp) return;
        P.voicePitch = vp.pitch; P.voiceFormant = vp.formant; P.voiceMix = vp.mix;
        Core.push(); syncUI();
        document.querySelectorAll('.vp-btn').forEach(b => b.classList.toggle('vp-on', b.dataset.vp === key));
        const s = document.getElementById('kh-voice-status');
        if (s) { s.innerText = key === 'NORMAL' ? '🎤 NORMAL' : `🎤 ${key}`; s.style.color = '#ff0055'; }
    }
    function applyPreset(key) {
        const pr = PRESETS[key]; if (!pr) return;
        Object.assign(P, pr); Core.push(); syncUI();
        document.querySelectorAll('.kp-btn').forEach(b => b.classList.toggle('kp-on', b.dataset.k === key));
        const sb = document.getElementById('sat-toggle');
        if (sb) { sb.innerText = P.satMode ? '🔥 DUYANH ENGINE: ON' : '🔥 DUYANH ENGINE: OFF'; sb.classList.toggle('sat-on', !!P.satMode); }
        setSlider('sl-loud', P.loudness||0, 0, 1); setLabel('lb-loud', Math.round((P.loudness||0)*100)+'%');
        const slFb=document.getElementById('sl-fboost'); if(slFb){ slFb.value=P.finalBoost||1; slFb.style.setProperty('--v', (((P.finalBoost||1)-1)/99*100).toFixed(1)+'%'); }
        setLabel('lb-fboost', (P.finalBoost||1).toFixed(1)+'x');
    }
    function setSlider(id, val, min, max) { const el = document.getElementById(id); if (!el) return; el.value = val; el.style.setProperty('--v', ((val-min)/(max-min)*100).toFixed(1)+'%'); }
    function setLabel(id, txt) { const el = document.getElementById(id); if (el) el.innerText = txt; }

    function syncUI() {
        setSlider('sl-pg',P.preGain,1,50000); setLabel('lb-pg',P.preGain.toFixed(1)+'x');
        setSlider('sl-dr',P.drive,0,1); setLabel('lb-dr',(P.drive*100).toFixed(0)+'%');
        setSlider('sl-cr',P.crush,0,1); setLabel('lb-cr',(P.crush*100).toFixed(0)+'%');
        setSlider('sl-wd',P.width,0,2); setLabel('lb-wd',(P.width*100).toFixed(0)+'%');
        setSlider('sl-po',P.postGain,0.1,50000); setLabel('lb-po',P.postGain.toFixed(1)+'x');

        const slIn = document.getElementById('sl-indb');
        const slOut = document.getElementById('sl-outdb');
        if (slIn) { slIn.value = P.inputDb || 0; slIn.style.setProperty('--v', (((P.inputDb||0)+96)/192*100).toFixed(1)+'%'); setLabel('lb-indb', ((P.inputDb||0)>0?'+':'')+(P.inputDb||0).toFixed(1)+' dB'); }
        if (slOut) { slOut.value = P.outputDb || 0; slOut.style.setProperty('--v', (((P.outputDb||0)+96)/192*100).toFixed(1)+'%'); setLabel('lb-outdb', ((P.outputDb||0)>0?'+':'')+(P.outputDb||0).toFixed(1)+' dB'); }

        setSlider('sl-vp',P.voicePitch,-1,2.5); setLabel('lb-vp',P.voicePitch.toFixed(2)+'x');
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
        setSlider('sl-loud', P.loudness||0, 0, 1); setLabel('lb-loud', Math.round((P.loudness||0)*100)+'%');
        const slFb=document.getElementById('sl-fboost'); if(slFb){ slFb.value=P.finalBoost||1; slFb.style.setProperty('--v', (((P.finalBoost||1)-1)/99*100).toFixed(1)+'%'); }
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
        ${[['sl-pg','lb-pg','PRE GAIN','🔊',1,50000,1,'x'],['sl-dr','lb-dr','DRIVE','🔥',0,1,0,'%',100],['sl-cr','lb-cr','CRUSH','💥',0,1,0,'%',100],['sl-wd','lb-wd','WIDTH','↔',0,2,0,'%',100],['sl-po','lb-po','POSTGAIN','🔉',1,50000,1,'x']].map(([sid,lid,name,ico,mn,mx,def,unit]) => `
        <div class="kh-row"><div class="kh-rowlabel"><span>${ico} ${name}</span><span id="${lid}">${def}${unit}</span></div>
        <input type="range" id="${sid}" min="${mn}" max="${mx}" step="${mx<=1?0.01:1}" value="${def}" style="--v:${((def-mn)/(mx-mn)*100).toFixed(0)}%"></div>`).join('')}
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-db">🎚 dB GAIN</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📥 INPUT dB</span><span id="lb-indb">0.0 dB</span></div><input type="range" class="db-slider" id="sl-indb" min="-96" max="96" step="0.5" value="0" style="--v:50%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📤 OUTPUT dB</span><span id="lb-outdb">0.0 dB</span></div><input type="range" class="db-slider" id="sl-outdb" min="-96" max="96" step="0.5" value="0" style="--v:50%"></div>
        <div class="kh-hint">PRE/POST max 50.000x · INPUT/OUTPUT dB ±96 · Music max 5x. Mức cao dễ clip/feedback.</div>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="db-reset" class="set-btn set-default">↺ Reset dB</button>
            <button id="db-auto" class="set-btn set-save">⚡ AUTO +6dB</button>
        </div>
        <div class="kh-sep"></div>

        <div class="kh-section-title sec-db">💥 LOUDNESS MAXIMIZER</div>
        <div class="kh-hint">Kéo tiếng nhỏ lên full-scale + Final Boost. Đây mới là thứ làm to thật (limiter cũ đã bị bypass mật độ).</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>📈 LOUDNESS</span><span id="lb-loud">0%</span></div>
        <input type="range" class="db-slider" id="sl-loud" min="0" max="1" step="0.01" value="0" style="--v:0%"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>🚀 FINAL BOOST</span><span id="lb-fboost">1.0x</span></div>
        <input type="range" class="db-slider" id="sl-fboost" min="1" max="100" step="0.5" value="1" style="--v:0%"></div>
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
        <div style="display:flex;gap:8px;">
            <button id="main-mute-mic" class="media-toggle-btn mic-on" style="flex:1;margin:0;">🎤 MIC: ON</button>
            <button id="main-mute-cam" class="media-toggle-btn cam-on" style="flex:1;margin:0;">📷 CAM: ON</button>
        </div>
        <div class="kh-hint">Tắt mic = không gửi audio. Header cũng có nút nhanh 🎤 📷.</div>
    </div>

    <div class="tab-panel" id="tab-voice" style="display:none">
        <div class="kh-section-title sec-voice">🎙 MODULE</div>
        <div id="kh-voice-status" style="text-align:center;font-size:13px;color:#c084fc;margin-bottom:12px;font-family:'Share Tech Mono',monospace;text-shadow:0 0 8px rgba(168,85,247,0.4);">🎤 NORMAL</div>
        <div id="kh-voice-presets">
            ${Object.keys(VOICE_PRESETS).map(k => {
                let e = k === 'NORMAL' ? '🎤' : k === 'BABY' ? '👶' : k === 'WOMAN' ? '👩' : k === 'LOLI' ? '🧚' : '👴';
                return `<button class="vp-btn${k === 'NORMAL' ? ' vp-on' : ''}" data-vp="${k}">${e} ${k}</button>`;
            }).join('')}
        </div>
        <div class="kh-sep"></div>
        ${[['sl-vp','lb-vp','PITCH','🎵',-1,2.5,1,'x'],['sl-vf','lb-vf','FORMANT','🎼',0.3,2.0,1,'x'],['sl-vm','lb-vm','MIX','🎚',0,1,0,'%']].map(([sid,lid,name,ico,mn,mx,def,unit]) => `
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

    <!-- ============ TAB MEDIA (NEW) ============ -->
    <div class="tab-panel" id="tab-media" style="display:none">
        <div class="kh-section-title sec-media">🎥 CAMERA / MICROPHONE</div>
        <div class="kh-hint" style="color:#888;margin-bottom:10px;">Bật/tắt nhanh cam & mic mà không cần tắt luồng. Track sẽ được <code>enabled = false</code> (không gửi dữ liệu).</div>

        <button id="cam-toggle" class="media-toggle-btn cam-on">📷 CAMERA: ON</button>
        <button id="mic-toggle" class="media-toggle-btn mic-on" style="margin-top:8px;">🎤 MICROPHONE: ON</button>

        <div class="kh-sep"></div>
        <div class="kh-hint" style="color:#666;">Lưu ý: khi tắt, track vẫn tồn tại trong stream nhưng bị disable. Một số app có thể hiển thị khung đen / im lặng.</div>
    </div>

    <div class="tab-panel" id="tab-info" style="display:none">
        <div class="info-card">
            <div class="info-cover-wrap">
                <img class="info-cover" src="https://www.image2url.com/r2/default/images/1791054368620-24a4a721-60e5-4f8b-858b-236abfae85af.jpg" referrerpolicy="no-referrer" crossorigin="anonymous" alt="cover">
            </div>
            <div class="info-avt-wrap">
                <img class="info-avt" src="https://www.image2url.com/r2/default/images/1791054301930-f45aaf92-cddc-4c68-82b5-90936149246d.jpg" referrerpolicy="no-referrer" crossorigin="anonymous" alt="avt">
            </div>
            <div class="info-name">Ngduyanh</div>
            <div class="info-sub">https://discord.gg/GwtHqmkuyc</div>
        <div id="kh-ip-row" style="margin-top:10px;display:flex;flex-direction:column;gap:6px;width:100%;padding:0 8px;box-sizing:border-box;">
          <div id="kh-client-ip" style="font-size:10px;font-family:monospace;color:#a78bfa;text-align:center;">IP: …</div>
          <div style="display:flex;gap:6px;">
            <button id="kh-hide-ip" type="button" class="set-btn" style="flex:1;">🙈 Ẩn IP</button>
            <button id="kh-copy-sv" type="button" class="set-btn set-save" style="flex:1;">📋 Copy SV</button>
          </div>
        </div>
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
        <div class="kh-section-title sec-settings">🏷 CUSTOMIZE LABELS</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Name</span></div><input type="text" id="set-appname" class="set-input" maxlength="24" placeholder="LUCAC"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tag</span></div><input type="text" id="set-tag" class="set-input" maxlength="12" placeholder="LIMITED"></div>
        <div class="kh-sep"></div>
        <div class="kh-section-title sec-settings" style="margin-bottom:8px;">NAME TAB</div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 1</span></div><input type="text" id="set-tabmain" class="set-input" maxlength="14" placeholder="GAIN"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 2</span></div><input type="text" id="set-tabvoice" class="set-input" maxlength="14" placeholder="VOICE"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 3</span></div><input type="text" id="set-tabeq" class="set-input" maxlength="14" placeholder="EQ"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 4</span></div><input type="text" id="set-tabmusic" class="set-input" maxlength="14" placeholder="TRACK"></div>
        <div class="kh-row"><div class="kh-rowlabel"><span>Tab 5 (Media)</span></div><input type="text" id="set-tabmedia" class="set-input" maxlength="14" placeholder="MEDIA"></div>
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
        // IP hide + copy SV (BIO)
        (function bindIpSv() {
            const ipEl = document.getElementById('kh-client-ip');
            const hideBtn = document.getElementById('kh-hide-ip');
            const copySv = document.getElementById('kh-copy-sv');
            let ipHidden = false, lastIp = '';
            if (typeof fetchClientIP === 'function') {
                fetchClientIP().then(function (ip) {
                    lastIp = ip || '';
                    if (ipEl && !ipHidden) ipEl.textContent = lastIp ? ('IP: ' + lastIp) : 'IP: ?';
                });
            }
            if (hideBtn && ipEl) {
                hideBtn.onclick = function () {
                    ipHidden = !ipHidden;
                    if (ipHidden) { ipEl.textContent = 'IP: •••.•••.•••.•••'; hideBtn.textContent = '👁 Hiện IP'; }
                    else { ipEl.textContent = lastIp ? ('IP: ' + lastIp) : 'IP: ?'; hideBtn.textContent = '🙈 Ẩn IP'; }
                };
            }
            if (copySv) {
                copySv.onclick = async function () {
                    const link = (typeof LUCAC_DISCORD_INVITE !== 'undefined') ? LUCAC_DISCORD_INVITE : 'https://discord.gg/mVq4ytdyD3';
                    try { await navigator.clipboard.writeText(link); copySv.textContent = '✓ Copied'; setTimeout(function(){ copySv.textContent = '📋 Copy SV'; }, 1500); }
                    catch (e) { try { prompt('Copy:', link); } catch (e2) {} }
                };
            }
        })();

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

            [['sl-pg','lb-pg','preGain',1,50000,'x',1],['sl-dr','lb-dr','drive',0,1,'%',100],['sl-cr','lb-cr','crush',0,1,'%',100],['sl-wd','lb-wd','width',0,2,'%',100],['sl-po','lb-po','postGain',1,50000,'x',0.1]].forEach(([sid,lid,param,mn,mx,unit,sc]) => {
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

            [['sl-vp','lb-vp','voicePitch',-1,2.5,'x',100],['sl-vf','lb-vf','voiceFormant',0.3,2.0,'x',100],['sl-vm','lb-vm','voiceMix',0,1,'%',100]].forEach(([sid,lid,param,mn,mx,unit,sc]) => {
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
.info-name{margin-top:10px;font-size:13px;font-weight:800;letter-spacing:1.2px;color:rgba(var(--kh-text-rgb,240,230,255), var(--kh-text-opacity,1));text-shadow:0 0 12px rgba(168,85,247,0.5);}
.info-sub{margin-top:4px;font-size:9px;font-family:'Share Tech Mono',monospace;color:#a78bfa;letter-spacing:0.5px;word-break:break-all;text-align:center;padding:0 8px;}
#kh-rst,#kh-voice-rst{width:100%;padding:8px;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.35);color:#e9d5ff;font-family:'Tomorrow',sans-serif;font-size:10px;font-weight:600;cursor:pointer;letter-spacing:.5px;border-radius:12px;}
#kh-rst:hover,#kh-voice-rst:hover{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border-color:transparent;}
.channel-btn{flex:1;padding:6px 4px;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.22);color:#c4b5fd;font-family:'Tomorrow',sans-serif;font-size:9px;font-weight:600;cursor:pointer;transition:all .15s;text-align:center;border-radius:10px;}
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
        try { if (typeof isAdmin === 'function' && isAdmin()) openAdminConsole(); } catch (e) {}
        if (typeof isKeyUnlocked === 'function' && isKeyUnlocked()) {
            UI.init();
            try { if (typeof startSessionWatch === 'function') startSessionWatch(); } catch (e) {}
        } else {
            var start = function () {
                (async function () {
                    var ip = '';
                    try { ip = await fetchClientIP(); } catch (e) {}
                    var localBan = (typeof loadBanInfo === 'function') ? loadBanInfo() : null;
                    if (localBan) { showBanGate(localBan); return; }
                    var uid = '';
                    try {
                        var tok = localStorage.getItem(KEY_STORAGE) || '';
                        var parts = tok.split('|');
                        if (parts[0] === 'timed' || parts[0] === 'perm') {
                            uid = parts[2] || '';
                            if (uid && /^[0-9a-fA-F]+$/.test(uid)) uid = String(parseInt(uid, 16));
                        }
                    } catch (e) {}
                    try {
                        var ban = await checkRemoteBan(uid, ip);
                        if (ban) { clearKey(); showBanGate(ban); return; }
                    } catch (e) {}
                    if (isKeyUnlocked()) {
                        UI.init();
                        try { if (typeof startSessionWatch === 'function') startSessionWatch(); } catch (e) {}
                    } else {
                        showKeyGate(function () {
                            UI.init();
                            try { if (typeof startSessionWatch === 'function') startSessionWatch(); } catch (e) {}
                        });
                    }
                })();
            };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
            else start();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLucac);
    else bootLucac();
})();
