const COLORS  = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];
const AVATARS = ['👾', '🔴', '🔵', '🟡', '🟣'];

// ── Language Configurations ──────────────────────────────────
// Mỗi ngôn ngữ định nghĩa: files (name + content) và tasks (dev + inj)
// File name phải khớp chính xác với ext của ngôn ngữ đó (tránh bug quest).
const LANG_CONFIGS = {
    javascript: {
        id: 'javascript', label: 'JavaScript', icon: '🟦', ext: '.js',
        color: '#f7df1e',
        files: [
            {
                name: 'main.game.js',
                content: `let score = null;\nlet playerName = "";\nlet isRunning = false;\n\nfunction initPlayer(name) {\n\n}\n\nfunction gameLoop() {\n\n}\n\nfunction onCollision(a, b) {\n    return a.x === b.x && a.y === b.y;\n}`,
            },
            {
                name: 'engine.js',
                content: `class EventEmitter {\n    constructor() {\n        this.listeners = {};\n    }\n\n    on(event, fn) {\n\n    }\n\n    emit(event, data) {\n\n    }\n}\n\nfunction loadAssets(list) {\n    return Promise.all(list.map(url => fetch(url)));\n}`,
            },
        ],
        devTasks: [
            { id: 'js-1', label: 'Mở main.game.js — viết hàm initPlayer(name), gán playerName và isRunning=true' },
            { id: 'js-2', label: 'Trong main.game.js — thêm logic xử lý trong gameLoop()' },
            { id: 'js-3', label: 'Trong main.game.js — đổi score = null thành score = 0' },
            { id: 'js-4', label: 'Mở engine.js — implement EventEmitter.on(event, fn)' },
            { id: 'js-5', label: 'Trong engine.js — implement EventEmitter.emit(event, data)' },
        ],
        injTasks: [
            { id: 'injs-1', label: 'Truy cập main.game.js — thêm while(true){} ẩn trong gameLoop()' },
            { id: 'injs-2', label: 'Trong main.game.js — đổi biến score thành s0re (gây bug ngầm)' },
            { id: 'injs-3', label: 'Mở engine.js — thêm delete Object.prototype ở dòng cuối file' },
        ],
    },
    python: {
        id: 'python', label: 'Python', icon: '🐍', ext: '.py',
        color: '#3776ab',
        files: [
            {
                name: 'game_state.py',
                content: `class GameState:\n\n    def __init__(self):\n        self.players = []\n        self.round = 1\n        self.score = 0\n\ndef check_winner(state):\n\n    pass\n\ndef run_game():\n    state = GameState()\n    return state`,
            },
            {
                name: 'utils.py',
                content: `import math\n\ndef clamp(value, min_val, max_val):\n\n    pass\n\ndef lerp(a, b, t):\n\n    pass\n\ndef distance(p1, p2):\n    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)`,
            },
        ],
        devTasks: [
            { id: 'py-1', label: 'Mở game_state.py — thêm is_running=False vào GameState.__init__()' },
            { id: 'py-2', label: 'Trong game_state.py — viết hàm check_winner(state) trả về True/False' },
            { id: 'py-3', label: 'Mở utils.py — implement clamp(value, min_val, max_val)' },
            { id: 'py-4', label: 'Trong utils.py — implement lerp(a, b, t) = a + (b-a)*t' },
        ],
        injTasks: [
            { id: 'inpy-1', label: 'Truy cập game_state.py — sửa check_winner: return True thành return False' },
            { id: 'inpy-2', label: 'Trong game_state.py — thêm dòng "import nonexistent_module" gây lỗi' },
            { id: 'inpy-3', label: 'Mở utils.py — đổi math.sqrt thành math.sin trong hàm distance()' },
        ],
    },
    java: {
        id: 'java', label: 'Java', icon: '☕', ext: '.java',
        color: '#ed8b00',
        files: [
            {
                name: 'Main.java',
                content: `import java.util.ArrayList;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        PlayerManager pm = new PlayerManager();\n        System.out.println(pm.toString());\n    }\n}\n\nclass PlayerManager {\n    private List<String> players = new ArrayList<>();\n\n    public void addPlayer(String name) {\n        players.add(name);\n    }\n\n    public String toString() {\n\n    }\n}`,
            },
            {
                name: 'GameEngine.java',
                content: `public class GameEngine {\n    private int score;\n    private boolean running;\n\n    public GameEngine() {\n\n    }\n\n    public void start() {\n\n    }\n\n    public int getScore() {\n        return score;\n    }\n}`,
            },
        ],
        devTasks: [
            { id: 'java-1', label: 'Mở Main.java — implement PlayerManager.toString() trả về danh sách players' },
            { id: 'java-2', label: 'Mở GameEngine.java — viết constructor GameEngine() khởi tạo score=0, running=false' },
            { id: 'java-3', label: 'Trong GameEngine.java — implement start() set running=true' },
        ],
        injTasks: [
            { id: 'injava-1', label: 'Truy cập Main.java — xóa return statement trong toString()' },
            { id: 'injava-2', label: 'Mở GameEngine.java — comment out dòng score=0 trong constructor' },
            { id: 'injava-3', label: 'Trong GameEngine.java — đổi running=true thành running=false trong start()' },
        ],
    },
    cpp: {
        id: 'cpp', label: 'C/C++', icon: '⚙️', ext: '.cpp',
        color: '#00599c',
        files: [
            {
                name: 'game.cpp',
                content: `#include <iostream>\n#include <vector>\n#include <string>\n\nstruct Player {\n\n};\n\nstd::vector<Player> players;\n\nvoid update() {\n\n}\n\nint main() {\n    update();\n    std::cout << "Game running" << std::endl;\n    return 0;\n}`,
            },
            {
                name: 'renderer.cpp',
                content: `#include <iostream>\n\nclass Renderer {\npublic:\n    int width;\n    int height;\n\n    Renderer(int w, int h) {\n\n    }\n\n    void draw(const std::string& msg) {\n\n    }\n};\n`,
            },
        ],
        devTasks: [
            { id: 'cpp-1', label: 'Mở game.cpp — khai báo struct Player { string name; int hp; }' },
            { id: 'cpp-2', label: 'Trong game.cpp — viết hàm update() xử lý vị trí players' },
            { id: 'cpp-3', label: 'Mở renderer.cpp — implement Renderer(w,h): gán width và height' },
            { id: 'cpp-4', label: 'Trong renderer.cpp — implement draw(): in msg ra std::cout' },
        ],
        injTasks: [
            { id: 'incpp-1', label: 'Truy cập game.cpp — thêm "delete ptr;" sau khi dùng trong update()' },
            { id: 'incpp-2', label: 'Trong game.cpp — đổi <= thành < trong vòng lặp update()' },
            { id: 'incpp-3', label: 'Mở renderer.cpp — xóa this->width = w trong Renderer constructor' },
        ],
    },
    typescript: {
        id: 'typescript', label: 'TypeScript', icon: '🔷', ext: '.ts',
        color: '#3178c6',
        files: [
            {
                name: 'player.ts',
                content: `interface IPlayer {\n    name: string;\n    score: number;\n    isAlive: boolean;\n}\n\nclass Player implements IPlayer {\n    name: string;\n    score: number;\n    isAlive: boolean;\n\n    constructor(name: string) {\n\n    }\n\n    addScore(pts: number): void {\n\n    }\n}`,
            },
            {
                name: 'game.ts',
                content: `type GamePhase = 'lobby' | 'playing' | 'ended';\n\nclass Game {\n    private players: any[] = [];\n    private phase: GamePhase = 'lobby';\n\n    addPlayer(name: string): void {\n\n    }\n\n    start(): void {\n\n    }\n}`,
            },
        ],
        devTasks: [
            { id: 'ts-1', label: 'Mở player.ts — implement constructor(name): khởi tạo đủ 3 field' },
            { id: 'ts-2', label: 'Trong player.ts — implement addScore(pts): this.score += pts' },
            { id: 'ts-3', label: 'Mở game.ts — implement addPlayer(name): push Player mới vào array' },
            { id: 'ts-4', label: 'Trong game.ts — implement start(): đổi phase thành "playing"' },
        ],
        injTasks: [
            { id: 'ints-1', label: 'Truy cập game.ts — xóa "playing" khỏi union type GamePhase' },
            { id: 'ints-2', label: 'Trong player.ts — sửa addScore: đổi += thành -= (trừ thay vì cộng)' },
            { id: 'ints-3', label: 'Mở game.ts — đổi phase = "playing" thành phase = "ended" trong start()' },
        ],
    },
    rust: {
        id: 'rust', label: 'Rust', icon: '🦀', ext: '.rs',
        color: '#ce422b',
        files: [
            {
                name: 'main.rs',
                content: `struct Player {\n    name: String,\n    score: u32,\n}\n\nimpl Player {\n    fn new(name: &str) -> Self {\n\n    }\n\n    fn add_score(&mut self, pts: u32) {\n\n    }\n}\n\nfn main() {\n    let mut p = Player::new("Hero");\n    p.add_score(10);\n    println!("{}: {}", p.name, p.score);\n}`,
            },
            {
                name: 'game.rs',
                content: `use std::collections::HashMap;\n\npub struct Game {\n    players: HashMap<String, u32>,\n    round: u32,\n}\n\nimpl Game {\n    pub fn new() -> Self {\n\n    }\n\n    pub fn tick(&mut self) {\n\n    }\n}`,
            },
        ],
        devTasks: [
            { id: 'rs-1', label: 'Mở main.rs — implement Player::new(name): return Player{name, score:0}' },
            { id: 'rs-2', label: 'Trong main.rs — implement add_score: self.score += pts' },
            { id: 'rs-3', label: 'Mở game.rs — implement Game::new(): HashMap::new(), round: 1' },
            { id: 'rs-4', label: 'Trong game.rs — implement tick(): self.round += 1' },
        ],
        injTasks: [
            { id: 'inrs-1', label: 'Truy cập main.rs — thêm panic!("index out of bounds") vào add_score()' },
            { id: 'inrs-2', label: 'Trong main.rs — đổi score: u32 thành score: i32 gây type mismatch' },
            { id: 'inrs-3', label: 'Mở game.rs — xóa pub khỏi Game::new() làm hàm thành private' },
        ],
    },
    go: {
        id: 'go', label: 'Go', icon: '🐹', ext: '.go',
        color: '#00add8',
        files: [
            {
                name: 'main.go',
                content: `package main\n\nimport "fmt"\n\ntype Player struct {\n    Name  string\n    Score int\n}\n\nfunc NewPlayer(name string) *Player {\n\n}\n\nfunc (p *Player) AddScore(pts int) {\n\n}\n\nfunc main() {\n    p := NewPlayer("Hero")\n    p.AddScore(10)\n    fmt.Printf("%s: %d\\n", p.Name, p.Score)\n}`,
            },
            {
                name: 'game.go',
                content: `package main\n\ntype Game struct {\n    Players []*Player\n    Round   int\n}\n\nfunc NewGame() *Game {\n\n}\n\nfunc (g *Game) Tick() {\n\n}`,
            },
        ],
        devTasks: [
            { id: 'go-1', label: 'Mở main.go — implement NewPlayer(name): return &Player{Name:name, Score:0}' },
            { id: 'go-2', label: 'Trong main.go — implement AddScore(pts): p.Score += pts' },
            { id: 'go-3', label: 'Mở game.go — implement NewGame(): return &Game{Round:1}' },
            { id: 'go-4', label: 'Trong game.go — implement Tick(): g.Round += 1' },
        ],
        injTasks: [
            { id: 'ingo-1', label: 'Truy cập main.go — đổi p.Score += pts thành p.Score -= pts' },
            { id: 'ingo-2', label: 'Trong main.go — thêm nil pointer: var p *Player; p.Score = 1' },
            { id: 'ingo-3', label: 'Mở game.go — xóa return statement trong NewGame() gây compile error' },
        ],
    },
};

// ── Active FILES object (built at game start from chosen langs) ──────────────
// Ban đầu dùng JS + Python như cũ; sẽ được rebuild khi host chọn ngôn ngữ
const FILES = {
    'main.game.js': {
        content: LANG_CONFIGS.javascript.files[0].content,
        lang: 'javascript',
        icon: '🟦'
    },
    'script.py': {
        content: LANG_CONFIGS.python.files[0].content,
        lang: 'python',
        icon: '🐍'
    },
    'Main.java': {
        content: LANG_CONFIGS.java.files[0].content,
        lang: 'java',
        icon: '☕'
    },
    'game.cpp': {
        content: LANG_CONFIGS.cpp.files[0].content,
        lang: 'cpp',
        icon: '⚙️'
    }
};

const PUBLIC_ROOMS = [
    { id: '123456', name: 'Battle Royale #001', cur: 3, max: 5 },
    { id: '789012', name: 'Code Duel #042',     cur: 1, max: 5 },
    { id: '345678', name: 'Speed Code VIP',     cur: 4, max: 5 },
];

// ── Default file contents — dùng để reset khi bắt đầu game mới ──────────────
const FILES_DEFAULT = {};
(function() {
    Object.keys(FILES).forEach(fn => {
        FILES_DEFAULT[fn] = FILES[fn].content;
    });
})();

/** Khôi phục tất cả FILES về nội dung gốc (gọi khi bắt đầu game mới) */
function resetFilesContent() {
    Object.keys(FILES).forEach(fn => {
        FILES[fn].content = FILES_DEFAULT[fn];
    });
}

/**
 * Rebuild FILES và FILES_DEFAULT từ danh sách ngôn ngữ được chọn.
 * @param {string[]} langIds - mảng id ngôn ngữ, e.g. ['python','java']
 *                             Nếu rỗng hoặc 'random' → chọn 2 ngôn ngữ ngẫu nhiên
 * Trả về object FILES mới (đã ghi vào global FILES)
 */
function rebuildFilesFromLangs(langIds) {
    const allLangs = Object.keys(LANG_CONFIGS);

    // Resolve lang list
    let chosen;
    if (!langIds || langIds.length === 0 || langIds[0] === 'random') {
        const shuffled = _shuffleArray(allLangs.slice());
        chosen = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
    } else {
        chosen = langIds.filter(id => LANG_CONFIGS[id]);
        if (chosen.length === 0) chosen = ['javascript', 'python'];
    }

    // Clear FILES
    Object.keys(FILES).forEach(k => delete FILES[k]);

    // Collect file slots — shuffle within each lang so template order varies per game
    const allSlots = [];
    chosen.forEach(langId => {
        const cfg = LANG_CONFIGS[langId];
        const shuffledFiles = _shuffleArray(cfg.files.slice());
        shuffledFiles.forEach(f => allSlots.push({ langId, cfg, file: f }));
    });

    // Shuffle across langs too for extra variety
    _shuffleArray(allSlots);

    // Ensure exactly 4 file slots
    const TARGET = 4;
    while (allSlots.length < TARGET) {
        allSlots.push({ ...allSlots[allSlots.length % allSlots.length] });
    }
    const finalSlots = allSlots.slice(0, TARGET);

    // Handle duplicate file names
    const usedNames = new Set();
    finalSlots.forEach(slot => {
        const cfg  = slot.cfg;
        let name   = slot.file.name;
        if (usedNames.has(name)) {
            const ext  = name.lastIndexOf('.');
            const base = ext > 0 ? name.slice(0, ext) : name;
            const sfx  = ext > 0 ? name.slice(ext) : '';
            let i = 2;
            while (usedNames.has(`${base}${i}${sfx}`)) i++;
            name = `${base}${i}${sfx}`;
        }
        usedNames.add(name);

        FILES[name] = {
            content: slot.file.content,
            lang:    cfg.id,
            icon:    cfg.icon,
            _langId: cfg.id,
        };
        FILES_DEFAULT[name] = slot.file.content;
    });

    return FILES;
}

/**
 * Build dynamic TASKS_DEVELOPER and TASKS_INJECTOR keyed by current FILES.
 * Mỗi lần gọi (mỗi ván mới) sẽ shuffle và pick khác nhau.
 * Dev và Injector nhận tasks từ pool riêng biệt — không dùng chung template.
 */
function buildTasksForFiles() {
    const devTasks = {};
    const injTasks = {};

    // Group files by language
    const filesByLang = {};
    Object.keys(FILES).forEach(fn => {
        const langId = FILES[fn]._langId || FILES[fn].lang;
        if (!filesByLang[langId]) filesByLang[langId] = [];
        filesByLang[langId].push(fn);
    });

    // Pre-shuffle task pools ONCE per language (không shuffle lại mỗi file)
    // để đảm bảo slice theo pos luôn nhất quán và không overlap.
    const devPoolByLang = {};
    const injPoolByLang = {};
    Object.keys(filesByLang).forEach(langId => {
        const cfg = LANG_CONFIGS[langId];
        if (!cfg) return;
        devPoolByLang[langId] = _shuffleArray(cfg.devTasks.slice());
        injPoolByLang[langId] = _shuffleArray(cfg.injTasks.slice());
    });

    Object.keys(FILES).forEach(fn => {
        const langId = FILES[fn]._langId || FILES[fn].lang;
        if (!LANG_CONFIGS[langId]) return;

        const filesForLang = filesByLang[langId] || [fn];
        const pos          = filesForLang.indexOf(fn);
        const fileCount    = Math.max(1, filesForLang.length);

        const devPool = devPoolByLang[langId];
        const dPerFile = Math.min(2, Math.max(1, Math.ceil(devPool.length / Math.max(fileCount, 2))));
        const dStart = pos * dPerFile;
        const dSlice = devPool.slice(dStart, dStart + dPerFile);
        devTasks[fn] = (dSlice.length > 0 ? dSlice : [devPool[pos % devPool.length]]).filter(Boolean).slice(0, 2);

        const injPool = injPoolByLang[langId];
        const iPick = injPool[(pos + dStart) % injPool.length];
        injTasks[fn] = iPick ? [iPick] : [];
    });

    return { devTasks, injTasks };
}

/** Fisher-Yates shuffle — trả về mảng mới đã xáo trộn */
function _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
