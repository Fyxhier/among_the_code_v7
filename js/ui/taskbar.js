/* ============================================================
   ui/taskbar.js  [UI]
   Right-side task panel for coding phase.
   Dev    → "Các nhiệm vụ cần hoàn thành"
   Injector → "Nhiệm vụ phá hoại"
   Progress bar is rendered separately via renderProgressStrip().
   ============================================================ */

function renderTaskbar() {
    const isDev       = S.myRole === 'developer';
    const accentColor = isDev ? '#22c55e' : '#ef4444';
    const title       = isDev ? '📋 Nhiệm vụ cần hoàn thành' : '💉 Nhiệm vụ phá hoại (Injector)';
    const tasksForFile = (S.tasks && S.tasks[S.currentFile]) || [];
    const allFiles     = S.tasks ? Object.keys(S.tasks) : [];

    // Count overall completed for this role
    const totalTasks = allFiles.reduce((a, fn) => a + (S.tasks[fn]||[]).length, 0);
    const doneTasks  = allFiles.reduce((a, fn) => a + (S.tasks[fn]||[]).filter(t=>t.done).length, 0);

    return `
    <div style="width:210px;background:#252526;border-left:1px solid #1e1e1e;
        display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;">

        <!-- Header -->
        <div style="padding:8px 12px;font-size:10px;font-weight:600;color:${accentColor};
            border-bottom:1px solid #1e1e1e;letter-spacing:0.04em;flex-shrink:0;">
            ${title}
        </div>

        <!-- Current file label -->
        <div style="padding:6px 12px;font-size:9px;color:#555;border-bottom:1px solid #1a1a1a;flex-shrink:0;
            background:#1e1e1e;">
            ${FILES[S.currentFile]?.icon || ''} ${S.currentFile}
        </div>

        <!-- Task list for current file -->
        <div id="task-list-container" style="flex:1;overflow-y:auto;padding:8px 12px;">
            ${tasksForFile.length === 0
                ? `<div style="font-size:10px;color:#444;text-align:center;margin-top:20px;">Không có nhiệm vụ cho file này</div>`
                : tasksForFile.map(t => buildTaskRow(t)).join('')
            }
        </div>

        <!-- All-file summary -->
        <div style="padding:8px 12px;border-top:1px solid #1e1e1e;flex-shrink:0;">
            <div style="font-size:9px;color:#555;margin-bottom:6px;letter-spacing:0.06em;text-transform:uppercase;">
                Tổng tiến độ cá nhân
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <div style="flex:1;height:4px;background:#2d2d2e;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;background:${accentColor};border-radius:2px;
                        width:${totalTasks>0?Math.round(doneTasks/totalTasks*100):0}%;transition:width 0.3s;"></div>
                </div>
                <span style="font-size:9px;color:${accentColor};width:28px;text-align:right;">
                    ${totalTasks>0?Math.round(doneTasks/totalTasks*100):0}%
                </span>
            </div>

            <!-- File switcher shortcut -->
            <div style="font-size:9px;color:#444;margin-bottom:4px;">Xem theo file:</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${allFiles.map(fn => {
                    const tasks = S.tasks[fn] || [];
                    const done  = tasks.filter(t=>t.done).length;
                    const isActive = fn === S.currentFile;
                    return `
                    <div onclick="switchFile('${fn}')"
                        title="${fn}: ${done}/${tasks.length}"
                        style="font-size:14px;cursor:pointer;opacity:${isActive?1:0.45};
                        filter:${done===tasks.length&&tasks.length>0?'grayscale(0)':'grayscale(0.4)'};">
                        ${FILES[fn]?.icon || '📄'}
                    </div>`;
                }).join('')}
            </div>
        </div>
    </div>`;
}

// ── Thin progress strip shown at very top of coding area ──────
// (dev team progress only, Injector tasks do NOT contribute)
function renderProgressStrip() {
    const devPct = S.gameState.globalProgress || S.taskProgress || 0;
    const sabPct = S.gameState.sabotageProgress || 0;

    return `
    <div style="height:12px;background:#111;flex-shrink:0;position:relative;overflow:hidden;" title="Developer ${devPct}% · Sabotage ${sabPct}%">
        <div id="task-progress-fill"
            style="height:6px;background:#22c55e;width:${devPct}%;transition:width 0.5s ease;box-shadow:0 0 6px #22c55e80;">
        </div>
        <div id="sabotage-progress-fill"
            style="height:6px;background:#ef4444;width:${sabPct}%;transition:width 0.5s ease;box-shadow:0 0 6px #ef444480;">
        </div>
        <div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:6px;pointer-events:none;">
            <span id="task-progress-pct" style="font-size:8px;color:#22c55e;font-family:'JetBrains Mono',monospace;line-height:1;">D ${devPct}%</span>
            <span id="sabotage-progress-pct" style="font-size:8px;color:#ef4444;font-family:'JetBrains Mono',monospace;line-height:1;">I ${sabPct}%</span>
            <span id="task-progress-note" style="font-size:8px;color:#22c55e;font-family:'JetBrains Mono',monospace;line-height:1;"></span>
        </div>
    </div>`;
}