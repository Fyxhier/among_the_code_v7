function notify(msg, isErr = false) {
    S.notification = { msg, isErr };
    render();
    setTimeout(() => { S.notification = null; render(); }, 3500);
}

function dbg(msg) {
    S.debugLog.unshift('[' + new Date().toLocaleTimeString() + '] ' + msg);
    if (S.debugLog.length > 50) S.debugLog.pop();
    const el = document.getElementById('debug-log');
    if (el) el.innerHTML = S.debugLog.slice(0, 20).join('\n');
}

function addChatMessage(msg, type = 'player', color = null) {
    S.chatMessages.push({ msg, type, color, ts: Date.now() });
    render();
    setTimeout(() => {
        const el = document.getElementById('chat-scroll');
        if (el) el.scrollTop = el.scrollHeight;
    }, 30);
}

function broadcastChat(msg) {
    const full = S.myName + ': ' + msg;
    addChatMessage(full, 'player', S.myColor);
    sendToAll({ type: 'CHAT', name: S.myName, msg, color: S.myColor });
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => notify('✅ Đã copy!'));
}

function fitClass(name) {
    if (name.length > 14) return 'fit-text fit-sm';
    if (name.length > 9)  return 'fit-text fit-md';
    return 'fit-text';
}

function startCountdown() {
    if (S._countdownTimer) { clearInterval(S._countdownTimer); S._countdownTimer = null; }
    S.countdown = 3;
    render();
    S._countdownTimer = setInterval(() => {
        S.countdown--;
        render();
        if (S.countdown <= 0) {
            clearInterval(S._countdownTimer);
            S._countdownTimer = null;
            S.countdown = null;
            startRolePhase();
        }
    }, 1000);
}

function startRolePhase() {
    if (S.isHost) {
        prepareSharedGameState();
        const roles = assignRoles(S.players);
        sendToAll({ type: 'ROLE_ASSIGN', vibeCoderPeerId: roles.vibeCoderPeerId, injectorPeerIds: roles.injectorPeerIds, gameState: exportGameState() });
        applyRoles(roles.vibeCoderPeerId, roles.injectorPeerIds);
    }
}

function assignRoles(players) {
    const pool = (players || []).filter(p => p && p.peerId && !p.isSpectator);
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const injectorCount = shuffled.length >= 6 ? 2 : 1;
    const cappedCount = Math.max(1, Math.min(injectorCount, Math.floor((shuffled.length - 1) / 2) || 1));
    const injectorPeerIds = shuffled.slice(0, cappedCount).map(p => p.peerId);
    return { injectorPeerIds, vibeCoderPeerId: injectorPeerIds[0] || null };
}

function prepareSharedGameState() {
    const langs = S.selectedLangs && S.selectedLangs.length > 0 ? S.selectedLangs : ['javascript', 'python', 'java', 'cpp'];
    rebuildFilesFromLangs(langs);
    resetFilesContent();
    const built = buildTasksForFiles();
    TASKS_DEVELOPER = attachTaskTests(built.devTasks);
    TASKS_INJECTOR = attachTaskTests(built.injTasks);
    S.activeLangIds = langs;
    S.currentFile = Object.keys(FILES)[0] || S.currentFile;
    S.gameState = {
        files: clonePlain(FILES),
        developerTasks: clonePlain(TASKS_DEVELOPER),
        injectorTasks: clonePlain(TASKS_INJECTOR),
        verifiedTaskIds: [],
        taskValidation: {},
        globalProgress: 0,
        sabotageProgress: 0,
        round: 1,
        votes: {},
    };
    S.sharedFiles = FILES;
}

function applyRoles(vibeCoderPeerId, injectorPeerIds) {
    if (S._roleTimer) { clearInterval(S._roleTimer); S._roleTimer = null; }

    const injectors = injectorPeerIds && injectorPeerIds.length ? injectorPeerIds : [vibeCoderPeerId];
    S.vibeCoderPeerId = vibeCoderPeerId;
    S.injectorPeerIds = injectors;
    S.myRole          = injectors.includes(S.peerId) ? 'injector' : 'developer';
    S.phase           = 'role';
    S.roleTimer       = 6;
    render();

    S._roleTimer = setInterval(() => {
        S.roleTimer--;
        const bar = document.getElementById('role-timer-bar');
        const txt = document.getElementById('role-timer-txt');
        if (bar) bar.style.width = ((S.roleTimer / 6) * 100) + '%';
        if (txt) txt.textContent  = S.roleTimer + 's';

        if (S.roleTimer <= 0) {
            clearInterval(S._roleTimer);
            S._roleTimer = null;
            enterCodingPhase();
        }
    }, 1000);
}

async function runCodeAndValidate(fileId, code) {
    const file = FILES[fileId];
    if (!file) return { output: '', verified: [] };

    S.terminalOutput = `> ${fileId}\nRunning ${file.lang}...`;
    S.showTerminal = true;
    render();

    let output = '';
    try {
        if (file.lang === 'javascript') {
            output = runJavascriptSafely(code);
        } else {
            output = await runWithPiston(fileId, file.lang, code);
        }
    } catch (err) {
        output = 'Runtime error: ' + err.message;
    }

    const taskPool = S.myRole === 'injector' ? TASKS_INJECTOR : TASKS_DEVELOPER;
    const tasks = taskPool[fileId] || [];
    const verified = [];
    tasks.forEach(task => {
        if ((S.gameState.verifiedTaskIds || []).includes(task.id)) return;
        if (!validateTaskResult(task, code, output)) return;
        completeTask(task.id, S.myRole);
        verified.push(task.id);
    });

    S.terminalOutput = `> ${fileId}\n${output || '(no output)'}\n\nVerified tasks: ${verified.length}`;
    S.showTerminal = true;
    render();
    return { output, verified };
}

async function runWithPiston(fileId, lang, code) {
    const runtime = {
        python: ['python', '3.10.0'],
        java: ['java', '15.0.2'],
        cpp: ['cpp', '10.2.0'],
        typescript: ['typescript', '5.0.3'],
        rust: ['rust', '1.68.2'],
        go: ['go', '1.16.2'],
    }[lang] || [lang, '*'];

    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language: runtime[0],
            version: runtime[1],
            files: [{ name: fileId, content: code }],
            stdin: '',
            args: [],
            compile_timeout: 10000,
            run_timeout: 3000,
            compile_memory_limit: -1,
            run_memory_limit: -1,
        }),
    });
    if (!res.ok) throw new Error('Piston HTTP ' + res.status);
    const data = await res.json();
    return [data.compile && data.compile.stdout, data.compile && data.compile.stderr, data.run && data.run.stdout, data.run && data.run.stderr]
        .filter(Boolean)
        .join('\n')
        .trim();
}

function runJavascriptSafely(code) {
    const logs = [];
    const safeConsole = { log: (...args) => logs.push(args.join(' ')) };
    Function('console', '"use strict";\n' + code)(safeConsole);
    return logs.join('\n');
}

function validateTaskResult(task, code, output) {
    if (task.expectedOutput && !(output || '').includes(task.expectedOutput)) return false;
    if (task.validationRegex && !(new RegExp(task.validationRegex).test(code || '') || new RegExp(task.validationRegex).test(output || ''))) return false;
    if (typeof verifyTask === 'function') return verifyTask(code, output, task);
    return !!task.expectedOutput || !!task.validationRegex;
}

function completeTask(taskId, role) {
    if (typeof setTaskValidationStatus === 'function') setTaskValidationStatus(taskId, 'pending_validation', role || S.myRole);
    if (S.gameState && S.gameState.taskValidation) S.gameState.taskValidation[taskId] = 'pending_validation';
}

function enterCodingPhase() {
    if (S._codingTimerInterval) { clearInterval(S._codingTimerInterval); S._codingTimerInterval = null; }
    if (S._runResultTimer)      { clearInterval(S._runResultTimer);      S._runResultTimer      = null; }

    S.phase              = 'coding';
    S.roleTimer          = null;
    S.codingTimerRunning = false;
    S.showRunResult      = false;
    S.isSpectator        = false;
    S.hasVoted           = false;
    S.votes              = {};
    if (S.gameState) S.gameState.votes = {};

    S.fileActivePlayers                = {};
    S.fileActivePlayers[S.currentFile] = [{ peerId: S.peerId || 'local', name: S.myName, color: S.myColor }];

    if (!S.currentRound) S.currentRound = S.gameState.round || 1;
    if (!S.eliminatedPlayers) S.eliminatedPlayers = [];
    S.gameWinner        = null;
    S.isForceMeeting    = false;

    if (S.gameState && Object.keys(S.gameState.files || {}).length) {
        hydrateGameState(S.gameState);
    } else if (S.isHost) {
        prepareSharedGameState();
    }

    if (!FILES[S.currentFile]) S.currentFile = Object.keys(FILES)[0] || 'main.game.js';

    initTasks();
    resetMeetingVote();
    render();

    startCodingRound();
}

function startCodingRound() {
    if (S._codingTimerInterval) { clearInterval(S._codingTimerInterval); S._codingTimerInterval = null; }
    S.codingTimer        = ROUND_DURATION;
    S.codingTimerRunning = false;
    notify(`🔔 Round ${S.currentRound}/${TOTAL_ROUNDS} — ${ROUND_DURATION / 60} phút`);
    render();
    setTimeout(startCodingTimer, 200);
}

function startCodingTimer() {
    if (S._codingTimerInterval) return;
    S.codingTimerRunning = true;
    S._codingTimerInterval = setInterval(() => {
        S.codingTimer--;

        const timerEl = document.getElementById('coding-timer-display');
        if (timerEl) {
            const m        = Math.floor(S.codingTimer / 60);
            const sec      = S.codingTimer % 60;
            const isUrgent = S.codingTimer <= 30;
            timerEl.textContent = m + ':' + String(sec).padStart(2, '0');
            timerEl.style.color = isUrgent ? '#ef4444' : '#22c55e';
            const box = document.getElementById('coding-timer-box');
            if (box) box.style.borderColor = isUrgent ? '#ef444466' : '#22c55e44';
        }

        if (S.codingTimer <= 0) {
            clearInterval(S._codingTimerInterval);
            S._codingTimerInterval = null;
            S.codingTimerRunning   = false;
            S.codingTimer          = 0;
            if (S.isHost) onRoundTimerExpired();
        }
    }, 1000);
}

function pauseCodingTimer() {
    if (S._codingTimerInterval) {
        clearInterval(S._codingTimerInterval);
        S._codingTimerInterval = null;
    }
    S.codingTimerRunning = false;
}

function endRunResult() {
    S.showRunResult  = false;
    S.voteSkipCounts = 0;
    render();
}

function voteSkip() {
    S.voteSkipCounts++;
    const needed = Math.max(1, S.players.length || 1);
    const el = document.getElementById('vote-skip-count');
    if (el) el.textContent = S.voteSkipCounts + '/' + needed;
    notify('⏭️ Đã vote skip (' + S.voteSkipCounts + '/' + needed + ')');
    if (S.voteSkipCounts >= needed) {
        if (S._runResultTimer) { clearInterval(S._runResultTimer); S._runResultTimer = null; }
        endRunResult();
    }
}

function switchFile(fn) {
    const ta = document.querySelector('#code-editor-area');
    if (ta) FILES[S.currentFile].content = ta.value;

    Object.keys(S.fileActivePlayers).forEach(f => {
        S.fileActivePlayers[f] = (S.fileActivePlayers[f] || []).filter(p => p.peerId !== (S.peerId || 'local'));
    });
    if (!S.fileActivePlayers[fn]) S.fileActivePlayers[fn] = [];
    S.fileActivePlayers[fn].push({ peerId: S.peerId || 'local', name: S.myName, color: S.myColor });

    // Báo cho peers rằng cursor của mình đã rời file cũ
    sendToAll({ type: 'CURSOR_LEAVE', peerId: S.peerId || 'local' });
    sendToAll({ type: 'FILE_SWITCH', peerId: S.peerId || 'local', name: S.myName, color: S.myColor, file: fn });
    S.currentFile = fn;
    render();
}

let _mediaStream = null;

async function toggleVoice() {
    if (S.voiceActive) {
        if (_mediaStream) { _mediaStream.getTracks().forEach(t => t.stop()); _mediaStream = null; }
        S.voiceActive = false;
        notify('🔇 Mic đã tắt');
    } else {
        try {
            _mediaStream  = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            S.voiceActive = true;
            notify('🎙️ Mic đang hoạt động');
        } catch (e) {
            notify('❌ Không truy cập mic: ' + e.message, true);
        }
    }
    render();
}

function cleanupRoom() {
    Object.values(S.connections).forEach(c => { try { c.close(); } catch (e) {} });
    S.connections        = {};
    S.players            = [];
    S.isHost             = false;
    S.roomId             = null;
    S.chatMessages       = [];
    S.showChat           = false;
    S.modal              = null;
    S.codingTimerRunning = false;
    S.showRunResult      = false;
    S.codingTimer        = 300;
    S.isSpectator        = false;
    S.hasVoted           = false;
    if (S._codingTimerInterval) { clearInterval(S._codingTimerInterval); S._codingTimerInterval = null; }
    if (S._runResultTimer)      { clearInterval(S._runResultTimer);      S._runResultTimer      = null; }
}