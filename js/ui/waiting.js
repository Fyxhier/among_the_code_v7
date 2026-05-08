/* ============================================================
   ui/waiting.js — Waiting room phase UI
   Pure rendering. No logic.
   ============================================================ */

function renderWaiting() {
    const voteCount  = S.players.filter(p => p.readyVote).length;
    const voteNeeded = Math.ceil(S.players.length * 0.8);

    const chatPanel = S.showChat ? renderWaitingChat() : '';
    const confirmExit = S.modal === 'confirm-exit' ? renderConfirmExitModal() : '';
    const settingsModal = S.modal === 'settings' ? renderSettingsModal() : '';

    return `
    <div style="position:fixed;inset:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;z-index:1;">
        <!-- BG grid -->
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,122,204,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,122,204,0.04) 1px,transparent 1px);background-size:32px 32px;pointer-events:none;"></div>

        <div style="display:flex;gap:16px;align-items:flex-start;position:relative;z-index:2;max-width:860px;width:100%;padding:20px;">

            <!-- ── MAIN TERMINAL WINDOW ── -->
            <div style="flex:1;background:#252526;border-radius:18px;border:1px solid #3d3d3d;box-shadow:0 24px 60px #000c;overflow:hidden;min-width:0;">

                <!-- Titlebar -->
                <div style="height:40px;background:#323233;display:flex;align-items:center;padding:0 14px;gap:10px;border-bottom:1px solid #1e1e1e;">
                    <div style="display:flex;gap:5px;">
                        <div style="width:12px;height:12px;background:#ef4444;border-radius:50%;"></div>
                        <div style="width:12px;height:12px;background:#f59e0b;border-radius:50%;"></div>
                        <div style="width:12px;height:12px;background:#22c55e;border-radius:50%;"></div>
                    </div>
                    <span style="font-size:11px;color:#cccccc;flex:1;text-align:center;">
                        🎮 ${S.roomName || 'Phòng chờ'} · Room ID: ${S.roomId} · ${S.players.length}/${S.maxPlayers}
                    </span>
                    <button onclick="S.showChat=!S.showChat;render()"
                        style="font-size:10px;padding:3px 10px;background:#37373d;color:#ccc;border:none;border-radius:6px;cursor:pointer;">
                        💬 Chat
                    </button>
                </div>

                <div style="padding:20px;">

                    <!-- Host: share Room ID -->
                    ${S.isHost ? `
                    <div style="background:#1a2a1a;border:1px solid #22c55e30;border-radius:10px;padding:12px;margin-bottom:16px;">
                        <div style="font-size:9px;color:#858585;margin-bottom:6px;">📡 Chia sẻ Room ID này để người khác join:</div>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <code style="font-size:18px;letter-spacing:0.1em;color:#22c55e;flex:1;word-break:break-all;">${S.peerId}</code>
                            <span class="copy-btn" onclick="copyText('${S.peerId}')">Copy</span>
                        </div>
                    </div>` : ''}

                    <!-- Player list -->
                    <div style="font-size:9px;color:#858585;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">
                        Người chơi (${S.players.length}/${S.maxPlayers})
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                        ${S.players.map(p => `
                        <div class="player-row">
                            <div style="width:38px;height:38px;border-radius:12px;background:${p.color};
                                display:flex;align-items:center;justify-content:center;font-size:18px;
                                flex-shrink:0;box-shadow:0 4px 12px ${p.color}40;">${p.avatar}</div>
                            <div style="flex:1;min-width:0;">
                                <div class="${fitClass(p.name)}" style="color:white;font-weight:500;">${p.name}</div>
                                <div style="font-size:9px;color:#858585;">${p.isHost ? '👑 Host' : (p.readyVote ? '🗳️ Vote bắt đầu' : '⌛ Chờ...')}</div>
                            </div>
                            <div style="width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;"></div>
                        </div>`).join('')}

                        ${Array.from({ length: Math.max(0, S.maxPlayers - S.players.length) }).map(() => `
                        <div style="display:flex;align-items:center;gap:12px;background:#1e1e1e;border:1px dashed #2d2d2e;border-radius:14px;padding:10px 14px;opacity:0.4;">
                            <div style="width:38px;height:38px;border-radius:12px;background:#2d2d2e;display:flex;align-items:center;justify-content:center;color:#444;font-size:18px;">?</div>
                            <span style="font-size:11px;color:#555;">Chờ người chơi...</span>
                        </div>`).join('')}
                    </div>

                    <!-- Vote status (members only) -->
                    ${!S.isHost ? `
                    <div style="text-align:center;font-size:10px;color:#858585;margin-bottom:12px;">
                        Vote bắt đầu sớm: ${voteCount}/${S.players.length} (cần ≥${voteNeeded})
                    </div>` : ''}

                    <!-- Action buttons -->
                    <div style="display:flex;gap:10px;">
                        <button class="btn btn-gray" style="flex:1;" onclick="S.modal='confirm-exit';render()">← Thoát</button>
                        ${S.isHost ? `
                        <button class="btn btn-gray" style="padding:8px 12px;" onclick="S.modal='settings';render()">⚙️</button>
                        <button class="btn btn-green" style="flex:1;font-size:13px;font-weight:600;" onclick="doHostStart()">▶ Bắt đầu</button>
                        ` : `
                        <button class="btn btn-amber" style="flex:1;" onclick="doVoteStart()">🗳️ Vote bắt đầu sớm</button>
                        `}
                    </div>
                </div>
            </div>

            ${chatPanel}
        </div>

        ${confirmExit}
        ${settingsModal}
    </div>`;
}

function renderWaitingChat() {
    return `
    <div style="width:280px;background:#1e1e1e;border-radius:16px;border:1px solid #a855f7;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #2d2d2e;">
            <span style="font-size:12px;color:#a855f7;font-weight:500;">💬 Chat</span>
            <div style="display:flex;gap:8px;align-items:center;">
                <button onclick="toggleVoice()"
                    style="font-size:10px;padding:3px 8px;border-radius:6px;cursor:pointer;border:none;
                    background:${S.voiceActive ? '#22c55e' : '#37373d'};color:${S.voiceActive ? '#000' : '#ccc'};"
                    class="${S.voiceActive ? 'speaking-ring' : ''}">
                    ${S.voiceActive ? '🎙️ ON' : '🎙️ OFF'}
                </button>
                <span onclick="S.showChat=false;render()" style="cursor:pointer;color:#858585;font-size:16px;">✕</span>
            </div>
        </div>
        <div id="chat-scroll" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;max-height:300px;">
            ${S.chatMessages.map(m => `
            <div style="font-size:10px;${m.type === 'system' ? 'color:#555;text-align:center;font-style:italic;' : ''}">
                ${m.type === 'player'
                    ? `<span style="color:${m.color || '#4fc3f7'}">${m.msg.split(':')[0]}:</span><span style="color:#d4d4d4;">${m.msg.slice(m.msg.indexOf(':') + 1)}</span>`
                    : m.msg}
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:6px;padding:10px;border-top:1px solid #2d2d2e;">
            <input id="chat-in" type="text" placeholder="Nhắn gì đó..." style="flex:1;font-size:11px;"
                onkeydown="if(event.key==='Enter')doSendChat()">
            <button class="btn btn-purple" style="font-size:11px;padding:6px 10px;" onclick="doSendChat()">↑</button>
        </div>
    </div>`;
}

function renderConfirmExitModal() {
    return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;">
        <div class="modal-anim" style="background:#252526;border-radius:16px;padding:24px;width:320px;border:1px solid #ef4444;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
            <div style="color:white;font-weight:500;margin-bottom:6px;">Thoát phòng?</div>
            <div style="font-size:11px;color:#858585;margin-bottom:20px;">Bạn sẽ rời khỏi phòng chờ.</div>
            <div style="display:flex;gap:10px;">
                <button class="btn btn-gray" style="flex:1;" onclick="closeModal()">Ở lại</button>
                <button class="btn btn-red" style="flex:1;" onclick="doExitRoom()">Thoát</button>
            </div>
        </div>
    </div>`;
}

function renderSettingsModal() {
    return `
    <div onclick="if(event.target===this)closeModal()"
        style="position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:50;">
        <div class="modal-anim" style="background:#252526;border-radius:16px;padding:24px;width:360px;border:1px solid #3d3d3d;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <span style="font-size:15px;font-weight:600;color:white;">⚙️ Cài Đặt Game</span>
                <span onclick="closeModal()" style="cursor:pointer;color:#858585;font-size:18px;">✕</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                    <div style="font-size:10px;color:#858585;margin-bottom:4px;">Thời gian mỗi round (giây)</div>
                    <input type="number" id="s-round" value="${S.roundTime}" min="30" max="300">
                </div>
                <div>
                    <div style="font-size:10px;color:#858585;margin-bottom:4px;">Thời gian meeting (giây)</div>
                    <input type="number" id="s-meeting" value="${S.meetingTime}" min="15" max="120">
                </div>
                <div style="display:flex;gap:10px;margin-top:4px;">
                    <button class="btn btn-gray" style="flex:1;" onclick="closeModal()">Hủy</button>
                    <button class="btn btn-green" style="flex:1;" onclick="doSaveSettings()">✅ Lưu</button>
                </div>
            </div>
        </div>
    </div>`;
}