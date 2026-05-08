/* ============================================================
   ui/remote-cursors.js  — Remote Cursor System
   Hiển thị con trỏ nhấp nháy của các player khác đang edit
   cùng file, mỗi người một màu riêng.

   Cách hoạt động:
   1. Khi player gõ/click/move caret → gửi CURSOR_UPDATE qua P2P
      (peerId, file, offset = vị trí caret trong textarea text)
   2. Peer nhận → lưu vào S.remoteCursors[peerId]
   3. requestAnimationFrame loop tính pixel position từ offset
      rồi di chuyển <div> cursor overlay lên đúng chỗ

   Kỹ thuật tính pixel position:
   - Tạo một <div> "mirror" ẩn có cùng font/size/padding với textarea
   - Clone text đến vị trí offset vào mirror, đo getBoundingClientRect
      của marker span để lấy top/left chính xác
   ============================================================ */

// ── State ──────────────────────────────────────────────────────
// S.remoteCursors = { [peerId]: { name, color, file, offset, lastSeen } }

const CURSOR_THROTTLE_MS = 80;   // gửi tối đa ~12 lần/giây
const CURSOR_TIMEOUT_MS  = 5000; // ẩn cursor nếu 5s không có tín hiệu

let _lastCursorSend   = 0;
let _cursorRafId      = null;
let _mirrorDiv        = null;

// ── Init ────────────────────────────────────────────────────────
function initRemoteCursors() {
    if (!S.remoteCursors) S.remoteCursors = {};

    // Tạo mirror div ẩn để đo pixel position
    if (!_mirrorDiv) {
        _mirrorDiv = document.createElement('div');
        _mirrorDiv.id = 'cursor-mirror';
        _mirrorDiv.setAttribute('aria-hidden', 'true');
        Object.assign(_mirrorDiv.style, {
            position:      'absolute',
            top:           '-9999px',
            left:          '-9999px',
            visibility:    'hidden',
            pointerEvents: 'none',
            whiteSpace:    'pre-wrap',
            wordBreak:     'break-all',
            overflowWrap:  'break-word',
            boxSizing:     'border-box',
        });
        document.body.appendChild(_mirrorDiv);
    }

    _startCursorLoop();
}

// ── Broadcast local cursor ───────────────────────────────────────
/**
 * Gọi khi textarea có sự kiện keyup/click/selectionchange.
 * Throttle để không flood network.
 */
function broadcastCursor(textarea) {
    const now = Date.now();
    if (now - _lastCursorSend < CURSOR_THROTTLE_MS) return;
    _lastCursorSend = now;

    if (!textarea) return;
    const offset = textarea.selectionStart;
    const textBefore = textarea.value.slice(0, offset);
    const lines = textBefore.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    if (typeof sendToAll === 'function') {
        sendToAll({
            type:    'CURSOR_UPDATE',
            peerId:  S.peerId,
            name:    S.myName,
            color:   S.myColor,
            file:    S.currentFile,
            offset,
            line,
            column,
        });
    }
}

// ── Receive remote cursor ────────────────────────────────────────
function handleRemoteCursor(data) {
    if (!data.peerId || data.peerId === S.peerId) return;
    if (!S.remoteCursors) S.remoteCursors = {};
    S.remoteCursors[data.peerId] = {
        name:     data.name  || 'Player',
        color:    data.color || '#ffffff',
        file:     data.file  || S.currentFile,
        offset:   typeof data.offset === 'number' ? data.offset : 0,
        line:     typeof data.line === 'number' ? data.line : null,
        column:   typeof data.column === 'number' ? data.column : null,
        lastSeen: Date.now(),
    };
}

function handleRemoteCursorLeave(data) {
    if (S.remoteCursors && data.peerId) {
        delete S.remoteCursors[data.peerId];
        _removeCursorEl(data.peerId);
    }
}

// ── RAF loop — reposition overlays every frame ───────────────────
function _startCursorLoop() {
    if (_cursorRafId) cancelAnimationFrame(_cursorRafId);
    const tick = () => {
        _updateAllCursorOverlays();
        _cursorRafId = requestAnimationFrame(tick);
    };
    _cursorRafId = requestAnimationFrame(tick);
}

function stopCursorLoop() {
    if (_cursorRafId) { cancelAnimationFrame(_cursorRafId); _cursorRafId = null; }
}

// ── Overlay management ───────────────────────────────────────────
function _updateAllCursorOverlays() {
    const ta = document.getElementById('code-editor-area');
    if (!ta || !S.remoteCursors) return;

    const now = Date.now();

    Object.entries(S.remoteCursors).forEach(([peerId, cur]) => {
        // Timeout: ẩn cursor cũ
        if (now - cur.lastSeen > CURSOR_TIMEOUT_MS) {
            _removeCursorEl(peerId);
            return;
        }

        // Chỉ hiển thị cursor trên file đang mở
        if (cur.file !== S.currentFile) {
            _removeCursorEl(peerId);
            return;
        }

        const pos = _getPixelPosition(ta, cur);
        if (!pos) { _removeCursorEl(peerId); return; }

        _upsertCursorEl(peerId, cur, pos, ta);
    });
}

/**
 * Tính pixel {top, left, lineHeight} của offset trong textarea,
 * tương đối với container cha (#editor-wrapper).
 */
function _getPixelPosition(ta, cur) {
    const wrapper = document.getElementById('editor-wrapper');
    if (!wrapper) return null;

    const taRect = ta.getBoundingClientRect();
    const wrRect = wrapper.getBoundingClientRect();
    const cs = window.getComputedStyle(ta);
    const fontSize = parseFloat(cs.fontSize) || 13;
    const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.4;
    const paddingTop = parseFloat(cs.paddingTop) || 0;
    const paddingLeft = parseFloat(cs.paddingLeft) || 0;
    const borderTop = parseFloat(cs.borderTopWidth) || 0;
    const borderLeft = parseFloat(cs.borderLeftWidth) || 0;
    const charWidth = _measureCharWidth(ta, cs);

    let line = cur.line;
    let column = cur.column;
    if (line === null || column === null) {
        const before = (ta.value || '').slice(0, cur.offset || 0).split('\n');
        line = before.length - 1;
        column = before[before.length - 1].length;
    }

    const visibleTop = paddingTop + borderTop + (line * lineHeight) - ta.scrollTop;
    const visibleLeft = paddingLeft + borderLeft + (column * charWidth) - ta.scrollLeft;
    const top = (taRect.top - wrRect.top) + visibleTop;
    const left = (taRect.left - wrRect.left) + visibleLeft;

    if (top < taRect.top - wrRect.top - lineHeight || top > taRect.bottom - wrRect.top) return null;
    return { top, left, lineHeight };
}

function _measureCharWidth(ta, cs) {
    if (!_mirrorDiv) return parseFloat(cs.fontSize) * 0.6;
    _mirrorDiv.textContent = 'mmmmmmmmmm';
    _mirrorDiv.style.position = 'fixed';
    _mirrorDiv.style.visibility = 'hidden';
    _mirrorDiv.style.whiteSpace = 'pre';
    _mirrorDiv.style.fontFamily = cs.fontFamily;
    _mirrorDiv.style.fontSize = cs.fontSize;
    _mirrorDiv.style.fontWeight = cs.fontWeight;
    _mirrorDiv.style.fontStyle = cs.fontStyle;
    _mirrorDiv.style.letterSpacing = cs.letterSpacing;
    document.body.appendChild(_mirrorDiv);
    return _mirrorDiv.getBoundingClientRect().width / 10;
}

function _escapeHtml(str) {
    return str
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/ /g,  '&nbsp;')
        .replace(/\n/g, '<br>');
}

/**
 * Tạo hoặc cập nhật cursor overlay element cho một peer.
 */
function _upsertCursorEl(peerId, cur, pos, ta) {
    const wrapperId = 'editor-wrapper';
    const wrapper   = document.getElementById(wrapperId);
    if (!wrapper) return;

    const elId = 'remote-cursor-' + peerId.replace(/[^a-z0-9]/gi, '_');
    let el = document.getElementById(elId);

    if (!el) {
        el = document.createElement('div');
        el.id = elId;
        el.className = 'remote-cursor-container';
        el.setAttribute('aria-hidden', 'true');

        // Cursor bar (nhấp nháy)
        const bar = document.createElement('div');
        bar.className = 'remote-cursor-bar';
        bar.style.background = cur.color;
        bar.style.boxShadow  = `0 0 6px ${cur.color}`;

        // Label tag
        const label = document.createElement('div');
        label.className = 'remote-cursor-label';
        label.style.background   = cur.color;
        label.style.color        = _contrastColor(cur.color);
        label.textContent        = cur.name;

        el.appendChild(bar);
        el.appendChild(label);
        wrapper.appendChild(el);
    }

    // Update color (in case player changed)
    const bar   = el.querySelector('.remote-cursor-bar');
    const label = el.querySelector('.remote-cursor-label');
    if (bar) {
        bar.style.background = cur.color;
        bar.style.boxShadow  = `0 0 6px ${cur.color}80`;
        bar.style.height     = pos.lineHeight + 'px';
    }
    if (label) {
        label.style.background = cur.color;
        label.style.color      = _contrastColor(cur.color);
        label.textContent      = cur.name;
    }

    // Position — clamped to textarea visible area
    const taEl     = ta;
    const taWrapper = taEl.parentElement;
    const maxTop  = taWrapper ? taWrapper.offsetHeight - pos.lineHeight : 9999;
    const maxLeft = taWrapper ? taWrapper.offsetWidth - 2 : 9999;

    const clampedTop  = Math.max(0, Math.min(pos.top,  maxTop));
    const clampedLeft = Math.max(0, Math.min(pos.left, maxLeft));

    el.style.top     = clampedTop  + 'px';
    el.style.left    = clampedLeft + 'px';
    el.style.display = 'block';
}

function _removeCursorEl(peerId) {
    const elId = 'remote-cursor-' + peerId.replace(/[^a-z0-9]/gi, '_');
    const el   = document.getElementById(elId);
    if (el) el.remove();
}

/** Xóa toàn bộ cursor overlay (khi rời coding phase) */
function clearAllCursorOverlays() {
    document.querySelectorAll('.remote-cursor-container').forEach(el => el.remove());
}

/** Tính màu text tương phản trên nền màu player */
function _contrastColor(hex) {
    const r = parseInt(hex.slice(1,3),16) || 0;
    const g = parseInt(hex.slice(3,5),16) || 0;
    const b = parseInt(hex.slice(5,7),16) || 0;
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    return luminance > 0.55 ? '#111111' : '#ffffff';
}

// ── Remove cursors of disconnected players ───────────────────────
function removePlayerCursor(peerId) {
    if (S.remoteCursors) delete S.remoteCursors[peerId];
    _removeCursorEl(peerId);
}
