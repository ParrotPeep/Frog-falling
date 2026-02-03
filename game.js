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

// ─── Player ───
const player = {
    x: 0, y: 0,
    width: 30, height: 30,
    speed: 6,
    fallSpeed: 0,
    gravity: 0.4,
    color: '#a855f7',
    dead: false
};

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
    document.getElementById('levelNum').textContent = num;
}

// ─── Respawn player at top ───
function respawn() {
    player.x = canvas.width / 2 - player.width / 2;
    player.y = 50;
    player.fallSpeed = 0;
    player.dead = false;
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

function playSelected() {
    loadLevel(selectedLevel);
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('menuBtn').style.display = 'block';
    showTouchControls();
    gameRunning = true;
}

function buildMenu() {
    updateCard();
    initStars();
    buildGroundSpikes();
    drawStars();
}

// ─── Update ───
function update() {
    if (!gameRunning || player.dead) return;

    // Gravity
    const maxSpeed = currentLevelData.fallSpeed || 7;
    player.fallSpeed += player.gravity;
    if (player.fallSpeed > maxSpeed) player.fallSpeed = maxSpeed;
    player.y += player.fallSpeed;

    // Left / right
    if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['d']) player.x += player.speed;

    // Clamp to tunnel walls
    if (player.x < tunnelX) player.x = tunnelX;
    if (player.x + player.width > tunnelX + tunnelWidth) player.x = tunnelX + tunnelWidth - player.width;

    // Camera
    const targetCamY = player.y - canvas.height * 0.3;
    cameraY += (targetCamY - cameraY) * 0.1;
    if (cameraY < 0) cameraY = 0;

    // Depth
    depth = Math.floor(player.y / 10);
    document.getElementById('depthDisplay').textContent = depth + 'm';

    // Obstacle collision
    for (const obs of obstacles) {
        if (rectCollision(player, obs)) {
            die();
            return;
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
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY);

    // Tunnel walls
    ctx.fillStyle = '#333';
    ctx.fillRect(tunnelX - WALL_THICKNESS, -500, WALL_THICKNESS, levelDepth + 1500);
    ctx.fillRect(tunnelX + tunnelWidth, -500, WALL_THICKNESS, levelDepth + 1500);

    ctx.fillStyle = '#444';
    ctx.fillRect(tunnelX - 4, -500, 4, levelDepth + 1500);
    ctx.fillRect(tunnelX + tunnelWidth, -500, 4, levelDepth + 1500);

    // Grid
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

    // Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = '#666';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#888';
        ctx.fillRect(obs.x, obs.y, obs.width, 4);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    // Finish line
    const finishY = levelDepth;
    ctx.fillStyle = '#4ade80';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(tunnelX, finishY, tunnelWidth, 60);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(tunnelX, finishY, tunnelWidth, 6);
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', canvas.width / 2, finishY + 35);

    // Player
    if (!player.dead) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
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
    requestAnimationFrame(gameLoop);
}

// ─── Die: instant respawn with flash ───
function die() {
    deaths++;
    deathFlash = 0.6;
    respawn();
}

// ─── Win ───
function winLevel() {
    gameRunning = false;
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
    } else {
        goMenu();
    }
}

function goMenu() {
    gameRunning = false;
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

// Prevent scrolling/zooming on game area
document.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

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
