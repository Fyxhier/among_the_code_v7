function openModal(m) { S.modal = m; render(); }
function closeModal()  { S.modal = null; render(); }

function doCreateRoom() {
    const nameEl = document.getElementById('my-name');
    if (nameEl) S.myName = nameEl.value.trim() || S.myName;

    S.roomId     = S.peerId;
    S.roomName   = document.getElementById('cr-name')?.value || 'My Room';
    S.maxPlayers = Math.min(5, Math.max(2, parseInt(document.getElementById('cr-max')?.value) || 5));

    // Read language selection
    S.selectedLangs = readLangSelection();

    S.isHost     = true;
    S.players    = [{ peerId: S.peerId || 'local', name: S.myName, color: S.myColor, avatar: S.myAvatar, isHost: true, readyVote: false }];
    S.chatMessages = [];
    S.modal        = null;
    S.phase        = 'waiting';
    notify('✅ Phòng "' + S.roomName + '" đã tạo!');
    render();
}

/** Đọc ngôn ngữ được chọn từ UI buttons */
function readLangSelection() {
    const btns = document.querySelectorAll('.lang-btn.selected');
    if (!btns || btns.length === 0) return ['javascript', 'python', 'java', 'cpp'];
    const ids = [...btns].map(b => b.dataset.lang);
    if (ids.includes('random')) return ['random'];
    return ids;
}

/** Toggle lang button selection (called from inline onclick) */
function toggleLangBtn(langId) {
    if (langId === 'random') {
        const randBtn = document.querySelector('.lang-btn[data-lang="random"]');
        const wasSelected = randBtn && randBtn.classList.contains('selected');
        // Deselect all
        document.querySelectorAll('.lang-btn').forEach(b => {
            b.classList.remove('selected');
            _applyLangBtnStyle(b, false);
        });
        if (!wasSelected) {
            // Select random
            if (randBtn) { randBtn.classList.add('selected'); _applyLangBtnStyle(randBtn, true); }
        } else {
            // Restore defaults when deselecting random
            ['javascript','python','java','cpp'].forEach(id => {
                const b = document.querySelector(`.lang-btn[data-lang="${id}"]`);
                if (b) { b.classList.add('selected'); _applyLangBtnStyle(b, true); }
            });
        }
        return;
    }

    // Deselect random if active
    const randBtn = document.querySelector('.lang-btn[data-lang="random"]');
    if (randBtn && randBtn.classList.contains('selected')) {
        randBtn.classList.remove('selected');
        _applyLangBtnStyle(randBtn, false);
    }

    const btn = document.querySelector(`.lang-btn[data-lang="${langId}"]`);
    if (!btn) return;
    const isNowSelected = !btn.classList.contains('selected');

    // Enforce: at least 1 must remain
    const currentlySelected = document.querySelectorAll('.lang-btn.selected');
    if (!isNowSelected && currentlySelected.length <= 1) return; // block deselecting last

    btn.classList.toggle('selected');
    _applyLangBtnStyle(btn, isNowSelected);
}

function _applyLangBtnStyle(btn, isSelected) {
    const langId = btn.dataset.lang;
    if (langId === 'random') {
        btn.style.borderColor  = isSelected ? '#f59e0b' : '#3d3d3d';
        btn.style.background   = isSelected ? '#f59e0b22' : '#1e1e1e';
        btn.style.color        = isSelected ? '#f59e0b' : '#858585';
        return;
    }
    const cfg = LANG_CONFIGS[langId];
    if (!cfg) return;
    btn.style.borderColor  = isSelected ? cfg.color + '88' : '#3d3d3d';
    btn.style.background   = isSelected ? cfg.color + '22' : '#1e1e1e';
    btn.style.color        = isSelected ? cfg.color : '#858585';
}

function doJoinRoom() {
    const nameEl = document.getElementById('my-name');
    if (nameEl) S.myName = nameEl.value.trim() || S.myName;

    const hostId = (document.getElementById('join-peer-id')?.value || '').trim();
    const nick   = (document.getElementById('join-name')?.value    || S.myName).trim();

    if (!hostId) { notify('❌ Nhập Room ID của host!', true); return; }
    if (hostId === S.peerId) { notify('❌ Đó là ID phòng của chính bạn!', true); return; }

    S.myName = nick;
    S.modal  = null;
    render();

    notify('🔌 Đang kết nối tới phòng...');
    connectToPeer(hostId, conn => {
        conn.send({ type: 'JOIN_REQUEST', name: S.myName, color: S.myColor, avatar: S.myAvatar });
    });
}

function prefillJoin(id) {
    openModal('join');
    setTimeout(() => {
        const el = document.getElementById('join-peer-id');
        if (el) el.value = id;
    }, 40);
}

function quickGame() {
    notify('⚡ Quick game: Tạo phòng mới để thử...');
    setTimeout(() => openModal('create'), 600);
}

function doExitRoom() {
    cleanupRoom();
    S.phase = 'lobby';
    render();
}

function doHostStart() {
    if (!S.isHost) return;
    sendToAll({ type: 'START_COUNTDOWN', selectedLangs: S.selectedLangs });
    startCountdown();
}

function doVoteStart() {
    const host = S.players.find(p => p.isHost);
    if (host && host.peerId !== S.peerId) {
        sendTo(host.peerId, { type: 'VOTE_REQUEST' });
        notify('🗳️ Đã gửi vote bắt đầu sớm');
    } else {
        doHostStart();
    }
}

function doSaveSettings() {
    const rt = parseInt(document.getElementById('s-round')?.value)   || 60;
    const mt = parseInt(document.getElementById('s-meeting')?.value) || 30;
    S.roundTime   = rt;
    S.meetingTime = mt;
    sendToAll({ type: 'SETTINGS_UPDATE', roundTime: rt, meetingTime: mt, selectedLangs: S.selectedLangs });
    notify('✅ Đã chỉnh sửa thành công!');
    closeModal();
}

function doSendChat() {
    const el = document.getElementById('chat-in');
    if (!el || !el.value.trim()) return;
    broadcastChat(el.value.trim());
    el.value = '';
}

function doSendMeetingChat() {
    if (S.isSpectator) return;
    const el = document.getElementById('mc-in');
    if (!el || !el.value.trim()) return;
    const msg   = el.value.trim();
    const entry = { from: S.myName, msg, color: S.myColor };
    el.value = '';

    S.meetingChatMessages.push(entry);
    sendToAll({ type: 'MEETING_CHAT', ...entry });

    const scroll = document.getElementById('meeting-chat-scroll');
    if (scroll) {
        const div = document.createElement('div');
        div.style.fontSize = '10px';
        div.innerHTML = `<span style="color:${entry.color};">${entry.from}:</span> <span style="color:#d4d4d4;">${entry.msg}</span>`;
        scroll.appendChild(div);
        scroll.scrollTop = scroll.scrollHeight;
    }
}

function doRunCode() {
    const fileId = S.currentFile;
    const code = FILES[fileId] && FILES[fileId].content || '';
    runCodeAndValidate(fileId, code);
}

function doOpenMeeting() {
    if (S.isSpectator) return;
    requestMeeting();
}

function doConfirmVote() {
    if (S.isSpectator) return;
    S.hasVoted = true;
    render();
    submitVote(S.selectedVote || null);
}

function doSkipVote() {
    if (S.isSpectator) return;
    S.hasVoted = true;
    render();
    submitVote(null);
}