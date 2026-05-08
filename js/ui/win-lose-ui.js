/* ============================================================
   ui/win-lose-ui.js  [UI]
   Màn hình thắng/thua kiểu Among Us.
   Developer thắng → màn hình xanh cho Developer, đỏ cho Injector
   Injector thắng  → màn hình đỏ cho Injector (thắng), xanh mờ cho Developer (thua)

   Exports: renderEndgame()
   Reads:   S.gameWinner, S.myRole, S.players, S.eliminatedPlayers,
            S.vibeCoderPeerId, S.gameEndReason, S.myName, S.myColor, S.myAvatar
   Called by: ui/render.js
   ============================================================ */

function renderEndgame() {
    const iAmDev      = S.myRole === 'developer';
    const iAmInjector = S.myRole === 'injector';
    const devWon      = S.gameWinner === 'developer';

    // Did I personally win?
    const iWon = (devWon && iAmDev) || (!devWon && iAmInjector);

    return iWon ? renderWinScreen() : renderLoseScreen();
}

// ── WIN SCREEN ────────────────────────────────────────────────
function renderWinScreen() {
    const iAmDev   = S.myRole === 'developer';
    const devWon   = S.gameWinner === 'developer';

    // Colors & theme
    const accent   = iAmDev ? '#22c55e' : '#ef4444';
    const bgGrad   = iAmDev
        ? 'radial-gradient(ellipse at 50% 30%, #052a10 0%, #011008 60%, #000 100%)'
        : 'radial-gradient(ellipse at 50% 30%, #2a0505 0%, #100101 60%, #000 100%)';
    const title    = iAmDev ? 'Victory!' : 'Injector Wins!';
    const subtitle = iAmDev
        ? 'Injector đã bị loại — Hệ thống an toàn!'
        : 'Chưa ai tìm ra bạn — Nhiệm vụ hoàn thành!';
    const icon     = iAmDev ? '🏆' : '💉';

    // All players in my winning team
    const myTeammates = iAmDev
        ? S.players.filter(p => p.peerId !== S.vibeCoderPeerId)
        : S.players.filter(p => p.peerId === S.vibeCoderPeerId);

    // The losing side
    const losers = iAmDev
        ? [...S.eliminatedPlayers.filter(p => p.peerId === S.vibeCoderPeerId),
           ...S.players.filter(p => p.peerId === S.vibeCoderPeerId)]
        : S.players.filter(p => p.peerId !== S.vibeCoderPeerId);

    const revealedInjector = [...S.eliminatedPlayers, ...S.players]
        .find(p => p.peerId === S.vibeCoderPeerId);

    return `
    <style>
        @keyframes winReveal { 0%{opacity:0;transform:translateY(30px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes starFloat { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(-120px) rotate(360deg);opacity:0} }
        @keyframes shimmer   { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .win-card { animation: winReveal 0.6s cubic-bezier(.4,0,.2,1) both; }
        .win-card-2 { animation: winReveal 0.6s 0.15s cubic-bezier(.4,0,.2,1) both; }
        .win-card-3 { animation: winReveal 0.6s 0.3s cubic-bezier(.4,0,.2,1) both; }
    </style>

    <div style="position:fixed;inset:0;background:${bgGrad};display:flex;flex-direction:column;
        align-items:center;justify-content:center;z-index:500;overflow:hidden;">

        <!-- BG grid -->
        <div style="position:absolute;inset:0;background-image:linear-gradient(${accent}0a 1px,transparent 1px),linear-gradient(90deg,${accent}0a 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>
        <!-- Scan lines -->
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px);pointer-events:none;"></div>

        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:28px;max-width:700px;width:95%;padding:24px;">

            <!-- Win banner -->
            <div class="win-card" style="text-align:center;">
                <div style="font-size:72px;filter:drop-shadow(0 0 30px ${accent});margin-bottom:8px;">${icon}</div>
                <div style="font-size:48px;font-weight:700;color:${accent};text-shadow:0 0 40px ${accent}80;letter-spacing:0.05em;line-height:1.1;">${title}</div>
                <div style="font-size:14px;color:${accent}90;margin-top:8px;letter-spacing:0.06em;">${subtitle}</div>
                <div style="font-size:11px;color:#555;margin-top:6px;font-style:italic;">${S.gameEndReason}</div>
            </div>

            <!-- My team: winners -->
            <div class="win-card-2" style="width:100%;">
                <div style="font-size:9px;color:${accent}80;text-transform:uppercase;letter-spacing:0.15em;text-align:center;margin-bottom:12px;">
                    ${iAmDev ? '💻 Tim Developer' : '💉 Tim Injector'} — Chiến thắng
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${myTeammates.map(p => buildWinPlayerCard(p, true, accent)).join('')}
                </div>
            </div>

            <!-- Losing side reveal -->
            ${revealedInjector || losers.length ? `
            <div class="win-card-3" style="width:100%;">
                <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.15em;text-align:center;margin-bottom:12px;">
                    ${iAmDev ? '💉 Injector' : '💻 Developer'} — Thất bại
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;opacity:0.7;">
                    ${(iAmDev ? [revealedInjector].filter(Boolean) : losers)
                        .map(p => buildWinPlayerCard(p, false, '#555')).join('')}
                </div>
            </div>` : ''}

            <!-- Reason & back button -->
            <div class="win-card-3" style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                <button onclick="backToLobby()"
                    style="padding:12px 36px;background:${accent};color:#000;border:none;border-radius:12px;
                    font-size:14px;font-weight:600;cursor:pointer;font-family:'JetBrains Mono',monospace;
                    box-shadow:0 4px 20px ${accent}60;transition:transform 0.1s;"
                    onmouseover="this.style.transform='scale(1.04)'"
                    onmouseout="this.style.transform='scale(1)'">
                    🏠 Về Lobby
                </button>
            </div>
        </div>
    </div>`;
}

// ── LOSE SCREEN ───────────────────────────────────────────────
function renderLoseScreen() {
    const iAmDev = S.myRole === 'developer';

    const accent   = '#555';
    const bgGrad   = 'radial-gradient(ellipse at 50% 30%, #0d0d0d 0%, #050505 60%, #000 100%)';
    const title    = iAmDev ? 'Defeat...' : 'Busted!';
    const subtitle = iAmDev
        ? 'Injector vẫn còn ẩn náu — Hệ thống thất thủ'
        : 'Bạn đã bị tìm ra — Game over';
    const icon     = iAmDev ? '💀' : '🔍';

    const winnerAccent = iAmDev ? '#ef4444' : '#22c55e';
    const winners      = iAmDev
        ? S.players.filter(p => p.peerId === S.vibeCoderPeerId)
        : S.players.filter(p => p.peerId !== S.vibeCoderPeerId);

    const me = S.players.find(p => p.peerId === S.peerId)
        || { name: S.myName, color: S.myColor, avatar: S.myAvatar };

    return `
    <style>
        @keyframes loseReveal { 0%{opacity:0;transform:scale(0.9)} 100%{opacity:1;transform:scale(1)} }
        .lose-card  { animation: loseReveal 0.5s cubic-bezier(.4,0,.2,1) both; }
        .lose-card-2{ animation: loseReveal 0.5s 0.15s cubic-bezier(.4,0,.2,1) both; }
        .lose-card-3{ animation: loseReveal 0.5s 0.3s cubic-bezier(.4,0,.2,1) both; }
    </style>

    <div style="position:fixed;inset:0;background:${bgGrad};display:flex;flex-direction:column;
        align-items:center;justify-content:center;z-index:500;overflow:hidden;">

        <!-- Subtle red vignette -->
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.6) 100%);pointer-events:none;"></div>
        <!-- grid -->
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;"></div>

        <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:28px;max-width:700px;width:95%;padding:24px;">

            <!-- Lose banner (my card, greyed + X) -->
            <div class="lose-card" style="text-align:center;">
                <!-- My avatar with X overlay -->
                <div style="position:relative;display:inline-block;margin-bottom:16px;">
                    <div style="width:80px;height:80px;border-radius:20px;background:${me.color};
                        display:flex;align-items:center;justify-content:center;font-size:40px;
                        filter:grayscale(0.6) brightness(0.7);box-shadow:0 4px 20px ${me.color}30;">
                        ${me.avatar}
                    </div>
                    <!-- Red X overlay -->
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                        <div style="font-size:56px;color:#ef4444;font-weight:700;text-shadow:0 0 20px #ef444480;line-height:1;opacity:0.9;">✕</div>
                    </div>
                </div>
                <div style="font-size:42px;font-weight:700;color:#555;letter-spacing:0.05em;line-height:1.1;">${title}</div>
                <div style="font-size:13px;color:#444;margin-top:8px;letter-spacing:0.06em;">${subtitle}</div>
                <div style="font-size:11px;color:#333;margin-top:6px;font-style:italic;">${S.gameEndReason}</div>
            </div>

            <!-- The winning side -->
            ${winners.length ? `
            <div class="lose-card-2" style="width:100%;">
                <div style="font-size:9px;color:${winnerAccent}80;text-transform:uppercase;letter-spacing:0.15em;text-align:center;margin-bottom:12px;">
                    ${iAmDev ? '💉 Injector menang' : '💻 Developer menang'} — Phe thắng
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
                    ${winners.map(p => buildWinPlayerCard(p, true, winnerAccent)).join('')}
                </div>
            </div>` : ''}

            <!-- My losing team -->
            <div class="lose-card-3" style="width:100%;">
                <div style="font-size:9px;color:#333;text-transform:uppercase;letter-spacing:0.15em;text-align:center;margin-bottom:12px;">
                    ${iAmDev ? '💻 Team bạn' : '💉 Bạn'} — Thất bại
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;opacity:0.55;">
                    ${(iAmDev
                        ? S.players.filter(p => p.peerId !== S.vibeCoderPeerId)
                        : [me])
                        .map(p => buildWinPlayerCard(p, false, '#444')).join('')}
                </div>
            </div>

            <div class="lose-card-3">
                <button onclick="backToLobby()"
                    style="padding:12px 36px;background:#2d2d2e;color:#ccc;border:1px solid #444;border-radius:12px;
                    font-size:14px;font-weight:600;cursor:pointer;font-family:'JetBrains Mono',monospace;
                    transition:background 0.1s;"
                    onmouseover="this.style.background='#37373d'"
                    onmouseout="this.style.background='#2d2d2e'">
                    🏠 Về Lobby
                </button>
            </div>
        </div>
    </div>`;
}

// ── Shared player card ─────────────────────────────────────────
function buildWinPlayerCard(p, isWinner, accent) {
    if (!p) return '';
    const nameLen  = (p.name || '').length;
    const nameFsz  = nameLen > 12 ? '9px' : nameLen > 8 ? '11px' : '12px';
    return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:70px;">
        <div style="width:52px;height:52px;border-radius:14px;background:${p.color};
            display:flex;align-items:center;justify-content:center;font-size:26px;
            box-shadow:0 4px 16px ${p.color}${isWinner?'60':'30'};
            filter:${isWinner?'none':'grayscale(0.5) brightness(0.6)'};
            ${isWinner?'outline:2px solid '+accent+';outline-offset:3px;':''}">
            ${p.avatar || '?'}
        </div>
        <div style="font-size:${nameFsz};color:${isWinner?'white':'#555'};text-align:center;
            max-width:70px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${p.name}</div>
        ${isWinner ? `<div style="font-size:8px;color:${accent};letter-spacing:0.05em;">★ WIN</div>` : ''}
    </div>`;
}