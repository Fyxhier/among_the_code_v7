┌─ FILE TREE ─────────────────────────────────────────────────────────────────┐
│  codreamong/
│  ├── index.html                  [CONFIG]  Entry point
│  ├── style.css                   [CSS]     Visual styling
│  ├── README.md
│  │
│  └── js/
│      ├── constants.js            [LOGIC]   COLORS, AVATARS, FILES, PUBLIC_ROOMS
│      ├── state.js                [LOGIC]   S{} — nguồn sự thật duy nhất
│      ├── network.js              [LOGIC]   PeerJS WebRTC transport + message router
│      ├── game.js                 [LOGIC]   Phase transitions, timers, role assignment
│      ├── tasks.js                [LOGIC]   Developer / Injector tasks + progress
│      ├── meeting-vote.js         [LOGIC]   Vote cuộc họp + network messages
│      ├── win-lose.js             [LOGIC]★  Rounds (3×5min), force meeting, win conditions (V6: buildAutoRunOutput thực)
│      ├── actions.js              [LOGIC]   Controller — bridge giữa DOM và logic
│      │
│      └── ui/
│          ├── render.js           [UI]      render() dispatcher + toast + countdown
│          ├── lobby.js            [UI]      Lobby + create/join modals
│          ├── waiting.js          [UI]      Waiting room + chat + settings
│          ├── role.js             [UI]      Role reveal: Developer vs Injector
│          ├── taskbar.js          [UI]      Task sidebar + progress strip
│          ├── meeting-vote-ui.js  [UI]      Prompt nhỏ + banner vote họp
│          ├── win-lose-ui.js      [UI] ★    Among Us style win/lose screen
│          └── coding.js           [UI]      Coding phase: editor + overlays
│  
│  ★ = Thêm mới hoặc thay đổi lớn trong lần cập nhật này
└─────────────────────────────────────────────────────────────────────────────┘

┌─ LUỒNG PHỤ THUỘC ──────────────────────────────────────────────────────────┐
│  constants.js, state.js  ←── dữ liệu tĩnh & state, đọc bởi tất cả
│  
│  network.js ─── handleNetworkMessage() ──→  game.js       (countdown, roles)
│                                         ──→  win-lose.js   (GAME_OVER, FORCE_MEETING)
│                                         ──→  meeting-vote.js (vote events)
│                                         ──→  actions.js    (CONFIRM_VOTE)
│  
│  game.js ──→ startCodingTimer()  →  onRoundTimerExpired() [win-lose.js]
│          ──→ enterCodingPhase()  →  initTasks()           [tasks.js]
│          ──→ applyRoles()        →  S.myRole = developer|injector
│  
│  win-lose.js ──→ triggerEndgame()  →  S.phase = endgame  →  render()
│              ──→ processVoteResult() →  checkWinCondition()
│              ──→ startForceMeeting()  →  S.showMeeting = true
│  
│  actions.js  ──→ doConfirmVote()  →  processVoteResult()  [win-lose.js]
│              ──→ doOpenMeeting()  →  requestMeeting()     [meeting-vote.js]
│  
│  ui/render.js.render()
│      ├── renderLobby()         [ui/lobby.js]
│      ├── renderWaiting()       [ui/waiting.js]
│      ├── renderRolePhase()     [ui/role.js]
│      ├── renderEndgame()  ★    [ui/win-lose-ui.js]
│      └── renderCoding()        [ui/coding.js]
│              ├── renderTaskbar() + renderProgressStrip()   [ui/taskbar.js]
│              └── buildMeetingPrompt() + buildMeetingVoteBanner() [ui/meeting-vote-ui.js]
└─────────────────────────────────────────────────────────────────────────────┘

┌─ LUỒNG GAME (ROUND SYSTEM) ─────────────────────────────────────────────────┐
│  lobby → [create/join] → waiting → countdown 3-2-1 → role reveal (6s) → coding
│  
│  CODING PHASE (3 rounds × 5 phút):
│    Round 1 (5 phút)  →  timer hết  →  Force Meeting  →  vote
│    Round 2 (5 phút)  →  timer hết  →  Force Meeting  →  vote
│    Round 3 (5 phút)  →  timer hết  →  Force Meeting  →  vote  →  GAME OVER
│  
│  Trong mỗi meeting:
│    - Nếu vote loại Injector         →  Developer WIN
│    - Nếu Developer còn ≤ Injector   →  Injector WIN
│    - Sau round 3 & chưa tìm ra      →  Injector WIN
│  
│  Người chơi có thể mở meeting thủ công bằng nút MEETING
│    → Prompt nhỏ vote "Bạn có muốn họp?" → banner → ≥80% → họp
│    (Meeting thủ công không tốn round, không force kết thúc game)
│  
│  Win/Lose screen (Among Us style):
│    Developer thắng: nền xanh ★ cho Developer, xám mờ cho Injector
│    Injector thắng:  nền đỏ ★ cho Injector,   xám mờ cho Developer
└─────────────────────────────────────────────────────────────────────────────┘
