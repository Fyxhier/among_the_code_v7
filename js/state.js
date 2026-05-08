const S = {
    peer:        null,
    peerId:      null,
    peerStatus:  'connecting',
    connections: {},

    myName:   'Player',
    myColor:  COLORS[0],
    myAvatar: AVATARS[0],

    phase:      'lobby',
    isHost:     false,
    roomId:     null,
    roomName:   '',
    maxPlayers: 5,
    players:    [],

    modal:           null,
    showChat:        false,
    showMeetingChat: false,
    voiceActive:     false,

    chatMessages:        [],
    meetingChatMessages: [{ from: 'System', msg: 'Meeting started!', color: '#858585' }],

    currentFile:      'main.game.js',
    tabsMinimized:    false,
    showTerminal:     false,
    terminalOutput:   '',
    showMeeting:      false,
    selectedVote:     null,
    votes:            {},
    fileActivePlayers: {},
    remoteCursors:     {},   // { [peerId]: { name, color, file, offset, lastSeen } }

    roundTime:   60,
    meetingTime: 30,

    codingTimer:        300,
    codingTimerRunning: false,
    showRunResult:      false,
    runResultSecs:      15,
    voteSkipCounts:     0,

    myRole:          null,
    vibeCoderPeerId: null,
    roleTimer:       null,

    notification: null,
    countdown:    null,
    debugLog:     [],

    meetingVoteActive:  false,
    meetingVoteYes:     0,
    meetingVoteNo:      0,
    myMeetingVote:      null,
    showMeetingPrompt:  false,

    gameState: {
        files: {},
        developerTasks: {},
        injectorTasks: {},
        verifiedTaskIds: [],
        taskValidation: {},
        globalProgress: 0,
        sabotageProgress: 0,
        round: 0,
        votes: {},
    },
    sharedFiles:      FILES,
    localQuestState:  {},
    roomTaskProgressByPeer: {},
    tasks:            {},
    completedTaskIds: new Set(),
    taskProgress:     0,
    totalDevTasks:    0,

    currentRound:       0,
    isForceMeeting:     false,
    eliminatedPlayers:  [],
    gameWinner:         null,
    gameEndReason:      '',

    isSpectator: false,
    hasVoted:    false,

    // ── Language selection (set by host in Create Room) ──────
    selectedLangs:  [],      // e.g. ['python','java'] or ['random']
    activeLangIds:  [],      // resolved after rebuildFilesFromLangs()

    // ── Execute Code Screen (hiện trước Meeting) ──────────────
    showExecuteScreen:  false,
    executeScreenSecs:  10,
    _executeAfterCb:    null,
    validationRunning:  false,
    codeLocked:         false,
    waitingForHostResult: false,
    executionStatusText: '',
    hostCodeSubmissions: {},
    validationSubmissionDeadline: null,
    globalValidationResults: null,

    // Tổng hợp tasks đã hoàn thành từ tất cả players (broadcast qua network)
    allCompletedDevTasks: new Set(),   // Set<taskId>  — developer tasks
    allCompletedInjTasks: new Set(),   // Set<taskId>  — injector tasks

    _countdownTimer:      null,
    _roleTimer:           null,
    _codingTimerInterval: null,
    _runResultTimer:      null,
};