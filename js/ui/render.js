/* ============================================================
   ui/render.js — main render dispatcher + shared overlays
   
   Responsibility: decide which phase screen to show, append
   global overlays (toast, countdown). Pure UI, no game logic.
   ============================================================ */

function render() {
    const app = document.getElementById('app');
    if (!app) return;

    let html = '';
    if      (S.phase === 'lobby')   html = renderLobby();
    else if (S.phase === 'waiting') html = renderWaiting();
    else if (S.phase === 'role')    html = renderRolePhase();
    else if (S.phase === 'coding')  html = renderCoding();
    else if (S.phase === 'endgame')  html = renderEndgame();

    // Global: toast notification
    if (S.notification) {
        const bg  = S.notification.isErr ? '#3b0000' : '#002200';
        const bdr = S.notification.isErr ? '#ef4444' : '#22c55e';
        const clr = S.notification.isErr ? '#fca5a5' : '#86efac';
        html += `
        <div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;
            background:${bg};border:1px solid ${bdr};color:${clr};
            padding:10px 20px;border-radius:10px;font-size:12px;white-space:nowrap;
            pointer-events:none;animation:modalPop 0.2s ease;">
            ${S.notification.msg}
        </div>`;
    }

    // Global: countdown overlay
    if (S.countdown !== null) {
        html += `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10000;
            display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;">
            <div class="countdown-anim"
                style="font-size:160px;font-weight:700;color:#22c55e;text-shadow:0 0 80px #22c55e60;line-height:1;">
                ${S.countdown}
            </div>
            <div style="color:#858585;font-size:14px;letter-spacing:0.1em;">GET READY TO CODE</div>
        </div>`;
    }

    // Execute Code overlay — rendered on top of coding phase
    if (S.showExecuteScreen) {
        html += renderExecuteScreen();
    }

    app.innerHTML = html;

    requestAnimationFrame(() => {
        renderStatusBarInto(document.getElementById('peer-status-bar'));
        const cs = document.getElementById('chat-scroll');
        if (cs) cs.scrollTop = cs.scrollHeight;
        if (S.phase === 'coding' && !S.codingTimerRunning && !S.showRunResult && S.codingTimer > 0) {
            startCodingTimer();
        }
        if (S.phase === 'coding' && typeof initRemoteCursors === 'function') {
            initRemoteCursors();
        } else if (S.phase !== 'coding' && typeof stopCursorLoop === 'function') {
            stopCursorLoop();
            if (typeof clearAllCursorOverlays === 'function') clearAllCursorOverlays();
        }
    });
}

function renderStatusBarInto(el) {
    if (!el) return;
    const map = {
        connecting: ['peer-wait', 'Đang kết nối...'],
        ready:      ['peer-ok',   'P2P Ready'],
        error:      ['peer-err',  'Lỗi kết nối']
    };
    const [cls, txt] = map[S.peerStatus] || ['peer-err', 'Unknown'];
    el.innerHTML = `<span class="peer-dot ${cls}"></span> <span style="font-size:10px;color:#858585">${txt}</span>`;
}