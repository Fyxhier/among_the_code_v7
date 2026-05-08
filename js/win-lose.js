const ROUND_DURATION = 300;
const TOTAL_ROUNDS   = 3;

function onRoundTimerExpired() {
    buildAutoRunOutput();
    if (S.isHost) {
        recalculateGlobalProgress();
        sendToAll({ type: 'FORCE_MEETING', terminalOutput: S.terminalOutput, gameState: exportGameState() });
    }
    startForceMeeting();
}

function startForceMeeting() {
    pauseCodingTimer();
    resetMeetingVote();
    S.isForceMeeting = true;
    S.showRunResult  = false;
    S.selectedVote   = null;
    S.hasVoted       = false;
    S.codeLocked     = true;
    notify(`⚠️ Round ${S.currentRound} kết thúc — Emergency Meeting!`);
    const validation = S.isHost ? validateAllPendingTasks() : Promise.resolve();
    validation.then(() => {
        startExecuteScreen(() => {
            S.showMeeting = true;
            if (S.isHost) startVoteCollection();
            render();
        });
    });
    render();
}

function processVoteResult(votedOutPeerId) {
    if (!votedOutPeerId) {
        notify('⏭️ Không ai bị loại');
        afterMeetingEnd();
        return;
    }

    const votedPlayer = S.players.find(p => p.peerId === votedOutPeerId);
    if (!votedPlayer) { afterMeetingEnd(); return; }

    S.eliminatedPlayers.push({ ...votedPlayer, eliminatedRound: S.currentRound });
    S.players = S.players.filter(p => p.peerId !== votedOutPeerId);

    if (votedOutPeerId === S.peerId) {
        S.isSpectator = true;
        notify('👻 Bạn đã bị loại — chuyển sang Ghost Mode');
    }

    if (S.isHost) {
        sendToAll({ type: 'PLAYER_ELIMINATED', peerId: votedOutPeerId, eliminatedPlayer: votedPlayer });
        sendToAll({ type: 'PLAYERS_UPDATE', players: S.players });
    }

    notify(`🚫 ${votedPlayer.name} đã bị loại!`);
    checkWinCondition();
}

function checkWinCondition() {
    const injectorAlive = S.players.filter(p => p.peerId === S.vibeCoderPeerId);
    const devAlive      = S.players.filter(p => p.peerId !== S.vibeCoderPeerId);

    if (injectorAlive.length === 0) {
        const who = S.eliminatedPlayers.find(p => p.peerId === S.vibeCoderPeerId);
        triggerEndgame('developer', `${who ? who.name : 'Injector'} đã bị tìm ra và loại bỏ!`);
        return;
    }

    if (devAlive.length <= injectorAlive.length) {
        triggerEndgame('injector', 'Injector chiếm đa số — Developer không thể thắng!');
        return;
    }

    afterMeetingEnd();
}

function afterMeetingEnd() {
    S.showMeeting    = false;
    S.isForceMeeting = false;
    S.codeLocked     = false;
    S.selectedVote   = null;
    S.hasVoted       = false;
    S.votes          = {};
    if (S.gameState) S.gameState.votes = {};
    if (S.isHost) {
        recalculateGlobalProgress();
        S.gameState.round = S.currentRound + 1;
        sendToAll({ type: 'GAME_STATE_SYNC', gameState: exportGameState() });
    }
    S.currentRound++;

    if (S.currentRound > TOTAL_ROUNDS) {
        triggerEndgame('injector', `Hết ${TOTAL_ROUNDS} cuộc họp — Injector chưa bị tìm ra!`);
        return;
    }

    startCodingRound();
}

function triggerEndgame(winner, reason) {
    if (S.phase === 'endgame') return;

    if (S._codingTimerInterval) { clearInterval(S._codingTimerInterval); S._codingTimerInterval = null; }
    if (S._runResultTimer)      { clearInterval(S._runResultTimer);      S._runResultTimer      = null; }

    S.gameWinner    = winner;
    S.gameEndReason = reason;
    S.phase         = 'endgame';
    S.showMeeting   = false;
    S.showRunResult = false;

    if (S.isHost) {
        sendToAll({
            type:              'GAME_OVER',
            winner,
            reason,
            eliminatedPlayers: S.eliminatedPlayers,
            vibeCoderPeerId:   S.vibeCoderPeerId
        });
    }
    render();
}

function handleGameOver(data) {
    if (S._codingTimerInterval) { clearInterval(S._codingTimerInterval); S._codingTimerInterval = null; }
    if (S._runResultTimer)      { clearInterval(S._runResultTimer);      S._runResultTimer      = null; }

    S.gameWinner        = data.winner;
    S.gameEndReason     = data.reason;
    S.eliminatedPlayers = data.eliminatedPlayers || [];
    S.vibeCoderPeerId   = data.vibeCoderPeerId;
    S.phase             = 'endgame';
    S.showMeeting       = false;
    render();
}

function handleForceMeeting(data) {
    if (data.gameState) hydrateGameState(data.gameState);
    S.terminalOutput = data.terminalOutput || '';
    startForceMeeting();
}

function handlePlayerEliminated(data) {
    if (S.eliminatedPlayers.find(p => p.peerId === data.peerId)) return;
    S.eliminatedPlayers.push(data.eliminatedPlayer);
    S.players = S.players.filter(p => p.peerId !== data.peerId);
    if (data.peerId === S.peerId) {
        S.isSpectator = true;
        notify('👻 Bạn đã bị loại — chuyển sang Ghost Mode');
    } else {
        notify(`🚫 ${data.eliminatedPlayer.name} đã bị loại!`);
    }
    render();
}

function buildAutoRunOutput() {
    // Dùng computeExecuteResults() để lấy kết quả thực từ task của IDE
    const results = (typeof computeExecuteResults === 'function')
        ? computeExecuteResults()
        : null;

    let out = `> AUTO-RUN — Round ${S.currentRound} kết thúc\n\n`;

    Object.keys(FILES).forEach(fn => {
        const fi = FILES[fn];
        out += `── ${fn} (${fi.lang.toUpperCase()}) ──\n`;

        if (results && results[fn]) {
            const r = results[fn];
            if (r.status === 'ok') {
                out += `✅ OK — ${r.devDone}/${r.devTotal} task hoàn thành\n`;
                out += `   Tiến độ file: đạt chuẩn\n\n`;
            } else if (r.status === 'error') {
                out += `❌ ERROR — File bị sabotage (${r.injDone} inject)\n`;
                out += `   ⚠ Tiến độ file này KHÔNG được tính!\n\n`;
            } else {
                out += `⏳ Pending — Chưa có task nào hoàn thành (0/${r.devTotal})\n\n`;
            }
        } else {
            out += `⏳ Pending — Không có dữ liệu task\n\n`;
        }
    });

    // Tính tổng tiến độ
    if (results) {
        let total = 0, done = 0;
        Object.values(results).forEach(r => {
            total += r.devTotal;
            if (r.status === 'ok') done += r.devDone;
        });
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        out += `\n📊 Tổng tiến độ dev: ${pct}% (${done}/${total} tasks)`;
    }
    out += `\nRound ${S.currentRound}/${TOTAL_ROUNDS} hoàn thành.`;
    S.terminalOutput = out;
}

function backToLobby() {
    resetFilesContent();   // reset editor về mặc định
    cleanupRoom();
    S.phase             = 'lobby';
    S.gameWinner        = null;
    S.gameEndReason     = '';
    S.eliminatedPlayers = [];
    S.currentRound      = 0;
    S.isForceMeeting    = false;
    S.isSpectator       = false;
    S.hasVoted          = false;
    render();
}