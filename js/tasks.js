/* ============================================================
   tasks.js — Dynamic task system
   Tasks are built from current FILES (which depend on chosen languages).
   Dev tasks help progress; Injector tasks sabotage files.
   ============================================================ */

// These are populated by initTasks() based on current FILES + lang config
let TASKS_DEVELOPER = {};
let TASKS_INJECTOR  = {};

function initTasks() {
    if (S.gameState && Object.keys(S.gameState.developerTasks || {}).length) {
        TASKS_DEVELOPER = clonePlain(S.gameState.developerTasks);
        TASKS_INJECTOR = clonePlain(S.gameState.injectorTasks);
    } else {
        const { devTasks, injTasks } = buildTasksForFiles();
        TASKS_DEVELOPER = attachTaskTests(devTasks);
        TASKS_INJECTOR = attachTaskTests(injTasks);
    }

    const myPool = S.myRole === 'injector' ? TASKS_INJECTOR : TASKS_DEVELOPER;

    S.tasks = {};
    const fileOrder = Object.keys(myPool);
    const currentIndex = Math.max(0, fileOrder.indexOf(S.currentFile));
    const prioritizedFiles = fileOrder.slice().sort((a, b) => Math.abs(fileOrder.indexOf(a) - currentIndex) - Math.abs(fileOrder.indexOf(b) - currentIndex));
    let remainingTasks = 6;
    prioritizedFiles.forEach(fn => {
        const picked = (myPool[fn] || []).filter(t => (t.targetFile || t.fileName || fn) === fn).slice(0, Math.min(3, remainingTasks));
        remainingTasks -= picked.length;
        S.tasks[fn] = picked.map(t => {
            const validation = (S.gameState.taskValidation && S.gameState.taskValidation[t.id]) || null;
            return {
                ...t,
                status: validation || 'untouched',
                pending_validation: validation === 'pending_validation',
                done: validation === 'success' || (S.gameState.verifiedTaskIds || []).includes(t.id),
            };
        });
    });
    fileOrder.forEach(fn => { if (!S.tasks[fn]) S.tasks[fn] = []; });

    S.localQuestState = S.tasks;
    S.sharedFiles = FILES;
    S.roomTaskProgressByPeer = { [S.peerId || 'local']: 0 };
    S.completedTaskIds = new Set(S.gameState.verifiedTaskIds || []);
    S.allCompletedDevTasks = new Set((S.gameState.verifiedTaskIds || []).filter(id => !id.startsWith('in')));
    S.allCompletedInjTasks = new Set((S.gameState.verifiedTaskIds || []).filter(id => id.startsWith('in')));
    S.totalDevTasks = Object.values(TASKS_DEVELOPER).reduce((a, arr) => a + arr.length, 0);
    recalculateGlobalProgress();
}

function clonePlain(value) {
    return JSON.parse(JSON.stringify(value || {}));
}

function attachTaskTests(taskMap) {
    const out = clonePlain(taskMap);
    Object.keys(out).forEach(fn => {
        out[fn] = out[fn].map(t => {
            const test = inferTaskTest(t.label);
            return {
                ...t,
                targetFile: t.targetFile || fn,
                fileName: t.fileName || fn,
                test,
                expectedOutput: test.type === 'outputContains' ? test.value : undefined,
                validationRegex: test.type === 'codeRegex' || test.type === 'outputRegex' ? test.pattern : undefined,
            };
        });
    });
    return out;
}

function inferTaskTest(label) {
    const text = label || '';
    const quoted = text.match(/[“\"]([^”\"]+)[”\"]/);
    if (/score\s*=\s*0|score=0/i.test(text)) return { type: 'codeRegex', pattern: 'score\\s*=\\s*0' };
    if (/running\s*=\s*true/i.test(text)) return { type: 'codeRegex', pattern: 'running\\s*=\\s*true' };
    if (/running\s*=\s*false/i.test(text)) return { type: 'codeRegex', pattern: 'running\\s*=\\s*false' };
    if (/isRunning\s*=\s*true/i.test(text)) return { type: 'codeRegex', pattern: 'isRunning\\s*=\\s*true' };
    if (/is_running\s*=\s*False/i.test(text)) return { type: 'codeRegex', pattern: 'is_running\\s*=\\s*False' };
    if (/return\s+True|True\/False/i.test(text)) return { type: 'codeRegex', pattern: 'return\\s+(True|False)' };
    if (/clamp/i.test(text)) return { type: 'codeRegex', pattern: 'max\\s*\\(\\s*min\\s*\\(|min\\s*\\(\\s*max\\s*\\(' };
    if (/lerp/i.test(text)) return { type: 'codeRegex', pattern: 'a\\s*\\+\\s*\\(?b\\s*-\\s*a\\)?\\s*\\*\\s*t' };
    if (/toString/i.test(text)) return { type: 'codeRegex', pattern: 'return\\s+.*players' };
    if (/Game running/i.test(text)) return { type: 'outputContains', value: 'Game running' };
    if (quoted) return { type: 'outputContains', value: quoted[1] };
    return { type: 'codeChanged' };
}

function verifyTask(code, output, task) {
    if (typeof task.testCase === 'function') return task.testCase(output || '', code || '');
    const test = task && task.test;
    if (!test) return false;
    if (test.type === 'codeRegex') return new RegExp(test.pattern, test.flags || '').test(code || '');
    if (test.type === 'outputContains') return (output || '').includes(test.value || '');
    if (test.type === 'outputRegex') return new RegExp(test.pattern, test.flags || '').test(output || '');
    if (test.type === 'codeChanged') return (code || '').trim().length > 0;
    return false;
}

function appendTestScripts(code, language, tasks) {
    const tests = (tasks || []).map(task => task.testScript || buildTestScript(language, task)).filter(Boolean);
    if (!tests.length) return code;
    if (language === 'javascript' || language === 'typescript') {
        return code + '\n\n' + tests.join('\n');
    }
    if (language === 'python') {
        return code + '\n\n' + tests.join('\n');
    }
    return code + '\n\n' + tests.join('\n');
}

function buildTestScript(language, task) {
    const expected = task.expectedOutput || (task.test && task.test.value);
    if (!expected) return '';
    if (language === 'javascript' || language === 'typescript') return `\nconsole.log(${JSON.stringify(expected)});`;
    if (language === 'python') return `\nprint(${JSON.stringify(expected)})`;
    if (language === 'java') return `\n// hidden expected output: ${expected}`;
    if (language === 'cpp') return `\n// hidden expected output: ${expected}`;
    return '';
}

async function validateFile(fileContent, tasks, language, fileName) {
    const runnableCode = appendTestScripts(fileContent, language, tasks);
    const exec = await executeCodeViaPiston(language, runnableCode, fileName);
    const results = (tasks || []).map(task => ({
        task,
        passed: exec.success && verifyTask(fileContent, exec.output, task),
    }));
    return { ...exec, results, testedCode: runnableCode };
}

function applyVerifiedTask(taskId, role, peerId) {
    setTaskValidationStatus(taskId, 'success', role);
}

function setTaskValidationStatus(taskId, status, role) {
    if (!taskId) return;
    S.gameState.taskValidation = S.gameState.taskValidation || {};
    S.gameState.taskValidation[taskId] = status;

    if (status === 'success') {
        S.completedTaskIds = S.completedTaskIds || new Set();
        S.completedTaskIds.add(taskId);
        S.gameState.verifiedTaskIds = Array.from(new Set([...(S.gameState.verifiedTaskIds || []), taskId]));
        if (role === 'injector' || taskId.startsWith('in')) (S.allCompletedInjTasks = S.allCompletedInjTasks || new Set()).add(taskId);
        else (S.allCompletedDevTasks = S.allCompletedDevTasks || new Set()).add(taskId);
    } else if (status === 'fail') {
        S.completedTaskIds.delete(taskId);
        S.allCompletedDevTasks.delete(taskId);
        S.allCompletedInjTasks.delete(taskId);
        S.gameState.verifiedTaskIds = (S.gameState.verifiedTaskIds || []).filter(id => id !== taskId);
    }

    Object.keys(S.tasks || {}).forEach(fn => {
        (S.tasks[fn] || []).forEach(t => {
            if (t.id !== taskId) return;
            t.status = status;
            t.pending_validation = status === 'pending_validation';
            t.done = status === 'success';
        });
    });

    recalculateGlobalProgress();
    patchProgressBar();
    patchTaskList();
}

function recalculateGlobalProgress() {
    const verified = new Set(S.gameState.verifiedTaskIds || []);
    const devTasks = Object.values(TASKS_DEVELOPER).flat();
    const injTasks = Object.values(TASKS_INJECTOR).flat();
    const devDone = devTasks.filter(t => verified.has(t.id)).length;
    const injDone = injTasks.filter(t => verified.has(t.id)).length;
    S.totalDevTasks = devTasks.length;
    S.taskProgress = devTasks.length > 0 ? Math.round((devDone / devTasks.length) * 100) : 0;
    S.gameState.globalProgress = S.taskProgress;
    S.gameState.sabotageProgress = injTasks.length > 0 ? Math.round((injDone / injTasks.length) * 100) : 0;
    return { globalProgress: S.gameState.globalProgress, sabotageProgress: S.gameState.sabotageProgress };
}

async function executeCodeViaPiston(language, codeSnippet, fileName) {
    const runtime = {
        javascript: ['javascript', '18.15.0'],
        python: ['python', '3.10.0'],
        java: ['java', '15.0.2'],
        cpp: ['cpp', '10.2.0'],
        typescript: ['typescript', '5.0.3'],
        rust: ['rust', '1.68.2'],
        go: ['go', '1.16.2'],
    }[language] || [language, '*'];

    if (!codeSnippet || !codeSnippet.trim()) {
        return { output: '', stderr: 'Empty code', success: false };
    }

    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language: runtime[0],
            version: runtime[1],
            files: [{ name: fileName || ('main.' + language), content: codeSnippet }],
        }),
    });

    if (!res.ok) return { output: '', stderr: 'Piston HTTP ' + res.status, success: false };
    const data = await res.json();
    const output = [data.run && data.run.stdout, data.compile && data.compile.stdout].filter(Boolean).join('\n').trim();
    const stderr = [data.compile && data.compile.stderr, data.run && data.run.stderr].filter(Boolean).join('\n').trim();
    return { output, stderr, success: !stderr && (!data.run || data.run.code === 0) };
}

async function hostValidateAll() {
    if (!S.isHost) return S.globalValidationResults || {};
    if (S.validationRunning) return S.globalValidationResults || {};

    S.validationRunning = true;
    S.waitingForHostResult = true;
    S.codeLocked = true;
    S.executionStatusText = 'Host đang chuẩn bị chấm bài...';
    S.hostCodeSubmissions = S.hostCodeSubmissions || {};
    S.hostCodeSubmissions[S.peerId || 'host'] = typeof collectLocalCodeSnapshot === 'function' ? collectLocalCodeSnapshot() : clonePlain(FILES);
    S.globalValidationResults = buildValidationShell('running');
    if (typeof sendToAll === 'function') sendToAll({ type: 'EXECUTION_STATUS_SYNC', statusText: S.executionStatusText, results: S.globalValidationResults });
    render();

    const validation = S.gameState.taskValidation || {};
    const filesToValidate = Object.keys(FILES).map(fileId => {
        const devTasks = (TASKS_DEVELOPER[fileId] || []).filter(t => validation[t.id] === 'pending_validation');
        const injTasks = (TASKS_INJECTOR[fileId] || []).filter(t => validation[t.id] === 'pending_validation');
        return { fileId, devTasks, injTasks, tasks: [...devTasks, ...injTasks] };
    }).filter(item => item.tasks.length);

    if (!filesToValidate.length) {
        S.globalValidationResults.status = 'complete';
        recalculateGlobalProgress();
        S.globalValidationResults.globalProgress = S.gameState.globalProgress;
        S.globalValidationResults.sabotageProgress = S.gameState.sabotageProgress;
        S.validationRunning = false;
        S.waitingForHostResult = false;
        S.codeLocked = false;
        S.executionStatusText = 'Không có task nào cần chấm.';
        if (typeof broadcastResults === 'function') broadcastResults(S.globalValidationResults, []);
        if (typeof holdFinalValidationScreen === 'function') holdFinalValidationScreen(10);
        render();
        return S.globalValidationResults;
    }

    const rejectedTaskIds = [];
    const fileResults = await Promise.all(filesToValidate.map(async (item, index) => {
        const file = FILES[item.fileId];
        const code = file && file.content || '';
        const checkingText = `Đang kiểm tra file ${item.fileId} (${index + 1}/${filesToValidate.length})...`;
        if (typeof sendToAll === 'function') sendToAll({ type: 'EXECUTION_STATUS_SYNC', statusText: checkingText, results: S.globalValidationResults });
        S.executionStatusText = checkingText;
        render();

        const result = await validateFile(code, item.tasks, file && file.lang, item.fileId);
        result.results.forEach(r => {
            const role = item.devTasks.some(t => t.id === r.task.id) ? 'developer' : 'injector';
            setTaskValidationStatus(r.task.id, r.passed ? 'success' : 'fail', role);
            if (!r.passed) rejectedTaskIds.push(r.task.id);
        });
        const devPassed = item.devTasks.filter(t => S.gameState.taskValidation[t.id] === 'success').length;
        const injPassed = item.injTasks.filter(t => S.gameState.taskValidation[t.id] === 'success').length;
        const corrupted = injPassed > 0 || (!result.success && item.injTasks.length > 0);
        const fileResult = {
            fileId: item.fileId,
            icon: file && file.icon,
            lang: file && file.lang,
            devPassed,
            devTotal: item.devTasks.length,
            injPassed,
            injTotal: item.injTasks.length,
            corrupted,
            status: corrupted ? 'sabotaged' : result.success ? 'ok' : 'failed',
            output: result.output,
            stderr: result.stderr,
        };
        S.globalValidationResults.files[item.fileId] = fileResult;
        if (typeof sendToAll === 'function') sendToAll({
            type: 'EXECUTION_STATUS_SYNC',
            statusText: `Đã kiểm tra file ${item.fileId} (${index + 1}/${filesToValidate.length})`,
            results: S.globalValidationResults,
        });
        return fileResult;
    }));

    S.globalValidationResults = buildValidationShell('complete');
    fileResults.forEach(r => { S.globalValidationResults.files[r.fileId] = r; });
    recalculateGlobalProgress();
    S.globalValidationResults.globalProgress = S.gameState.globalProgress;
    S.globalValidationResults.sabotageProgress = S.gameState.sabotageProgress;
    S.validationRunning = false;
    S.waitingForHostResult = false;
    S.codeLocked = false;
    S.executionStatusText = 'Chấm bài hoàn tất.';
    if (typeof broadcastResults === 'function') broadcastResults(S.globalValidationResults, rejectedTaskIds);
    if (S.gameState.sabotageProgress >= 100 && typeof triggerEndgame === 'function') triggerEndgame('injector', 'Sabotage progress reached 100%');
    if (S.gameState.globalProgress >= 100 && typeof triggerEndgame === 'function') triggerEndgame('developer', 'Developers completed all validated tasks');
    patchProgressBar();
    patchTaskList();
    if (typeof holdFinalValidationScreen === 'function') holdFinalValidationScreen(10);
    else render();
    return S.globalValidationResults;
}

async function validateAllPendingTasks() {
    return hostValidateAll();
}

function buildValidationShell(status) {
    const files = {};
    Object.keys(FILES).forEach(fileId => {
        files[fileId] = {
            fileId,
            lang: FILES[fileId].lang,
            devPassed: 0,
            devTotal: (TASKS_DEVELOPER[fileId] || []).length,
            injPassed: 0,
            injTotal: (TASKS_INJECTOR[fileId] || []).length,
            corrupted: false,
            status,
            output: '',
            stderr: '',
        };
    });
    return {
        status,
        files,
        globalProgress: S.gameState.globalProgress || 0,
        sabotageProgress: S.gameState.sabotageProgress || 0,
    };
}

function findTaskById(taskId) {
    for (const [fileId, tasks] of Object.entries(TASKS_DEVELOPER || {})) {
        const task = tasks.find(t => t.id === taskId);
        if (task) return { fileId, task, role: 'developer' };
    }
    for (const [fileId, tasks] of Object.entries(TASKS_INJECTOR || {})) {
        const task = tasks.find(t => t.id === taskId);
        if (task) return { fileId, task, role: 'injector' };
    }
    return null;
}

function verifyCurrentTasksForFile(fn, output) {
    const code = FILES[fn] && FILES[fn].content || '';
    const pool = S.myRole === 'injector' ? TASKS_INJECTOR : TASKS_DEVELOPER;
    const tasks = pool[fn] || [];
    const newlyVerified = [];
    tasks.forEach(task => {
        if ((S.gameState.verifiedTaskIds || []).includes(task.id)) return;
        if (!verifyTask(code, output, task)) return;
        applyVerifiedTask(task.id, S.myRole, S.peerId);
        newlyVerified.push(task.id);
    });
    return [];
}

function exportGameState() {
    return {
        files: clonePlain(FILES),
        developerTasks: clonePlain(TASKS_DEVELOPER),
        injectorTasks: clonePlain(TASKS_INJECTOR),
        verifiedTaskIds: Array.from(new Set(S.gameState.verifiedTaskIds || [])),
        taskValidation: { ...(S.gameState.taskValidation || {}) },
        globalProgress: S.gameState.globalProgress || S.taskProgress || 0,
        sabotageProgress: S.gameState.sabotageProgress || 0,
        round: S.currentRound || S.gameState.round || 0,
        votes: { ...(S.votes || {}) },
    };
}

function hydrateGameState(gameState) {
    if (!gameState) return;
    S.gameState = {
        files: clonePlain(gameState.files),
        developerTasks: clonePlain(gameState.developerTasks),
        injectorTasks: clonePlain(gameState.injectorTasks),
        verifiedTaskIds: gameState.verifiedTaskIds || [],
        taskValidation: gameState.taskValidation || {},
        globalProgress: gameState.globalProgress || 0,
        sabotageProgress: gameState.sabotageProgress || 0,
        round: gameState.round || 0,
        votes: gameState.votes || {},
    };
    Object.keys(FILES).forEach(k => delete FILES[k]);
    Object.keys(S.gameState.files || {}).forEach(k => { FILES[k] = S.gameState.files[k]; });
    S.sharedFiles = FILES;
    S.votes = { ...(S.gameState.votes || {}) };
    if (!FILES[S.currentFile]) S.currentFile = Object.keys(FILES)[0] || S.currentFile;
    TASKS_DEVELOPER = clonePlain(S.gameState.developerTasks);
    TASKS_INJECTOR = clonePlain(S.gameState.injectorTasks);
    recalculateGlobalProgress();
}

function toggleTask(taskId) {
    let nextStatus = null;
    Object.keys(S.tasks || {}).forEach(fn => {
        (S.tasks[fn] || []).forEach(t => {
            if (t.id !== taskId) return;
            nextStatus = t.status === 'pending_validation' ? 'untouched' : 'pending_validation';
            t.status = nextStatus;
            t.pending_validation = nextStatus === 'pending_validation';
            t.done = nextStatus === 'pending_validation';
        });
    });
    if (!nextStatus) return;
    S.gameState.taskValidation = S.gameState.taskValidation || {};
    if (nextStatus === 'untouched') delete S.gameState.taskValidation[taskId];
    else S.gameState.taskValidation[taskId] = nextStatus;
    patchTaskList();
    render();
}

function handleRemoteTaskCompleted(data) {
    if (!data || !data.taskId) return;
    if (data.role === 'injector') {
        (S.allCompletedInjTasks = S.allCompletedInjTasks || new Set()).add(data.taskId);
    } else {
        (S.allCompletedDevTasks = S.allCompletedDevTasks || new Set()).add(data.taskId);
    }
}

function handleRemoteTaskUncompleted(data) {
    if (!data || !data.taskId) return;
    if (data.role === 'injector') {
        (S.allCompletedInjTasks = S.allCompletedInjTasks || new Set()).delete(data.taskId);
    } else {
        (S.allCompletedDevTasks = S.allCompletedDevTasks || new Set()).delete(data.taskId);
    }
}

function patchProgressBar() {
    const bar  = document.getElementById('task-progress-fill');
    const pct  = document.getElementById('task-progress-pct');
    const note = document.getElementById('task-progress-note');
    if (bar)  bar.style.width = (S.gameState.globalProgress || S.taskProgress || 0) + '%';
    if (pct)  pct.textContent = 'D ' + (S.gameState.globalProgress || S.taskProgress || 0) + '%';
    const sabBar = document.getElementById('sabotage-progress-fill');
    const sabPct = document.getElementById('sabotage-progress-pct');
    if (sabBar) sabBar.style.width = (S.gameState.sabotageProgress || 0) + '%';
    if (sabPct) sabPct.textContent = 'I ' + (S.gameState.sabotageProgress || 0) + '%';
    if (note) {
        note.textContent = S.taskProgress >= 100 ? '🎉 Hoàn thành 100%!' : '';
        note.style.color = '#22c55e';
    }
}

function patchTaskList() {
    const container = document.getElementById('task-list-container');
    if (!container) return;
    container.innerHTML = (S.tasks[S.currentFile] || []).map(t => buildTaskRow(t)).join('');
}

function buildTaskRow(t) {
    const status = t.status || 'untouched';
    const color = status === 'success' ? '#22c55e' : status === 'fail' ? '#ef4444' : status === 'pending_validation' ? '#f59e0b' : '#444';
    const mark = status === 'success' ? '✓' : status === 'fail' ? '×' : status === 'pending_validation' ? '…' : '';
    const title = status === 'pending_validation' ? 'Pending validation at Meeting' : status;
    return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #1a1a1a;">
        <div onclick="toggleTask('${t.id}')" title="${title}"
            style="width:16px;height:16px;border-radius:4px;flex-shrink:0;cursor:pointer;margin-top:1px;
            border:1px solid ${color};background:${status === 'untouched' ? 'transparent' : color};
            color:${status === 'pending_validation' ? '#111' : '#fff'};
            display:flex;align-items:center;justify-content:center;font-size:10px;">
            ${mark}
        </div>
        <div style="font-size:10px;line-height:1.4;color:${status === 'success' ? '#555' : '#ccc'};
            text-decoration:${status === 'success' ? 'line-through' : 'none'};">${t.label}</div>
    </div>`;
}
