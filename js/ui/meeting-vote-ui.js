/* ============================================================
   ui/meeting-vote-ui.js  [UI]
   Hai component liên quan đến vote cuộc họp:
     1. buildMeetingPrompt()  — box nhỏ hỏi người bấm MEETING
     2. buildMeetingVoteBanner() — banner góc trên cho mọi người
   ============================================================ */

// ── Prompt nhỏ: chỉ hiện với người vừa bấm MEETING ───────────
// Không fullscreen, không overlap nặng — compact 260×120px
function buildMeetingPrompt() {
    if (!S.showMeetingPrompt) return '';
    return `
    <div style="position:fixed;top:52px;right:100px;z-index:200;
        background:#252526;border:1px solid #f59e0b;border-radius:14px;
        padding:14px 16px;width:264px;box-shadow:0 8px 32px rgba(0,0,0,0.6);
        animation:modalPop 0.15s ease;">
        <div style="font-size:12px;color:white;font-weight:500;margin-bottom:4px;">🗣️ Cuộc họp khẩn</div>
        <div style="font-size:11px;color:#858585;margin-bottom:14px;">Bạn có muốn bắt đầu cuộc họp?</div>
        <div style="display:flex;gap:8px;">
            <!-- ✓ Có -->
            <button onclick="castMeetingVote('yes')"
                style="flex:1;height:36px;background:#22c55e;color:#000;border:none;border-radius:10px;
                font-size:16px;cursor:pointer;font-family:'JetBrains Mono',monospace;
                display:flex;align-items:center;justify-content:center;gap:6px;font-weight:600;
                transition:background 0.1s;" onmouseover="this.style.background='#16a34a'"
                onmouseout="this.style.background='#22c55e'">
                ✓ <span style="font-size:11px;">Có</span>
            </button>
            <!-- ✕ Không -->
            <button onclick="castMeetingVote('no')"
                style="flex:1;height:36px;background:#37373d;color:#ccc;border:none;border-radius:10px;
                font-size:16px;cursor:pointer;font-family:'JetBrains Mono',monospace;
                display:flex;align-items:center;justify-content:center;gap:6px;
                transition:background 0.1s;" onmouseover="this.style.background='#ef4444';this.style.color='#fff'"
                onmouseout="this.style.background='#37373d';this.style.color='#ccc'">
                ✕ <span style="font-size:11px;">Không</span>
            </button>
        </div>
    </div>`;
}

// ── Banner góc trên: hiện cho tất cả khi có vote đang diễn ra ─
// Nhỏ gọn, không che editor
function buildMeetingVoteBanner() {
    if (!S.meetingVoteActive && !S.showMeetingPrompt) return '';
    if (!S.meetingVoteActive) return ''; // chỉ show khi đã broadcast

    const total    = Math.max(1, S.players.length || 1);
    const needed   = Math.ceil(total * 0.8);
    const yes      = S.meetingVoteYes;
    const hasVoted = S.myMeetingVote !== null;

    return `
    <div style="position:fixed;top:48px;left:50%;transform:translateX(-50%);z-index:190;
        background:#1e1e1e;border:1px solid #f59e0b;border-radius:12px;
        padding:8px 14px;display:flex;align-items:center;gap:10px;
        box-shadow:0 4px 20px rgba(0,0,0,0.5);animation:modalPop 0.15s ease;
        white-space:nowrap;">
        <span style="font-size:13px;">🚨</span>
        <span style="font-size:11px;color:#f59e0b;font-weight:500;">Tham gia cuộc họp?</span>
        <span style="font-size:11px;color:#cccccc;">(${yes}/${needed} phiếu cần)</span>

        ${!hasVoted ? `
        <div style="display:flex;gap:6px;margin-left:4px;">
            <button onclick="castMeetingVote('yes')"
                style="width:28px;height:28px;background:#22c55e;color:#000;border:none;border-radius:8px;
                font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;">
                ✓
            </button>
            <button onclick="castMeetingVote('no')"
                style="width:28px;height:28px;background:#37373d;color:#ccc;border:none;border-radius:8px;
                font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                ✕
            </button>
        </div>` : `
        <span style="font-size:10px;color:#555;margin-left:4px;">
            Đã vote: ${S.myMeetingVote === 'yes' ? '✓ Có' : '✕ Không'}
        </span>`}
    </div>`;
}