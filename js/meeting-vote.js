let _meetingStartSent = false;

function requestMeeting() {
    S.showMeetingPrompt = true;
    render();
}

function castMeetingVote(vote) {
    if (S.isSpectator) return;
    if (S.myMeetingVote !== null) return;
    S.myMeetingVote     = vote;
    S.showMeetingPrompt = false;

    sendToAll({ type: 'MEETING_VOTE_CAST', vote, name: S.myName, peerId: S.peerId });

    if (vote === 'yes') {
        S.meetingVoteYes++;
        S.meetingVoteActive = true;
    } else {
        S.meetingVoteNo++;
    }

    checkMeetingThreshold();
    render();
}

function handleMeetingVoteCast(data) {
    if (data.peerId === S.peerId) return;
    if (data.vote === 'yes') {
        S.meetingVoteYes++;
        S.meetingVoteActive = true;
    } else {
        S.meetingVoteNo++;
    }
    checkMeetingThreshold();
    render();
}

async function handleMeetingStart() {
    _meetingStartSent = false;
    resetMeetingVote();
    pauseCodingTimer();
    S.codeLocked = true;
    startExecuteScreen(() => {
        S.showMeeting = true;
        if (S.isHost) startVoteCollection();
        render();
    });
}

function handleMeetingCancel() {
    _meetingStartSent = false;
    resetMeetingVote();
    notify('❌ Cuộc họp bị hủy — không đủ phiếu');
    render();
}

function checkMeetingThreshold() {
    if (_meetingStartSent) return;
    const total  = Math.max(1, S.players.length || 1);
    const needed = Math.ceil(total * 0.8);
    const voted  = S.meetingVoteYes + S.meetingVoteNo;

    if (S.meetingVoteYes >= needed) {
        _meetingStartSent = true;
        sendToAll({ type: 'MEETING_START' });
        resetMeetingVote();
        pauseCodingTimer();
        S.codeLocked = true;
        startExecuteScreen(() => {
            S.showMeeting = true;
            if (S.isHost) startVoteCollection();
            render();
        });
        return;
    }

    if (voted >= total && S.meetingVoteYes < needed) {
        _meetingStartSent = true;
        sendToAll({ type: 'MEETING_CANCEL' });
        resetMeetingVote();
        notify('❌ Cuộc họp bị hủy — không đủ phiếu');
        render();
    }
}

function resetMeetingVote() {
    _meetingStartSent   = false;
    S.meetingVoteActive = false;
    S.meetingVoteYes    = 0;
    S.meetingVoteNo     = 0;
    S.myMeetingVote     = null;
    S.showMeetingPrompt = false;
    S.hasVoted          = false;
}