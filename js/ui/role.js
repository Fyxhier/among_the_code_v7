/* ============================================================
   ui/role.js — Role reveal phase UI
   Pure rendering. Reads S.myRole to decide which screen to show.
   ============================================================ */

function renderRolePhase() {
    const isDev = S.myRole === 'developer';

    const playerList = S.players.length > 0 ? S.players
        : [{ peerId: S.peerId, name: S.myName, color: S.myColor, avatar: S.myAvatar }];

    const vibeCoderPlayer = playerList.find(p => p.peerId === S.vibeCoderPeerId)
        || { name: S.myName, color: S.myColor, avatar: S.myAvatar };

    const timerPct = ((S.roleTimer ?? 6) / 6) * 100;

    return isDev ? renderDevScreen(playerList, timerPct) : renderInjectorScreen(vibeCoderPlayer, timerPct);
}

function renderDevScreen(playerList, timerPct) {
    return `
    <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:radial-gradient(ellipse at 50% 40%, #0a2a0a 0%, #050f05 60%, #000 100%);z-index:200;overflow:hidden;">

        <!-- BG grid -->
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(34,197,94,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.06) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
        <!-- Scan-lines -->
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);pointer-events:none;"></div>

        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:28px;max-width:600px;width:90%;padding:20px;">

            <!-- Role badge -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                <div style="font-size:56px;filter:drop-shadow(0 0 20px #22c55e);">💻</div>
                <div style="font-size:11px;color:#22c55e;letter-spacing:0.25em;text-transform:uppercase;">— Role Assigned —</div>
                <div style="font-size:36px;font-weight:700;color:#22c55e;text-shadow:0 0 30px #22c55e80;letter-spacing:0.05em;">
                    Bạn là Developer
                </div>
                <div style="font-size:13px;color:#86efac;opacity:0.85;">Hãy hoàn thành các nhiệm vụ trong game</div>
            </div>

            <!-- All teammates -->
            <div style="width:100%;">
                <div style="font-size:9px;color:#22c55e80;text-transform:uppercase;letter-spacing:0.15em;text-align:center;margin-bottom:14px;">
                    Đồng đội của bạn
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${playerList.map(p => `
                    <div style="display:flex;align-items:center;gap:8px;background:rgba(34,197,94,0.08);
                        border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:8px 14px;min-width:120px;">
                        <div style="width:34px;height:34px;border-radius:10px;background:${p.color};
                            display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;
                            box-shadow:0 2px 10px ${p.color}60;">${p.avatar}</div>
                        <div style="overflow:hidden;white-space:nowrap;font-size:${p.name.length > 10 ? '10px' : '12px'};color:white;font-weight:500;">${p.name}</div>
                    </div>`).join('')}
                </div>
            </div>

            <!-- Timer bar -->
            <div style="width:100%;display:flex;flex-direction:column;gap:6px;align-items:center;">
                <div style="width:100%;height:4px;background:rgba(34,197,94,0.15);border-radius:4px;overflow:hidden;">
                    <div id="role-timer-bar" style="height:100%;background:#22c55e;border-radius:4px;transition:width 0.95s linear;width:${timerPct}%;"></div>
                </div>
                <div style="font-size:10px;color:#22c55e60;">
                    Vào game sau <span id="role-timer-txt" style="color:#22c55e;">${S.roleTimer ?? 6}s</span>
                </div>
            </div>
        </div>
    </div>`;
}

function renderInjectorScreen(vibeCoderPlayer, timerPct) {
    return `
    <style>
        @keyframes vignettePulse { from{opacity:0.6} to{opacity:1} }
        @keyframes imposterReveal { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
    </style>
    <div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:radial-gradient(ellipse at 50% 40%, #2a0505 0%, #0f0505 60%, #000 100%);z-index:200;overflow:hidden;">

        <!-- BG grid -->
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(239,68,68,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.06) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
        <!-- Scan-lines -->
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.10) 2px,rgba(0,0,0,0.10) 4px);pointer-events:none;"></div>
        <!-- Vignette pulse -->
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.15) 100%);animation:vignettePulse 2s ease-in-out infinite alternate;pointer-events:none;"></div>

        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:28px;max-width:480px;width:90%;padding:20px;">

            <!-- Role badge -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;animation:imposterReveal 0.5s cubic-bezier(.4,0,.2,1) both;">
                <div style="font-size:56px;filter:drop-shadow(0 0 24px #ef444480);">🕵️</div>
                <div style="font-size:11px;color:#ef4444;letter-spacing:0.25em;text-transform:uppercase;">— Role Assigned —</div>
                <div style="font-size:36px;font-weight:700;color:#ef4444;text-shadow:0 0 30px #ef444480;letter-spacing:0.05em;">
                    Bạn là Injector
                </div>
                <div style="font-size:13px;color:#fca5a5;opacity:0.85;">Sabotage và phá hoại Developer!</div>
            </div>

            <!-- My player card -->
            <div style="display:flex;align-items:center;gap:16px;background:rgba(239,68,68,0.1);
                border:1px solid rgba(239,68,68,0.4);border-radius:18px;padding:16px 24px;
                box-shadow:0 0 40px rgba(239,68,68,0.2);">
                <div style="width:52px;height:52px;border-radius:14px;background:${vibeCoderPlayer.color};
                    display:flex;align-items:center;justify-content:center;font-size:26px;
                    box-shadow:0 4px 20px ${vibeCoderPlayer.color}60;">${vibeCoderPlayer.avatar}</div>
                <div>
                    <div style="font-size:9px;color:#ef444480;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">Injector</div>
                    <div style="font-size:16px;color:white;font-weight:600;">${vibeCoderPlayer.name}</div>
                </div>
            </div>

            <!-- Warning -->
            <div style="font-size:10px;color:#ef444460;letter-spacing:0.08em;text-align:center;line-height:1.7;">
                ⚠️ Đừng để lộ role của bạn<br>Hành động tự nhiên như những người khác
            </div>

            <!-- Timer bar -->
            <div style="width:100%;display:flex;flex-direction:column;gap:6px;align-items:center;">
                <div style="width:100%;height:4px;background:rgba(239,68,68,0.15);border-radius:4px;overflow:hidden;">
                    <div id="role-timer-bar" style="height:100%;background:#ef4444;border-radius:4px;transition:width 0.95s linear;width:${timerPct}%;"></div>
                </div>
                <div style="font-size:10px;color:#ef444460;">
                    Vào game sau <span id="role-timer-txt" style="color:#ef4444;">${S.roleTimer ?? 6}s</span>
                </div>
            </div>
        </div>
    </div>`;
}