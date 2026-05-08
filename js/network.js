let _voteCollector  = null;
let _voteTimeout    = null;
let _applyingRemote = false;
let _codeEditSeq    = 0;
let _pendingCodeTimers = {};
let _networkRenderRaf = null;
let _lastValidationMessageAt = 0;
let _lastValidationSignature = '';

function scheduleNetworkRender() {
    if (_networkRenderRaf) return;
    _networkRenderRaf = requestAnimationFrame(() => {
        _networkRenderRaf = null;
        render();
    });
}

function genId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function initPeer() {
    dbg('Initializing PeerJS...');
    updateNetworkStatus('connecting');

    const peer = new Peer(genId(), {
        host:   '0.peerjs.com',
        port:   443,
        path:   '/',
        secure: true,
        debug:  1,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
            ]
        }
    });

    S.peer = peer;

    peer.on('open', id => {
        S.peerId = id;
        updateNetworkStatus('ready');
        dbg('✅ Peer ready. ID = ' + id);
        render();
    });

    peer.on('connection', conn => {
        dbg('📥 Incoming: ' + conn.peer);
        setupConn(conn);
    });

    peer.on('error', err => {
        dbg('❌ Peer error: ' + err.type + ' — ' + err.message);
        if (err.type === 'peer-unavailable') {
            notify('❌ Không tìm thấy phòng. Kiểm tra lại Room ID.', true);
        } else if (err.type === 'network' || err.type === 'server-error') {
            notify('⚠️ Mất kết nối. Thử reload trang.', true);
            updateNetworkStatus('error');
        } else {
            notify('⚠️ ' + err.type, true);
        }
        render();
    });

    peer.on('disconnected', () => {
        dbg('⚠️ Disconnected. Reconnecting...');
        updateNetworkStatus('connecting');
        setTimeout(() => { if (!S.peer.destroyed) S.peer.reconnect(); }, 2000);
    });
}

function updateNetworkStatus(status) {
    S.peerStatus = status;
    const el = document.getElementById('peer-status-bar');
    if (el) renderStatusBarInto(el);
}

function setupConn(conn) {
    conn.on('data', data => {
        dbg('📨 Recv: ' + data.type + ' from ' + conn.peer);
        handleNetworkMessage(data, conn.peer);
    });

    conn.on('close', () => {
        dbg('🔌 Closed: ' + conn.peer);
        delete S.connections[conn.peer];
        S.players = S.players.filter(p => p.peerId !== conn.peer);
        if (S.isHost) {
            sendToAll({ type: 'PLAYERS_UPDATE', players: S.players });
            if (_voteCollector) {
                _voteCollector.expected = Math.max(1, _voteCollector.expected - 1);
                _checkVoteComplete();
            }
        }
        // Xóa cursor overlay của player vừa disconnect
        if (typeof removePlayerCursor === 'function') removePlayerCursor(conn.peer);
        addChatMessage('🔴 Một người chơi đã rời phòng', 'system');
        render();
    });

    conn.on('error', e => dbg('Conn error: ' + e));

    const onOpen = () => {
        dbg('🔗 Open: ' + conn.peer);
        S.connections[conn.peer] = conn;
    };
    if (conn.open) onOpen();
    else conn.on('open', onOpen);
}

function connectToPeer(targetId, onOpen) {
    dbg('🔌 Connecting to: ' + targetId);
    if (!S.peer || S.peer.destroyed) { notify('❌ Peer chưa sẵn sàng!', true); return; }
    if (S.peerStatus !== 'ready')    { notify('❌ Chờ kết nối mạng xong đã!', true); return; }

    const conn = S.peer.connect(targetId, { reliable: true, serialization: 'json' });
    setupConn(conn);
    conn.on('open',  () => onOpen(conn));
    conn.on('error', e  => { dbg('Connect error: ' + e); notify('❌ Không thể kết nối: ' + e, true); });

    setTimeout(() => {
        if (!conn.open) {
            notify('❌ Timeout. Phòng không phản hồi.', true);
            dbg('⏱ Timeout connecting to ' + targetId);
        }
    }, 8000);
}

function sendTo(peerId, data) {
    const c = S.connections[peerId];
    if (c && c.open) c.send(data);
    else dbg('⚠️ Cannot send to ' + peerId + ': not open');
}

function sendToAll(data) {
    Object.keys(S.connections).forEach(id => sendTo(id, data));
}

function getHostPlayer() {
    return (S.players || []).find(p => p.isHost) || null;
}

function collectLocalCodeSnapshot() {
    const files = {};
    Object.keys(FILES || {}).forEach(fileId => {
        files[fileId] = { ...FILES[fileId], content: FILES[fileId].content || '' };
    });
    return files;
}

function submitCodeToHost() {
    const snapshot = collectLocalCodeSnapshot();
    if (S.isHost) {
        S.hostCodeSubmissions = S.hostCodeSubmissions || {};
        S.hostCodeSubmissions[S.peerId || 'host'] = { files: snapshot, role: S.myRole, tasks: clonePlain(S.tasks || {}) };
        return;
    }
    const host = getHostPlayer();
    if (!host) return;
    sendTo(host.peerId, {
        type: 'SUBMIT_CODE',
        peerId: S.peerId,
        role: S.myRole,
        tasks: clonePlain(S.tasks || {}),
        files: snapshot,
        taskValidation: { ...(S.gameState.taskValidation || {}) },
    });
}

function broadcastResults(results, rejectedTaskIds) {
    if (!S.isHost) return;
    const payload = {
        type: 'GLOBAL_RESULT_SYNC',
        results,
        gameState: exportGameState(),
        rejectedTaskIds: rejectedTaskIds || [],
        statusText: S.executionStatusText || 'Chấm bài hoàn tất.',
    };
    sendToAll(payload);
    (rejectedTaskIds || []).forEach(taskId => sendToAll({ type: 'REJECT_TASK', taskId, reason: 'Validation Failed', gameState: payload.gameState }));
}

function isFromHost(fromPeer) {
    if (!fromPeer) return true;
    const host = getHostPlayer();
    return !!host && host.peerId === fromPeer;
}

function applyHostValidationResult(data) {
    const now = performance.now();
    const signature = data.type + '|' + (data.statusText || '') + '|' + JSON.stringify(data.results && data.results.globalProgress) + '|' + JSON.stringify(data.results && data.results.sabotageProgress);
    if (signature === _lastValidationSignature && now - _lastValidationMessageAt < 200) return;
    if ((data.type === 'EXECUTION_STATUS_SYNC' || data.type === 'VALIDATION_HOLD_TICK') && now - _lastValidationMessageAt < 200) return;
    _lastValidationSignature = signature;
    _lastValidationMessageAt = now;

    if (data.gameState) hydrateGameState(data.gameState);
    if (data.results) S.globalValidationResults = data.results;
    S.executionStatusText = data.statusText || S.executionStatusText || '';
    S.validationRunning = data.type !== 'GLOBAL_RESULT_SYNC' && data.type !== 'FINAL_PROGRESS_UPDATE' && data.type !== 'FINAL_VALIDATION_SYNC';
    S.waitingForHostResult = S.validationRunning;
    S.codeLocked = S.validationRunning;
    S.showExecuteScreen = true;
    if (data.results) {
        S.gameState.globalProgress = data.results.globalProgress || 0;
        S.gameState.sabotageProgress = data.results.sabotageProgress || 0;
        S.taskProgress = S.gameState.globalProgress;
    }
    patchProgressBar();
    patchTaskList();
    if (document.getElementById('executing-overlay') && typeof updateExecutionUI === 'function') updateExecutionUI(data);
    else scheduleNetworkRender();
    if (data.type === 'GLOBAL_RESULT_SYNC' || data.type === 'FINAL_PROGRESS_UPDATE') {
        if (typeof finishExecuteScreenFromHost === 'function') finishExecuteScreenFromHost();
    }
}

function rejectTaskFromHost(taskId, reason) {
    if (!taskId) return;
    if (typeof setTaskValidationStatus === 'function') setTaskValidationStatus(taskId, 'fail');
    notify(reason || 'Validation Failed', true);
    patchTaskList();
    render();
}

function handleCodeInput(el) {
    if (_applyingRemote || !el || !S.currentFile) return;

    const file = S.currentFile;
    const previous = FILES[file].content || '';
    const next = el.value;
    FILES[file].content = next;
    if (S.gameState && S.gameState.files && S.gameState.files[file]) S.gameState.files[file].content = next;

    clearTimeout(_pendingCodeTimers[file]);
    _pendingCodeTimers[file] = setTimeout(() => {
        const patch = createTextPatch(previous, next);
        sendToAll({
            type: 'CODE_EDIT',
            file,
            fileId: file,
            seq: ++_codeEditSeq,
            patch,
            content: patch ? undefined : next,
            cursorOffset: el.selectionStart,
            peerId: S.peerId,
        });
        if (S.isHost) sendToAll({ type: 'SYNC_CODE', fileId: file, content: next, gameState: exportGameState() });
    }, 35);

    if (typeof broadcastCursor === 'function') broadcastCursor(el);
}

function createTextPatch(oldText, newText) {
    if (oldText === newText) return { start: 0, deleteCount: 0, text: '' };

    let start = 0;
    const oldLen = oldText.length;
    const newLen = newText.length;
    while (start < oldLen && start < newLen && oldText[start] === newText[start]) start++;

    let oldEnd = oldLen - 1;
    let newEnd = newLen - 1;
    while (oldEnd >= start && newEnd >= start && oldText[oldEnd] === newText[newEnd]) {
        oldEnd--;
        newEnd--;
    }

    const patch = {
        start,
        deleteCount: oldEnd - start + 1,
        text: newText.slice(start, newEnd + 1),
    };

    const patchCost = JSON.stringify(patch).length;
    return patchCost < newText.length * 0.75 ? patch : null;
}

function applyTextPatch(text, patch) {
    if (!patch || typeof patch.start !== 'number' || typeof patch.deleteCount !== 'number' || typeof patch.text !== 'string') return text;
    return text.slice(0, patch.start) + patch.text + text.slice(patch.start + patch.deleteCount);
}

function startVoteCollection() {
    if (!S.isHost) return;
    if (_voteTimeout) { clearTimeout(_voteTimeout); _voteTimeout = null; }
    _voteCollector = { votes: {}, expected: S.players.length };
    dbg('🗳 Vote collection started — expecting ' + _voteCollector.expected);

    _voteTimeout = setTimeout(() => {
        if (!_voteCollector) return;
        dbg('⏱ Vote timeout — tallying partial votes');
        _finalizeVotes(_tallyVotes(_voteCollector.votes));
    }, 90000);
}

function submitVote(votedOutPeerId) {
    if (S.isSpectator) return;
    const vote = votedOutPeerId || 'skip';
    if (S.isHost) {
        recordVoteAction(S.peerId, vote);
    } else {
        const host = S.players.find(p => p.isHost);
        if (host) sendTo(host.peerId, { type: 'VOTE_ACTION', playerId: S.peerId, vote });
    }
}

function recordVoteAction(playerId, vote) {
    if (!playerId || S.votes[playerId]) return;
    S.votes[playerId] = vote || 'skip';
    if (S.gameState) S.gameState.votes = { ...S.votes };
    sendToAll({ type: 'VOTE_STATE', votes: S.votes });
    checkVoteStatus();
}

function checkVoteStatus() {
    const aliveIds = S.players.filter(p => !S.eliminatedPlayers.some(e => e.peerId === p.peerId)).map(p => p.peerId);
    const totalAlive = Math.max(1, aliveIds.length || S.players.length || 1);
    const answered = aliveIds.filter(id => Object.prototype.hasOwnProperty.call(S.votes, id)).length;
    dbg('🗳 Vote status ' + answered + '/' + totalAlive);
    if (answered < totalAlive) return false;

    const result = _tallyVotes(S.votes);
    if (_voteTimeout) { clearTimeout(_voteTimeout); _voteTimeout = null; }
    _voteCollector = null;
    sendToAll({ type: 'END_VOTE_PHASE', votedOutPeerId: result, votes: S.votes, gameState: exportGameState() });
    processVoteResult(result);
    return true;
}

function _receiveVote(fromPeerId, votedOutPeerId) {
    recordVoteAction(fromPeerId, votedOutPeerId || 'skip');
}

function _checkVoteComplete() {
    checkVoteStatus();
}

function _finalizeVotes(result) {
    if (_voteTimeout) { clearTimeout(_voteTimeout); _voteTimeout = null; }
    _voteCollector = null;
    sendToAll({ type: 'END_VOTE_PHASE', votedOutPeerId: result, votes: S.votes, gameState: exportGameState() });
    processVoteResult(result);
}

function _tallyVotes(votes) {
    const counts = {};
    let skipCount = 0;

    Object.values(votes).forEach(v => {
        if (v) {
            counts[v] = (counts[v] || 0) + 1;
        } else {
            skipCount++;   // null / undefined = skip
        }
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    // Không ai bị vote → skip
    if (!entries.length) return null;

    const topVotes = entries[0][1];

    // Hòa giữa 2+ ứng viên → skip
    if (entries.length >= 2 && entries[0][1] === entries[1][1]) return null;

    // Top ứng viên bằng số phiếu skip → hòa → skip
    if (topVotes <= skipCount) return null;

    return entries[0][0];
}

function handleGlobalSync(data, fromPeer) {
    if (!isFromHost(fromPeer)) return;
    applyHostValidationResult(data);
}

function handleNetworkMessage(data, fromPeer) {
    switch (data.type) {

        case 'JOIN_REQUEST': {
            if (!S.isHost) return;
            if (S.players.length >= S.maxPlayers) {
                sendTo(fromPeer, { type: 'JOIN_DENIED', reason: 'Phòng đầy rồi!' });
                return;
            }
            const newPlayer = { peerId: fromPeer, name: data.name, color: data.color, avatar: data.avatar, isHost: false, readyVote: false };
            S.players.push(newPlayer);
            sendTo(fromPeer, { type: 'JOIN_ACCEPTED', players: S.players, roomName: S.roomName, maxPlayers: S.maxPlayers, roomId: S.roomId, gameState: exportGameState() });
            sendToAll({ type: 'PLAYERS_UPDATE', players: S.players });
            addChatMessage('🟢 ' + data.name + ' đã vào phòng', 'system');
            render();
            break;
        }

        case 'JOIN_ACCEPTED': {
            S.players    = data.players;
            S.roomName   = data.roomName;
            S.maxPlayers = data.maxPlayers;
            S.roomId     = data.roomId;
            if (data.gameState) hydrateGameState(data.gameState);
            S.phase      = 'waiting';
            notify('✅ Đã vào phòng: ' + data.roomName);
            render();
            break;
        }

        case 'JOIN_DENIED': {
            notify('❌ Từ chối: ' + data.reason, true);
            break;
        }

        case 'PLAYERS_UPDATE': {
            S.players = data.players;
            render();
            break;
        }

        case 'SETTINGS_UPDATE': {
            S.roundTime   = data.roundTime;
            S.meetingTime = data.meetingTime;
            if (data.selectedLangs) S.selectedLangs = data.selectedLangs;
            addChatMessage('⚙️ Host cập nhật cài đặt game', 'system');
            render();
            break;
        }

        case 'START_COUNTDOWN': {
            if (data.selectedLangs) S.selectedLangs = data.selectedLangs;
            startCountdown();
            break;
        }

        case 'ROLE_ASSIGN': {
            if (data.gameState) hydrateGameState(data.gameState);
            applyRoles(data.vibeCoderPeerId, data.injectorPeerIds);
            break;
        }

        case 'VOTE_REQUEST': {
            if (!S.isHost) return;
            S.players = S.players.map(p => p.peerId === fromPeer ? { ...p, readyVote: true } : p);
            sendToAll({ type: 'PLAYERS_UPDATE', players: S.players });
            const votes  = S.players.filter(p => p.readyVote).length;
            const needed = Math.ceil(S.players.length * 0.8);
            addChatMessage(`🗳️ Vote: ${votes}/${S.players.length} (cần ${needed})`, 'system');
            if (votes >= needed && S.players.length >= 2) {
                sendToAll({ type: 'START_COUNTDOWN' });
                startCountdown();
            }
            render();
            break;
        }

        case 'CHAT': {
            addChatMessage(data.name + ': ' + data.msg, 'player', data.color);
            break;
        }

        case 'MEETING_CHAT': {
            S.meetingChatMessages.push({ from: data.from, msg: data.msg, color: data.color });
            const el = document.getElementById('meeting-chat-scroll');
            if (el) {
                const div = document.createElement('div');
                div.style.fontSize = '10px';
                div.innerHTML = `<span style="color:${data.color || '#4fc3f7'};">${data.from}:</span> <span style="color:#d4d4d4;">${data.msg}</span>`;
                el.appendChild(div);
                el.scrollTop = el.scrollHeight;
            }
            break;
        }

        case 'SYNC_CODE': {
            const fileId = data.fileId || data.file;
            if (!fileId || !FILES[fileId]) break;
            FILES[fileId].content = data.content || '';
            if (S.gameState && S.gameState.files && S.gameState.files[fileId]) S.gameState.files[fileId].content = data.content || '';
            if (data.gameState) hydrateGameState(data.gameState);
            if (fileId === S.currentFile) {
                const el = document.getElementById('code-editor-area');
                if (el) el.value = FILES[fileId].content;
            }
            break;
        }

        case 'CODE_UPDATE':
        case 'CODE_EDIT': {
            const incomingFile = data.fileId || data.file;
            if (!incomingFile || !FILES[incomingFile]) break;
            data.file = incomingFile;
            const oldContent = FILES[data.file].content || '';
            const nextContent = data.type === 'CODE_EDIT' && data.patch
                ? applyTextPatch(oldContent, data.patch)
                : (data.content || '');

            FILES[data.file].content = nextContent;
            if (S.sharedFiles) S.sharedFiles[data.file] = FILES[data.file];
            if (S.gameState && S.gameState.files && S.gameState.files[data.file]) S.gameState.files[data.file].content = nextContent;

            if (data.file === S.currentFile) {
                const el = document.getElementById('code-editor-area');
                if (el) {
                    _applyingRemote = true;
                    const selStart = el.selectionStart;
                    const selEnd = el.selectionEnd;
                    el.value = nextContent;
                    const delta = nextContent.length - oldContent.length;
                    const nextSelStart = Math.max(0, Math.min(nextContent.length, selStart + (data.patch && data.patch.start <= selStart ? delta : 0)));
                    const nextSelEnd = Math.max(0, Math.min(nextContent.length, selEnd + (data.patch && data.patch.start <= selEnd ? delta : 0)));
                    el.setSelectionRange(nextSelStart, nextSelEnd);
                    _applyingRemote = false;
                }
            }
            break;
        }

        case 'MEETING_VOTE_CAST': {
            handleMeetingVoteCast(data);
            break;
        }

        case 'MEETING_START': {
            handleMeetingStart();
            break;
        }

        case 'MEETING_CANCEL': {
            handleMeetingCancel();
            break;
        }

        case 'TASK_COMPLETED':
        case 'TASK_COMPLETE': {
            if (S.isHost) {
                S.gameState.taskValidation = S.gameState.taskValidation || {};
                S.gameState.taskValidation[data.taskId] = 'pending_validation';
                sendToAll({ type: 'GAME_STATE_SYNC', gameState: exportGameState() });
            }
            break;
        }

        case 'TASK_UNCOMPLETED': {
            handleRemoteTaskUncompleted(data);
            break;
        }

        case 'VOTE_ACTION':
        case 'VOTE_CAST': {
            if (!S.isHost) return;
            recordVoteAction(data.playerId || data.fromPeerId, data.vote || data.votedOutPeerId || 'skip');
            break;
        }

        case 'VOTE_STATE': {
            S.votes = data.votes || {};
            if (S.gameState) S.gameState.votes = { ...S.votes };
            render();
            break;
        }

        case 'END_VOTE_PHASE':
        case 'VOTE_RESULT': {
            if (data.gameState) hydrateGameState(data.gameState);
            if (S.isHost && data.type !== 'VOTE_RESULT') return;
            processVoteResult(data.votedOutPeerId || null);
            break;
        }

        case 'SUBMIT_CODE': {
            if (!S.isHost) return;
            S.hostCodeSubmissions = S.hostCodeSubmissions || {};
            S.hostCodeSubmissions[data.peerId || fromPeer] = { files: data.files || {}, role: data.role, tasks: data.tasks || {} };
            break;
        }

        case 'EXECUTION_STATUS_SYNC':
        case 'START_GLOBAL_VALIDATION':
        case 'GLOBAL_RESULT_SYNC':
        case 'FINAL_VALIDATION_SYNC':
        case 'FINAL_PROGRESS_UPDATE': {
            handleGlobalSync(data, fromPeer);
            break;
        }

        case 'VALIDATION_HOLD_TICK': {
            if (!isFromHost(fromPeer)) return;
            applyHostValidationResult({ ...data, type: 'VALIDATION_HOLD_TICK' });
            break;
        }

        case 'ENTER_MEETING_AFTER_VALIDATION': {
            if (!isFromHost(fromPeer)) return;
            if (typeof finishExecuteScreenFromHost === 'function') finishExecuteScreenFromHost();
            break;
        }

        case 'REJECT_TASK': {
            if (!isFromHost(fromPeer)) return;
            if (data.gameState) hydrateGameState(data.gameState);
            rejectTaskFromHost(data.taskId, data.reason);
            break;
        }

        case 'PROGRESS_UPDATE': {
            if (!S.isHost) break;
            if (data.peerId && typeof data.localProgress === 'number') {
                S.roomTaskProgressByPeer = S.roomTaskProgressByPeer || {};
                S.roomTaskProgressByPeer[data.peerId] = data.localProgress;
            }
            break;
        }

        case 'GAME_STATE_SYNC': {
            hydrateGameState(data.gameState);
            initTasks();
            patchProgressBar();
            patchTaskList();
            render();
            break;
        }

        case 'FORCE_MEETING': {
            handleForceMeeting(data);
            break;
        }

        case 'GAME_OVER': {
            handleGameOver(data);
            break;
        }

        case 'PLAYER_ELIMINATED': {
            handlePlayerEliminated(data);
            break;
        }

        case 'FILE_SWITCH': {
            if (!S.fileActivePlayers) S.fileActivePlayers = {};
            Object.keys(S.fileActivePlayers).forEach(f => {
                S.fileActivePlayers[f] = (S.fileActivePlayers[f] || []).filter(p => p.peerId !== data.peerId);
            });
            if (!S.fileActivePlayers[data.file]) S.fileActivePlayers[data.file] = [];
            S.fileActivePlayers[data.file].push({ peerId: data.peerId, name: data.name, color: data.color });
            Object.keys(FILES).forEach(fn => {
                const dotEl = document.getElementById('file-dots-' + fn);
                if (dotEl) {
                    const players = S.fileActivePlayers[fn] || [];
                    dotEl.innerHTML = players
                        .map(p => `<div title="${p.name}" style="width:8px;height:8px;border-radius:2px;background:${p.color};flex-shrink:0;"></div>`)
                        .join('');
                }
            });
            break;
        }

        case 'CURSOR_UPDATE': {
            if (typeof handleRemoteCursor === 'function') handleRemoteCursor(data);
            break;
        }

        case 'CURSOR_LEAVE': {
            if (typeof handleRemoteCursorLeave === 'function') handleRemoteCursorLeave(data);
            break;
        }
    }
}