const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 500;
canvas.height = 700;

// ─── State ───
let gameRunning = false;
let currentLevel = 1;
let cameraY = 0;
let depth = 0;
let completedLevels = [];
let deathFlash = 0;
let deaths = 0;

// ═══════════════════════════════════════════════════════════════════════
// OWNER MENU — CHEAT CODE SYSTEM
// Type "1476" on the start screen to unlock the Owner Menu button.
// ═══════════════════════════════════════════════════════════════════════
let ownerUnlocked = false;
let cheatCodeBuffer = '';
const CHEAT_CODE = '1476';

const cheats = {
    noclip: false,
    halfSpeed: false,
    moonGravity: false,
    superSpeed: false,
    tinyFrog: false,
    ghostMode: false,
    instaWin: false
};

// Listen for the cheat code on the start screen
window.addEventListener('keydown', (e) => {
    // Only listen on the start screen
    if (document.getElementById('startScreen').classList.contains('hidden')) return;
    if (ownerUnlocked) return;

    if (e.key >= '0' && e.key <= '9') {
        cheatCodeBuffer += e.key;
        // Keep only the last 4 characters
        if (cheatCodeBuffer.length > CHEAT_CODE.length) {
            cheatCodeBuffer = cheatCodeBuffer.slice(-CHEAT_CODE.length);
        }
        if (cheatCodeBuffer === CHEAT_CODE) {
            ownerUnlocked = true;
            document.getElementById('ownerMenuBtn').style.display = 'block';
            // Flash the button to draw attention
            const btn = document.getElementById('ownerMenuBtn');
            btn.style.animation = 'none';
            btn.offsetHeight; // reflow
            btn.style.animation = '';
        }
    }
});

function openOwnerMenu() {
    document.getElementById('ownerMenu').classList.remove('hidden');
    syncCheatCheckboxes();
    drawSpaceFrogPreview();
}

function closeOwnerMenu() {
    readCheatCheckboxes();
    document.getElementById('ownerMenu').classList.add('hidden');
}

function showOwnerTab(tabName) {
    // Update tab button states
    document.querySelectorAll('.owner-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === tabName);
    });
    // Show/hide pages
    document.getElementById('ownerPage-cheats').classList.toggle('hidden', tabName !== 'cheats');
    document.getElementById('ownerPage-secrets').classList.toggle('hidden', tabName !== 'secrets');
}

function drawSpaceFrogPreview() {
    const spaceFrog = FROG_DEFS.find(f => f.ownerOnly);
    if (!spaceFrog || !spaceFrog.canvas) return;
    const preview = document.getElementById('spaceFrogPreview');
    if (!preview) return;
    const pctx = preview.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, 80, 80);
    pctx.drawImage(spaceFrog.canvas, 0, 0, 80, 80);
}

function playSecretLevel() {
    closeOwnerMenu();
    document.getElementById('startScreen').classList.add('hidden');
    loadLevel(9); // Level 9 = Void Descent
    document.getElementById('charSelectScreen').classList.remove('hidden');
}

function syncCheatCheckboxes() {
    document.getElementById('cheatNoclip').checked = cheats.noclip;
    document.getElementById('cheatHalfSpeed').checked = cheats.halfSpeed;
    document.getElementById('cheatMoonGravity').checked = cheats.moonGravity;
    document.getElementById('cheatSuperSpeed').checked = cheats.superSpeed;
    document.getElementById('cheatTinyFrog').checked = cheats.tinyFrog;
    document.getElementById('cheatGhostMode').checked = cheats.ghostMode;
    document.getElementById('cheatInstaWin').checked = cheats.instaWin;
}

function readCheatCheckboxes() {
    cheats.noclip = document.getElementById('cheatNoclip').checked;
    cheats.halfSpeed = document.getElementById('cheatHalfSpeed').checked;
    cheats.moonGravity = document.getElementById('cheatMoonGravity').checked;
    cheats.superSpeed = document.getElementById('cheatSuperSpeed').checked;
    cheats.tinyFrog = document.getElementById('cheatTinyFrog').checked;
    cheats.ghostMode = document.getElementById('cheatGhostMode').checked;
    cheats.instaWin = document.getElementById('cheatInstaWin').checked;
}

function anyCheatsActive() {
    return Object.values(cheats).some(v => v);
}

function updateCheatIndicator() {
    const el = document.getElementById('cheatIndicator');
    if (!anyCheatsActive()) {
        el.style.display = 'none';
        return;
    }
    const labels = [];
    if (cheats.noclip) labels.push('NOCLIP');
    if (cheats.halfSpeed) labels.push('HALF SPD');
    if (cheats.moonGravity) labels.push('MOON GRAV');
    if (cheats.superSpeed) labels.push('SUPER SPD');
    if (cheats.tinyFrog) labels.push('TINY');
    if (cheats.ghostMode) labels.push('GHOST');
    if (cheats.instaWin) labels.push('INSTA-WIN');
    el.textContent = labels.join('\n');
    el.style.display = 'block';
}

// ─── Player ───
// "facing" tracks the last horizontal direction for sprite flipping.
// The frog sprites face right by default; when moving left, the sprite
// is flipped horizontally so the frog appears to face the movement direction.
const player = {
    x: 0, y: 0,
    width: 40, height: 40,
    speed: 6,
    fallSpeed: 0,
    gravity: 0.4,
    color: '#a855f7',
    dead: false,
    facing: 'right'
};

// ═══════════════════════════════════════════════════════════════════════
// FROG DEFINITIONS — individual image files (frog 1.jpg … frog 9.jpg)
// ═══════════════════════════════════════════════════════════════════════
// Each entry has:
//   - name:   Display name in the selection grid
//   - src:    Path to the individual frog image
//   - img:    Set at runtime — the loaded Image object
//   - canvas: Set at runtime — color-keyed + trimmed sprite canvas
// ═══════════════════════════════════════════════════════════════════════
const FROG_DEFS = [
    { name: "Frog 1", src: 'assets/sprites/frog 1.jpg' },
    { name: "Frog 2", src: 'assets/sprites/frog 2.jpg' },
    { name: "Frog 3", src: 'assets/sprites/frog 3.jpg' },
    { name: "Frog 4", src: 'assets/sprites/frog 4.jpg' },
    { name: "Frog 5", src: 'assets/sprites/frog 5.jpg' },
    { name: "Frog 6", src: 'assets/sprites/frog 6.jpg' },
    { name: "Frog 7", src: 'assets/sprites/frog 7.jpg' },
    { name: "Frog 8", src: 'assets/sprites/frog 8.jpg' },
    { name: "Frog 9", src: 'assets/sprites/frog 9.jpg' },
    // Secret owner-only frog (index 9) — only shown if ownerUnlocked
    { name: "Space Frog", src: 'assets/sprites/space frog.jpg', ownerOnly: true },
];

// Load all frog images; once every image is ready, extract sprites
let sheetsLoaded = 0;
const totalSheets = FROG_DEFS.length;
for (const def of FROG_DEFS) {
    def.img = new Image();
    def.img.onload = () => { sheetsLoaded++; if (sheetsLoaded === totalSheets) onSheetsLoaded(); };
    def.img.src = def.src;
}

// ═══════════════════════════════════════════════════════════════════════
// LEVEL TEXTURE IMAGES
// ═══════════════════════════════════════════════════════════════════════
// Level 3 background — single tall image (sky → grass → cave)
const texFrogBg = new Image();
texFrogBg.src = 'assets/backgrounds/FrogBG_Level3.jpg';

// ═══════════════════════════════════════════════════════════════════════
// LEVEL MUSIC + AUDIO REACTIVE EDGE GLOW
// ═══════════════════════════════════════════════════════════════════════
const level3Music = new Audio('assets/Music/NoteGPT-Music-Generator-1770264800181.mp3');
level3Music.loop = false;

// Web Audio API — analyser for reactive edge lighting
let audioCtx = null;
let analyser = null;
let audioSource = null;
let freqData = null;

function initAudioAnalyser() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    audioSource = audioCtx.createMediaElementSource(level3Music);
    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
}

// Read current audio energy — returns 0..1 values for bass, mid, high
function getAudioLevels() {
    if (!analyser || !freqData) return { bass: 0, mid: 0, high: 0 };
    analyser.getByteFrequencyData(freqData);
    let bass = 0, mid = 0, high = 0;
    // Bass: bins 0–8   (~0–340 Hz)  — kick drums, deep beats
    for (let i = 0; i < 9; i++) bass += freqData[i];
    bass = bass / (9 * 255);
    // Mids: bins 9–40  (~340–1400 Hz) — melody, vocals
    for (let i = 9; i < 41; i++) mid += freqData[i];
    mid = mid / (32 * 255);
    // Highs: bins 41–80 (~1400–2800 Hz) — hi-hats, sparkle
    for (let i = 41; i < 81; i++) high += freqData[i];
    high = high / (40 * 255);
    return { bass, mid, high };
}

function startLevelMusic() {
    if (currentLevel === 3) {
        initAudioAnalyser();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        level3Music.currentTime = 0;
        level3Music.play().catch(() => {});
    }
}

function stopLevelMusic() {
    level3Music.pause();
    level3Music.currentTime = 0;
}

// Draw subtle edge glow strips that pulse with the music.
// Bass → purple glow on left & right edges
// Mids → teal glow that shifts along the edges
// Highs → brief white sparkle flickers at the top corners
function drawMusicEdgeGlow() {
    if (currentLevel !== 3) return;
    if (!analyser) return;

    const { bass, mid, high } = getAudioLevels();
    if (bass < 0.01 && mid < 0.01 && high < 0.01) return;

    // ── Bass pulse: purple glow on left & right edges ──
    if (bass > 0.05) {
        const intensity = Math.min(bass * 1.2, 0.35);
        const glowW = 30 + bass * 40;

        // Left edge
        const leftGrad = ctx.createLinearGradient(0, 0, glowW, 0);
        leftGrad.addColorStop(0, `rgba(168, 85, 247, ${intensity})`);
        leftGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, glowW, canvas.height);

        // Right edge
        const rightGrad = ctx.createLinearGradient(canvas.width, 0, canvas.width - glowW, 0);
        rightGrad.addColorStop(0, `rgba(168, 85, 247, ${intensity})`);
        rightGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(canvas.width - glowW, 0, glowW, canvas.height);
    }

    // ── Mid pulse: teal accent that shifts vertically ──
    if (mid > 0.08) {
        const intensity = Math.min(mid * 0.8, 0.2);
        const glowH = 120 + mid * 200;
        const yOffset = (canvas.height / 2) - glowH / 2;

        // Left accent
        const leftMid = ctx.createRadialGradient(0, canvas.height / 2, 0, 0, canvas.height / 2, glowH * 0.7);
        leftMid.addColorStop(0, `rgba(94, 234, 212, ${intensity})`);
        leftMid.addColorStop(1, 'rgba(94, 234, 212, 0)');
        ctx.fillStyle = leftMid;
        ctx.fillRect(0, yOffset, 50, glowH);

        // Right accent
        const rightMid = ctx.createRadialGradient(canvas.width, canvas.height / 2, 0, canvas.width, canvas.height / 2, glowH * 0.7);
        rightMid.addColorStop(0, `rgba(94, 234, 212, ${intensity})`);
        rightMid.addColorStop(1, 'rgba(94, 234, 212, 0)');
        ctx.fillStyle = rightMid;
        ctx.fillRect(canvas.width - 50, yOffset, 50, glowH);
    }

    // ── High sparkle: white flickers at top corners ──
    if (high > 0.12) {
        const intensity = Math.min(high * 0.6, 0.15);
        const sparkR = 20 + high * 30;

        // Top-left
        const tl = ctx.createRadialGradient(0, 0, 0, 0, 0, sparkR);
        tl.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        tl.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = tl;
        ctx.fillRect(0, 0, sparkR, sparkR);

        // Top-right
        const tr = ctx.createRadialGradient(canvas.width, 0, 0, canvas.width, 0, sparkR);
        tr.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        tr.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = tr;
        ctx.fillRect(canvas.width - sparkR, 0, sparkR, sparkR);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SPACE THEME — Starfield Background
// ═══════════════════════════════════════════════════════════════════════
// Pre-generate star positions for the void descent level.
// Uses parallax scrolling based on cameraY for depth effect.
const spaceStars = [];
for (let i = 0; i < 150; i++) {
    spaceStars.push({
        x: Math.random() * 500,
        y: Math.random() * 10000,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 0.3 + 0.1 // parallax factor
    });
}

function drawSpaceStars() {
    for (const star of spaceStars) {
        // Parallax: slower stars appear further away
        const screenY = (star.y - cameraY * star.speed) % canvas.height;
        const adjustedY = screenY < 0 ? screenY + canvas.height : screenY;

        ctx.fillStyle = `rgba(200, 180, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, adjustedY, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Character selection state ──
// selectedFrogIndex: which frog the player highlighted (-1 = none yet)
// playerSprite: the offscreen canvas of the chosen frog (set on confirm)
let selectedFrogIndex = -1;
let playerSprite = null;

const WALL_THICKNESS = 20;

// ─── Level builder helpers ───
// wall with a gap: gapLeft is where the opening starts (relative to tunnel)
function wall(tw, y, gapLeft, gapW, h) {
    const obs = [];
    h = h || 25;
    if (gapLeft > 2) obs.push({ x: 0, y, width: gapLeft, height: h });
    const r = gapLeft + gapW;
    if (r < tw - 2) obs.push({ x: r, y, width: tw - r, height: h });
    return obs;
}

function pillar(x, y, w, h) {
    return [{ x, y, width: w, height: h || 30 }];
}

// ─── Levels ───
// All hand-placed, static, and verified possible.
// Rule: required horizontal shift between consecutive obstacles
// must be < 70% of (speed * spacing / fallSpeed)
function makeLevels() {
    return {
        // ── LEVEL 1: Easy Drop ──
        // tw=400, fall=5.5, spacing=250, max_shift=272
        1: {
            name: "Easy Drop",
            tunnelWidth: 400,
            depth: 2500,
            fallSpeed: 5.5,
            obstacles: [
                // gap right side
                ...wall(400, 400, 200, 200),
                // center pillar
                ...pillar(170, 650, 60),
                // gap left side
                ...wall(400, 900, 0, 200),
                // center pillar
                ...pillar(155, 1150, 90),
                // gap right
                ...wall(400, 1400, 180, 200),
                // two small pillars
                ...pillar(90, 1650, 50),
                ...pillar(260, 1650, 50),
                // gap left
                ...wall(400, 1900, 0, 220),
                // center pillar
                ...pillar(170, 2150, 60),
            ]
        },

        // ── LEVEL 2: Weave ──
        // tw=400, fall=6, spacing=200, max_shift=200
        2: {
            name: "Weave",
            tunnelWidth: 400,
            depth: 3000,
            fallSpeed: 6,
            obstacles: [
                ...wall(400, 350, 140, 260),      // gap center-right
                ...pillar(200, 550, 70),            // pillar center
                ...wall(400, 750, 0, 260),          // gap left
                ...pillar(160, 950, 80),             // pillar center
                ...wall(400, 1150, 170, 230),       // gap right
                ...pillar(70, 1350, 50),
                ...pillar(280, 1350, 50),            // two pillars
                ...wall(400, 1550, 0, 230),          // gap left
                ...pillar(150, 1750, 100),           // wide pillar
                ...wall(400, 1950, 160, 240),        // gap right
                ...pillar(60, 2150, 60),
                ...pillar(280, 2150, 60),            // two pillars
                ...wall(400, 2400, 0, 250),          // gap left
                ...pillar(170, 2650, 60),            // center pillar
            ]
        },

        // ── LEVEL 3: Gap Runner ──
        // tw=380, fall=6.5, spacing=200, max_shift=184
        // Gaps are 130px wide, shift by max 100px each step
        3: {
            name: "Gap Runner",
            tunnelWidth: 380,
            depth: 3200,
            fallSpeed: 6.5,
            theme: 'forest',
            obstacles: [
                ...wall(380, 400, 250, 130),   // gap far right
                ...wall(380, 600, 150, 130),   // gap center-right (shift 100)
                ...wall(380, 800, 50, 130),    // gap left (shift 100)
                ...wall(380, 1000, 130, 130),  // gap center (shift 80)
                ...wall(380, 1200, 230, 130),  // gap right (shift 100)
                ...wall(380, 1400, 130, 130),  // gap center (shift 100)
                ...wall(380, 1600, 30, 130),   // gap far left (shift 100)
                ...wall(380, 1800, 120, 130),  // gap center (shift 90)
                ...wall(380, 2000, 220, 130),  // gap right (shift 100)
                ...wall(380, 2200, 120, 130),  // gap center (shift 100)
                ...wall(380, 2400, 20, 130),   // gap left (shift 100)
                ...wall(380, 2600, 100, 130),  // gap center (shift 80)
                ...wall(380, 2800, 200, 130),  // gap right (shift 100)
            ]
        },

        // ── LEVEL 4: Zigzag ──
        // tw=380, fall=7, spacing=200, max_shift=171
        // Alternating shelves 200px wide (gap 180px), shift=40px
        4: {
            name: "Zigzag",
            tunnelWidth: 380,
            depth: 3600,
            fallSpeed: 7,
            obstacles: [
                { x: 0, y: 400, width: 200, height: 25 },
                { x: 180, y: 600, width: 200, height: 25 },
                { x: 0, y: 800, width: 200, height: 25 },
                { x: 180, y: 1000, width: 200, height: 25 },
                { x: 0, y: 1200, width: 200, height: 25 },
                { x: 180, y: 1400, width: 200, height: 25 },
                { x: 0, y: 1600, width: 200, height: 25 },
                { x: 180, y: 1800, width: 200, height: 25 },
                { x: 0, y: 2000, width: 200, height: 25 },
                { x: 180, y: 2200, width: 200, height: 25 },
                { x: 0, y: 2400, width: 200, height: 25 },
                { x: 180, y: 2600, width: 200, height: 25 },
                { x: 0, y: 2800, width: 200, height: 25 },
                { x: 180, y: 3000, width: 200, height: 25 },
                { x: 0, y: 3200, width: 200, height: 25 },
            ]
        },

        // ── LEVEL 5: Pillars ──
        // tw=380, fall=7, spacing=180, max_shift=154
        5: {
            name: "Pillars",
            tunnelWidth: 380,
            depth: 3600,
            fallSpeed: 7,
            obstacles: [
                ...pillar(160, 350, 60),              // center
                ...pillar(60, 550, 50),
                ...pillar(270, 550, 50),               // two pillars
                ...wall(380, 750, 180, 200),            // gap right
                ...pillar(160, 950, 60),                // center
                ...wall(380, 1150, 0, 200),             // gap left
                ...pillar(70, 1350, 50),
                ...pillar(260, 1350, 50),               // two pillars
                ...pillar(160, 1550, 60),               // center
                ...wall(380, 1750, 180, 200),           // gap right
                ...pillar(80, 1950, 50),
                ...pillar(250, 1950, 50),               // two pillars
                ...wall(380, 2150, 0, 200),             // gap left
                ...pillar(160, 2350, 60),               // center
                ...wall(380, 2550, 90, 200),            // gap center
                ...pillar(60, 2750, 50),
                ...pillar(160, 2750, 60),
                ...pillar(270, 2750, 50),               // triple pillars
                ...wall(380, 2950, 180, 200),           // gap right
                ...wall(380, 3150, 0, 200),             // gap left
            ]
        },

        // ── LEVEL 6: Tight Squeeze ──
        // tw=320, fall=7.5, spacing=170, max_shift=136
        // Gaps 100px wide, shifts ≤ 80px
        6: {
            name: "Tight Squeeze",
            tunnelWidth: 320,
            depth: 3600,
            fallSpeed: 7.5,
            obstacles: [
                ...wall(320, 350, 220, 100),    // gap right
                ...wall(320, 520, 140, 100),    // shift 80
                ...pillar(130, 690, 60),         // center
                ...wall(320, 860, 60, 100),     // gap left
                ...wall(320, 1030, 140, 100),   // shift 80
                ...wall(320, 1200, 220, 100),   // shift 80
                ...pillar(40, 1370, 50),
                ...pillar(230, 1370, 50),        // two pillars
                ...wall(320, 1540, 140, 100),   // center
                ...wall(320, 1710, 60, 100),    // shift 80
                ...wall(320, 1880, 0, 100),     // shift 60
                ...pillar(130, 2050, 60),        // center
                ...wall(320, 2220, 80, 100),    // gap left-center
                ...wall(320, 2390, 160, 100),   // shift 80
                ...wall(320, 2560, 220, 100),   // shift 60
                ...wall(320, 2730, 140, 100),   // shift 80
                ...pillar(40, 2900, 50),
                ...pillar(130, 2900, 60),
                ...pillar(230, 2900, 50),        // triple pillars
                ...wall(320, 3100, 60, 100),    // gap left
                ...wall(320, 3300, 140, 100),   // shift 80
            ]
        },

        // ── LEVEL 7: Chaos ──
        // tw=340, fall=8, spacing=160, max_shift=120
        // Mix of everything, gaps 110px, shifts ≤ 80px
        7: {
            name: "Chaos",
            tunnelWidth: 340,
            depth: 4200,
            fallSpeed: 8,
            obstacles: [
                ...pillar(140, 300, 60),                 // center
                ...wall(340, 460, 190, 110),             // gap right
                ...pillar(50, 620, 50),
                ...pillar(240, 620, 50),                  // two pillars
                ...wall(340, 780, 110, 110),             // gap center
                ...wall(340, 940, 30, 110),              // gap left (shift 80)
                ...pillar(140, 1100, 60),                 // center
                ...wall(340, 1260, 110, 110),            // center
                ...wall(340, 1420, 190, 110),            // right (shift 80)
                ...pillar(50, 1580, 50),
                ...pillar(140, 1580, 60),
                ...pillar(240, 1580, 50),                 // triple pillars
                ...wall(340, 1740, 110, 110),            // center
                ...wall(340, 1900, 30, 110),             // left (shift 80)
                ...wall(340, 2060, 110, 110),            // center (shift 80)
                ...pillar(140, 2220, 60),                 // center
                ...wall(340, 2380, 190, 110),            // right
                ...wall(340, 2540, 110, 110),            // center (shift 80)
                ...pillar(50, 2700, 50),
                ...pillar(240, 2700, 50),                 // two pillars
                ...wall(340, 2860, 30, 110),             // left
                ...wall(340, 3020, 110, 110),            // center (shift 80)
                ...wall(340, 3180, 190, 110),            // right (shift 80)
                ...pillar(140, 3340, 60),                 // center
                ...wall(340, 3500, 110, 110),            // center
                ...wall(340, 3660, 30, 110),             // left (shift 80)
                ...wall(340, 3820, 110, 110),            // center (shift 80)
            ]
        },

        // ── LEVEL 8: The Gauntlet ──
        // tw=300, fall=8.5, spacing=140, max_shift=99
        // Gaps 90px, shifts ≤ 60px, dense and long
        8: {
            name: "The Gauntlet",
            tunnelWidth: 300,
            depth: 5200,
            fallSpeed: 8.5,
            obstacles: [
                ...wall(300, 300, 210, 90),     // far right
                ...wall(300, 440, 150, 90),     // shift 60
                ...pillar(120, 580, 60),         // center
                ...wall(300, 720, 90, 90),      // center-left
                ...wall(300, 860, 30, 90),      // far left (shift 60)
                ...wall(300, 1000, 90, 90),     // shift 60
                ...pillar(40, 1140, 50),
                ...pillar(210, 1140, 50),        // two pillars
                ...wall(300, 1280, 150, 90),    // center-right
                ...wall(300, 1420, 210, 90),    // right (shift 60)
                ...wall(300, 1560, 150, 90),    // shift 60
                ...wall(300, 1700, 90, 90),     // shift 60
                ...pillar(120, 1840, 60),        // center
                ...wall(300, 1980, 30, 90),     // left
                ...wall(300, 2120, 90, 90),     // shift 60
                ...wall(300, 2260, 150, 90),    // shift 60
                ...wall(300, 2400, 210, 90),    // shift 60
                ...pillar(40, 2540, 50),
                ...pillar(120, 2540, 60),
                ...pillar(210, 2540, 50),        // triple pillars
                ...wall(300, 2680, 150, 90),    // center-right
                ...wall(300, 2820, 90, 90),     // shift 60
                ...wall(300, 2960, 30, 90),     // shift 60
                ...wall(300, 3100, 90, 90),     // shift 60
                ...wall(300, 3240, 150, 90),    // shift 60
                ...pillar(120, 3380, 60),        // center
                ...wall(300, 3520, 210, 90),    // right
                ...wall(300, 3660, 150, 90),    // shift 60
                ...wall(300, 3800, 90, 90),     // shift 60
                ...wall(300, 3940, 30, 90),     // shift 60
                ...pillar(40, 4080, 50),
                ...pillar(210, 4080, 50),        // two pillars
                ...wall(300, 4220, 90, 90),     // center-left
                ...wall(300, 4360, 150, 90),    // shift 60
                ...wall(300, 4500, 210, 90),    // shift 60
                ...wall(300, 4640, 150, 90),    // shift 60
                ...wall(300, 4780, 90, 90),     // shift 60
                ...wall(300, 4920, 30, 90),     // shift 60
            ]
        },

        // ═══════════════════════════════════════════════════════════════════════
        // SECRET LEVEL 9: Void Descent (owner-only)
        // A space-themed nightmare. Very wide tunnel but dense floating
        // asteroids (pillars) and laser barriers (walls). Fast and brutal.
        // ═══════════════════════════════════════════════════════════════════════
        9: {
            name: "Void Descent",
            tunnelWidth: 460,
            depth: 6000,
            fallSpeed: 9,
            theme: 'space',
            obstacles: [
                // Asteroid field entrance
                ...pillar(200, 400, 60),
                ...pillar(80, 600, 40),
                ...pillar(340, 600, 40),
                // Laser barrier 1
                ...wall(460, 850, 180, 100),
                ...pillar(60, 1050, 50),
                ...pillar(200, 1050, 50),
                ...pillar(350, 1050, 50),
                // Zigzag lasers
                ...wall(460, 1300, 0, 150),
                ...wall(460, 1500, 310, 150),
                ...wall(460, 1700, 0, 150),
                ...wall(460, 1900, 310, 150),
                // Dense asteroid cluster
                ...pillar(100, 2100, 70),
                ...pillar(290, 2100, 70),
                ...pillar(200, 2300, 60),
                ...pillar(50, 2500, 50),
                ...pillar(200, 2500, 50),
                ...pillar(360, 2500, 50),
                // Triple laser gates
                ...wall(460, 2750, 100, 80),
                ...wall(460, 2750, 280, 80),
                ...pillar(180, 2950, 100),
                ...wall(460, 3150, 0, 120),
                ...wall(460, 3150, 340, 120),
                // Slalom section
                ...pillar(80, 3400, 60),
                ...pillar(320, 3600, 60),
                ...pillar(80, 3800, 60),
                ...pillar(320, 4000, 60),
                ...pillar(80, 4200, 60),
                ...pillar(320, 4400, 60),
                // Final gauntlet
                ...wall(460, 4600, 200, 60),
                ...pillar(100, 4800, 40),
                ...pillar(180, 4800, 40),
                ...pillar(260, 4800, 40),
                ...pillar(340, 4800, 40),
                ...wall(460, 5000, 0, 100),
                ...wall(460, 5000, 360, 100),
                ...pillar(180, 5200, 100),
                ...wall(460, 5400, 150, 160),
                ...pillar(60, 5600, 50),
                ...pillar(180, 5600, 50),
                ...pillar(300, 5600, 50),
                ...wall(460, 5800, 50, 80),
                ...wall(460, 5800, 330, 80),
            ]
        }
    };
}

let levels = makeLevels();
let currentLevelData = null;
let obstacles = [];
let tunnelWidth = 400;
let tunnelX = 0;
let levelDepth = 0;

// ─── Input ───
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; keys[e.key.toLowerCase()] = false; });

// ─── Load Level ───
// Buffer gives ~2 seconds of empty tunnel before first obstacle
const START_BUFFER = 700;

function loadLevel(num) {
    levels = makeLevels();
    currentLevel = num;
    currentLevelData = levels[num];
    tunnelWidth = currentLevelData.tunnelWidth;
    tunnelX = (canvas.width - tunnelWidth) / 2;
    levelDepth = currentLevelData.depth + START_BUFFER;

    obstacles = currentLevelData.obstacles.map(o => ({
        x: o.x + tunnelX,
        y: o.y + START_BUFFER,
        width: o.width,
        height: o.height
    }));

    respawn();
    deaths = 0;
    document.getElementById('levelNum').textContent = num === 9 ? '?' : num;
}

// ─── Respawn player at top ───
function respawn() {
    player.x = canvas.width / 2 - player.width / 2;
    player.y = 50;
    player.fallSpeed = 0;
    player.dead = false;
    player.facing = 'right';
    cameraY = 0;
    depth = 0;
}

// ─── Level Select Carousel ───
let selectedLevel = 1;
const totalLevels = 8;
const diffLabels = ['EASY', 'EASY', 'NORMAL', 'NORMAL', 'HARD', 'HARD', 'INSANE', 'INSANE'];
const diffColors = ['#4ade80','#4ade80','#facc15','#facc15','#f97316','#f97316','#ef4444','#ef4444'];
const diffFaces = ['easy','easy','normal','normal','hard','hard','insane','insane'];

function updateCard() {
    const lvl = levels[selectedLevel];
    const card = document.getElementById('levelCard');
    document.getElementById('cardNumber').textContent = selectedLevel;
    document.getElementById('cardName').textContent = lvl.name;
    document.getElementById('cardDiff').textContent = diffLabels[selectedLevel - 1];
    document.getElementById('cardDiff').style.color = diffColors[selectedLevel - 1];

    // Update difficulty face
    const face = document.getElementById('cardFace');
    face.className = 'diff-face ' + diffFaces[selectedLevel - 1];

    // Update card border to match difficulty
    card.style.borderColor = diffColors[selectedLevel - 1];

    const bar = document.getElementById('cardBar');
    bar.style.width = (selectedLevel / totalLevels * 100) + '%';
    bar.style.background = diffColors[selectedLevel - 1];

    const done = completedLevels.includes(selectedLevel);
    if (done) {
        card.className = 'level-card done';
        card.style.borderColor = '#4ade80';
    } else {
        card.className = 'level-card';
    }
    document.getElementById('cardStatus').textContent = done ? '✓ COMPLETED' : '';
    document.getElementById('cardStatus').style.color = done ? '#4ade80' : '#888';
    document.getElementById('cardNumber').style.color = done ? '#4ade80' : '#a855f7';
}

function prevLevelSelect() {
    selectedLevel--;
    if (selectedLevel < 1) selectedLevel = totalLevels;
    updateCard();
}

function nextLevelSelect() {
    selectedLevel++;
    if (selectedLevel > totalLevels) selectedLevel = 1;
    updateCard();
}

// ─── Play Selected Level ───
// Instead of starting gameplay immediately, this now loads the chosen
// level and shows the character selection screen. The game only begins
// once the player picks a frog and clicks GO! (see confirmFrogSelection).
// If sprite sheets haven't loaded yet (unlikely), falls back to the
// original behavior with the placeholder rectangle.
function playSelected() {
    loadLevel(selectedLevel);
    document.getElementById('startScreen').classList.add('hidden');

    // Show character select if sprite sheets are ready
    if (sheetsLoaded === totalSheets) {
        document.getElementById('charSelectScreen').classList.remove('hidden');
    } else {
        // Fallback: start game without sprite (uses purple rectangle)
        document.getElementById('menuBtn').style.display = 'block';
        showTouchControls();
        gameRunning = true;
        startLevelMusic();
    }
}

function buildMenu() {
    updateCard();
    initStars();
    buildGroundSpikes();
    drawStars();
    // Keep Owner button visible if already unlocked
    if (ownerUnlocked) {
        document.getElementById('ownerMenuBtn').style.display = 'block';
    }
}

// ═══════════════════════════════════════════════════════════════════════
// CHARACTER SELECTION SCREEN
// ═══════════════════════════════════════════════════════════════════════
// These functions manage the character selection overlay that appears
// between the level-select menu and actual gameplay. The flow is:
//
//   1. Player clicks PLAY on level select → playSelected() loads the
//      level and shows the character selection screen.
//   2. onSheetsLoaded() fires once both sprite sheet JPGs have loaded.
//      It extracts each frog sprite into its own transparent-background
//      canvas, then populates the selection grid with preview tiles.
//   3. Player clicks a frog tile → selectFrog() highlights it.
//   4. Player clicks GO! → confirmFrogSelection() stores the sprite
//      and starts gameplay.
//   5. BACK button → cancelCharSelect() returns to level select.
// ═══════════════════════════════════════════════════════════════════════

// Called automatically when both sprite sheet images finish loading.
// Extracts individual frog sprites and builds the DOM selection grid.
function onSheetsLoaded() {
    for (let i = 0; i < FROG_DEFS.length; i++) {
        // Extract each frog from its sprite sheet into a standalone
        // canvas with the gray background removed (color-keyed),
        // then trim excess transparent padding so the sprite fills
        // its canvas tightly.
        FROG_DEFS[i].canvas = trimCanvas(extractFrogSprite(FROG_DEFS[i]));
    }
    buildCharSelectGrid();
}

// ─── Auto-Trim Transparent Padding ───
// After color-keying, the extracted sprite canvas often has large
// transparent margins where the gray background used to be. This
// function finds the tight bounding box of all non-transparent
// pixels and returns a new SQUARE canvas cropped to just the sprite
// content, centered if width != height.
function trimCanvas(srcCanvas) {
    const ctx = srcCanvas.getContext('2d');
    const w = srcCanvas.width, h = srcCanvas.height;
    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
        return srcCanvas; // tainted canvas (file:// protocol)
    }
    const data = imageData.data;
    let top = h, left = w, right = 0, bottom = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 0) {
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
    }
    if (right < left || bottom < top) return srcCanvas; // fully transparent
    const trimW = right - left + 1;
    const trimH = bottom - top + 1;

    // Make the final canvas square, using the larger dimension
    const size = Math.max(trimW, trimH);
    const trimmed = document.createElement('canvas');
    trimmed.width = size;
    trimmed.height = size;
    const tCtx = trimmed.getContext('2d');
    // Center the sprite in the square canvas
    const offsetX = Math.floor((size - trimW) / 2);
    const offsetY = Math.floor((size - trimH) / 2);
    tCtx.drawImage(srcCanvas, left, top, trimW, trimH, offsetX, offsetY, trimW, trimH);
    return trimmed;
}

// ─── Sprite Extraction with Color Keying ───
// Draws the individual frog image onto an offscreen canvas, then
// makes the neutral-gray background transparent.
// Returns: an offscreen <canvas> with the sprite on transparent bg.
function extractFrogSprite(def) {
    const img = def.img;
    const sw = img.width;
    const sh = img.height;

    // Draw the full image onto an offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sw;
    offCanvas.height = sh;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    // ── Color Key: remove the gray/white background ──
    // The JPG sprites have a light gray background (~190-210 RGB).
    // We remove any pixel that looks like neutral gray/white:
    // - All channels above 140 (catches light grays)
    // - Channels are close to each other (neutral, not colored)
    // The tolerance is wide to handle JPG compression artifacts.
    try {
        const imageData = offCtx.getImageData(0, 0, sw, sh);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            // Check if pixel is neutral gray/white background
            const minC = Math.min(r, g, b);
            const maxC = Math.max(r, g, b);
            const spread = maxC - minC;
            // Remove if: bright enough AND neutral (low color spread)
            if (minC > 140 && spread < 40) {
                data[i + 3] = 0; // set alpha to 0 (transparent)
            }
        }
        offCtx.putImageData(imageData, 0, 0);
    } catch (e) {
        // Canvas tainted (file:// protocol) — sprite keeps gray bg
    }

    return offCanvas;
}

// ─── Build the Character Selection Grid ───
// Dynamically creates DOM elements for each frog option inside the
// #charGrid container. Each option is a div with:
//   - A small <canvas> showing the sprite preview (drawn from the
//     pre-extracted offscreen canvas)
//   - A text label with the frog's name
function buildCharSelectGrid() {
    const grid = document.getElementById('charGrid');
    grid.innerHTML = '';

    for (let i = 0; i < FROG_DEFS.length; i++) {
        const def = FROG_DEFS[i];
        // Skip owner-only frogs unless owner mode is unlocked
        if (def.ownerOnly && !ownerUnlocked) continue;
        grid.appendChild(createFrogOption(i));
    }

    // If a frog was previously selected (re-entering from menu),
    // re-highlight that option so the player can quickly replay
    if (selectedFrogIndex >= 0) {
        selectFrog(selectedFrogIndex);
    }
}

// Creates a single frog option tile for the selection grid.
// Each tile contains a canvas preview and a name label.
function createFrogOption(index) {
    const def = FROG_DEFS[index];

    const option = document.createElement('div');
    option.className = 'frog-option';
    option.dataset.frogIndex = index;
    option.onclick = () => selectFrog(index);

    // ── Sprite preview canvas ──
    // Draw the pre-extracted sprite onto a small canvas for display.
    // imageSmoothingEnabled = false preserves the pixel art aesthetic.
    const preview = document.createElement('canvas');
    preview.width = 80;
    preview.height = 80;
    const pctx = preview.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    if (def.canvas) {
        pctx.drawImage(def.canvas, 0, 0, 80, 80);
    }

    // ── Name label ──
    const name = document.createElement('div');
    name.className = 'frog-name';
    name.textContent = def.name;

    option.appendChild(preview);
    option.appendChild(name);
    return option;
}

// ─── Select a Frog ───
// Called when the player clicks a frog tile. Updates the visual
// highlight (green border) and enables the GO! button.
function selectFrog(index) {
    selectedFrogIndex = index;

    // Toggle the "selected" class on frog options using data attributes
    // to ensure correct matching regardless of DOM order
    document.querySelectorAll('#charGrid .frog-option').forEach((opt) => {
        opt.classList.toggle('selected', parseInt(opt.dataset.frogIndex) === index);
    });

    // Enable and relabel the confirm button
    const goBtn = document.getElementById('charGoBtn');
    goBtn.disabled = false;
    goBtn.textContent = 'GO!';
}

// ─── Confirm Selection ───
// Called when the player clicks GO! after selecting a frog.
// Assigns the chosen frog's sprite canvas to playerSprite, hides
// the character select screen, and starts gameplay.
function confirmFrogSelection() {
    if (selectedFrogIndex < 0) return;

    // Store the chosen frog's offscreen canvas for use in draw()
    playerSprite = FROG_DEFS[selectedFrogIndex].canvas;

    // Transition to gameplay
    document.getElementById('charSelectScreen').classList.add('hidden');
    document.getElementById('menuBtn').style.display = 'block';
    showTouchControls();
    gameRunning = true;
    startLevelMusic();
}

// ─── Cancel Selection ───
// Returns to the level select / start screen without starting a game.
function cancelCharSelect() {
    document.getElementById('charSelectScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
}

// ─── Update ───
function update() {
    if (!gameRunning || player.dead) return;

    // ── Cheat: Tiny Frog (adjust hitbox) ──
    if (cheats.tinyFrog) {
        player.width = 20;
        player.height = 20;
    } else {
        player.width = 40;
        player.height = 40;
    }

    // Gravity
    let maxSpeed = currentLevelData.fallSpeed || 7;
    let grav = player.gravity;

    // ── Cheat: Half Speed ──
    if (cheats.halfSpeed) maxSpeed *= 0.5;

    // ── Cheat: Moon Gravity ──
    if (cheats.moonGravity) {
        grav *= 0.15;
        maxSpeed *= 0.4;
    }

    player.fallSpeed += grav;
    if (player.fallSpeed > maxSpeed) player.fallSpeed = maxSpeed;
    player.y += player.fallSpeed;

    // Left / right movement + facing direction for sprite flipping
    let moveSpeed = player.speed;

    // ── Cheat: Super Speed ──
    if (cheats.superSpeed) moveSpeed *= 3;

    if (keys['ArrowLeft'] || keys['a']) {
        player.x -= moveSpeed;
        player.facing = 'left';
    }
    if (keys['ArrowRight'] || keys['d']) {
        player.x += moveSpeed;
        player.facing = 'right';
    }

    // ── Cheat: Insta-Win (press W to skip to finish) ──
    if (cheats.instaWin && (keys['w'] || keys['W'])) {
        player.y = levelDepth + 1;
    }

    // Clamp to tunnel walls (skip if noclip)
    if (!cheats.noclip) {
        if (player.x < tunnelX) player.x = tunnelX;
        if (player.x + player.width > tunnelX + tunnelWidth) player.x = tunnelX + tunnelWidth - player.width;
    }

    // Camera
    const targetCamY = player.y - canvas.height * 0.3;
    cameraY += (targetCamY - cameraY) * 0.1;
    if (cameraY < 0) cameraY = 0;

    // Depth
    depth = Math.floor(player.y / 10);
    document.getElementById('depthDisplay').textContent = depth + 'm';

    // Obstacle collision (skip if noclip)
    if (!cheats.noclip) {
        for (const obs of obstacles) {
            if (rectCollision(player, obs)) {
                die();
                return;
            }
        }
    }

    // Reached bottom?
    if (player.y > levelDepth) {
        winLevel();
    }
}

function rectCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// ─── Draw ───
function draw() {
    const themed = currentLevelData && currentLevelData.theme === 'forest';
    const spaceTheme = currentLevelData && currentLevelData.theme === 'space';

    // Background color
    if (spaceTheme) {
        ctx.fillStyle = '#050510';
    } else {
        ctx.fillStyle = '#0a0a0a';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Space theme: draw stars (fixed screen position, parallax effect)
    if (spaceTheme) {
        drawSpaceStars();
    }

    ctx.save();
    ctx.translate(0, -cameraY);

    // Tunnel background — forest theme
    // Scale the image to fill the full level height while preserving its
    // aspect ratio. The image ends up wider than the tunnel, so the sides
    // are cropped by a clip rect — keeps the pixel art undistorted and
    // the content centered (sky → grass → cave from top to bottom).
    if (themed && texFrogBg.complete && texFrogBg.naturalWidth) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const bgTop = -100;
        const bgBottom = levelDepth + 100;
        const bgHeight = bgBottom - bgTop;

        // Clip to the tunnel, from just above the start to just past the finish
        ctx.beginPath();
        ctx.rect(tunnelX, bgTop, tunnelWidth, bgHeight);
        ctx.clip();

        // Scale to fill level height; width follows from aspect ratio
        const scale = bgHeight / texFrogBg.naturalHeight;
        const drawW = texFrogBg.naturalWidth * scale;
        const drawX = canvas.width / 2 - drawW / 2;
        ctx.drawImage(texFrogBg, drawX, bgTop, drawW, bgHeight);

        ctx.restore();
    }

    // Tunnel walls (skip for space theme — the void has no walls visually)
    if (!spaceTheme) {
        ctx.fillStyle = '#333';
        ctx.fillRect(tunnelX - WALL_THICKNESS, -500, WALL_THICKNESS, levelDepth + 1500);
        ctx.fillRect(tunnelX + tunnelWidth, -500, WALL_THICKNESS, levelDepth + 1500);

        ctx.fillStyle = '#444';
        ctx.fillRect(tunnelX - 4, -500, 4, levelDepth + 1500);
        ctx.fillRect(tunnelX + tunnelWidth, -500, 4, levelDepth + 1500);
    } else {
        // Space theme: draw subtle purple nebula walls
        const nebulaGrad = ctx.createLinearGradient(0, 0, tunnelX, 0);
        nebulaGrad.addColorStop(0, 'rgba(88, 28, 135, 0.4)');
        nebulaGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
        ctx.fillStyle = nebulaGrad;
        ctx.fillRect(0, -500, tunnelX, levelDepth + 2000);

        const nebulaGrad2 = ctx.createLinearGradient(canvas.width, 0, tunnelX + tunnelWidth, 0);
        nebulaGrad2.addColorStop(0, 'rgba(88, 28, 135, 0.4)');
        nebulaGrad2.addColorStop(1, 'rgba(88, 28, 135, 0)');
        ctx.fillStyle = nebulaGrad2;
        ctx.fillRect(tunnelX + tunnelWidth, -500, canvas.width - tunnelX - tunnelWidth, levelDepth + 2000);
    }

    // Grid (skip for themed levels — the background texture replaces it)
    if (!themed && !spaceTheme) {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        const gridStart = Math.floor((cameraY - 100) / 50) * 50;
        for (let y = gridStart; y < cameraY + canvas.height + 50; y += 50) {
            ctx.beginPath();
            ctx.moveTo(tunnelX, y);
            ctx.lineTo(tunnelX + tunnelWidth, y);
            ctx.stroke();
        }
        for (let x = tunnelX; x <= tunnelX + tunnelWidth; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, gridStart);
            ctx.lineTo(x, cameraY + canvas.height + 50);
            ctx.stroke();
        }
    }

    // Obstacles
    obstacles.forEach(obs => {
        if (spaceTheme) {
            // Space theme: cyan/purple asteroids and laser barriers
            const isWide = obs.width > obs.height * 2;
            if (isWide) {
                // Laser barrier — glowing cyan
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#06b6d4';
                ctx.fillStyle = '#0891b2';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.fillStyle = '#22d3ee';
                ctx.fillRect(obs.x, obs.y, obs.width, 3);
                ctx.shadowBlur = 0;
            } else {
                // Asteroid — rocky purple
                ctx.fillStyle = '#581c87';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.fillStyle = '#7c3aed';
                ctx.fillRect(obs.x, obs.y, obs.width, 4);
                ctx.strokeStyle = '#4c1d95';
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            }
        } else {
            // Default gray obstacles
            ctx.fillStyle = '#666';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.fillStyle = '#888';
            ctx.fillRect(obs.x, obs.y, obs.width, 4);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
    });

    // Finish line
    const finishY = levelDepth;
    const finishColor = spaceTheme ? '#a855f7' : '#4ade80';
    ctx.fillStyle = finishColor;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(tunnelX, finishY, tunnelWidth, 60);
    ctx.globalAlpha = 1;
    ctx.fillStyle = finishColor;
    ctx.fillRect(tunnelX, finishY, tunnelWidth, 6);
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(spaceTheme ? 'ESCAPE' : 'FINISH', canvas.width / 2, finishY + 35);

    // ── Player Rendering ──
    // If a frog sprite was selected, draw it instead of the placeholder
    // rectangle. The sprite is drawn slightly larger than the hitbox so
    // it looks good while keeping tight collision. Flips horizontally
    // based on player.facing.
    if (!player.dead) {
        // ── Cheat: Ghost Mode (semi-transparent) ──
        if (cheats.ghostMode) ctx.globalAlpha = 0.3;

        if (playerSprite) {
            ctx.save();
            if (cheats.ghostMode) ctx.globalAlpha = 0.3;
            // Disable image smoothing for crisp pixel art rendering
            ctx.imageSmoothingEnabled = false;

            // Draw the sprite 10px larger than the hitbox, centered on it
            const drawSize = player.width + 10;
            const drawX = player.x + player.width / 2 - drawSize / 2;
            const drawY = player.y + player.height / 2 - drawSize / 2;

            // Flip horizontally when facing left: the source sprites
            // face right by default, so we mirror the canvas transform
            if (player.facing === 'left') {
                ctx.translate(drawX + drawSize, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(playerSprite, 0, 0, drawSize, drawSize);
            } else {
                ctx.drawImage(playerSprite, drawX, drawY, drawSize, drawSize);
            }

            ctx.restore();
        } else {
            // Fallback: original purple rectangle (no frog selected)
            ctx.shadowBlur = 15;
            ctx.shadowColor = player.color;
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x, player.y, player.width, player.height);
        }
        ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Progress bar
    const progress = Math.min(player.y / levelDepth, 1);
    const barX = canvas.width - 15;
    const barH = canvas.height - 80;
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, 40, 8, barH);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(barX, 40, 8, barH * progress);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(barX + 4, 40 + barH * progress, 5, 0, Math.PI * 2);
    ctx.fill();

    // Music-reactive edge glow (Level 3)
    drawMusicEdgeGlow();

    // Death flash overlay
    if (deathFlash > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${deathFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        deathFlash -= 0.05;
    }
}

// ─── Game Loop ───
function gameLoop() {
    update();
    draw();
    updateCheatIndicator();
    requestAnimationFrame(gameLoop);
}

// ─── Die: instant respawn with flash ───
function die() {
    deaths++;
    deathFlash = 0.6;
    respawn();
    startLevelMusic();
}

// ─── Win ───
function winLevel() {
    gameRunning = false;
    stopLevelMusic();
    if (!completedLevels.includes(currentLevel)) completedLevels.push(currentLevel);
    document.getElementById('completeText').textContent =
        `You beat Level ${currentLevel}: ${currentLevelData.name}!` +
        (deaths > 0 ? ` (${deaths} death${deaths > 1 ? 's' : ''})` : ' (Flawless!)');
    document.getElementById('levelComplete').style.display = 'block';
    document.getElementById('menuBtn').style.display = 'none';
    hideTouchControls();
}

// ─── Navigation ───
function goNextLevel() {
    document.getElementById('levelComplete').style.display = 'none';
    const next = currentLevel + 1;
    if (levels[next]) {
        selectedLevel = next;
        loadLevel(next);
        document.getElementById('menuBtn').style.display = 'block';
        showTouchControls();
        gameRunning = true;
        startLevelMusic();
    } else {
        goMenu();
    }
}

function goMenu() {
    gameRunning = false;
    stopLevelMusic();
    document.getElementById('levelComplete').style.display = 'none';
    document.getElementById('menuBtn').style.display = 'none';
    document.getElementById('startScreen').classList.remove('hidden');
    hideTouchControls();
    buildMenu();
}

// ─── Menu Stars Animation ───
const starsCanvas = document.getElementById('starsCanvas');
const starsCtx = starsCanvas.getContext('2d');
let stars = [];

function initStars() {
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;
    stars = [];
    for (let i = 0; i < 80; i++) {
        stars.push({
            x: Math.random() * starsCanvas.width,
            y: Math.random() * starsCanvas.height * 0.85,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 0.3 + 0.05,
            alpha: Math.random(),
            dir: Math.random() > 0.5 ? 1 : -1
        });
    }
}

function drawStars() {
    starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
    for (const s of stars) {
        s.alpha += s.speed * s.dir * 0.016;
        if (s.alpha >= 1) { s.alpha = 1; s.dir = -1; }
        if (s.alpha <= 0.1) { s.alpha = 0.1; s.dir = 1; }
        starsCtx.fillStyle = `rgba(200, 180, 255, ${s.alpha * 0.7})`;
        starsCtx.beginPath();
        starsCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        starsCtx.fill();
    }
    if (!document.getElementById('startScreen').classList.contains('hidden')) {
        requestAnimationFrame(drawStars);
    }
}

// Generate ground spikes
function buildGroundSpikes() {
    const container = document.getElementById('groundSpikes');
    container.innerHTML = '';
    const count = Math.ceil(window.innerWidth / 30) + 2;
    for (let i = 0; i < count; i++) {
        const spike = document.createElement('div');
        container.appendChild(spike);
    }
}

window.addEventListener('resize', () => {
    initStars();
    buildGroundSpikes();
});

// ─── Mobile Support ───
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const touchControls = document.getElementById('touchControls');
const touchLeft = document.getElementById('touchLeft');
const touchRight = document.getElementById('touchRight');

if (isMobile) {
    document.getElementById('controlsHint').textContent = 'Tap the arrows to move';
}

function showTouchControls() {
    if (isMobile) touchControls.style.display = 'flex';
}
function hideTouchControls() {
    touchControls.style.display = 'none';
}

// Touch button events
function addTouchEvents(btn, key) {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys[key] = true;
        btn.classList.add('active');
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[key] = false;
        btn.classList.remove('active');
    });
    btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys[key] = false;
        btn.classList.remove('active');
    });
}
addTouchEvents(touchLeft, 'ArrowLeft');
addTouchEvents(touchRight, 'ArrowRight');

// Prevent scrolling/zooming on game area, but allow scrolling
// on the character selection screen so the frog grid is scrollable
document.addEventListener('touchmove', (e) => {
    const charScreen = document.getElementById('charSelectScreen');
    if (!charScreen.classList.contains('hidden')) return; // allow scroll
    e.preventDefault();
}, { passive: false });

// Responsive canvas scaling
function resizeCanvas() {
    const maxW = 500, maxH = 700;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / maxW, vh / maxH, 1);
    canvas.style.width = (maxW * scale) + 'px';
    canvas.style.height = (maxH * scale) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─── Init ───
buildMenu();
loadLevel(1);
gameLoop();
