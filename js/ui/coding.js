function renderExplorer() {
    const files = (S.gameState && S.gameState.files && Object.keys(S.gameState.files).length) ? S.gameState.files : FILES;
    return Object.keys(files).map(fn => {
        const fileMeta = files[fn];
        const active = fn === S.currentFile;
        const activePlayers = S.fileActivePlayers[fn] || [];
        const hasTask = !!((TASKS_DEVELOPER[fn] || []).length || (TASKS_INJECTOR[fn] || []).length);
        const dotRow = '<div id="file-dots-' + fn + '" style="display:flex;gap:3px;flex-wrap:nowrap;margin-top:3px;overflow:hidden;">'
            + activePlayers.map(p => '<div title="' + p.name + '" style="width:8px;height:8px;border-radius:2px;background:' + p.color + ';flex-shrink:0;"></div>').join('')
            + '</div>';
        return '<div onclick="switchFile(\'' + fn + '\')"'
            + ' style="padding:7px 10px;cursor:pointer;border-left:2px solid ' + (active ? '#007acc' : 'transparent') + ';'
            + 'background:' + (active ? '#37373d' : 'transparent') + ';transition:background 0.1s;"'
            + ' onmouseover="if(\'' + fn + '\'!==\'' + S.currentFile + '\')this.style.background=\'#2a2a2a\'"'
            + ' onmouseout="if(\'' + fn + '\'!==\'' + S.currentFile + '\')this.style.background=\'transparent\'">'
            + '<div style="display:flex;align-items:center;gap:6px;">'
            + '<span style="font-size:13px;flex-shrink:0;">' + (fileMeta.icon || '📄') + '</span>'
            + '<span style="font-size:11px;color:' + (active ? 'white' : '#ccc') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">' + fn + '</span>'
            + (hasTask ? '<span title="Has verified task" style="font-size:8px;color:#f59e0b;margin-left:auto;">●</span>' : '')
            + '</div>' + dotRow + '</div>';
    }).join('');
}

function renderCoding() {
    const mins     = Math.floor(S.codingTimer / 60);
    const secs     = S.codingTimer % 60;
    const isUrgent = S.codingTimer <= 30;
    const timerStr = mins + ':' + String(secs).padStart(2, '0');

    const terminal      = S.showRunResult ? buildRunResultTerminal() : '';
    const meeting       = S.showMeeting   ? buildMeeting()           : '';
    const meetingPrompt = buildMeetingPrompt();
    const meetingBanner = buildMeetingVoteBanner();

    const meetingBtnStyle = S.isSpectator
        ? 'opacity:0.3;pointer-events:none;cursor:not-allowed;'
        : '';

    const spectatorBadge = S.isSpectator
        ? `<div style="display:flex;align-items:center;gap:5px;background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:3px 10px;font-size:10px;color:#858585;">
            <span>👻</span><span>Ghost Mode</span>
           </div>`
        : '';

    return `
    <div style="height:36px;background:#323233;display:flex;align-items:center;padding:0 12px;
        border-bottom:1px solid #1e1e1e;gap:8px;flex-shrink:0;position:relative;">
        <div style="display:flex;gap:5px;">
            <div style="width:11px;height:11px;background:#ef4444;border-radius:50%;"></div>
            <div style="width:11px;height:11px;background:#f59e0b;border-radius:50%;"></div>
            <div style="width:11px;height:11px;background:#22c55e;border-radius:50%;"></div>
        </div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);">
            <div id="coding-timer-box" style="display:flex;align-items:center;gap:6px;background:#1a1a1a;
                border:1px solid ${isUrgent ? '#ef444466' : '#22c55e44'};border-radius:10px;padding:3px 12px;">
                <span style="font-size:9px;color:#555;">⏱ R${S.currentRound}/${TOTAL_ROUNDS}</span>
                <span id="coding-timer-display"
                    style="font-size:13px;font-weight:600;color:${isUrgent ? '#ef4444' : '#22c55e'};letter-spacing:0.06em;">
                    ${timerStr}
                </span>
            </div>
        </div>
        <span style="font-size:10px;color:#858585;margin-left:auto;">Coding Phase</span>
        ${spectatorBadge}
        <button class="btn btn-purple" style="font-size:11px;padding:5px 12px;${meetingBtnStyle}"
            onclick="doOpenMeeting()">🗣️ MEETING</button>

    </div>

    ${renderProgressStrip()}

    <div style="display:flex;flex:1;overflow:hidden;">
        <div style="width:48px;background:#2d2d2e;display:flex;flex-direction:column;
            align-items:center;padding:8px 0;gap:4px;flex-shrink:0;">
            <div style="font-size:16px;">📁</div>
        </div>

        <div style="width:172px;background:#252526;border-right:1px solid #1e1e1e;
            flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:8px 12px;font-size:9px;color:#858585;text-transform:uppercase;
                letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;flex-shrink:0;">Explorer</div>
            <div style="flex:1;overflow-y:auto;padding:4px 0;">
                ${renderExplorer()}
            </div>
        </div>

        <div id="editor-wrapper">
            <div style="background:#252526;display:flex;align-items:flex-end;border-bottom:1px solid #1e1e1e;padding:0 8px;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;font-size:11px;
                    color:white;background:#1e1e1e;border-bottom:2px solid #007acc;border-radius:6px 6px 0 0;">
                    ${FILES[S.currentFile].icon} ${S.currentFile}
                </div>
            </div>
            <div style="flex:1;padding:16px;overflow:auto;background:#1e1e1e;">
                <textarea id="code-editor-area"
                    style="width:100%;height:100%;background:transparent;color:#d4d4d4;outline:none;resize:none;border:none;caret-color:#d4d4d4;"
                    ${S.codeLocked ? 'disabled' : ''}
                    spellcheck="false"
                    oninput="handleCodeInput(this)"
                    onkeyup="broadcastCursor(this)"
                    onmouseup="broadcastCursor(this)"
                    onselect="broadcastCursor(this)">${FILES[S.currentFile].content}</textarea>
            </div>
            <div style="height:24px;background:#007acc;font-size:9px;display:flex;align-items:center;padding:0 12px;flex-shrink:0;">
                <span style="margin-left:auto;">${S.isSpectator ? '👻 Ghost · ' : ''}${S.myName} · Room ${S.roomId || 'Solo'} · ${S.myRole === 'injector' ? '🕵️ Injector' : '💻 Developer'}</span>
            </div>
        </div>

        ${renderTaskbar()}
    </div>

    ${meetingPrompt}
    ${meetingBanner}
    ${terminal}
    ${meeting}`;
}

function buildRunResultTerminal() {
    const needed = Math.max(1, S.players.length || 1);
    return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:50;">
        <div class="modal-anim" style="background:#1e1e1e;border-radius:16px;padding:20px;border:1px solid #f59e0b;width:680px;height:460px;display:flex;flex-direction:column;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <span style="color:#22c55e;font-weight:500;">◉ AUTO-RUN — Round ${S.currentRound} kết thúc</span>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:10px;color:#555;">Tự đóng sau <span id="run-result-timer" style="color:#f59e0b;">${S.runResultSecs}s</span></span>
                    <button onclick="voteSkip()" style="font-size:10px;padding:4px 10px;background:#37373d;color:#ccc;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:'JetBrains Mono',monospace;">
                        ⏭️ Vote Skip <span id="vote-skip-count">${S.voteSkipCounts}/${needed}</span>
                    </button>
                </div>
            </div>
            <pre style="flex:1;background:#0a0a0a;color:#22c55e;padding:16px;font-size:11px;overflow:auto;border-radius:10px;font-family:'JetBrains Mono',monospace;margin:0;">${S.terminalOutput}</pre>
        </div>
    </div>`;
}

function buildMeeting() {
    const alivePlayers = S.players.length > 0 ? S.players : [
        { peerId: 'demo1', name: 'Araki',   color: '#22c55e', avatar: '👾' },
        { peerId: 'demo2', name: 'Player2', color: '#ef4444', avatar: '🔴' },
        { peerId: 'demo3', name: 'Player3', color: '#3b82f6', avatar: '🔵' },
    ];

    const chatInputRow = S.isSpectator ? '' : `
        <div style="display:flex;gap:6px;padding:8px;border-top:1px solid #2d2d2e;">
            <input id="mc-in" type="text" placeholder="Nhắn..." style="flex:1;font-size:11px;"
                onkeydown="if(event.key==='Enter')doSendMeetingChat()">
            <button class="btn btn-purple" style="font-size:11px;padding:5px 8px;" onclick="doSendMeetingChat()">↑</button>
        </div>`;

    const chatPanel = S.showMeetingChat ? `
    <div style="width:260px;background:#1e1e1e;border-radius:14px;border:1px solid #a855f7;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;">
        <div style="display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #2d2d2e;">
            <span style="font-size:12px;color:#a855f7;">💬 Chat</span>
            <span onclick="S.showMeetingChat=false;render()" style="cursor:pointer;color:#858585;">✕</span>
        </div>
        <div id="meeting-chat-scroll" style="flex:1;overflow:auto;padding:10px;font-size:10px;display:flex;flex-direction:column;gap:4px;max-height:280px;">
            ${S.meetingChatMessages.map(m =>
                `<div><span style="color:${m.color || '#4fc3f7'};">${m.from}:</span> <span style="color:#d4d4d4;">${m.msg}</span></div>`
            ).join('')}
        </div>
        ${chatInputRow}
    </div>` : '';

    let voteArea;
    if (S.isSpectator) {
        voteArea = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
            <div style="font-size:48px;">👻</div>
            <div style="font-size:14px;color:#555;font-weight:500;">Bạn đang ở chế độ Ghost</div>
            <div style="font-size:11px;color:#3d3d3d;">Quan sát cuộc họp — không thể bỏ phiếu</div>
        </div>`;
    } else if (S.hasVoted) {
        voteArea = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
            <div style="font-size:48px;animation:shimmer 1.5s infinite;">⏳</div>
            <div style="font-size:14px;color:#f59e0b;font-weight:500;">Phiếu của bạn đã được ghi nhận</div>
            <div style="font-size:11px;color:#555;">Đang chờ người khác bỏ phiếu...</div>
            <div style="display:flex;gap:6px;margin-top:4px;">
                ${alivePlayers.map(p => `
                <div title="${p.name}" style="width:32px;height:32px;border-radius:8px;background:${p.color};
                    display:flex;align-items:center;justify-content:center;font-size:16px;opacity:0.6;">
                    ${p.avatar}
                </div>`).join('')}
            </div>
        </div>`;
    } else {
        voteArea = `
        <div style="flex:1;">
            <div style="font-size:9px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.1em;text-align:center;margin-bottom:12px;">Chọn để vote</div>
            <div style="background:#1e1e1e;border-radius:14px;padding:20px;display:flex;flex-wrap:wrap;gap:16px;justify-content:center;border:1px solid rgba(245,158,11,0.2);">
                ${alivePlayers.map(p => {
                    const sel = S.selectedVote === (p.peerId || p.id);
                    return '<div onclick="S.selectedVote=\'' + (p.peerId || p.id) + '\';render()" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.1s;transform:' + (sel ? 'scale(1.12)' : 'scale(1)') + ';">'
                        + '<div style="width:60px;height:60px;border-radius:14px;background:' + p.color + ';display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 8px 20px ' + p.color + '40;' + (sel ? 'outline:2px solid #22c55e;outline-offset:3px;' : '') + '">' + p.avatar + '</div>'
                        + '<div style="margin-top:8px;font-size:11px;color:white;">' + p.name + '</div>'
                        + (sel ? '<div style="font-size:9px;color:#22c55e;">● VOTED</div>' : '')
                        + '</div>';
                }).join('')}
            </div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;">
                <button class="btn btn-green" style="padding:12px 28px;font-size:14px;" onclick="doConfirmVote()">✅ Xác nhận</button>
                <button class="btn btn-amber" style="padding:12px 28px;font-size:14px;" onclick="doSkipVote()">⏭️ Skip</button>
            </div>
        </div>`;
    }

    return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:50;">
        <div class="modal-anim" style="background:#252526;border-radius:18px;padding:22px;border:2px solid #f59e0b;box-shadow:0 24px 60px #000c;display:flex;flex-direction:column;max-width:860px;width:95%;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:28px;">🚨</span>
                    <div>
                        <div style="font-size:20px;font-weight:600;color:#f59e0b;">EMERGENCY MEETING</div>
                        <div style="font-size:10px;color:#555;">Round ${S.currentRound}/${TOTAL_ROUNDS}${S.isForceMeeting ? ' — Force Meeting' : ''}</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-gray" style="font-size:11px;" onclick="S.showMeetingChat=!S.showMeetingChat;render()">💬 Chat</button>
                </div>
            </div>
            <div style="display:flex;gap:16px;flex:1;">
                ${voteArea}
                ${chatPanel}
            </div>
        </div>
    </div>`;
}