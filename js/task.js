/* ============================================================
   tasks.js  [LOGIC]
   Định nghĩa nhiệm vụ cho Dev và Injector, logic hoàn thành,
   và tính toán tiến độ.
   ─────────────────────────────────────────────────────────────
   Writes to: S.tasks, S.completedTaskIds, S.taskProgress,
              S.totalDevTasks
   Reads:     S.myRole, S.currentFile
   ============================================================ */

// ── Task definitions (keyed by filename) ─────────────────────
// Dev tasks: làm tăng task progress
const TASKS_DEVELOPER = {
    'main.game.js': [
        { id: 'js-1', label: 'Viết hàm initPlayer(name)' },
        { id: 'js-2', label: 'Thêm vòng lặp gameLoop()' },
        { id: 'js-3', label: 'Khai báo biến score = 0' },
    ],
    'script.py': [
        { id: 'py-1', label: 'Tạo class GameState' },
        { id: 'py-2', label: 'Viết hàm check_winner()' },
    ],
    'Main.java': [
        { id: 'java-1', label: 'Implement PlayerManager class' },
        { id: 'java-2', label: 'Override phương thức toString()' },
    ],
    'game.cpp': [
        { id: 'cpp-1', label: 'Khai báo struct Player { }' },
        { id: 'cpp-2', label: 'Viết hàm update() mỗi frame' },
    ],
};

// Injector tasks: sabotage — KHÔNG cộng vào progress
const TASKS_INJECTOR = {
    'main.game.js': [
        { id: 'injs-1', label: 'Thêm while(true){} ẩn vào hàm bất kỳ' },
        { id: 'injs-2', label: 'Đổi biến score thành s0re' },
    ],
    'script.py': [
        { id: 'inpy-1', label: 'Sửa return True thành return False' },
        { id: 'inpy-2', label: 'Thêm import thừa gây lỗi module' },
    ],
    'Main.java': [
        { id: 'injava-1', label: 'Xóa throws Exception khỏi method' },
        { id: 'injava-2', label: 'Comment out dòng return quan trọng' },
    ],
    'game.cpp': [
        { id: 'incpp-1', label: 'Thêm delete ptr sau khi đã dùng' },
        { id: 'incpp-2', label: 'Đổi <= thành < trong vòng lặp' },
    ],
};

// ── Init tasks based on role ──────────────────────────────────
function initTasks() {
    const source = S.myRole === 'injector' ? TASKS_INJECTOR : TASKS_DEVELOPER;
    S.tasks = {};
    Object.keys(source).forEach(fn => {
        S.tasks[fn] = source[fn].map(t => ({ ...t, done: false }));
    });
    S.completedTaskIds = new Set();

    // Count total dev tasks (used for progress bar denominator)
    S.totalDevTasks = Object.values(TASKS_DEVELOPER)
        .reduce((acc, arr) => acc + arr.length, 0);
    S.taskProgress = 0;
}

// ── Complete a task ───────────────────────────────────────────
function completeTask(taskId) {
    // Find and mark done
    let found = false;
    Object.keys(S.tasks).forEach(fn => {
        S.tasks[fn].forEach(t => {
            if (t.id === taskId && !t.done) {
                t.done = true;
                found = true;
                S.completedTaskIds.add(taskId);
            }
        });
    });
    if (!found) return;

    // Recalculate progress (only Dev tasks count)
    if (S.myRole === 'developer') {
        const completed = [...S.completedTaskIds].filter(id => !id  .startsWith('in')).length;
        S.taskProgress = S.totalDevTasks > 0
            ? Math.round((completed / S.totalDevTasks) * 100)
            : 0;
    }
    // Patch progress bar in-place to avoid full re-render
    patchProgressBar();
    // Re-render task list
    patchTaskList();
}

// ── DOM patches (avoid full re-render for perf) ───────────────
function patchProgressBar() {
    const bar  = document.getElementById('task-progress-fill');
    const pct  = document.getElementById('task-progress-pct');
    const note = document.getElementById('task-progress-note');
    if (bar)  bar.style.width = S.taskProgress + '%';
    if (pct)  pct.textContent = S.taskProgress + '%';
    if (note && S.taskProgress >= 100) {
        note.textContent = '🎉 Tất cả nhiệm vụ hoàn thành!';
        note.style.color = '#22c55e';
    }
}

function patchTaskList() {
    const container = document.getElementById('task-list-container');
    if (!container) return;
    const tasksForFile = (S.tasks[S.currentFile] || []);
    container.innerHTML = tasksForFile.map(t => buildTaskRow(t)).join('');
}

// Exposed for ui/taskbar.js
function buildTaskRow(t) {
    return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #1a1a1a;">
        <div onclick="completeTask('${t.id}')"
            style="width:16px;height:16px;border-radius:4px;flex-shrink:0;cursor:${t.done?'default':'pointer'};margin-top:1px;
            border:1px solid ${t.done?'#22c55e':'#444'};background:${t.done?'#22c55e':'transparent'};
            display:flex;align-items:center;justify-content:center;font-size:10px;">
            ${t.done ? '✓' : ''}
        </div>
        <div style="font-size:10px;line-height:1.4;color:${t.done?'#555':'#ccc'};
            text-decoration:${t.done?'line-through':'none'};">${t.label}</div>
    </div>`;
}