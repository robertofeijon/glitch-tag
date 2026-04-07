// ============================================
// GLITCH TAG v4.0 - ULTIMATE EDITION
// ============================================

// ============================================
// CONSTANTS
// ============================================
const PLAYER_COLORS = [
    { bg: '#00ff88', txt: '#002211' }, { bg: '#ff2255', txt: '#fff0f3' },
    { bg: '#00ccff', txt: '#002233' }, { bg: '#ffcc00', txt: '#2a1e00' },
    { bg: '#cc44ff', txt: '#1a0033' }, { bg: '#ff7700', txt: '#2a1200' },
    { bg: '#44ffcc', txt: '#002a20' }, { bg: '#ff44aa', txt: '#2a0018' },
];

const CTRL = {
    wasd: { up: 'w', down: 's', left: 'a', right: 'd' },
    arrows: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
    ijkl: { up: 'i', down: 'k', left: 'j', right: 'l' },
    numpad: { up: '8', down: '5', left: '4', right: '6' },
};

const GLITCH_RATE = { low: 11000, medium: 6500, high: 3800, insane: 1800 };
const SPEED = 3.4, PW = 28, PH = 28, TAG_COOL = 900, PICKUP_SPAWN = 4000;

const PICKUP_TYPES = [
    { id: 'shield',    icon: '🛡️', cls: 'pickup-shield',    dur: 6000, desc: 'SHIELD — immune to tags & drains',  color: '#00ccff' },
    { id: 'freeze',    icon: '❄️', cls: 'pickup-freeze',    dur: 3500, desc: 'FREEZE — stops all + pauses their HP', color: '#88ccff' },
    { id: 'ghost',     icon: '👻', cls: 'pickup-ghost',     dur: 4000, desc: 'GHOST — untaggable, phase walls',   color: '#aaaaff' },
    { id: 'bomb',      icon: '💣', cls: 'pickup-bomb',      dur: 0,    desc: 'BOMB — -30hp everyone near you',    color: '#ff2255' },
    { id: 'swap',      icon: '🔀', cls: 'pickup-swap',      dur: 0,    desc: 'SWAP — teleport swap nearest foe',  color: '#cc44ff' },
    { id: 'leech',     icon: '🩸', cls: 'pickup-leech',     dur: 5000, desc: 'LEECH — drain 6hp/s from nearest',  color: '#ff4477' },
    { id: 'decoy',     icon: '🪄', cls: 'pickup-decoy',     dur: 5000, desc: 'DECOY — clone absorbs 1 tag',       color: '#44ff88' },
    { id: 'hppack',    icon: '💊', cls: 'pickup-hppack',    dur: 0,    desc: 'HP PACK — restore 40hp',            color: '#ff88cc' },
    { id: 'speed',     icon: '⚡', cls: 'pickup-speed',     dur: 4000, desc: 'SPEED — 1.6× faster',               color: '#44ffcc' },
    { id: 'overclock', icon: '🔋', cls: 'pickup-overclock', dur: 6000, desc: 'OVERCLOCK — 2× HP gain rate',       color: '#ffcc00' },
];

const STREAK_MSGS = {
    2: 'DOUBLE!', 3: 'TRIPLE!', 4: 'QUAD!!', 5: 'UNSTOPPABLE!!!',
    6: 'UNKILLABLE!!!', 7: 'LEGENDARY!!!!'
};

const MODE_DESCS = {
    classic:   'Be IT, bleed HP fast. Tag someone to pass the burn. Highest HP when time\'s up wins.',
    hunted:    'ONE player is hunted by EVERYONE. Hunted: survive 90s to win big. Hunters: drain the hunted to 0.',
    potato:    'The Hot Potato holder bleeds 15hp/s. Pass it by tagging. Last one standing wins.',
    assassin:  'Secret targets. Tag ONLY your target to steal their HP. Miss and waste your time bleeding.',
    blitz:     '60 seconds. Everyone bleeds. Only way to gain HP is to tag someone. Last one alive wins.',
    king:      'A random player holds the CROWN. Crown holder gains HP — everyone else bleeds trying to steal it.',
    drainrace: 'Everyone bleeds 8hp/s constantly. Only tags restore HP. Most HP when time runs out wins.',
};

const ZONE_TYPES = ['danger', 'boost', 'slow'];
const GLITCH_CHARS = '▓░▒█▄▀■□●○◆◇★☆♦♣♠♥';

// ============================================
// AI PLAYER CLASS
// ============================================
class AIPlayer {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.state = 'neutral'; // chase, flee, collect, patrol
        this.target = null;
        this.lastDecision = 0;
        this.decisionInterval = this.getDecisionInterval();
    }

    getDecisionInterval() {
        const intervals = { easy: 400, medium: 250, hard: 120, nightmare: 50 };
        return intervals[this.difficulty] || 250;
    }

    getReactionTime() {
        const times = { easy: 300, medium: 150, hard: 80, nightmare: 30 };
        return times[this.difficulty] || 150;
    }

    decide(player, gameState, arena) {
        const now = Date.now();
        if (now - this.lastDecision < this.getReactionTime()) return { dx: 0, dy: 0 };
        this.lastDecision = now;

        const itPlayers = gameState.players.filter(p => p.isIt && !p.eliminated);
        const powerups = pickups.filter(p => p.active);
        const runners = gameState.players.filter(p => !p.isIt && !p.eliminated && p.id !== player.id);

        if (player.isIt || (gameState.mode === 'infection' && player.infected)) {
            return this.decideAttacker(player, runners, gameState, arena);
        } else {
            return this.decideEvader(player, itPlayers, powerups, gameState, arena);
        }
    }

    decideAttacker(player, targets, gameState, arena) {
        if (targets.length === 0) return { dx: 0, dy: 0 };

        let bestTarget = targets[0];
        let minDist = Math.hypot(bestTarget.x - player.x, bestTarget.y - player.y);

        for (let i = 1; i < targets.length; i++) {
            const dist = Math.hypot(targets[i].x - player.x, targets[i].y - player.y);
            if (dist < minDist) {
                minDist = dist;
                bestTarget = targets[i];
            }
        }

        return this.moveToward(player, bestTarget, minDist < 150 ? 1.2 : 1.0);
    }

    decideEvader(player, threats, powerups, gameState, arena) {
        if (threats.length === 0) {
            if (powerups.length > 0 && this.difficulty !== 'easy') {
                const closest = this.findClosest(powerups, player);
                return this.moveToward(player, closest, 0.6);
            }
            return { dx: 0, dy: 0 };
        }

        const threat = threats[0];
        const dist = Math.hypot(threat.x - player.x, threat.y - player.y);

        if (dist < 200) {
            // Flee
            const dx = player.x - threat.x;
            const dy = player.y - threat.y;
            const len = Math.hypot(dx, dy) || 1;
            return { dx: dx / len, dy: dy / len };
        } else if (powerups.length > 0 && this.difficulty !== 'easy') {
            // Go for powerups
            const closest = this.findClosest(powerups, player);
            return this.moveToward(player, closest, 0.6);
        } else {
            // Patrol randomly
            return { dx: (Math.random() - 0.5), dy: (Math.random() - 0.5) };
        }
    }

    findClosest(targets, player) {
        return targets.reduce((closest, target) => {
            const d1 = Math.hypot(target.x - player.x, target.y - player.y);
            const d2 = Math.hypot(closest.x - player.x, closest.y - player.y);
            return d1 < d2 ? target : closest;
        });
    }

    moveToward(player, target, speedMult = 1.0) {
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const len = Math.hypot(dx, dy) || 1;
        return { dx: (dx / len) * speedMult, dy: (dy / len) * speedMult };
    }
}

// ============================================
// ACHIEVEMENT SYSTEM
// ============================================
const ACHIEVEMENTS = [
    { id: 'first_tag', icon: '🏹', title: 'FIRST BLOOD', desc: 'Tag a player for the first time' },
    { id: 'triple_streak', icon: '🔥', title: 'HOT STARTER', desc: 'Get 3 tags in a row' },
    { id: 'five_streak', icon: '🌟', title: 'ON FIRE', desc: 'Get 5 tags without dying' },
    { id: 'ten_streak', icon: '👑', title: 'LEGENDARY', desc: 'Get 10 tags in a row' },
    { id: 'collector', icon: '🧲', title: 'COLLECTOR', desc: 'Collect 10 powerups in one round' },
    { id: 'survivor', icon: '💪', title: 'SURVIVOR', desc: 'Last alive in Infection mode' },
    { id: 'ghost_master', icon: '👻', title: 'PHANTOM', desc: 'Use Ghost Mode 5 times' },
    { id: 'shield_blocker', icon: '🛡️', title: 'DEFENDER', desc: 'Block 3 tags with shields' },
    { id: 'assassin_ace', icon: '🎯', title: 'SNIPER', desc: 'Win an Assassin round' },
    { id: 'chaos_master', icon: '⚡', title: 'CHAOS AGENT', desc: 'Experience 10 glitches in one round' },
    { id: 'speedrunner', icon: '💨', title: 'SPEEDSTER', desc: 'Get caught never in a classic round' },
    { id: 'marathon', icon: '🏃', title: 'MARATHON', desc: 'Play 10 rounds' },
];

class AchievementSystem {
    constructor() {
        this.unlocked = this.loadUnlocked();
        this.stats = this.loadStats();
    }

    loadUnlocked() {
        const saved = localStorage.getItem('glitch_tag_achievements');
        return saved ? JSON.parse(saved) : {};
    }

    loadStats() {
        const saved = localStorage.getItem('glitch_tag_stats');
        return saved ? JSON.parse(saved) : {
            totalTags: 0,
            roundsPlayed: 0,
            pickupsCollected: 0,
            ghostModesUsed: 0,
            shieldsBlocked: 0,
        };
    }

    save() {
        localStorage.setItem('glitch_tag_achievements', JSON.stringify(this.unlocked));
        localStorage.setItem('glitch_tag_stats', JSON.stringify(this.stats));
    }

    unlock(id) {
        if (!this.unlocked[id]) {
            this.unlocked[id] = { unlockedAt: new Date().toISOString() };
            this.save();
            return true;
        }
        return false;
    }

    checkAchievements(matchResults) {
        const unlocked = [];

        if (matchResults.tags > 0 && this.stats.totalTags === 0) {
            if (this.unlock('first_tag')) unlocked.push('FIRST BLOOD');
        }
        if (matchResults.longestStreak >= 3 && !this.unlocked['triple_streak']) {
            if (this.unlock('triple_streak')) unlocked.push('HOT STARTER');
        }
        if (matchResults.longestStreak >= 5 && !this.unlocked['five_streak']) {
            if (this.unlock('five_streak')) unlocked.push('ON FIRE');
        }
        if (matchResults.longestStreak >= 10 && !this.unlocked['ten_streak']) {
            if (this.unlock('ten_streak')) unlocked.push('LEGENDARY');
        }
        if (matchResults.pickups >= 10 && !this.unlocked['collector']) {
            if (this.unlock('collector')) unlocked.push('COLLECTOR');
        }
        if (matchResults.mode === 'infection' && matchResults.survived && !this.unlocked['survivor']) {
            if (this.unlock('survivor')) unlocked.push('SURVIVOR');
        }
        if (matchResults.mode === 'assassin' && matchResults.won && !this.unlocked['assassin_ace']) {
            if (this.unlock('assassin_ace')) unlocked.push('SNIPER');
        }

        return unlocked;
    }
}

let achievementSystem = new AchievementSystem();

// ============================================
// STATE
// ============================================
let players = [], gameState = null, animId = null, timerInterval = null, glitchTimeout = null, pickupInterval = null;
let potatoInterval = null, rageInterval = null, pointsInterval = null;
let keysDown = {}, paused = false, obstacles = [], zones = [], pickups = [], projectiles = [], decoys = [];
let bc = null, myRoomCode = null, isHost = false, netPlayers = {};
let touchVec = { x: 0, y: 0 }, trailAccum = 0;
let matchStats = { totalTags: 0, glitches: 0, pickups: 0, longestStreak: 0, tagFlash: 0 };
let sessionLB = {}; // name->total score across rounds
let soundEnabled = true;
let heatCtx = null;
let titleGlitchInterval = null;
let tutorialMode = false;
let graphicsPreset = 'normal';
let colorblindMode = 'none';
let aiPlayers = {}; // id -> AIPlayer instance
let keyPressTimings = {}; // track double-tap detection
let currentWeather = null;
let weatherInterval = null;

// ============================================
// DOM Helpers
// ============================================
const $ = id => document.getElementById(id);

// ============================================
// AUDIO ENGINE (Web Audio API)
// ============================================
let audioCtx = null;

function getAudio() {
    if (!audioCtx && soundEnabled) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { }
    }
    return audioCtx;
}

function playTone(freq, type, dur, vol = 0.3, delay = 0) {
    const ac = getAudio();
    if (!ac || !soundEnabled) return;
    try {
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g);
        g.connect(ac.destination);
        o.type = type;
        o.frequency.setValueAtTime(freq, ac.currentTime + delay);
        g.gain.setValueAtTime(vol, ac.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
        o.start(ac.currentTime + delay);
        o.stop(ac.currentTime + delay + dur + 0.01);
    } catch (e) { }
}

function sfxTag() { playTone(880, 'square', 0.08, 0.4); playTone(440, 'square', 0.12, 0.3, 0.05); }
function sfxPickup() { playTone(660, 'sine', 0.1, 0.25); playTone(880, 'sine', 0.1, 0.2, 0.08); playTone(1100, 'sine', 0.12, 0.15, 0.16); }
function sfxGlitch() { playTone(80 + Math.random() * 200, 'sawtooth', 0.15, 0.2); playTone(40 + Math.random() * 100, 'square', 0.1, 0.15, 0.1); }
function sfxCountdown(n) { playTone(n === 0 ? 880 : 440, 'sine', 0.15, 0.3); }
function sfxFrenzy() { playTone(220, 'sawtooth', 0.08, 0.15); playTone(330, 'sawtooth', 0.08, 0.12, 0.1); playTone(440, 'sawtooth', 0.1, 0.1, 0.2); }
function sfxEliminate() { playTone(200, 'sawtooth', 0.2, 0.4); playTone(100, 'square', 0.25, 0.35, 0.15); playTone(50, 'square', 0.15, 0.2, 0.35); }
function sfxShot() { playTone(600, 'square', 0.05, 0.3); playTone(300, 'square', 0.08, 0.2, 0.04); }
function sfxShield() { playTone(900, 'sine', 0.12, 0.2); playTone(1200, 'sine', 0.08, 0.15, 0.1); }
function sfxFreeze() { playTone(1200, 'sine', 0.06, 0.2); playTone(800, 'sine', 0.1, 0.15, 0.15); playTone(400, 'sine', 0.12, 0.1, 0.3); }

// ============================================
// TITLE GLITCH ANIMATION
// ============================================
function startTitleGlitch() {
    const title = $('main-title');
    const original = ['G', 'L', 'I', 'T', 'C', 'H', ' ', 'T', 'A', 'G'];
    let active = false;
    titleGlitchInterval = setInterval(() => {
        if (active) return;
        if (Math.random() < 0.15) {
            active = true;
            const spans = title.querySelectorAll('span');
            const idx = Math.floor(Math.random() * spans.length);
            const orig = original[idx] || ' ';
            let flickers = 0;
            const tick = setInterval(() => {
                spans[idx].textContent = Math.random() < 0.5 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : orig;
                spans[idx].style.color = Math.random() < 0.5 ? '#ff2255' : '#00ff88';
                flickers++;
                if (flickers > 6) {
                    clearInterval(tick);
                    spans[idx].textContent = orig;
                    spans[idx].style.color = '';
                    active = false;
                }
            }, 60);
        }
    }, 800);
}

// ============================================
// MODE DESCRIPTIONS
// ============================================
$('game-mode').addEventListener('change', () => {
    $('mode-desc').textContent = MODE_DESCS[$('game-mode').value] || '';
});
$('mode-desc').textContent = MODE_DESCS['classic'];

// ============================================
// SOUND TOGGLE
// ============================================
$('sound-btn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    $('sound-btn').textContent = soundEnabled ? '🔊 SFX' : '🔇 SFX';
    if (soundEnabled) getAudio();
});

// ============================================
// GRAPHICS SETTINGS
// ============================================
$('graphics-preset').addEventListener('change', (e) => {
    graphicsPreset = e.target.value;
    applyGraphicsSettings();
});

$('colorblind-mode').addEventListener('change', (e) => {
    colorblindMode = e.target.value;
    applyGraphicsSettings();
});

function applyGraphicsSettings() {
    document.body.classList.remove('crt-filter', 'high-contrast', 'reduced-motion');
    document.body.classList.remove('colorblind-deuteranopia', 'colorblind-protanopia', 'colorblind-tritanopia');
    
    if (graphicsPreset === 'crt') document.body.classList.add('crt-filter');
    else if (graphicsPreset === 'high-contrast') document.body.classList.add('high-contrast');
    else if (graphicsPreset === 'reduced-motion') document.body.classList.add('reduced-motion');
    
    if (colorblindMode !== 'none') document.body.classList.add('colorblind-' + colorblindMode);
    
    localStorage.setItem('glitch_tag_graphics', JSON.stringify({ graphicsPreset, colorblindMode }));
}

function loadGraphicsSettings() {
    const saved = localStorage.getItem('glitch_tag_graphics');
    if (saved) {
        const { graphicsPreset: gp, colorblindMode: cm } = JSON.parse(saved);
        graphicsPreset = gp || 'normal';
        colorblindMode = cm || 'none';
        $('graphics-preset').value = graphicsPreset;
        $('colorblind-mode').value = colorblindMode;
        applyGraphicsSettings();
    }
}

// ============================================
// TUTORIAL MODE
// ============================================
$('tutorial-btn').addEventListener('click', showTutorial);
$('close-tutorial-btn').addEventListener('click', () => $('tutorial-modal').style.display = 'none');
$('practice-btn').addEventListener('click', startPracticeMode);

function showTutorial() {
    const content = $('tutorial-content');
    const sections = [
        { title: 'OBJECTIVE', text: 'Classic Tag: Chase and tag others to become IT. The tagger scores points. Last to be caught wins.' },
        { title: 'CONTROLS', text: 'P1: WASD | P2: ARROWS | P3: IJKL | P4: NUMPAD 8456 — Move your player around the arena.' },
        { title: 'TAG MECHANICS', text: 'Touch another player to tag them. If you\'re IT, you score points by tagging others. Avoid being tagged!' },
        { title: 'POWERUPS', text: '🛡️ Shield blocks 1 tag | ❄️ Freeze stops others | 👻 Ghost phase through walls | 🧲 Magnet pull runners | 💣Bomb force IT swap | 🔫 Shot fire a tag bullet | 🪄 Decoy leave a fake copy' },
        { title: 'ACHIEVEMENTS', text: 'Unlock badges by hitting milestones: First tag, 3-streak, 5-streak, 10-streak, collector, survivor, etc. Check your profile!' },
        { title: 'GAME MODES', text: 'Infection: Last survivor wins | Hot Potato: Hold the potato too long = eliminated | Assassin: Tag only your target' },
        { title: 'GLITCHES', text: 'Random events shake up the game: inverted controls, teleports, speed boosts, position swaps, and more chaos!' },
    ];
    
    content.innerHTML = sections.map(s => `
        <div class="tutorial-section">
            <h3>${s.title}</h3>
            <p>${s.text}</p>
        </div>
    `).join('');
    
    $('tutorial-modal').style.display = 'flex';
}

function startPracticeMode() {
    // Initialize practice mode against stationary targets
    $('tutorial-modal').style.display = 'none';
    tutorialMode = true;
    players = [{ name: 'YOU', scheme: 'wasd', net: false, id: Date.now() }];
    // Add stationary target dummies
    for (let i = 0; i < 2; i++) {
        players.push({ 
            name: `TARGET_${i+1}`, 
            scheme: 'ai', 
            net: false, 
            id: 'practice_' + i, 
            ai: true, 
            aiDifficulty: 'easy',
            isPracticeTarget: true
        });
    }
    updateLobby();
    const seed = Math.random();
    startGame(seed, 'classic', 'low', 60, false, '');
}

// ============================================
// LOBBY FUNCTIONS
// ============================================
function renderSlots() {
    const el = $('player-slots');
    el.innerHTML = '';
    const all = [...players, ...Object.values(netPlayers)];
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        if (i < all.length) {
            const p = all[i], c = PLAYER_COLORS[i];
            slot.className = 'slot filled';
            slot.innerHTML = `<div class="slot-avatar" style="background:${c.bg};color:${c.txt}">${p.name.slice(0, 2)}</div>
        <div class="slot-name">${p.name}</div>
        <div class="slot-tag">${p.net ? 'NET' : p.scheme.toUpperCase()}</div>
        ${i === 0 ? '<div style="color:#ff2255;font-size:0.48rem">STARTS IT</div>' : ''}`;
            if (!p.net) {
                const r = document.createElement('button');
                r.textContent = '×';
                r.style.cssText = 'background:none;border:none;color:#ff2255;cursor:pointer;font-size:0.75rem;';
                r.onclick = () => {
                    players = players.filter(x => x !== p);
                    updateLobby();
                };
                slot.appendChild(r);
            }
        } else {
            slot.className = 'slot';
            slot.innerHTML = '<div style="color:var(--border);font-size:1rem">+</div><div style="color:var(--muted);font-size:0.52rem">EMPTY</div>';
        }
        el.appendChild(slot);
    }
}

function updateLobby() {
    renderSlots();
    const total = players.length + Object.keys(netPlayers).length;
    const aiCount = players.filter(p => p.ai).length;
    $('ai-count').textContent = aiCount > 0 ? `${aiCount} bot${aiCount !== 1 ? 's' : ''} added` : '0 bots';
    $('start-btn').disabled = total < 2;
    $('lobby-msg').textContent = total >= 2 ? `${total} player${total > 1 ? 's' : ''} ready` : 'Need at least 2 players';
    const used = players.map(p => p.scheme).filter(s => s !== 'ai');
    Array.from($('control-scheme').options).forEach(o => o.disabled = used.includes(o.value));
    const av = Array.from($('control-scheme').options).find(o => !o.disabled);
    if (av) $('control-scheme').value = av.value;
    renderLeaderboard();
    renderAchievements();
}

$('add-local-btn').addEventListener('click', () => {
    if (players.length + Object.keys(netPlayers).length >= 8) return;
    const name = $('player-name-input').value.trim().toUpperCase() || `P${players.length + 1}`;
    const scheme = $('control-scheme').value;
    if (players.find(p => p.scheme === scheme)) {
        $('net-status').textContent = 'Controls in use';
        return;
    }
    players.push({ name, scheme, net: false, id: Date.now() + Math.random() });
    $('player-name-input').value = '';
    updateLobby();
});

$('add-ai-btn').addEventListener('click', () => {
    if (players.length + Object.keys(netPlayers).length >= 8) return;
    const difficulty = $('ai-difficulty').value;
    const names = ['ECHO', 'VOLT', 'NEXUS', 'CIPHER', 'SURGE', 'PULSE'];
    const usedNames = players.map(p => p.name);
    const name = names.find(n => !usedNames.includes(n)) || `AI${players.length + 1}`;
    const id = 'ai_' + Date.now() + Math.random();
    players.push({ name, scheme: 'ai', net: false, id, ai: true, aiDifficulty: difficulty });
    updateLobby();
});

$('player-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('add-local-btn').click();
});

// ============================================
// SESSION LEADERBOARD
// ============================================
function renderLeaderboard() {
    const keys = Object.keys(sessionLB);
    if (!keys.length) {
        $('leaderboard-section').style.display = 'none';
        return;
    }
    $('leaderboard-section').style.display = 'block';
    const sorted = keys.sort((a, b) => sessionLB[b] - sessionLB[a]);
    $('lb-rows').innerHTML = sorted.slice(0, 6).map((name, i) => `
    <div class="lb-row ${i === 0 ? 'lb-top' : ''}">
      <span>${i === 0 ? '🏆' : i + 1 + '.'} ${name}</span>
      <span>${sessionLB[name]} pts</span>
    </div>`).join('');
}

function renderAchievements() {
    const display = $('achievement-display');
    const unlockedCount = Object.keys(achievementSystem.unlocked).length;
    $('achievement-count').textContent = `(${unlockedCount}/${ACHIEVEMENTS.length})`;
    
    display.innerHTML = ACHIEVEMENTS.map(ach => {
        const unlocked = achievementSystem.unlocked[ach.id];
        return `<div class="achievement-badge ${!unlocked ? 'locked' : ''}" data-locked="${!unlocked}" data-desc="${ach.title}: ${ach.desc}" title="${ach.title}">${unlocked ? ach.icon : '?'}</div>`;
    }).join('');
}

// ============================================
// NETWORK FUNCTIONS
// ============================================
function genCode() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

$('gen-room-btn').addEventListener('click', () => {
    myRoomCode = genCode();
    $('room-code-display').textContent = myRoomCode;
    isHost = true;
    bc = new BroadcastChannel('gt3_' + myRoomCode);
    bc.onmessage = handleNet;
    $('net-status').textContent = '📡 Hosting — share code';
    $('gen-room-btn').textContent = 'HOSTING';
    $('gen-room-btn').disabled = true;
});

$('join-room-btn').addEventListener('click', () => {
    const code = $('join-code-input').value.trim().toUpperCase();
    if (code.length !== 6) {
        $('net-status').textContent = 'Enter 6-char code';
        return;
    }
    bc = new BroadcastChannel('gt3_' + code);
    bc.onmessage = handleNet;
    isHost = false;
    myRoomCode = code;
    const name = $('player-name-input').value.trim().toUpperCase() || 'NET';
    const myId = 'net_' + Date.now();
    bc.postMessage({ type: 'join', id: myId, name });
    $('net-status').textContent = '🔗 Joining ' + code + '...';
});

function handleNet(e) {
    const m = e.data;
    if (m.type === 'join') {
        netPlayers[m.id] = { name: m.name, id: m.id, net: true, scheme: 'net' };
        updateLobby();
        if (isHost && bc) bc.postMessage({ type: 'roster', players: Object.values(netPlayers) });
        $('net-status').textContent = m.name + ' joined';
    }
    if (m.type === 'roster') {
        m.players.forEach(p => {
            if (!netPlayers[p.id]) netPlayers[p.id] = p;
        });
        updateLobby();
    }
    if (m.type === 'start') startGame(m.seed, m.mode, m.intensity, m.dur, m.pups, m.theme);
    if (m.type === 'tag') applyTag(m.tagged, m.tagger);
}

// ============================================
// GAME START
// ============================================
$('start-btn').addEventListener('click', () => {
    const seed = Math.random();
    const mode = $('game-mode').value;
    const intensity = $('glitch-intensity').value;
    const dur = parseInt($('round-duration').value);
    const pups = $('powerup-setting').value === 'on';
    const theme = $('arena-theme').value;
    if (isHost && bc) bc.postMessage({ type: 'start', seed, mode, intensity, dur, pups, theme });
    startGame(seed, mode, intensity, dur, pups, theme);
});

function mulberry32(a) {
    return function () {
        a |= 0;
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function startGame(seed, mode, intensity, duration, pupsOn, theme) {
    clearTimers();
    showScreen('game');
    const allPlayers = [...players, ...Object.values(netPlayers)];
    const arena = getArena();
    const rng = mulberry32((seed * 0xffffffff) | 0);
    matchStats = { totalTags: 0, glitches: 0, pickups: 0, longestStreak: 0 };
    obstacles = [];
    zones = [];
    pickups = [];
    projectiles = [];
    decoys = [];

    // Apply theme
    $('arena-inner').className = '';
    if (theme) $('arena-inner').classList.add(theme);

    // Mode badge
    const modeNames = { classic: 'CLASSIC', hunted: 'HUNTED', potato: 'POTATO', assassin: 'ASSASSIN', blitz: 'BLITZ', king: 'KING', drainrace: 'DRAIN RACE' };
    $('mode-badge-hud').textContent = modeNames[mode] || mode.toUpperCase();

    // Obstacles
    const nObs = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < nObs; i++) {
        const w = 35 + rng() * 80, h = 18 + rng() * 38;
        obstacles.push({ px: 0.05 + rng() * 0.65, py: 0.08 + rng() * 0.65, pw: w / arena.w, ph: h / arena.h });
    }

    // Zones
    const nZ = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < nZ; i++) {
        const sz = 0.11 + rng() * 0.13;
        zones.push({
            px: 0.05 + rng() * 0.75, py: 0.05 + rng() * 0.75,
            pw: sz, ph: sz * (0.5 + rng() * 0.5),
            type: ZONE_TYPES[Math.floor(rng() * 3)]
        });
    }

    // Assign assassin targets
    let targets = {};
    if (mode === 'assassin') {
        const ids = allPlayers.map((p, i) => i);
        const shuffled = [...ids].sort(() => rng() - 0.5);
        allPlayers.forEach((_, i) => { targets[i] = shuffled[(i + 1) % allPlayers.length]; });
    }

    // HUNTED: pick one random player to be hunted
    let huntedIdx = mode === 'hunted' ? Math.floor(rng() * allPlayers.length) : -1;

    // KING: pick a random starting crown holder
    let crownIdx = mode === 'king' ? Math.floor(rng() * allPlayers.length) : -1;

    // Team modes removed — no teams needed for new modes
    const isTeamMode = false;

    gameState = {
        players: allPlayers.map((p, i) => ({
            ...p,
            x: (0.08 + (i % 4) * 0.22) * arena.w,
            y: (0.18 + Math.floor(i / 4) * 0.58) * arena.h,
            isIt: i === 0 && mode === 'classic',
            score: 0,
            hp: 100,
            colorIdx: i,
            team: null,
            lastTagTime: 0,
            streak: 0,
            tagsMade: 0,
            tagsTaken: 0,
            shield: false,
            shieldTicks: 0,
            frozen: false,
            frozenHPPause: false,
            ghosted: false,
            untaggable: false,
            magnet: false,
            magnetRepel: false,
            hasShot: false,
            overclocked: false,
            leeching: false,
            hasCrown: i === crownIdx,
            isHunted: i === huntedIdx,
            _timers: {},
            _speedMult: 1,
            infected: mode === 'infection' && i === 0,
            eliminated: false,
            survivedMs: 0,
            assassinTarget: targets[i] !== undefined ? targets[i] : null,
            rageLevel: 0,
            momentum: { x: 0, y: 0 },
        })),
        timeLeft: duration,
        intensity,
        pupsOn,
        mode,
        glitchInverted: false,
        running: false,
        frenzy: false,
        potatoHolder: mode === 'potato' ? 0 : -1,
        potatoTimer: mode === 'potato' ? 12 : 0,
        teamScores: { 0: 0, 1: 0 },
        isTeamMode: false,
        crownTimer: mode === 'king' ? 15 : 0,
        huntedStartTime: 0,
        huntedWinTime: 90, // hunted must survive this many seconds
    };

    // Initialize AI players
    aiPlayers = {};
    allPlayers.forEach(p => {
        if (p.ai) {
            aiPlayers[p.id] = new AIPlayer(p.aiDifficulty || 'medium');
        }
    });

    setupHeatmap();
    renderArena();

    doCountdown(mode, () => {
        gameState.running = true;
        startTimer();
        scheduleGlitch();
        initWeather();
        startLoop();
        if (pupsOn) pickupInterval = setInterval(spawnPickup, PICKUP_SPAWN);
        if (mode === 'potato') potatoInterval = setInterval(tickPotato, 1000);
        if (mode === 'infection') {
            const infOverlay = document.createElement('div');
            infOverlay.className = 'infection-overlay';
            $('arena-inner').appendChild(infOverlay);
        }
        rageInterval = setInterval(tickRage, 500);
        pointsInterval = setInterval(tickPoints, 1000);
        if (mode === 'king') {
            gameState.crownInterval = setInterval(rotateCrown, 15000);
            renderCrownIndicator();
        }
        if (mode === 'hunted') {
            gameState.huntedStartTime = Date.now();
            renderHuntedIndicator();
        }
        $('rage-wrap').style.display = mode === 'classic' || mode === 'potato' ? 'flex' : 'none';
    });
}

function clearTimers() {
    if (animId) cancelAnimationFrame(animId);
    if (timerInterval) clearInterval(timerInterval);
    if (glitchTimeout) clearTimeout(glitchTimeout);
    if (pickupInterval) clearInterval(pickupInterval);
    if (potatoInterval) clearInterval(potatoInterval);
    if (rageInterval) clearInterval(rageInterval);
    if (pointsInterval) clearInterval(pointsInterval);
    if (gameState && gameState.crownInterval) clearInterval(gameState.crownInterval);
    clearWeather();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', offKey);
}

// ============================================
// HEATMAP
// ============================================
function setupHeatmap() {
    const canvas = $('heatmap-canvas');
    const arena = getArena();
    canvas.width = arena.w;
    canvas.height = arena.h;
    heatCtx = canvas.getContext('2d');
    heatCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function paintHeat(p) {
    if (!heatCtx) return;
    const c = PLAYER_COLORS[p.colorIdx];
    heatCtx.beginPath();
    const grad = heatCtx.createRadialGradient(p.x + PW / 2, p.y + PH / 2, 0, p.x + PW / 2, p.y + PH / 2, 10);
    grad.addColorStop(0, c.bg + '22');
    grad.addColorStop(1, 'transparent');
    heatCtx.fillStyle = grad;
    heatCtx.arc(p.x + PW / 2, p.y + PH / 2, 10, 0, Math.PI * 2);
    heatCtx.fill();
}

// ============================================
// COUNTDOWN
// ============================================
function doCountdown(mode, cb) {
    let n = 3;
    const ov = document.createElement('div');
    ov.className = 'countdown-overlay';
    $('arena-inner').appendChild(ov);
    const modeDesc = { classic: 'CLASSIC TAG', hunted: 'HUNTED', potato: 'HOT POTATO', assassin: 'ASSASSIN', blitz: 'BLITZ', king: 'KING', drainrace: 'DRAIN RACE' };

    function tick() {
        sfxCountdown(n);
        ov.innerHTML = n > 0
            ? `<div class="countdown-mode">${modeDesc[mode] || ''}</div>
         <div class="countdown-num" style="color:${n === 1 ? '#ff2255' : n === 2 ? '#ffcc00' : '#00ff88'}">${n}</div>
         <div class="countdown-label">GET READY</div>`
            : `<div class="countdown-num" style="color:#00ff88;font-size:3.5rem">GO!</div>`;
        if (n === 0) {
            setTimeout(() => {
                ov.remove();
                cb();
            }, 600);
            return;
        }
        n--;
        setTimeout(tick, 900);
    }
    tick();
}

// ============================================
// ARENA RENDER
// ============================================
function getArena() {
    const el = $('arena-inner');
    return { w: el.offsetWidth || 820, h: el.offsetHeight || 512 };
}

function posEl(el, x, y, w, h) {
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (w !== undefined) el.style.width = w + 'px';
    if (h !== undefined) el.style.height = h + 'px';
}

function renderArena() {
    // keep canvas + glitch-banner + kill-feed
    const canvas = $('heatmap-canvas');
    const gb = $('glitch-banner');
    const kf = $('kill-feed') || document.createElement('div');
    $('arena-inner').innerHTML = '';
    $('arena-inner').appendChild(canvas);
    $('arena-inner').appendChild(gb);
    const newKf = document.createElement('div');
    newKf.id = 'kill-feed';
    $('arena-inner').appendChild(newKf);

    const modeLabels = {
        hunted:    'HUNTED — SURVIVE THE HUNT OR ELIMINATE THE TARGET',
        potato:    'HOT POTATO — 15hp/s WHILE HOLDING — PASS IT!',
        assassin:  'ASSASSIN — TAG YOUR TARGET ONLY',
        blitz:     'BLITZ — EVERYONE BLEEDS — TAGS RESTORE HP',
        king:      'KING — STEAL THE CROWN — HOLD IT TO WIN',
        drainrace: 'DRAIN RACE — -8hp/s — ONLY TAGS SAVE YOU',
        classic:   ''
    };
    if (modeLabels[gameState.mode]) {
        const ml = document.createElement('div');
        ml.className = 'mode-overlay-text';
        ml.textContent = modeLabels[gameState.mode];
        $('arena-inner').appendChild(ml);
    }

    const arena = getArena();
    zones.forEach((z, i) => {
        const el = document.createElement('div');
        el.className = 'zone zone-' + z.type;
        el.id = 'zone_' + i;
        posEl(el, z.px * arena.w, z.py * arena.h, z.pw * arena.w, z.ph * arena.h);
        const lbl = document.createElement('div');
        lbl.className = 'zone-label';
        lbl.textContent = z.type.toUpperCase();
        el.appendChild(lbl);
        $('arena-inner').appendChild(el);
    });

    obstacles.forEach((o, i) => {
        const el = document.createElement('div');
        el.className = 'obstacle';
        el.id = 'obs_' + i;
        posEl(el, o.px * arena.w, o.py * arena.h, o.pw * arena.w, o.ph * arena.h);
        $('arena-inner').appendChild(el);
    });

    gameState.players.forEach(p => {
        const c = PLAYER_COLORS[p.colorIdx];
        const el = document.createElement('div');
        el.className = 'player-el' + (p.isIt ? ' is-it' : '') + (p.infected && !p.isIt ? ' infected' : '') + (p.hasCrown ? ' has-crown' : '') + (p.isHunted ? ' is-hunted' : '');
        el.id = 'player_' + p.id;
        el.style.cssText = `background:${c.bg};color:${c.txt};left:${p.x}px;top:${p.y}px;`;
        el.textContent = p.name.slice(0, 2);
        // name tag
        const nt = document.createElement('div');
        nt.className = 'player-name-tag';
        nt.textContent = p.name;
        nt.style.color = c.bg;
        el.appendChild(nt);
        $('arena-inner').appendChild(el);
        // assassin target indicator
        if (gameState.mode === 'assassin' && p.assassinTarget !== null) {
            updateTargetIndicator(p);
        }
    });
    renderHUD();
    // Spawn jump pads after arena elements
    setTimeout(() => {
        if (typeof spawnJumpPads === 'function' && gameState) {
            jumpPads = [];
            const rng2 = mulberry32(((Date.now() * 0.001) | 0) ^ 0x12345678);
            spawnJumpPads(rng2);
        }
        if (typeof applyCustomMap === 'function' && typeof currentCustomMap !== 'undefined' && currentCustomMap) {
            applyCustomMap();
        }
    }, 0);
}

function updateTargetIndicator(p) {
    const el = document.getElementById('player_' + p.id);
    if (!el) return;
    const old = el.querySelector('.target-indicator');
    if (old) old.remove();
    const target = gameState.players[p.assassinTarget];
    if (!target) return;
    const tc = PLAYER_COLORS[target.colorIdx];
    const ti = document.createElement('div');
    ti.className = 'target-indicator';
    ti.innerHTML = `🎯<span style="color:${tc.bg}">${target.name.slice(0, 4)}</span>`;
    el.appendChild(ti);
}

function renderHUD() {
    if (!gameState) return;
    const sb = $('score-board');
    sb.innerHTML = '';

    if (gameState.isTeamMode) {
        const t1Score = gameState.teamScores[0] || 0;
        const t2Score = gameState.teamScores[1] || 0;
        // Team HP bars (average HP of each team)
        const t1Players = gameState.players.filter(p => p.team === 0 && !p.eliminated);
        const t2Players = gameState.players.filter(p => p.team === 1 && !p.eliminated);
        const t1HP = t1Players.length ? Math.round(t1Players.reduce((s,p) => s + p.hp, 0) / t1Players.length) : 0;
        const t2HP = t2Players.length ? Math.round(t2Players.reduce((s,p) => s + p.hp, 0) / t2Players.length) : 0;
        sb.innerHTML = `
            <div class="hp-team-bar">
                <span style="color:#00ff88;font-size:0.55rem;">T1 ${t1Score}pts</span>
                <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${t1HP}%;background:${t1HP>50?'#00ff88':t1HP>25?'#ffcc00':'#ff2255'};"></div></div>
                <span style="color:#00ff88;font-size:0.52rem;">${t1HP}hp</span>
            </div>
            <div class="hp-team-bar">
                <span style="color:#ff2255;font-size:0.55rem;">T2 ${t2Score}pts</span>
                <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:${t2HP}%;background:${t2HP>50?'#ff2255':'#ff2255'};"></div></div>
                <span style="color:#ff2255;font-size:0.52rem;">${t2HP}hp</span>
            </div>`;
    } else {
        gameState.players.forEach((p, i) => {
            const c = PLAYER_COLORS[p.colorIdx];
            const hp = p.hp || 0;
            const barColor = hp > 60 ? c.bg : hp > 30 ? '#ffcc00' : '#ff2255';
            const wrap = document.createElement('div');
            wrap.className = 'hp-player-wrap' + (p.eliminated ? ' hp-eliminated' : '');
            let badge = '';
            if (p.isIt) badge = `<span class="tag-badge">IT</span>`;
            if (gameState.mode === 'infection' && p.infected) badge = `<span style="font-size:0.44rem;color:#cc44ff;border:1px solid #cc44ff;border-radius:3px;padding:0 2px;">INF</span>`;
            if (gameState.mode === 'potato' && gameState.potatoHolder === i) badge = `<span style="font-size:0.6rem;">🥔</span>`;
            wrap.innerHTML = `
                <div class="hp-label-row">
                    <span style="color:${c.bg};font-size:0.52rem;">${p.name.slice(0,5)}${badge}</span>
                    <span style="font-size:0.48rem;color:${barColor};">${hp}hp</span>
                </div>
                <div class="hp-bar-bg">
                    <div class="hp-bar-fill" style="width:${hp}%;background:${barColor};transition:width 0.4s,background 0.4s;"></div>
                </div>`;
            sb.appendChild(wrap);
        });
    }

    const itP = gameState.players.find(p => p.isIt);
    if (itP) {
        $('it-display').textContent = 'IT: ' + itP.name;
        $('it-display').style.color = PLAYER_COLORS[itP.colorIdx].bg;
    } else if (gameState.isTeamMode) {
        $('it-display').textContent = 'TEAMS';
        $('it-display').style.color = 'var(--accent)';
    } else {
        $('it-display').textContent = 'IT: —';
        $('it-display').style.color = 'var(--muted)';
    }
}

// ============================================
// GAME LOOP
// ============================================
let lastTime = 0;

function startLoop() {
    keysDown = {};
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    setupTouch();
    startReplayRecording();
    lastTime = performance.now();
    loop(lastTime);
}

function onKey(e) {
    keysDown[e.key.toLowerCase()] = true;
    keysDown[e.key] = true;
}

function offKey(e) {
    keysDown[e.key.toLowerCase()] = false;
    keysDown[e.key] = false;
}

function setupTouch() {
    const wrap = $('arena-wrap');
    let sx = 0, sy = 0;
    wrap.addEventListener('touchstart', e => {
        const t = e.touches[0];
        sx = t.clientX;
        sy = t.clientY;
        e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchmove', e => {
        const t = e.touches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 5) {
            touchVec.x = dx / Math.max(mag, 40);
            touchVec.y = dy / Math.max(mag, 40);
        }
        e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchend', () => {
        touchVec.x = 0;
        touchVec.y = 0;
    });
}

function getInput(p) {
    // AI Player input
    if (p.ai && aiPlayers[p.id]) {
        const arena = getArena();
        const input = aiPlayers[p.id].decide(p, gameState, arena);
        return input;
    }
    
    const m = CTRL[p.scheme] || {};
    let dx = 0, dy = 0;
    
    // DIRECT keyboard checking
    if (keysDown[m.up]) { dy -= 1; }
    if (keysDown[m.down]) { dy += 1; }
    if (keysDown[m.left]) { dx -= 1; }
    if (keysDown[m.right]) { dx += 1; }
    
    // Log only on human player with movement
    if (dx || dy) {
        if (Math.random() < 0.02) {
        
        }
    }
    
    if (p.scheme === 'wasd' && (Math.abs(touchVec.x) > 0.1 || Math.abs(touchVec.y) > 0.1)) {
        dx = touchVec.x;
        dy = touchVec.y;
    }
    if (gameState.glitchInverted) {
        dx = -dx;
        dy = -dy;
    }
    return { dx, dy };
}

// ============================================
// DASH MECHANIC
// ============================================
function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(ts - lastTime, 50);
    lastTime = ts;
    if (gameState && gameState.running && !paused) {
        window.update(dt);
    }
    animId = requestAnimationFrame(loop);
}

function update(dt) {
    const arena = getArena();
    const now = Date.now();
    trailAccum += dt;
    const doTrail = trailAccum > 45;
    if (doTrail) trailAccum = 0;

    gameState.players.forEach((p, idx) => {
        if (p.net || p.frozen || p.eliminated) return;
        let { dx, dy } = getInput(p);
        
        // Normalize movement vector if there's input
        const mag = Math.hypot(dx, dy);
        if (mag > 0.1) {
            dx /= mag;
            dy /= mag;
        }
        
        // Update cooldowns removed (no dash)
        
        // Calculate movement
        let moveX = 0, moveY = 0;
        
        if (mag > 0.1) {
            // MOVING STATE: apply normalized direction * speed + momentum
            const baseMoveX = dx * SPEED;
            const baseMoveY = dy * SPEED;
            
            // Accumulate momentum
            p.momentum.x = p.momentum.x * 0.9 + baseMoveX * 0.1;
            p.momentum.y = p.momentum.y * 0.9 + baseMoveY * 0.1;
            
            moveX = baseMoveX + p.momentum.x * 0.1;
            moveY = baseMoveY + p.momentum.y * 0.1;
            
            // Apply modifiers
            let modSpd = p._speedMult || 1;
            if (p.isIt && p.rageLevel >= 100) modSpd *= 1.6;
            if (currentWeather && currentWeather.friction) modSpd *= currentWeather.friction;
            
            moveX *= modSpd;
            moveY *= modSpd;
            
            // Zone effects
            const cx = p.x + PW / 2, cy = p.y + PH / 2;
            zones.forEach(z => {
                const zx = z.px * arena.w, zy = z.py * arena.h, zw = z.pw * arena.w, zh = z.ph * arena.h;
                if (cx > zx && cx < zx + zw && cy > zy && cy < zy + zh) {
                    if (z.type === 'boost') { moveX *= 1.65; moveY *= 1.65; }
                    if (z.type === 'slow') { moveX *= 0.45; moveY *= 0.45; }
                }
            });
            
            // Weather effects (after all multipliers)
            if (currentWeather && currentWeather.gravity) moveY += 0.5 * SPEED;
        } else {
            // NO INPUT: coast with momentum only
            p.momentum.x *= 0.85;
            p.momentum.y *= 0.85;
            moveX = p.momentum.x;
            moveY = p.momentum.y;
        }
        
        let nx = p.x + moveX;
        let ny = p.y + moveY;
        
        // DEBUG
        if (idx === 0 && Math.random() < 0.05) {
        
        }
        
        nx = Math.max(0, Math.min(arena.w - PW, nx));
        ny = Math.max(0, Math.min(arena.h - PH, ny));
        
        if (!p.ghosted) {
            obstacles.forEach(o => {
                const ox = o.px * arena.w, oy = o.py * arena.h, ow = o.pw * arena.w, oh = o.ph * arena.h;
                if (nx < ox + ow && nx + PW > ox && ny < oy + oh && ny + PH > oy) {
                    const oL = (nx + PW) - ox, oR = (ox + ow) - nx, oT = (ny + PH) - oy, oB = (oy + oh) - ny;
                    const mH = Math.min(oL, oR), mV = Math.min(oT, oB);
                    if (mH < mV) {
                        nx = oL < oR ? ox - PW : ox + ow;
                    } else {
                        ny = oT < oB ? oy - PH : oy + oh;
                    }
                }
            });
        }
        
        p.x = nx;
        p.y = ny;
        
        if (doTrail && (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1)) {
            spawnTrail(p);
            paintHeat(p);
        }
        
        const el = document.getElementById('player_' + p.id);
        if (el) {
            el.style.left = p.x + 'px';
            el.style.top = p.y + 'px';
        }
    });

    // Magnet effect — IT with magnet pulls runners; runner with magnetRepel pushes IT away
    const itP = gameState.players.find(p => p.isIt);
    gameState.players.forEach(runner => {
        if (runner.eliminated) return;
        // IT pulling runners
        if (itP && itP.magnet && runner.id !== itP.id && !runner.untaggable) {
            const dx = itP.x - runner.x, dy = itP.y - runner.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 5 && dist < 260) {
                runner.x += dx / dist * 2.2;
                runner.y += dy / dist * 2.2;
                const el = document.getElementById('player_' + runner.id);
                if (el) { el.style.left = runner.x + 'px'; el.style.top = runner.y + 'px'; }
            }
        }
        // Runner repelling IT away
        if (runner.magnetRepel && itP && runner.id !== itP.id) {
            const dx = itP.x - runner.x, dy = itP.y - runner.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 5 && dist < 220) {
                // Push IT in the opposite direction
                itP.x -= dx / dist * 2.5;
                itP.y -= dy / dist * 2.5;
                const el = document.getElementById('player_' + itP.id);
                if (el) { el.style.left = itP.x + 'px'; el.style.top = itP.y + 'px'; }
            }
        }
    });

    // Projectiles
    updateProjectiles(arena);

    // Pickups
    pickups.forEach(pu => {
        if (!pu.active) return;
        gameState.players.forEach(p => {
            if (p.eliminated) return;
            if (Math.abs(p.x - pu.x) < PW + 8 && Math.abs(p.y - pu.y) < PH + 8) collectPickup(p, pu);
        });
    });

    // Tags
    checkTags(now);

    // Jump pads
    if (typeof checkJumpPads === 'function') checkJumpPads();

    // Replay recording
    if (typeof recordFrame === 'function') recordFrame();

    // Spectator cam
    if (typeof applySpectatorCam === 'function') applySpectatorCam();

    // Leech tick (every ~1s via accumulator)
    if (!window._leechAccum) window._leechAccum = 0;
    window._leechAccum += dt;
    if (window._leechAccum >= 1000) { window._leechAccum = 0; tickLeech(); }

    // KING: update crown indicator each frame
    if (gameState.mode === 'king') renderCrownIndicator();

    // HUNTED: check survival win
    if (gameState.mode === 'hunted') checkHuntedWin();
}

// ============================================
// PROJECTILES
// ============================================
function fireShot(shooter) {
    if (!shooter.hasShot) return;
    shooter.hasShot = false;
    sfxShot();
    const arena = getArena();
    // fire in the direction they're roughly moving — fallback: toward nearest player
    const itP = gameState.players.find(p => p.isIt && p.id !== shooter.id);
    const targets = gameState.players.filter(p => p.id !== shooter.id && !p.eliminated);
    if (!targets.length) return;
    const closest = targets.reduce((a, b) => {
        const da = Math.hypot(a.x - shooter.x, a.y - shooter.y);
        const db = Math.hypot(b.x - shooter.x, b.y - shooter.y);
        return da < db ? a : b;
    });
    const dx = closest.x - shooter.x, dy = closest.y - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const proj = {
        x: shooter.x + PW / 2, y: shooter.y + PH / 2,
        vx: (dx / dist) * 8, vy: (dy / dist) * 8,
        owner: shooter, active: true,
        id: 'proj_' + Date.now(),
    };
    projectiles.push(proj);
    const el = document.createElement('div');
    el.className = 'projectile';
    el.id = proj.id;
    el.style.left = proj.x + 'px';
    el.style.top = proj.y + 'px';
    $('arena-inner').appendChild(el);
}

function updateProjectiles(arena) {
    projectiles.forEach(proj => {
        if (!proj.active) return;
        proj.x += proj.vx;
        proj.y += proj.vy;
        const el = document.getElementById(proj.id);
        if (el) {
            el.style.left = (proj.x - 4) + 'px';
            el.style.top = (proj.y - 4) + 'px';
        }
        // bounds
        if (proj.x < 0 || proj.x > arena.w || proj.y < 0 || proj.y > arena.h) {
            proj.active = false;
            if (el) el.remove();
            return;
        }
        // wall bounce
        let bounced = false;
        obstacles.forEach(o => {
            const ox = o.px * arena.w, oy = o.py * arena.h, ow = o.pw * arena.w, oh = o.ph * arena.h;
            if (proj.x > ox && proj.x < ox + ow && proj.y > oy && proj.y < oy + oh) {
                proj.vx *= -1;
                proj.vy *= -1;
                bounced = true;
            }
        });
        // hit player
        gameState.players.forEach(p => {
            if (p.id === proj.owner.id || p.eliminated) return;
            if (Math.abs(p.x + PW / 2 - proj.x) < PW / 2 + 4 && Math.abs(p.y + PH / 2 - proj.y) < PH / 2 + 4) {
                if (p.shield) {
                    sfxShield();
                    blockShield(p);
                    proj.active = false;
                    if (el) el.remove();
                    return;
                }
                applyTag(p.id, proj.owner.id);
                proj.active = false;
                if (el) el.remove();
                spawnParticles(proj.x, proj.y, '#ffcc00', 8);
            }
        });
    });
}

// ============================================
// DECOYS
// ============================================
function spawnDecoy(p) {
    const c = PLAYER_COLORS[p.colorIdx];
    // Looks IDENTICAL to the real player — same color, name, class, size
    const el = document.createElement('div');
    el.className = 'player-el' + (p.isIt ? ' is-it' : '');
    el.style.cssText = `background:${c.bg};color:${c.txt};left:${p.x}px;top:${p.y}px;`;
    el.textContent = p.name.slice(0, 2);
    // Real name tag
    const nt = document.createElement('div');
    nt.className = 'player-name-tag';
    nt.textContent = p.name;
    nt.style.color = c.bg;
    el.appendChild(nt);
    $('arena-inner').appendChild(el);

    const decoyObj = { x: p.x, y: p.y, owner: p, el, alive: true };
    decoys.push(decoyObj);

    // Wander convincingly — same speed as a real slow player
    const wander = () => {
        if (!decoyObj.alive || !el.parentNode) return;
        const arena = getArena();
        decoyObj.x = Math.max(0, Math.min(arena.w - PW, decoyObj.x + (Math.random() - 0.5) * 20));
        decoyObj.y = Math.max(0, Math.min(arena.h - PH, decoyObj.y + (Math.random() - 0.5) * 20));
        el.style.left = decoyObj.x + 'px';
        el.style.top  = decoyObj.y + 'px';
        setTimeout(wander, 200 + Math.random() * 250);
    };
    setTimeout(wander, 150);

    setTimeout(() => {
        if (decoyObj.alive) { el.remove(); decoys = decoys.filter(d => d !== decoyObj); }
    }, 5000);
}

function checkDecoyTags(now) {
    // If IT touches a decoy, it absorbs the tag — decoy pops, IT gets nothing
    const itP = gameState.players.find(p => p.isIt);
    if (!itP) return;
    decoys.forEach(d => {
        if (!d.alive) return;
        if (Math.abs(itP.x - d.x) < PW && Math.abs(itP.y - d.y) < PH) {
            d.alive = false;
            d.el.remove();
            decoys = decoys.filter(x => x !== d);
            spawnParticles(d.x + PW/2, d.y + PH/2, PLAYER_COLORS[d.owner.colorIdx].bg, 12);
            showBanner(`🪄 ${itP.name} TAGGED A DECOY!`, '#44ff88');
            setTimeout(hideBanner, 1500);
            sfxShield();
            // Tag cooldown for IT so they can't immediately re-tag
            itP.lastTagTime = now + TAG_COOL;
            log(`// ${d.owner.name}'s decoy absorbed ${itP.name}'s tag!`);
        }
    });
}

// ============================================
// CHECK TAGS
// ============================================
function checkTags(now) {
    checkDecoyTags(now);
    const mode = gameState.mode;

    // HUNTED: everyone chases the hunted player
    if (mode === 'hunted') {
        const hunted = gameState.players.find(p => p.isHunted && !p.eliminated);
        if (!hunted) return;
        gameState.players.forEach(hunter => {
            if (hunter.isHunted || hunter.eliminated || hunter.frozen) return;
            if (hunter.untaggable) return;
            if (now - hunter.lastTagTime < TAG_COOL || now - hunted.lastTagTime < TAG_COOL) return;
            if (Math.abs(hunter.x - hunted.x) < PW && Math.abs(hunter.y - hunted.y) < PH) {
                if (hunted.shield) { blockShield(hunted); return; }
                // Hunter drains HP from hunted directly
                const dmg = 20;
                hunted.hp = Math.max(0, hunted.hp - dmg);
                hunter.hp = Math.min(100, hunter.hp + 8);
                flashHPLoss(hunted, dmg);
                flashHPGain(hunter, 8);
                hunter.score++;
                hunter.tagsMade++;
                hunted.tagsTaken++;
                matchStats.totalTags++;
                hunter.lastTagTime = now;
                hunted.lastTagTime = now;
                addKillFeed(hunter, hunted, 'HIT');
                spawnParticles(hunted.x + PW/2, hunted.y + PH/2, PLAYER_COLORS[hunter.colorIdx].bg, 8);
                screenShake(120);
                sfxTag();
                if (hunted.hp <= 0) eliminateByPoints(hunted);
                renderHUD();
            }
        });
        return;
    }

    // BLITZ + DRAINRACE: any player can tag any other player to steal HP
    if (mode === 'blitz' || mode === 'drainrace') {
        gameState.players.forEach(tagger => {
            if (tagger.eliminated || tagger.frozen) return;
            gameState.players.forEach(target => {
                if (target.id === tagger.id || target.eliminated) return;
                if (target.untaggable) return;
                if (now - tagger.lastTagTime < TAG_COOL || now - target.lastTagTime < TAG_COOL) return;
                if (Math.abs(tagger.x - target.x) < PW && Math.abs(tagger.y - target.y) < PH) {
                    if (target.shield) { blockShield(target); return; }
                    const steal = mode === 'blitz' ? 18 : 22;
                    target.hp = Math.max(0, target.hp - steal);
                    tagger.hp = Math.min(100, tagger.hp + steal);
                    flashHPLoss(target, steal);
                    flashHPGain(tagger, steal);
                    tagger.score++;
                    tagger.tagsMade++;
                    tagger.streak++;
                    target.tagsTaken++;
                    if (tagger.streak > matchStats.longestStreak) matchStats.longestStreak = tagger.streak;
                    matchStats.totalTags++;
                    tagger.lastTagTime = now;
                    target.lastTagTime = now;
                    addKillFeed(tagger, target, 'DRAINED');
                    spawnParticles(target.x + PW/2, target.y + PH/2, PLAYER_COLORS[tagger.colorIdx].bg, 10);
                    screenShake(130);
                    sfxTag();
                    if (STREAK_MSGS[tagger.streak]) showStreakPopup(STREAK_MSGS[tagger.streak], PLAYER_COLORS[tagger.colorIdx].bg);
                    if (target.hp <= 0) {
                        const alive = gameState.players.filter(p => !p.eliminated).length;
                        if (alive > 2) eliminateByPoints(target);
                        else target.hp = 1;
                    }
                    renderHUD();
                }
            });
        });
        return;
    }

    // KING: tagging the crown holder steals the crown + 15hp
    if (mode === 'king') {
        const crownHolder = gameState.players.find(p => p.hasCrown && !p.eliminated);
        if (crownHolder) {
            gameState.players.forEach(tagger => {
                if (tagger.id === crownHolder.id || tagger.eliminated || tagger.frozen) return;
                if (tagger.untaggable) return;
                if (now - tagger.lastTagTime < TAG_COOL || now - crownHolder.lastTagTime < TAG_COOL) return;
                if (Math.abs(tagger.x - crownHolder.x) < PW && Math.abs(tagger.y - crownHolder.y) < PH) {
                    if (crownHolder.shield) { blockShield(crownHolder); return; }
                    // Steal the crown
                    crownHolder.hasCrown = false;
                    tagger.hasCrown = true;
                    const oldEl = document.getElementById('player_' + crownHolder.id);
                    const newEl = document.getElementById('player_' + tagger.id);
                    if (oldEl) oldEl.classList.remove('has-crown');
                    if (newEl) newEl.classList.add('has-crown');
                    // HP exchange
                    const steal = 15;
                    crownHolder.hp = Math.max(1, crownHolder.hp - steal);
                    tagger.hp = Math.min(100, tagger.hp + steal);
                    flashHPLoss(crownHolder, steal);
                    flashHPGain(tagger, steal);
                    tagger.score++;
                    tagger.tagsMade++;
                    crownHolder.tagsTaken++;
                    matchStats.totalTags++;
                    tagger.lastTagTime = now;
                    crownHolder.lastTagTime = now;
                    spawnParticles(crownHolder.x + PW/2, crownHolder.y + PH/2, '#ffcc00', 14);
                    showBanner(`👑 ${tagger.name} STOLE THE CROWN!`, '#ffcc00');
                    setTimeout(hideBanner, 1800);
                    sfxTag();
                    screenShake(200);
                    playTone(880, 'sine', 0.15, 0.3);
                    addKillFeed(tagger, crownHolder, 'STOLE CROWN FROM');
                    renderCrownIndicator();
                    renderHUD();
                }
            });
        }
        return;
    }

    if (mode === 'infection') {
        const infected = gameState.players.filter(p => p.infected && !p.eliminated);
        const clean = gameState.players.filter(p => !p.infected && !p.eliminated);
        if (clean.length === 0) { endGame(); return; }
        infected.forEach(inf => {
            clean.forEach(runner => {
                if (now - runner.lastTagTime < TAG_COOL || now - inf.lastTagTime < TAG_COOL) return;
                if (Math.abs(inf.x - runner.x) < PW && Math.abs(inf.y - runner.y) < PH) {
                    if (runner.shield) { blockShield(runner); return; }
                    infectPlayer(runner, inf);
                }
            });
        });
        return;
    }
    if (mode === 'assassin') {
        gameState.players.forEach(p => {
            if (p.eliminated || p.net) return;
            const targetIdx = p.assassinTarget;
            if (targetIdx === null) return;
            const target = gameState.players[targetIdx];
            if (!target || target.eliminated) return;
            if (now - target.lastTagTime < TAG_COOL || now - p.lastTagTime < TAG_COOL) return;
            if (Math.abs(p.x - target.x) < PW && Math.abs(p.y - target.y) < PH) {
                if (target.shield) { blockShield(target); return; }
                applyAssassinTag(p, target);
            }
        });
        return;
    }
    // Classic + Potato
    const itP = gameState.players.find(p => p.isIt);
    if (!itP) return;
    gameState.players.forEach(runner => {
        if (runner.isIt || runner.frozen || runner.eliminated) return;
        if (runner.untaggable) return;
        if (now - runner.lastTagTime < TAG_COOL || now - itP.lastTagTime < TAG_COOL) return;
        if (Math.abs(itP.x - runner.x) < PW && Math.abs(itP.y - runner.y) < PH) {
            if (runner.shield) { sfxShield(); blockShield(runner); return; }
            applyTag(runner.id, itP.id);
            if (bc && isHost) bc.postMessage({ type: 'tag', tagged: runner.id, tagger: itP.id });
        }
    });
}

// ============================================
// INFECTION MODE
// ============================================
function infectPlayer(runner, infector) {
    sfxEliminate();
    runner.infected = true;
    runner.lastTagTime = Date.now();
    infector.score++;
    // Infecting someone gives the infector 10 HP back
    infector.hp = Math.min(100, infector.hp + 10);
    flashHPGain(infector, 10);
    // Infection costs the runner 20 HP immediately
    runner.hp = Math.max(1, runner.hp - 20);
    flashHPLoss(runner, 20);
    matchStats.totalTags++;
    spawnParticles(runner.x, runner.y, '#cc44ff', 10);
    addKillFeed(infector, runner, 'INFECTED');
    const el = document.getElementById('player_' + runner.id);
    if (el) {
        el.className = 'player-el infected';
    }
    renderHUD();
    const alive = gameState.players.filter(p => !p.infected && !p.eliminated);
    if (alive.length === 0) endGame();
    else if (alive.length === 1) {
        alive[0].score += 3;
        alive[0].hp = Math.min(100, alive[0].hp + 20); // survivor bonus
        flashHPGain(alive[0], 20);
        const el2 = document.getElementById('player_' + alive[0].id);
        if (el2) el2.classList.add('survivor-glow');
        log(`// ${alive[0].name} IS THE LAST SURVIVOR!`);
        setTimeout(endGame, 2000);
    }
}

// ============================================
// ASSASSIN MODE
// ============================================
function applyAssassinTag(assassin, target) {
    sfxTag();
    spawnParticles(target.x, target.y, PLAYER_COLORS[target.colorIdx].bg, 10);
    assassin.score += 2;
    assassin.streak++;
    assassin.tagsMade++;
    target.tagsTaken++;
    matchStats.totalTags++;
    if (assassin.streak > matchStats.longestStreak) matchStats.longestStreak = assassin.streak;
    // Assassin steals 15 HP from target
    const steal = 15;
    target.hp = Math.max(0, target.hp - steal);
    assassin.hp = Math.min(100, assassin.hp + steal);
    flashHPLoss(target, steal);
    flashHPGain(assassin, steal);
    if (target.hp <= 0) eliminateByPoints(target);
    target.lastTagTime = Date.now();
    assassin.lastTagTime = Date.now();
    // reassign new target for assassin
    const alive = gameState.players.filter(p => !p.eliminated && p !== assassin);
    if (alive.length > 0) {
        assassin.assassinTarget = gameState.players.indexOf(alive[Math.floor(Math.random() * alive.length)]);
    }
    addKillFeed(assassin, target, 'ELIMINATED');
    updateTargetIndicator(assassin);
    renderHUD();
    $('combo-display').textContent = assassin.streak > 1 ? `${assassin.name} ×${assassin.streak}` : '';
    if (STREAK_MSGS[assassin.streak]) showStreakPopup(STREAK_MSGS[assassin.streak], PLAYER_COLORS[assassin.colorIdx].bg);
}

// ============================================
// HOT POTATO
// ============================================
function tickPotato() {
    if (!gameState || !gameState.running || paused) return;
    gameState.potatoTimer--;
    if (gameState.potatoTimer <= 0) {
        // Potato explodes — holder is eliminated
        const holder = gameState.players[gameState.potatoHolder];
        if (holder && !holder.eliminated) {
            sfxEliminate();
            holder.eliminated = true;
            const el = document.getElementById('player_' + holder.id);
            if (el) el.classList.add('eliminated');
            spawnParticles(holder.x, holder.y, '#ffcc00', 14);
            showBanner(`${holder.name}: EXPLODED! 💥`, '#ff7700');
            setTimeout(hideBanner, 2000);
            log(`// ${holder.name} HELD THE POTATO TOO LONG — ELIMINATED`);
            // pass potato to next alive player
            const alive = gameState.players.filter(p => !p.eliminated);
            if (alive.length <= 1) {
                endGame();
                return;
            }
            const next = alive[Math.floor(Math.random() * alive.length)];
            gameState.potatoHolder = gameState.players.indexOf(next);
            gameState.potatoTimer = 12 + Math.floor(Math.random() * 8);
            renderHUD();
        }
    }
    // potato holder transfer on touch
    const holder = gameState.players[gameState.potatoHolder];
    if (!holder || holder.eliminated) return;
    gameState.players.forEach((p, i) => {
        if (i === gameState.potatoHolder || p.eliminated) return;
        if (Math.abs(p.x - holder.x) < PW && Math.abs(p.y - holder.y) < PH) {
            gameState.potatoHolder = i;
            gameState.potatoTimer = 12 + Math.floor(Math.random() * 8);
            sfxTag();
            log(`// POTATO PASSED TO ${p.name}`);
            renderHUD();
        }
    });
    renderHUD();
}

// ============================================
// RAGE METER
// ============================================
function tickRage() {
    if (!gameState || !gameState.running || paused) return;
    const itP = gameState.players.find(p => p.isIt);
    if (!itP) return;
    itP.rageLevel = Math.min(100, itP.rageLevel + 3);
    const pct = itP.rageLevel;
    const rageBar = $('rage-bar');
    if (rageBar) {
        rageBar.style.width = pct + '%';
        rageBar.style.background = pct > 80 ? '#ff7700' : pct > 50 ? '#ffcc00' : '#ff2255';
    }
    const el = document.getElementById('player_' + itP.id);
    if (pct >= 100) {
        if (el && !el.classList.contains('raged')) el.classList.add('raged');
    } else {
        if (el) el.classList.remove('raged');
    }
}

// ── KING MODE: rotate crown every 15s to a random alive player ──
function rotateCrown() {
    if (!gameState || !gameState.running) return;
    const alive = gameState.players.filter(p => !p.eliminated);
    if (alive.length < 2) return;
    // Remove crown from current holder
    gameState.players.forEach(p => {
        p.hasCrown = false;
        const el = document.getElementById('player_' + p.id);
        if (el) el.classList.remove('has-crown');
    });
    // Give to random alive player
    const next = alive[Math.floor(Math.random() * alive.length)];
    next.hasCrown = true;
    const el = document.getElementById('player_' + next.id);
    if (el) el.classList.add('has-crown');
    spawnParticles(next.x + PW/2, next.y + PH/2, '#ffcc00', 16);
    showBanner(`👑 CROWN → ${next.name}!`, '#ffcc00');
    setTimeout(hideBanner, 2000);
    playTone(880, 'sine', 0.2, 0.4);
    playTone(1100, 'sine', 0.15, 0.3, 0.15);
    log(`// 👑 CROWN ROTATED TO ${next.name}`);
    renderCrownIndicator();
    renderHUD();
}

function renderCrownIndicator() {
    // Show current crown holder in HUD it-display
    const crown = gameState && gameState.players.find(p => p.hasCrown);
    if (!crown) return;
    const c = PLAYER_COLORS[crown.colorIdx];
    $('it-display').textContent = '👑 ' + crown.name;
    $('it-display').style.color = '#ffcc00';
}

// ── HUNTED MODE: check if hunted has survived long enough to win ──
function renderHuntedIndicator() {
    const hunted = gameState && gameState.players.find(p => p.isHunted);
    if (!hunted) return;
    const c = PLAYER_COLORS[hunted.colorIdx];
    $('it-display').textContent = '🎯 HUNTED: ' + hunted.name;
    $('it-display').style.color = '#ff2255';
}

function checkHuntedWin() {
    if (!gameState || gameState.mode !== 'hunted') return;
    const hunted = gameState.players.find(p => p.isHunted && !p.eliminated);
    if (!hunted) { endGame(); return; }
    const elapsed = (Date.now() - gameState.huntedStartTime) / 1000;
    if (elapsed >= gameState.huntedWinTime) {
        // Hunted survived! Give massive HP bonus and end game
        hunted.hp = Math.min(100, hunted.hp + 50);
        hunted.score += 20;
        showBanner(`🎯 ${hunted.name} SURVIVED THE HUNT!`, '#00ff88');
        log(`// ${hunted.name} SURVIVED THE HUNT — WINS!`);
        setTimeout(endGame, 2500);
    }
}

// ── LEECH: drain HP from nearest player every second ──
function tickLeech() {
    if (!gameState || !gameState.running || paused) return;
    gameState.players.forEach(p => {
        if (!p.leeching || p.eliminated) return;
        // Find nearest non-eliminated other player
        let nearest = null, nearDist = Infinity;
        gameState.players.forEach(other => {
            if (other.id === p.id || other.eliminated) return;
            const d = Math.hypot(other.x - p.x, other.y - p.y);
            if (d < nearDist) { nearDist = d; nearest = other; }
        });
        if (!nearest) return;
        const dmg = 6;
        nearest.hp = Math.max(0, nearest.hp - dmg);
        p.hp = Math.min(100, p.hp + dmg);
        flashHPLoss(nearest, dmg);
        flashHPGain(p, dmg);
        // Draw a leech line
        spawnLeechLine(p, nearest);
        if (nearest.hp <= 0) {
            const aliveCount = gameState.players.filter(x => !x.eliminated).length;
            if (aliveCount > 2) eliminateByPoints(nearest);
            else nearest.hp = 1;
        }
        renderHUD();
    });
}

function spawnLeechLine(from, to) {
    const line = document.createElement('div');
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.cssText = `
        position:absolute;
        left:${from.x + PW/2}px; top:${from.y + PH/2}px;
        width:${len}px; height:2px;
        background:linear-gradient(90deg, #ff4477, transparent);
        transform-origin:left center;
        transform:rotate(${angle}deg);
        opacity:0.7; pointer-events:none; z-index:15;
        animation:leech-fade 0.5s ease-out forwards;`;
    $('arena-inner').appendChild(line);
    setTimeout(() => line.remove(), 500);
}

// ============================================
// POINTS SYSTEM (HP-based, ticks every 1s)
// ============================================
function getPointDrainRate(p) {
    const mode = gameState.mode;
    let drain = 0, gain = 0;

    if (mode === 'classic') {
        // IT bleeds hard, runners slowly recover
        if (p.isIt) drain = 8;
        else gain = 4;

    } else if (mode === 'hunted') {
        // One player is hunted — they gain if alive, hunters drain slowly
        if (p.isHunted) gain = 3;   // hunted gets HP to survive longer
        else drain = 2;              // hunters bleed — pressure to finish it

    } else if (mode === 'potato') {
        // Holding the potato is brutal
        const holderIdx = gameState.potatoHolder;
        if (gameState.players[holderIdx] && gameState.players[holderIdx].id === p.id) drain = 15;
        else gain = 2;

    } else if (mode === 'assassin') {
        // Everyone bleeds — gotta tag fast
        drain = 3;

    } else if (mode === 'blitz') {
        // Everyone bleeds, no passive gain — only tags save you
        drain = 6;

    } else if (mode === 'king') {
        // Crown holder gains, everyone else bleeds
        if (p.hasCrown) gain = 8;
        else drain = 3;

    } else if (mode === 'drainrace') {
        // Constant hard drain — only tags give HP back
        drain = 8;
    }

    // Overclock doubles gain
    if (p.overclocked && gain > 0) gain *= 2;

    // Zone modifiers
    const arena = getArena();
    const cx = p.x + PW/2, cy = p.y + PH/2;
    let drainMult = 1, gainBonus = 0;
    zones.forEach(z => {
        const zx = z.px * arena.w, zy = z.py * arena.h, zw = z.pw * arena.w, zh = z.ph * arena.h;
        if (cx > zx && cx < zx + zw && cy > zy && cy < zy + zh) {
            if (z.type === 'danger') { drainMult *= 2.5; gainBonus -= 2; }  // very punishing
            if (z.type === 'boost')  { gainBonus += 3; drainMult *= 0.5; } // strong reward
            if (z.type === 'slow')   { drainMult *= 0.7; }                 // mild relief
        }
    });

    const netDrain = Math.max(0, Math.round(drain * drainMult));
    const netGain  = Math.max(0, gain + gainBonus);
    return { drain: netDrain, gain: netGain };
}

function tickPoints() {
    if (!gameState || !gameState.running || paused) return;
    const aliveCount = gameState.players.filter(p => !p.eliminated).length;

    gameState.players.forEach(p => {
        if (p.eliminated) return;
        if (p.frozenHPPause) return; // frozen by enemy freeze — no drain
        const { drain, gain } = getPointDrainRate(p);
        // Shield absorbs drain ticks
        if (p.shield && drain > 0 && p.shieldTicks > 0) {
            p.shieldTicks--;
            if (p.shieldTicks <= 0) {
                p.shield = false;
                const sel = document.getElementById('player_' + p.id);
                if (sel) sel.classList.remove('shielded');
                log(`// ${p.name}'s shield absorbed all ticks — expired`);
            }
            return; // tick absorbed
        }
        const delta = gain - drain;
        const prev = p.hp;
        p.hp = Math.max(0, Math.min(100, p.hp + delta));

        // Visual feedback when losing HP
        if (delta < 0) {
            flashHPLoss(p, Math.abs(delta));
        }
        if (delta > 0 && prev < p.hp) {
            flashHPGain(p, delta);
        }

        // Elimination at 0 HP
        if (p.hp <= 0 && !p.eliminated) {
            if (aliveCount > 2) {
                // 3+ players: eliminate
                eliminateByPoints(p);
            } else if (aliveCount === 2) {
                // 2 players: just log low HP, timer decides
                p.hp = 1; // floor at 1 so they don't loop
                log(`// ⚠️ ${p.name} IS CRITICAL — ${p.hp} HP`);
            }
        }

        // Warning flash below 30hp
        if (p.hp <= 30 && !p.eliminated) {
            const el = document.getElementById('player_' + p.id);
            if (el && !el.classList.contains('low-hp')) el.classList.add('low-hp');
        } else {
            const el = document.getElementById('player_' + p.id);
            if (el) el.classList.remove('low-hp');
        }
    });

    renderHUD();
}

function eliminateByPoints(p) {
    if (p.eliminated) return;
    p.eliminated = true;
    p.hp = 0;
    sfxEliminate();
    const el = document.getElementById('player_' + p.id);
    if (el) {
        el.classList.add('eliminated');
        // Play death animation based on selected skin
        playDeathAnim(p, el);
    }
    showBanner(`💀 ${p.name}: OUT OF HP!`, '#ff2255');
    setTimeout(hideBanner, 2000);
    log(`// ${p.name} ELIMINATED — RAN OUT OF POINTS`);
    spawnParticles(p.x + PW/2, p.y + PH/2, PLAYER_COLORS[p.colorIdx].bg, 18);
    screenShake(300);

    const alive = gameState.players.filter(p2 => !p2.eliminated);
    if (alive.length <= 1) {
        setTimeout(endGame, 1200);
    }
    renderHUD();
}

function flashHPLoss(p, amount) {
    const el = document.getElementById('player_' + p.id);
    if (!el) return;
    // Floating damage number
    const dmg = document.createElement('div');
    dmg.className = 'hp-float hp-loss';
    dmg.textContent = `-${amount}`;
    dmg.style.cssText = `left:${p.x + PW/2}px;top:${p.y - 8}px;`;
    $('arena-inner').appendChild(dmg);
    setTimeout(() => dmg.remove(), 900);
    // Brief red flash on player
    el.style.boxShadow = '0 0 14px #ff2255';
    setTimeout(() => { if (el) el.style.boxShadow = ''; }, 400);
}

function flashHPGain(p, amount) {
    const el = document.getElementById('player_' + p.id);
    if (!el) return;
    const gain = document.createElement('div');
    gain.className = 'hp-float hp-gain';
    gain.textContent = `+${amount}`;
    gain.style.cssText = `left:${p.x + PW/2}px;top:${p.y - 8}px;`;
    $('arena-inner').appendChild(gain);
    setTimeout(() => gain.remove(), 900);
}

function playDeathAnim(p, el) {
    const anim = (typeof metaProfile !== 'undefined') ? metaProfile.selectedDeathAnim : 'default';
    if (anim === 'explosion') {
        for (let i = 0; i < 20; i++) spawnParticles(p.x + PW/2, p.y + PH/2, PLAYER_COLORS[p.colorIdx].bg, 2);
        screenShake(400);
    } else if (anim === 'glitch') {
        el.classList.add('rgb-shift');
        setTimeout(() => { if (el) el.classList.remove('rgb-shift'); }, 600);
    } else if (anim === 'confetti') {
        const colors = ['#ff2255','#ffcc00','#00ff88','#cc44ff','#00ccff'];
        colors.forEach(c => spawnParticles(p.x + PW/2, p.y + PH/2, c, 5));
    } else {
        spawnParticles(p.x + PW/2, p.y + PH/2, PLAYER_COLORS[p.colorIdx].bg, 12);
    }
}

// ============================================
// TAG (Classic) — now also transfers HP pressure
function applyTag(taggedId, taggerId) {
    const tagged = gameState.players.find(p => p.id == taggedId);
    const tagger = gameState.players.find(p => p.id == taggerId);
    if (!tagged || !tagger) return;
    sfxTag();
    tagger.score++;
    tagger.streak++;
    tagger.tagsMade++;
    tagged.tagsTaken++;
    matchStats.totalTags++;
    if (tagger.streak > matchStats.longestStreak) matchStats.longestStreak = tagger.streak;
    tagger.rageLevel = 0;
    // HP bonus for tagger — tagging saves you from draining
    const hpBonus = 5 + Math.min(10, tagger.streak * 2);
    tagger.hp = Math.min(100, tagger.hp + hpBonus);
    flashHPGain(tagger, hpBonus);
    // Tagged player gets a small HP penalty (the shock of being caught)
    tagged.hp = Math.max(1, tagged.hp - 3);
    flashHPLoss(tagged, 3);
    const now = Date.now();
    gameState.players.forEach(p => {
        p.isIt = false;
        p.lastTagTime = now;
    });
    tagged.isIt = true;
    tagged.streak = 0;
    spawnParticles(tagged.x, tagged.y, PLAYER_COLORS[tagger.colorIdx].bg, 10);
    addKillFeed(tagger, tagged, 'TAGGED');
    renderHUD();
    screenShake(160);
    if (STREAK_MSGS[tagger.streak]) showStreakPopup(STREAK_MSGS[tagger.streak], PLAYER_COLORS[tagger.colorIdx].bg);
    gameState.players.forEach(p => {
        const el = document.getElementById('player_' + p.id);
        if (!el) return;
        el.className = 'player-el' + (p.isIt ? ' is-it' : '') + (p.ghosted ? ' ghosted' : '') + (p.shield ? ' shielded' : '');
    });
    $('combo-display').textContent = tagger.streak > 1 ? `${tagger.name} ×${tagger.streak} STREAK` : '';
}

function applyTeamTag(tagger, tagged) {
    sfxTag();
    tagger.score++;
    tagger.tagsMade++;
    tagged.tagsTaken++;
    gameState.teamScores[tagger.team] = (gameState.teamScores[tagger.team] || 0) + 1;
    matchStats.totalTags++;
    const now = Date.now();
    tagged.lastTagTime = now;
    tagger.lastTagTime = now;
    // HP: tagger gains 5, tagged loses 8
    tagger.hp = Math.min(100, tagger.hp + 5);
    tagged.hp = Math.max(0, tagged.hp - 8);
    flashHPGain(tagger, 5);
    flashHPLoss(tagged, 8);
    if (tagged.hp <= 0) eliminateByPoints(tagged);
    spawnParticles(tagged.x, tagged.y, PLAYER_COLORS[tagger.colorIdx].bg, 10);
    addKillFeed(tagger, tagged, 'TAGGED');
    renderHUD();
    screenShake(160);
    if (gameState.teamScores[tagger.team] >= 10) {
        log(`// TEAM ${tagger.team + 1} WINS!`);
        endGame();
    }
}

function blockShield(runner) {
    runner.shield = false;
    sfxShield();
    const el = document.getElementById('player_' + runner.id);
    if (el) el.classList.remove('shielded');
    spawnParticles(runner.x, runner.y, '#00ccff', 8);
    log(`// ${runner.name} SHIELD BLOCKED!`);
    showBanner(`${runner.name}: BLOCKED!`, '#00ccff');
    setTimeout(hideBanner, 1200);
    screenShake(150);
}

// ============================================
// PARTICLES
// ============================================
function spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        const size = 3 + Math.random() * 5;
        el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};`;
        $('arena-inner').appendChild(el);
        let vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
        let life = 0;
        const tick = () => {
            life += 16;
            el.style.left = (parseFloat(el.style.left) + vx) + 'px';
            el.style.top = (parseFloat(el.style.top) + vy) + 'px';
            vy += 0.12;
            vx *= 0.95;
            el.style.opacity = Math.max(0, 1 - life / 500);
            if (life < 500 && el.parentNode) requestAnimationFrame(tick);
            else el.remove();
        };
        requestAnimationFrame(tick);
    }
}

// ============================================
// TRAILS
// ============================================
function spawnTrail(p) {
    const c = PLAYER_COLORS[p.colorIdx];
    const t = document.createElement('div');
    t.className = 'trail';
    t.style.cssText = `left:${p.x + 5}px;top:${p.y + 5}px;width:14px;height:14px;background:${c.bg};`;
    $('arena-inner').appendChild(t);
    setTimeout(() => t.remove(), 450);
}

// ============================================
// PICKUPS
// ============================================
function spawnPickup() {
    if (!gameState || !gameState.running || paused) return;
    const arena = getArena();
    const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
    const pu = {
        x: PW + Math.random() * (arena.w - PW * 3),
        y: PH + Math.random() * (arena.h - PH * 3),
        type, active: true,
        id: 'pu_' + Date.now()
    };
    pickups.push(pu);
    const el = document.createElement('div');
    el.className = 'pickup ' + type.cls;
    el.id = pu.id;
    posEl(el, pu.x, pu.y);
    el.textContent = type.icon;
    $('arena-inner').appendChild(el);
    setTimeout(() => {
        if (pu.active) {
            pu.active = false;
            const e = document.getElementById(pu.id);
            if (e) e.remove();
        }
    }, 9000);
}

function collectPickup(p, pu) {
    if (!pu.active) return;
    pu.active = false;
    sfxPickup();
    matchStats.pickups++;
    const el = document.getElementById(pu.id);
    if (el) {
        el.style.transform = 'scale(2.5)';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
    }
    log(`// ${p.name} COLLECTED ${pu.type.icon} ${pu.type.id.toUpperCase()}`);
    showBanner(`${p.name}: ${pu.type.desc}`, pu.type.color);
    setTimeout(hideBanner, 1800);
    spawnParticles(pu.x, pu.y, pu.type.color, 8);
    const pel = document.getElementById('player_' + p.id);

    // ── SHIELD: blocks next tag AND next HP loss tick ──
    if (pu.type.id === 'shield') {
        p.shield = true;
        p.shieldTicks = 2; // absorbs 2 damage ticks as well
        if (pel) pel.classList.add('shielded');
        clearTimeout(p._timers.shield);
        p._timers.shield = setTimeout(() => {
            p.shield = false;
            p.shieldTicks = 0;
            if (pel) pel.classList.remove('shielded');
            log(`// ${p.name}'s shield expired`);
        }, pu.type.dur);
    }

    // ── FREEZE: stops ALL other players dead — they can't move or drain HP ──
    if (pu.type.id === 'freeze') {
        sfxFreeze();
        const others = gameState.players.filter(o => o.id !== p.id && !o.eliminated);
        others.forEach(other => {
            other.frozen = true;
            other.frozenHPPause = true; // HP won't drain while frozen
            const oel = document.getElementById('player_' + other.id);
            if (oel) oel.classList.add('frozen');
        });
        // Restore after duration
        setTimeout(() => {
            others.forEach(other => {
                other.frozen = false;
                other.frozenHPPause = false;
                const oel = document.getElementById('player_' + other.id);
                if (oel) oel.classList.remove('frozen');
            });
            log(`// FREEZE expired`);
        }, pu.type.dur);
        // Bonus: give collector free HP ticks while others are frozen
        p.hp = Math.min(100, p.hp + 6);
        flashHPGain(p, 6);
        screenShake(250);
    }

    // ── GHOST: pass through walls AND become untaggable for duration ──
    if (pu.type.id === 'ghost') {
        p.ghosted = true;
        p.untaggable = true;
        if (pel) { pel.classList.add('ghosted'); pel.style.opacity = '0.45'; }
        clearTimeout(p._timers.ghost);
        p._timers.ghost = setTimeout(() => {
            p.ghosted = false;
            p.untaggable = false;
            if (pel) { pel.classList.remove('ghosted'); pel.style.opacity = ''; }
            log(`// ${p.name}'s ghost expired`);
        }, pu.type.dur);
    }

    // ── MAGNET: if IT, pulls ALL runners toward you; if not IT, pushes IT away ──
    if (pu.type.id === 'magnet') {
        p.magnet = true;
        clearTimeout(p._timers.magnet);
        p._timers.magnet = setTimeout(() => {
            p.magnet = false;
            log(`// ${p.name}'s magnet expired`);
        }, pu.type.dur);
        if (!p.isIt) {
            // Repel: push IT away from this player
            p.magnetRepel = true;
            setTimeout(() => { p.magnetRepel = false; }, pu.type.dur);
        }
    }

    // ── BOMB: instantly drains 25 HP from ALL other players ──
    if (pu.type.id === 'bomb') {
        sfxEliminate();
        screenShake(500);
        const others = gameState.players.filter(o => o.id !== p.id && !o.eliminated);
        others.forEach(other => {
            const dmg = 25;
            other.hp = Math.max(0, other.hp - dmg);
            flashHPLoss(other, dmg);
            spawnParticles(other.x + PW/2, other.y + PH/2, '#ff7700', 10);
            if (other.hp <= 0) {
                const aliveCount = gameState.players.filter(x => !x.eliminated).length;
                if (aliveCount > 2) eliminateByPoints(other);
                else other.hp = 1;
            }
        });
        // Bomb also gives collector a 15 HP boost
        p.hp = Math.min(100, p.hp + 15);
        flashHPGain(p, 15);
        renderHUD();
    }

    // ── SHOT: fires a projectile that tags the nearest enemy — also deals 20 HP damage on hit ──
    if (pu.type.id === 'shot') {
        p.hasShot = true;
        p.shotDmg = 20; // extra HP damage on hit
        // Auto-fire toward nearest player
        setTimeout(() => { if (p.hasShot) fireShot(p); }, 150);
    }

    // ── DECOY: leaves a fake copy — draws IT toward it; decoy absorbs one tag ──
    if (pu.type.id === 'decoy') {
        spawnDecoy(p);
    }

    // ── HP PACK (new): straight-up restores 30 HP ──
    if (pu.type.id === 'hppack') {
        const restore = 30;
        p.hp = Math.min(100, p.hp + restore);
        flashHPGain(p, restore);
        renderHUD();
    }

    // ── SPEED BOOST: temporarily increases movement speed by 50% ──
    if (pu.type.id === 'speed') {
        p._speedMult = 1.6;
        if (pel) pel.style.outline = '2px solid #44ffcc';
        clearTimeout(p._timers.speed);
        p._timers.speed = setTimeout(() => {
            p._speedMult = 1;
            if (pel) pel.style.outline = '';
            log(`// ${p.name}'s speed boost expired`);
        }, pu.type.dur);
    }

    // ── SWAP: teleport-swap positions with the nearest other player ──
    if (pu.type.id === 'swap') {
        const others = gameState.players.filter(o => o.id !== p.id && !o.eliminated);
        if (others.length === 0) return;
        const nearest = others.reduce((a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b);
        // Swap positions
        const tx = nearest.x, ty = nearest.y;
        nearest.x = p.x; nearest.y = p.y;
        p.x = tx; p.y = ty;
        // Update DOM
        const pel2 = document.getElementById('player_' + nearest.id);
        if (pel)  { pel.style.left  = p.x + 'px'; pel.style.top  = p.y + 'px'; }
        if (pel2) { pel2.style.left = nearest.x + 'px'; pel2.style.top = nearest.y + 'px'; }
        spawnParticles(p.x + PW/2, p.y + PH/2, PLAYER_COLORS[p.colorIdx].bg, 12);
        spawnParticles(nearest.x + PW/2, nearest.y + PH/2, PLAYER_COLORS[nearest.colorIdx].bg, 12);
        screenShake(200);
        playTone(660, 'square', 0.12, 0.3);
        playTone(880, 'square', 0.1, 0.2, 0.1);
        log(`// 🔀 ${p.name} SWAPPED WITH ${nearest.name}!`);
    }

    // ── LEECH: drain HP from nearest player for duration ──
    if (pu.type.id === 'leech') {
        p.leeching = true;
        if (pel) pel.style.filter = 'drop-shadow(0 0 8px #ff4477)';
        clearTimeout(p._timers.leech);
        p._timers.leech = setTimeout(() => {
            p.leeching = false;
            if (pel) pel.style.filter = '';
            log(`// ${p.name}'s leech expired`);
        }, pu.type.dur);
    }

    // ── OVERCLOCK: doubles HP gain rate for duration ──
    if (pu.type.id === 'overclock') {
        p.overclocked = true;
        if (pel) { pel.style.outline = '2px solid #ffcc00'; }
        clearTimeout(p._timers.overclock);
        p._timers.overclock = setTimeout(() => {
            p.overclocked = false;
            if (pel) pel.style.outline = '';
            log(`// ${p.name}'s overclock expired`);
        }, pu.type.dur);
    }
}

// ============================================
// KILL FEED
// ============================================
function addKillFeed(tagger, tagged, verb) {
    const kf = document.getElementById('kill-feed');
    if (!kf) return;
    const tc = PLAYER_COLORS[tagger.colorIdx].bg, dc = PLAYER_COLORS[tagged.colorIdx].bg;
    const e = document.createElement('div');
    e.className = 'kf-entry';
    e.style.borderColor = tc;
    e.innerHTML = `<span style="color:${tc}">${tagger.name}</span><span style="color:#444"> ${verb} </span><span style="color:${dc}">${tagged.name}</span>`;
    kf.appendChild(e);
    if (kf.children.length > 6) kf.firstChild.remove();
    setTimeout(() => e.remove(), 3000);
}

function showStreakPopup(msg, color) {
    const el = document.createElement('div');
    el.className = 'streak-pop';
    el.style.color = color;
    el.style.top = '28%';
    el.textContent = msg;
    $('arena-inner').appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function screenShake(dur) {
    const w = $('arena-wrap');
    w.classList.add('shaking');
    setTimeout(() => w.classList.remove('shaking'), dur);
}

// ============================================
// WEATHER SYSTEM
// ============================================
const WEATHER_TYPES = [
    { id: 'rain', name: 'RAIN', effect: 'Slippery movement', friction: 0.7 },
    { id: 'fog', name: 'FOG', effect: 'Reduced visibility', visibility: 0.6 },
    { id: 'storm', name: 'STORM', effect: 'Lightning strikes', stun: true },
    { id: 'gravity', name: 'GRAVITY FLUX', effect: 'Unstable gravity', gravity: true }
];

function initWeather() {
    if (Math.random() > 0.6) return; // 40% chance for weather
    currentWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    log(`// WEATHER: ${currentWeather.name} INCOMING`);
    
    const weatherEl = document.createElement('div');
    weatherEl.id = 'weather-indicator';
    weatherEl.style.cssText = 'position:absolute;top:30px;right:60px;font-size:0.65rem;color:var(--warn);z-index:10;font-family:Orbitron;letter-spacing:0.1em;';
    weatherEl.textContent = `☁️ ${currentWeather.name}: ${currentWeather.effect}`;
    $('arena-inner').appendChild(weatherEl);
    
    if (currentWeather.id === 'storm') {
        weatherInterval = setInterval(strikeLightning, 2000);
    }
    if (currentWeather.id === 'fog') {
        $('arena-inner').classList.add('fog-effect');
    }
    if (currentWeather.id === 'rain') {
        spawnRain();
    }
}

function strikeLightning() {
    if (!gameState || !gameState.running) return;
    const arena = getArena();
    const strikex = Math.random() * arena.w;
    const strikey = Math.random() * arena.h;
    
    const bolt = document.createElement('div');
    bolt.style.cssText = `position:absolute;left:${strikex}px;top:${strikey}px;width:20px;height:80px;background:radial-gradient(circle,#ffff00,#fff,transparent);z-index:5;opacity:0.8;pointer-events:none;`;
    $('arena-inner').appendChild(bolt);
    
    sfxStrike();
    spawnParticles(strikex, strikey, '#ffff00', 10);
    screenShake(150);
    
    // Stun nearby players
    gameState.players.forEach(p => {
        if (p.eliminated) return;
        const dist = Math.hypot(p.x + PW/2 - strikex, p.y + PH/2 - strikey);
        if (dist < 100) {
            p.frozen = true;
            const el = document.getElementById('player_' + p.id);
            if (el) el.classList.add('frozen');
            setTimeout(() => {
                p.frozen = false;
                if (el) el.classList.remove('frozen');
            }, 1500);
        }
    });
    
    setTimeout(() => bolt.remove(), 200);
}

function sfxStrike() {
    playTone(200, 'sawtooth', 0.1, 0.4);
    playTone(400, 'sawtooth', 0.15, 0.3, 0.08);
}

function spawnRain() {
    const arena = getArena();
    for (let i = 0; i < 15; i++) {
        const drop = document.createElement('div');
        drop.style.cssText = `position:absolute;left:${Math.random() * arena.w}px;top:${Math.random() * arena.h}px;width:2px;height:10px;background:#00ccff;opacity:0.6;`;
        $('arena-inner').appendChild(drop);
        
        let y = parseInt(drop.style.top);
        const tick = () => {
            y += 5;
            drop.style.top = y + 'px';
            if (y < arena.h) requestAnimationFrame(tick);
            else drop.remove();
        };
        tick();
    }
}

function clearWeather() {
    if (weatherInterval) clearInterval(weatherInterval);
    currentWeather = null;
    const indicator = document.getElementById('weather-indicator');
    if (indicator) indicator.remove();
    $('arena-inner').classList.remove('fog-effect');
}

// ============================================
// TIMER
// ============================================
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (paused || !gameState) return;
        gameState.timeLeft--;
        const m = Math.floor(gameState.timeLeft / 60), s = gameState.timeLeft % 60;
        $('timer-display').textContent = m + ':' + String(s).padStart(2, '0');
        if (gameState.timeLeft === 30 && !gameState.frenzy) startFrenzy();
        if (gameState.timeLeft <= 10) $('timer-display').style.color = '#ff2255';
        if (gameState.timeLeft <= 0) endGame();
    }, 1000);
}

function startFrenzy() {
    gameState.frenzy = true;
    sfxFrenzy();
    const fr = document.createElement('div');
    fr.className = 'frenzy-overlay';
    $('arena-inner').appendChild(fr);
    showBanner('⚡ FRENZY — FINAL 30s ⚡', '#ff2255');
    setTimeout(hideBanner, 2200);
    log('// !! FRENZY MODE — GLITCH RATE DOUBLED !!');
    if (gameState.pupsOn) {
        clearInterval(pickupInterval);
        pickupInterval = setInterval(spawnPickup, PICKUP_SPAWN / 2);
    }
}

// ============================================
// GLITCHES (12 unique events)
// ============================================
const GLITCHES = [
    () => {
        gameState.glitchInverted = true;
        showBanner('CONTROLS: INVERTED', '#ff2255');
        log('// AXIS FLIP');
        setTimeout(() => {
            gameState.glitchInverted = false;
            hideBanner();
        }, 3000);
    },
    () => {
        $('arena-inner').classList.add('flickering');
        showBanner('VISUAL: CORRUPTED', '#ffcc00');
        setTimeout(() => {
            $('arena-inner').classList.remove('flickering');
            hideBanner();
        }, 2000);
    },
    () => {
        $('arena-inner').classList.add('rgb-shift');
        showBanner('CHROMATIC: ABERRATION', '#cc44ff');
        setTimeout(() => {
            $('arena-inner').classList.remove('rgb-shift');
            hideBanner();
        }, 2200);
    },
    () => { // spawn obstacle
        const arena = getArena();
        const w = 30 + Math.random() * 75, h = 14 + Math.random() * 35;
        const o = { px: 0.05 + Math.random() * 0.7, py: 0.05 + Math.random() * 0.7, pw: w / arena.w, ph: h / arena.h };
        obstacles.push(o);
        const el = document.createElement('div');
        el.className = 'obstacle';
        el.id = 'obs_' + (obstacles.length - 1);
        posEl(el, o.px * arena.w, o.py * arena.h, o.pw * arena.w, o.ph * arena.h);
        $('arena-inner').appendChild(el);
        log('// OBSTACLE SPAWNED');
    },
    () => {
        if (obstacles.length > 2) {
            const i = Math.floor(Math.random() * obstacles.length);
            const el = document.getElementById('obs_' + i);
            if (el) el.remove();
            obstacles.splice(i, 1);
            log('// OBSTACLE REMOVED');
        }
    },
    () => { // teleport
        const arena = getArena();
        const p = gameState.players.filter(p => !p.eliminated)[Math.floor(Math.random() * gameState.players.length)];
        p.x = PW + Math.random() * (arena.w - PW * 3);
        p.y = PH + Math.random() * (arena.h - PH * 3);
        const el = document.getElementById('player_' + p.id);
        if (el) {
            el.style.left = p.x + 'px';
            el.style.top = p.y + 'px';
        }
        spawnParticles(p.x, p.y, '#ff7700', 8);
        showBanner(`${p.name}: TELEPORTED`, '#ff7700');
        setTimeout(hideBanner, 1400);
        screenShake(180);
    },
    () => { // speed boost on random player
        const p = gameState.players.filter(p => !p.eliminated)[Math.floor(Math.random() * gameState.players.length)];
        const el = document.getElementById('player_' + p.id);
        if (el) el.style.outline = '2px solid #44ffcc';
        p._speedMult = 2.2;
        showBanner(`${p.name}: OVERCLOCK`, '#44ffcc');
        setTimeout(() => {
            p._speedMult = 1;
            if (el) el.style.outline = '';
            hideBanner();
        }, 3000);
    },
    () => { // gravity drift
        showBanner('GRAVITY: INVERTED', '#cc44ff');
        const start = Date.now();
        const tick = () => {
            if (!gameState || !gameState.running || Date.now() - start > 2600) {
                hideBanner();
                return;
            }
            gameState.players.forEach(p => {
                if (p.eliminated) return;
                p.y = Math.max(0, p.y - 1.4);
                const el = document.getElementById('player_' + p.id);
                if (el) el.style.top = p.y + 'px';
            });
            requestAnimationFrame(tick);
        };
        tick();
    },
    () => { // swap all positions
        showBanner('POSITIONS: SHUFFLED', '#cc44ff');
        const ps = gameState.players.filter(p => !p.eliminated);
        const pos = ps.map(p => ({ x: p.x, y: p.y }));
        for (let i = pos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pos[i], pos[j]] = [pos[j], pos[i]];
        }
        ps.forEach((p, i) => {
            p.x = pos[i].x;
            p.y = pos[i].y;
            const el = document.getElementById('player_' + p.id);
            if (el) {
                el.style.left = p.x + 'px';
                el.style.top = p.y + 'px';
            }
        });
        screenShake(300);
        setTimeout(hideBanner, 1400);
    },
    () => { // random IT swap (classic only)
        if (gameState.mode !== 'classic' && gameState.mode !== 'potato') return;
        const runners = gameState.players.filter(p => !p.isIt && !p.eliminated);
        const itP = gameState.players.find(p => p.isIt);
        if (!runners.length || !itP) return;
        applyTag(runners[Math.floor(Math.random() * runners.length)].id, itP.id);
        showBanner('IT: RANDOMLY SWAPPED', '#ff2255');
        setTimeout(hideBanner, 1400);
    },
    () => { // mass speed
        showBanner('OVERDRIVE: ALL', '#44ffcc');
        gameState.players.forEach(p => { p._speedMult = 2.0; });
        setTimeout(() => {
            gameState.players.forEach(p => { p._speedMult = 1; });
            hideBanner();
        }, 2200);
    },
    () => { // horizontal mirror
        const arena = getArena();
        showBanner('MIRROR: FLIP', '#cc44ff');
        gameState.players.forEach(p => {
            if (p.eliminated) return;
            p.x = arena.w - PW - p.x;
            const el = document.getElementById('player_' + p.id);
            if (el) el.style.left = p.x + 'px';
        });
        screenShake(220);
        setTimeout(hideBanner, 1400);
    },
    () => { // arena zoom
        $('arena-wrap').classList.add('zoomed');
        setTimeout(() => $('arena-wrap').classList.remove('zoomed'), 400);
        showBanner('REALITY: DISTORTED', '#cc44ff');
        setTimeout(hideBanner, 1200);
    },
];

function scheduleGlitch() {
    if (glitchTimeout) clearTimeout(glitchTimeout);
    let delay = GLITCH_RATE[gameState.intensity] || 6500;
    if (gameState.frenzy) delay = Math.min(delay, 1600);
    const next = delay * 0.55 + Math.random() * delay * 0.9;
    glitchTimeout = setTimeout(() => {
        if (!gameState || !gameState.running || paused) {
            scheduleGlitch();
            return;
        }
        sfxGlitch();
        GLITCHES[Math.floor(Math.random() * GLITCHES.length)]();
        matchStats.glitches++;
        scheduleGlitch();
    }, next);
}

function showBanner(txt, color) {
    const gb = $('glitch-banner');
    gb.textContent = txt;
    gb.style.background = color || '#ff2255';
    gb.style.display = 'block';
}

function hideBanner() {
    const gb = $('glitch-banner');
    if (gb) gb.style.display = 'none';
}

function log(msg) {
    const el = $('glitch-log');
    if (el) el.textContent = msg;
}

// ============================================
// PAUSE / END
// ============================================
$('pause-btn').addEventListener('click', () => {
    paused = !paused;
    $('pause-btn').textContent = paused ? 'RESUME' : 'PAUSE';
    if (paused) log('// PAUSED');
    else {
        log('// RESUMED');
        scheduleGlitch();
    }
});

$('end-btn').addEventListener('click', endGame);

function endGame() {
    if (!gameState) return;
    gameState.running = false;
    clearTimers();
    if ($('arena-inner')) {
        $('arena-inner').classList.remove('flickering', 'rgb-shift');
    }
    // Save replay before results
    if (typeof saveReplay === 'function') saveReplay();
    showResults();
    // Award XP/coins & update challenges after results shown
    if (typeof awardMatchXP === 'function') {
        const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
        const result = awardMatchXP(sorted);
        if (result && result.earnedXP > 0) {
            log(`// +${result.earnedXP} XP · +${result.earnedCoins} 🪙 GLITCH COINS`);
        }
    }
    if (typeof dailyChallenges !== 'undefined') {
        dailyChallenges.updateProgress('rounds');
        if (matchStats.longestStreak >= 10) dailyChallenges.updateProgress('streak');
        if (matchStats.pickups >= 10) dailyChallenges.updateProgress('pickups_round', matchStats.pickups);
        if (gameState.mode === 'infection') {
            const alive = gameState.players.filter(p => !p.eliminated);
            if (alive.length >= 1) dailyChallenges.updateProgress('infection_wins');
        }
        if (gameState.mode === 'assassin') {
            const sorted2 = [...gameState.players].sort((a, b) => b.score - a.score);
            if (sorted2[0] && sorted2[0].tagsMade >= 5) dailyChallenges.updateProgress('assassin_tags', sorted2[0].tagsMade);
        }
        renderDailyChallenges();
    }
    if (typeof renderProfile === 'function') renderProfile();
    // Tournament advance
    if (window._tournamentMatchActive && typeof tournament !== 'undefined' && tournament && !tournament.done) {
        window._tournamentMatchActive = false;
        const sorted3 = [...gameState.players].sort((a, b) => b.score - a.score);
        setTimeout(() => {
            const match = tournament.getCurrentMatch();
            if (match) {
                const winnerIdx = sorted3[0] && match[0] && sorted3[0].id === match[0].id ? 0 : 1;
                tournament.advanceMatch(winnerIdx);
            }
        }, 500);
    }
}

// ============================================
// RESULTS + AWARDS
// ============================================
function showResults() {
    const alive = [...gameState.players].filter(p => !p.eliminated).sort((a, b) => b.hp - a.hp || b.score - a.score);
    const dead  = [...gameState.players].filter(p =>  p.eliminated).sort((a, b) => b.score - a.score);
    const sorted = [...alive, ...dead];
    const winner = sorted[0];

    // Session leaderboard
    sorted.forEach((p, i) => {
        const pts = Math.max(0, sorted.length - i);
        sessionLB[p.name] = (sessionLB[p.name] || 0) + pts;
    });

    // ── Winner celebration header ──
    const wc = PLAYER_COLORS[winner.colorIdx];
    $('winner-name-big').textContent = winner.name;
    $('winner-name-big').style.color = wc.bg;
    $('winner-name-big').style.textShadow = `0 0 30px ${wc.bg}`;

    const isTwoPlayer = sorted.length === 2;
    const reason = winner.eliminated ? 'SURVIVED LONGEST'
        : isTwoPlayer ? (winner.hp > sorted[1].hp ? 'MOST HP REMAINING' : 'TIME RAN OUT')
        : 'LAST STANDING';
    $('winner-subtitle').textContent = reason;

    const hpColor = winner.hp > 60 ? wc.bg : winner.hp > 30 ? '#ffcc00' : '#ff2255';
    $('winner-hp-display').innerHTML =
        `<span style="color:${hpColor};">${winner.hp}hp</span>` +
        `<span style="color:var(--muted);margin:0 0.4rem;">·</span>` +
        `<span style="color:var(--muted);">${winner.tagsMade} tags</span>` +
        `<span style="color:var(--muted);margin:0 0.4rem;">·</span>` +
        `<span style="color:var(--warn);">${winner.score} pts</span>`;

    // Crown emoji based on mode
    const crowns = { infection: '🧟', potato: '🥔', assassin: '🎯', koth: '⛰️', ctf: '🚩', team2v2: '🤝' };
    $('winner-crown').textContent = crowns[gameState.mode] || '👑';

    // Confetti burst
    spawnConfetti(wc.bg);

    // ── Standings list ──
    $('winner-list').innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    sorted.forEach((p, i) => {
        const c = PLAYER_COLORS[p.colorIdx];
        const row = document.createElement('div');
        row.className = 'winner-row' + (i === 0 ? ' gold' : '') + (p.eliminated ? ' eliminated-row' : '');
        if (i === 0) row.style.borderColor = c.bg;
        const hpCol = p.hp > 60 ? c.bg : p.hp > 30 ? '#ffcc00' : '#ff2255';
        const hpBarW = p.eliminated ? 0 : p.hp;
        row.innerHTML = `
          <span style="display:flex;align-items:center;gap:4px;">
            <span class="rank">${medals[i] || '#'+(i+1)}</span>
            <span style="color:${c.bg};font-weight:bold;">${p.name}</span>
            ${p.eliminated ? '<span style="font-size:0.42rem;color:#ff2255;border:1px solid #ff2255;border-radius:2px;padding:0 2px;">ELIM</span>' : ''}
          </span>
          <span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:64px;">
            <span style="font-size:0.6rem;color:${hpCol};">${p.hp}hp</span>
            <div style="width:60px;height:4px;background:var(--border);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${hpBarW}%;background:${hpCol};border-radius:2px;"></div>
            </div>
          </span>
          <div class="stats-mini" style="width:100%;flex-basis:100%;">
            <span>🏹 ${p.tagsMade} tags</span>
            <span>🎯 ${p.tagsTaken} caught</span>
            <span style="color:var(--muted);">${p.score} pts</span>
          </div>`;
        $('winner-list').appendChild(row);
    });

    // ── Awards ──
    const awards = [];
    const topTagger = sorted.reduce((a, b) => a.tagsMade > b.tagsMade ? a : b);
    if (topTagger.tagsMade > 0) awards.push(`🏹 HITMAN: ${topTagger.name}`);
    const mostCaught = sorted.reduce((a, b) => a.tagsTaken > b.tagsTaken ? a : b);
    if (mostCaught.tagsTaken > 0) awards.push(`🐢 SLOWPOKE: ${mostCaught.name}`);
    if (matchStats.longestStreak >= 3) awards.push(`🔥 STREAK ×${matchStats.longestStreak}`);
    if (matchStats.glitches >= 5) awards.push(`⚡ CHAOS: ${matchStats.glitches}`);
    $('award-row').innerHTML = awards.map(a => `<div class="award">${a}</div>`).join('');

    // ── XP + Coins earned display ──
    const rewardsEl = $('match-rewards');
    if (rewardsEl) {
        // awardMatchXP was already called in endGame — just display what was earned
        const xpEarned = Math.round(50 + winner.tagsMade * 15 + matchStats.pickups * 2);
        const coinsEarned = Math.round(winner.tagsMade * 3 + matchStats.pickups * 2 + 25);
        rewardsEl.innerHTML =
            `<span style="color:var(--accent);">+${xpEarned} XP</span>` +
            `<span style="color:var(--border);">|</span>` +
            `<span style="color:var(--warn);">+${coinsEarned} 🪙 COINS</span>` +
            (winner.tagsMade >= 5 ? `<span style="color:var(--border);">|</span><span style="color:var(--purp);">🔥 BONUS XP FOR 5+ TAGS</span>` : '');
    }

    // ── Match stats ──
    $('match-stats').innerHTML =
        `<span>Tags: <b>${matchStats.totalTags}</b></span>` +
        `<span>Glitches: <b>${matchStats.glitches}</b></span>` +
        `<span>Pickups: <b>${matchStats.pickups}</b></span>` +
        `<span>Best streak: <b>${matchStats.longestStreak}</b></span>`;

    // ── Achievements ──
    if (!tutorialMode) {
        const matchResults = {
            tags: winner.tagsMade || 0,
            longestStreak: matchStats.longestStreak,
            pickups: matchStats.pickups,
            mode: gameState.mode,
            survived: !winner.eliminated,
            won: true
        };
        const newAch = achievementSystem.checkAchievements(matchResults);
        if (newAch.length > 0) log(`// 🏆 UNLOCKED: ${newAch.join(', ')}`);
        achievementSystem.stats.totalTags += matchStats.totalTags;
        achievementSystem.stats.roundsPlayed++;
        achievementSystem.stats.pickupsCollected += matchStats.pickups;
        achievementSystem.save();
    }

    $('result-modal').style.display = 'flex';
}

// ── Confetti burst for winner ──
function spawnConfetti(winnerColor) {
    const wrap = $('confetti-canvas-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const colors = [winnerColor, '#ffcc00', '#00ff88', '#cc44ff', '#00ccff', '#ff2255', '#ffffff'];
    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 5 + Math.random() * 8;
        const startX = 10 + Math.random() * 80; // % from left
        const delay = Math.random() * 0.8;
        const dur = 1.2 + Math.random() * 1.2;
        const drift = (Math.random() - 0.5) * 200;
        piece.style.cssText = `
            position:absolute;
            left:${startX}%;
            top:-10px;
            width:${size}px;
            height:${size * 0.5}px;
            background:${color};
            border-radius:${Math.random() > 0.5 ? '50%' : '1px'};
            opacity:0;
            transform:rotate(${Math.random()*360}deg);
            animation: confetti-fall ${dur}s ${delay}s ease-in forwards;
            --drift: ${drift}px;
        `;
        wrap.appendChild(piece);
    }
    // Remove after animation
    setTimeout(() => { if (wrap) wrap.innerHTML = ''; }, 2500);
}

$('play-again-btn').addEventListener('click', () => {
    $('result-modal').style.display = 'none';
    const seed = Math.random();
    const mode = $('game-mode').value;
    const intensity = $('glitch-intensity').value;
    const dur = parseInt($('round-duration').value);
    const pups = $('powerup-setting').value === 'on';
    const theme = $('arena-theme').value;
    if (isHost && bc) bc.postMessage({ type: 'start', seed, mode, intensity, dur, pups, theme });
    startGame(seed, mode, intensity, dur, pups, theme);
});

$('back-lobby-btn').addEventListener('click', () => {
    $('result-modal').style.display = 'none';
    gameState = null;
    showScreen('lobby');
    $('timer-display').textContent = '—';
    $('timer-display').style.color = 'var(--warn)';
    $('combo-display').textContent = '';
    updateLobby();
});

// ============================================
// UTILS
// ============================================
const comboDisplay = $('combo-display');

function showScreen(n) {
    $('lobby-screen').className = 'screen' + (n === 'lobby' ? ' active' : '');
    $('game-screen').className = 'screen' + (n === 'game' ? ' active' : '');
    const emoteBtn = $('emote-toggle-btn');
    if (emoteBtn) emoteBtn.style.display = n === 'game' ? 'inline-block' : 'none';
    if (n !== 'game' && typeof exitSpectatorMode === 'function') exitSpectatorMode();
}

window.addEventListener('resize', () => {
    if (!gameState || !gameState.running) return;
    const arena = getArena();
    obstacles.forEach((o, i) => {
        const el = document.getElementById('obs_' + i);
        if (el) posEl(el, o.px * arena.w, o.py * arena.h, o.pw * arena.w, o.ph * arena.h);
    });
    zones.forEach((z, i) => {
        const el = document.getElementById('zone_' + i);
        if (el) posEl(el, z.px * arena.w, z.py * arena.h, z.pw * arena.w, z.ph * arena.h);
    });
    setupHeatmap();
});

// ============================================
// META PROGRESSION & PLAYER PROFILE
// ============================================
const RANKS = [
    { level: 1, name: 'ROOKIE', xpNeeded: 0 },
    { level: 5, name: 'RUNNER', xpNeeded: 1500 },
    { level: 10, name: 'CHASER', xpNeeded: 4000 },
    { level: 20, name: 'GHOST', xpNeeded: 9000 },
    { level: 30, name: 'GLITCH HUNTER', xpNeeded: 18000 },
    { level: 42, name: 'GLITCH MASTER', xpNeeded: 35000 },
    { level: 60, name: 'LEGEND', xpNeeded: 70000 },
    { level: 99, name: '∞ THE VOID', xpNeeded: 150000 },
];

class MetaProfile {
    constructor() {
        const saved = localStorage.getItem('glitch_tag_profile');
        const d = saved ? JSON.parse(saved) : {};
        this.xp = d.xp || 0;
        this.level = d.level || 1;
        this.coins = d.coins || 0;
        this.wins = d.wins || 0;
        this.totalTags = d.totalTags || 0;
        this.roundsPlayed = d.roundsPlayed || 0;
        this.unlockedTrails = d.unlockedTrails || ['default'];
        this.unlockedDeathAnims = d.unlockedDeathAnims || ['default'];
        this.selectedTrail = d.selectedTrail || 'default';
        this.selectedDeathAnim = d.selectedDeathAnim || 'default';
    }

    getRank() {
        let rank = RANKS[0];
        for (const r of RANKS) {
            if (this.xp >= r.xpNeeded) rank = r;
        }
        return rank;
    }

    getNextRankXP() {
        for (let i = 0; i < RANKS.length - 1; i++) {
            if (this.xp < RANKS[i + 1].xpNeeded) return RANKS[i + 1].xpNeeded;
        }
        return RANKS[RANKS.length - 1].xpNeeded;
    }

    addXP(amount) {
        this.xp += amount;
        this.level = this.getRank().level;
    }

    addCoins(amount) {
        this.coins += amount;
    }

    unlock(type, id) {
        if (type === 'trail' && !this.unlockedTrails.includes(id)) {
            this.unlockedTrails.push(id);
            return true;
        }
        if (type === 'death' && !this.unlockedDeathAnims.includes(id)) {
            this.unlockedDeathAnims.push(id);
            return true;
        }
        return false;
    }

    isUnlocked(type, id) {
        if (type === 'trail') return this.unlockedTrails.includes(id);
        if (type === 'death') return this.unlockedDeathAnims.includes(id);
        return id === 'default';
    }

    save() {
        localStorage.setItem('glitch_tag_profile', JSON.stringify({
            xp: this.xp, level: this.level, coins: this.coins,
            wins: this.wins, totalTags: this.totalTags, roundsPlayed: this.roundsPlayed,
            unlockedTrails: this.unlockedTrails, unlockedDeathAnims: this.unlockedDeathAnims,
            selectedTrail: this.selectedTrail, selectedDeathAnim: this.selectedDeathAnim
        }));
    }
}

let metaProfile = new MetaProfile();

function renderProfile() {
    const rank = metaProfile.getRank();
    const nextXP = metaProfile.getNextRankXP();
    const pct = Math.min(100, (metaProfile.xp / nextXP) * 100);
    if ($('profile-rank-badge')) $('profile-rank-badge').textContent = `LV.${metaProfile.level} ${rank.name}`;
    if ($('xp-bar')) $('xp-bar').style.width = pct + '%';
    if ($('xp-label')) $('xp-label').textContent = `${metaProfile.xp.toLocaleString()} / ${nextXP.toLocaleString()} XP`;
    if ($('stat-total-tags')) $('stat-total-tags').textContent = (metaProfile.totalTags + (achievementSystem.stats.totalTags || 0)).toLocaleString();
    if ($('stat-wins')) $('stat-wins').textContent = metaProfile.wins;
    if ($('stat-rounds')) $('stat-rounds').textContent = (metaProfile.roundsPlayed + (achievementSystem.stats.roundsPlayed || 0));
    if ($('stat-coins')) $('stat-coins').textContent = metaProfile.coins;
    if ($('skin-coins-display')) $('skin-coins-display').textContent = `💰 ${metaProfile.coins} GLITCH COINS`;
    
    // Update trail/death dropdowns to show locked/unlocked
    const trailSel = $('trail-select');
    if (trailSel) {
        Array.from(trailSel.options).forEach(opt => {
            if (opt.value !== 'default') {
                const unlocked = metaProfile.isUnlocked('trail', opt.value);
                opt.text = unlocked ? opt.text.replace(' 🔒', '') : opt.text.replace(' 🔒', '') + ' 🔒';
            }
        });
        trailSel.value = metaProfile.selectedTrail;
    }
}

function awardMatchXP(sorted) {
    // XP & coin rewards per match
    const rank1XP = 250, rankXP = 80, tagXP = 15, killXP = 10;
    let earnedXP = tagXP * (matchStats.totalTags || 0) + 50; // base
    let earnedCoins = Math.floor(matchStats.totalTags * 3 + matchStats.pickups * 2);
    if (sorted[0]) {
        earnedXP += rank1XP;
        earnedCoins += 25;
        metaProfile.wins++;
    }
    metaProfile.addXP(earnedXP);
    metaProfile.addCoins(earnedCoins);
    metaProfile.roundsPlayed++;
    metaProfile.totalTags += matchStats.totalTags || 0;
    metaProfile.save();
    renderProfile();
    return { earnedXP, earnedCoins };
}

// Unlock shop
if ($('unlock-btn')) {
    $('unlock-btn').addEventListener('click', () => {
        const trailVal = $('trail-select').value;
        const deathVal = $('death-anim-select').value;
        const trailOpt = $('trail-select').selectedOptions[0];
        const deathOpt = $('death-anim-select').selectedOptions[0];

        const trailCost = parseInt(trailOpt.dataset.cost || 0);
        const deathCost = parseInt(deathOpt.dataset.cost || 0);
        const msg = $('unlock-shop-msg');

        // Try trail
        if (trailVal !== 'default' && !metaProfile.isUnlocked('trail', trailVal)) {
            if (metaProfile.coins >= trailCost) {
                metaProfile.coins -= trailCost;
                metaProfile.unlock('trail', trailVal);
                metaProfile.save();
                msg.textContent = `✅ UNLOCKED ${trailVal.toUpperCase()} TRAIL!`;
                msg.style.color = 'var(--accent)';
                renderProfile();
            } else {
                msg.textContent = `❌ NOT ENOUGH COINS (need ${trailCost}, have ${metaProfile.coins})`;
                msg.style.color = 'var(--danger)';
            }
            return;
        }
        // Try death anim
        if (deathVal !== 'default' && !metaProfile.isUnlocked('death', deathVal)) {
            if (metaProfile.coins >= deathCost) {
                metaProfile.coins -= deathCost;
                metaProfile.unlock('death', deathVal);
                metaProfile.save();
                msg.textContent = `✅ UNLOCKED ${deathVal.toUpperCase()} DEATH ANIM!`;
                msg.style.color = 'var(--accent)';
                renderProfile();
            } else {
                msg.textContent = `❌ NOT ENOUGH COINS (need ${deathCost}, have ${metaProfile.coins})`;
                msg.style.color = 'var(--danger)';
            }
            return;
        }

        // Already unlocked - equip
        metaProfile.selectedTrail = trailVal;
        metaProfile.selectedDeathAnim = deathVal;
        metaProfile.save();
        msg.textContent = `✅ EQUIPPED!`;
        msg.style.color = 'var(--accent)';
    });
}

// ============================================
// DAILY CHALLENGES SYSTEM
// ============================================
const ALL_CHALLENGES = [
    { id: 'tag5_frozen', text: 'Tag 5 players while frozen enemies are present', type: 'tags', goal: 5, reward: 50 },
    { id: 'survive_infection', text: 'Survive as last survivor in Infection 3 times', type: 'infection_wins', goal: 3, reward: 100 },
    { id: 'collect10', text: 'Collect 10 powerups in one round', type: 'pickups_round', goal: 10, reward: 75 },
    { id: 'win_notit', text: 'Win a round without ever being IT', type: 'win_notit', goal: 1, reward: 80 },
    { id: 'streak10', text: 'Get a 10x streak in any mode', type: 'streak', goal: 10, reward: 150 },
    { id: 'play3', text: 'Play 3 rounds today', type: 'rounds', goal: 3, reward: 30 },
    { id: 'glitch5', text: 'Survive 5 glitch events in one round', type: 'glitches', goal: 5, reward: 60 },
    { id: 'tag_assassin', text: 'Win an Assassin round with 5+ tags', type: 'assassin_tags', goal: 5, reward: 120 },
];

class DailyChallengeSystem {
    constructor() {
        this.loadOrReset();
    }

    loadOrReset() {
        const saved = localStorage.getItem('glitch_daily_challenges');
        const today = new Date().toDateString();
        if (saved) {
            const d = JSON.parse(saved);
            if (d.date === today) {
                this.challenges = d.challenges;
                this.date = today;
                return;
            }
        }
        this.resetForToday();
    }

    resetForToday() {
        const today = new Date().toDateString();
        // Pick 3 challenges seeded by date
        const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const shuffled = [...ALL_CHALLENGES].sort((a, b) => {
            const h = x => ((seed ^ x.charCodeAt(0)) >>> 0);
            return h(a.id[0]) - h(b.id[0]);
        });
        this.challenges = shuffled.slice(0, 3).map(c => ({ ...c, progress: 0, done: false }));
        this.date = today;
        this.save();
    }

    updateProgress(type, amount = 1) {
        let changed = false;
        this.challenges.forEach(ch => {
            if (!ch.done && ch.type === type) {
                ch.progress = Math.min(ch.goal, ch.progress + amount);
                if (ch.progress >= ch.goal) {
                    ch.done = true;
                    metaProfile.addCoins(ch.reward);
                    metaProfile.save();
                    showBanner(`🎯 CHALLENGE DONE! +${ch.reward} COINS`, '#ffcc00');
                    setTimeout(hideBanner, 2500);
                }
                changed = true;
            }
        });
        if (changed) this.save();
    }

    save() {
        localStorage.setItem('glitch_daily_challenges', JSON.stringify({
            date: this.date,
            challenges: this.challenges
        }));
    }
}

let dailyChallenges = new DailyChallengeSystem();

function renderDailyChallenges() {
    const el = $('daily-challenges-display');
    if (!el) return;
    const done = dailyChallenges.challenges.filter(c => c.done).length;
    if ($('challenges-completed')) $('challenges-completed').textContent = `(${done}/3)`;
    el.innerHTML = dailyChallenges.challenges.map(c => `
        <div style="display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0; border-bottom:1px solid var(--border); font-size:0.6rem;">
            <span style="font-size:1rem;">${c.done ? '✅' : '🎯'}</span>
            <div style="flex:1;">
                <div style="${c.done ? 'color:var(--muted);text-decoration:line-through;' : ''}">${c.text}</div>
                <div style="font-size:0.52rem; color:var(--muted);">${c.progress}/${c.goal} · 💰 ${c.reward} coins</div>
            </div>
            <div style="width:60px; height:4px; background:var(--border); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${Math.min(100,(c.progress/c.goal)*100)}%; background:${c.done?'var(--accent)':'var(--warn)'}; border-radius:2px;"></div>
            </div>
        </div>
    `).join('');
}

// ============================================
// REPLAY SYSTEM
// ============================================
const REPLAY_MAX_FRAMES = 1800; // 30s @ 60fps
let replayBuffer = []; // circular buffer of game frames
let replayRecording = false;
let savedReplay = null;
let replayPlayback = { active: false, frameIdx: 0, speed: 1, interval: null };

function startReplayRecording() {
    replayBuffer = [];
    replayRecording = true;
}

function recordFrame() {
    if (!replayRecording || !gameState) return;
    const frame = {
        t: gameState.timeLeft,
        players: gameState.players.map(p => ({ id: p.id, x: p.x, y: p.y, isIt: p.isIt, eliminated: p.eliminated, name: p.name, colorIdx: p.colorIdx }))
    };
    replayBuffer.push(frame);
    if (replayBuffer.length > REPLAY_MAX_FRAMES) replayBuffer.shift();
}

function saveReplay() {
    savedReplay = {
        frames: [...replayBuffer],
        mode: gameState ? gameState.mode : 'classic',
        duration: gameState ? gameState.timeLeft : 0,
        players: gameState ? gameState.players.map(p => ({ name: p.name, colorIdx: p.colorIdx, id: p.id, score: p.score })) : [],
    };
}

function openReplayModal() {
    if (!savedReplay || savedReplay.frames.length === 0) {
        alert('No replay available yet. Play a round first!');
        return;
    }
    $('result-modal').style.display = 'none';
    $('replay-modal').style.display = 'flex';
    $('replay-info').textContent = `${savedReplay.mode.toUpperCase()} · ${savedReplay.frames.length} frames · ${savedReplay.players.length} players`;
    replayPlayback = { active: false, frameIdx: 0, speed: 1, interval: null };
    renderReplayFrame(0);
}

function renderReplayFrame(idx) {
    const miniArena = $('replay-arena-mini');
    if (!miniArena || !savedReplay) return;
    const frame = savedReplay.frames[Math.min(idx, savedReplay.frames.length - 1)];
    if (!frame) return;
    miniArena.innerHTML = '';
    const W = miniArena.offsetWidth || 480, H = miniArena.offsetHeight || 200;
    const scaleX = W / 820, scaleY = H / 512;
    frame.players.forEach(p => {
        if (p.eliminated) return;
        const c = PLAYER_COLORS[p.colorIdx];
        const dot = document.createElement('div');
        dot.style.cssText = `position:absolute;left:${p.x*scaleX}px;top:${p.y*scaleY}px;width:${PW*scaleX}px;height:${PH*scaleY}px;background:${c.bg};border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:${8*scaleX}px;color:${c.txt};box-shadow:${p.isIt?'0 0 8px '+c.bg:'none'};border:${p.isIt?'2px solid #fff':'none'};`;
        dot.textContent = p.name.slice(0, 2);
        miniArena.appendChild(dot);
    });
    const t = frame.t;
    $('replay-time-display').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}

function startReplayPlayback() {
    if (!savedReplay) return;
    replayPlayback.active = true;
    $('replay-play-btn').textContent = '⏸ PAUSE';
    if (replayPlayback.interval) clearInterval(replayPlayback.interval);
    replayPlayback.interval = setInterval(() => {
        if (!replayPlayback.active) return;
        replayPlayback.frameIdx += replayPlayback.speed;
        if (replayPlayback.frameIdx >= savedReplay.frames.length) {
            replayPlayback.frameIdx = savedReplay.frames.length - 1;
            replayPlayback.active = false;
            $('replay-play-btn').textContent = '▶ PLAY';
            clearInterval(replayPlayback.interval);
            return;
        }
        renderReplayFrame(Math.floor(replayPlayback.frameIdx));
    }, 1000 / 60);
}

function pauseReplayPlayback() {
    replayPlayback.active = false;
    $('replay-play-btn').textContent = '▶ PLAY';
    if (replayPlayback.interval) clearInterval(replayPlayback.interval);
}

if ($('replay-play-btn')) {
    $('replay-play-btn').addEventListener('click', () => {
        if (replayPlayback.active) pauseReplayPlayback();
        else startReplayPlayback();
    });
}
if ($('replay-rewind-btn')) {
    $('replay-rewind-btn').addEventListener('click', () => {
        pauseReplayPlayback();
        replayPlayback.frameIdx = 0;
        renderReplayFrame(0);
    });
}
if ($('replay-ff-btn')) {
    $('replay-ff-btn').addEventListener('click', () => {
        replayPlayback.speed = replayPlayback.speed === 1 ? 4 : 1;
        $('replay-speed-display').textContent = replayPlayback.speed + 'x';
        $('replay-ff-btn').textContent = replayPlayback.speed > 1 ? '⏩ FAST ✓' : '⏩ FAST';
    });
}
if ($('close-replay-btn')) {
    $('close-replay-btn').addEventListener('click', () => {
        pauseReplayPlayback();
        $('replay-modal').style.display = 'none';
    });
}
if ($('share-replay-btn')) {
    $('share-replay-btn').addEventListener('click', () => {
        // Encode replay as base64 code
        const code = btoa(JSON.stringify({ mode: savedReplay.mode, players: savedReplay.players.map(p => p.name), frames: savedReplay.frames.length })).slice(0, 16).toUpperCase();
        navigator.clipboard ? navigator.clipboard.writeText(code).then(() => {
            $('share-replay-btn').textContent = '✅ COPIED!';
            setTimeout(() => $('share-replay-btn').textContent = '📋 COPY CODE', 2000);
        }) : alert('Replay code: ' + code);
    });
}
if ($('watch-replay-btn')) {
    $('watch-replay-btn').addEventListener('click', openReplayModal);
}

// Hook replay into game loop
const _origUpdate = update;
const _origStartGame = startGame;

// Record frames during game loop
let _loopHooked = false;
function hookReplayIntoLoop() {
    if (_loopHooked) return;
    _loopHooked = true;
    const origLoop = loop;
    // We'll call recordFrame in the main loop instead by monkey-patching update
    const prevUpdate = window._replayPatchedUpdate;
    window._replayPatchedUpdate = true;
}

// ============================================
// SPECTATOR MODE
// ============================================
let spectatorActive = false;
let spectatorTargetIdx = -1; // -1 = free cam

function enterSpectatorMode(player) {
    spectatorActive = true;
    spectatorTargetIdx = 0;
    $('spectator-modal').style.display = 'flex';
    $('spectate-btn').style.display = 'none';
    updateSpectatorLabel();
}

function exitSpectatorMode() {
    spectatorActive = false;
    $('spectator-modal').style.display = 'none';
}

function updateSpectatorLabel() {
    if (!gameState) return;
    const alive = gameState.players.filter(p => !p.eliminated);
    if (spectatorTargetIdx < 0 || spectatorTargetIdx >= alive.length) {
        $('spec-target-name').textContent = 'FREE CAM';
        return;
    }
    const p = alive[spectatorTargetIdx];
    if (p) {
        const c = PLAYER_COLORS[p.colorIdx];
        $('spec-target-name').innerHTML = `<span style="color:${c.bg}">${p.name}</span>`;
    }
}

if ($('spec-prev-btn')) {
    $('spec-prev-btn').addEventListener('click', () => {
        if (!gameState) return;
        const alive = gameState.players.filter(p => !p.eliminated);
        spectatorTargetIdx = (spectatorTargetIdx - 1 + alive.length) % alive.length;
        updateSpectatorLabel();
    });
}
if ($('spec-next-btn')) {
    $('spec-next-btn').addEventListener('click', () => {
        if (!gameState) return;
        const alive = gameState.players.filter(p => !p.eliminated);
        spectatorTargetIdx = (spectatorTargetIdx + 1) % alive.length;
        updateSpectatorLabel();
    });
}
if ($('close-spec-btn')) {
    $('close-spec-btn').addEventListener('click', exitSpectatorMode);
}
if ($('spectate-btn')) {
    $('spectate-btn').addEventListener('click', () => enterSpectatorMode(null));
}

// Spectator follow cam
function applySpectatorCam() {
    if (!spectatorActive || !gameState) return;
    const alive = gameState.players.filter(p => !p.eliminated);
    if (alive.length === 0 || spectatorTargetIdx < 0) return;
    const target = alive[spectatorTargetIdx];
    if (!target) return;
    const arena = $('arena-inner');
    const wrap = $('arena-wrap');
    // Subtle highlight on the followed player
    gameState.players.forEach(p => {
        const el = document.getElementById('player_' + p.id);
        if (!el) return;
        if (p.id === target.id) el.style.outline = '3px solid #cc44ff';
        else el.style.outline = '';
    });
}

// ============================================
// VOICE LINES / TAUNTS / EMOTES
// ============================================
const VOICE_LINES = [
    { emote: '😱', text: "COME GET ME!", freq: [800, 600, 400], types: ['sine', 'sine', 'sine'] },
    { emote: '👑', text: "TOO SLOW!", freq: [900, 1200], types: ['square', 'sine'] },
    { emote: '🏃', text: "CATCH ME IF YOU CAN!", freq: [500, 700, 900], types: ['sine', 'sine', 'sine'] },
    { emote: '💀', text: "BOOM!", freq: [200, 150, 100], types: ['sawtooth', 'square', 'square'] },
    { emote: '🎯', text: "NICE TRY!", freq: [440, 554, 660], types: ['sine', 'sine', 'sine'] },
    { emote: '⚡', text: "GAME OVER!", freq: [880, 660, 440, 220], types: ['square', 'square', 'square', 'square'] },
];

let emotePanel = null;
let emoteVisible = false;

function showEmotePanel() {
    emoteVisible = !emoteVisible;
    const panel = $('emote-panel');
    if (panel) panel.style.display = emoteVisible ? 'block' : 'none';
}

function fireEmote(idx, player) {
    if (!gameState || !gameState.running) return;
    const vl = VOICE_LINES[idx];
    if (!vl) return;
    // Play voice-like tone sequence
    vl.freq.forEach((f, i) => {
        playTone(f, vl.types[i] || 'sine', 0.12, 0.25, i * 0.08);
    });
    // Show emote bubble on player
    const p = player || gameState.players.find(p => !p.ai);
    if (!p) return;
    const el = document.getElementById('player_' + p.id);
    if (!el) return;
    const bubble = document.createElement('div');
    bubble.style.cssText = `position:absolute;top:-26px;left:-4px;background:rgba(0,0,0,0.8);border:1px solid var(--purp);border-radius:6px;padding:2px 6px;font-size:0.9rem;white-space:nowrap;z-index:20;pointer-events:none;`;
    bubble.textContent = vl.emote + ' ' + vl.text;
    el.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2500);
    // Show in log
    log(`// ${p.name}: "${vl.text}"`);
    emoteVisible = false;
    const panel = $('emote-panel');
    if (panel) panel.style.display = 'none';
}

if ($('emote-toggle-btn')) {
    $('emote-toggle-btn').addEventListener('click', () => {
        if (!gameState || !gameState.running) return;
        showEmotePanel();
    });
}

document.querySelectorAll('.emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.emote);
        if (!gameState) return;
        const p = gameState.players.find(p => !p.ai && !p.eliminated);
        fireEmote(idx, p);
    });
});

// Tab key to toggle emote panel, 1-6 to fire
window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && gameState && gameState.running) {
        e.preventDefault();
        showEmotePanel();
    }
    if (emoteVisible && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const p = gameState && gameState.players.find(p => !p.ai && !p.eliminated);
        fireEmote(parseInt(e.key) - 1, p);
    }
});

// ============================================
// MUSIC SYSTEM (Procedural)
// ============================================
let musicInterval = null, musicNotes = [], musicBeat = 0;
let currentTrack = 'off';
let musicBeatInterval = null;

const MUSIC_SCALES = {
    chiptune: [220, 277, 330, 392, 440, 554, 659, 880],
    synthwave: [220, 247, 294, 330, 392, 440, 494, 588],
    glitch: [180, 240, 360, 480, 540, 720, 960, 1080],
};

function startMusic(track) {
    stopMusic();
    if (track === 'off') {
        $('music-track-name').textContent = 'OFF';
        return;
    }
    currentTrack = track;
    $('music-track-name').textContent = track.toUpperCase();
    const scale = MUSIC_SCALES[track] || MUSIC_SCALES.chiptune;
    let beat = 0;
    const bpm = track === 'synthwave' ? 120 : track === 'glitch' ? 160 : 140;
    const interval = Math.floor(60000 / bpm / 2);
    const patterns = {
        chiptune: [0, 2, 4, 2, 0, 4, 2, 0],
        synthwave: [0, 0, 4, 2, 5, 4, 2, 4],
        glitch: [0, 3, 7, 3, 0, 7, 3, 7],
    };
    const pat = patterns[track] || patterns.chiptune;
    musicBeatInterval = setInterval(() => {
        if (!soundEnabled) return;
        const noteIdx = pat[beat % pat.length];
        const freq = scale[noteIdx];
        const isFrenzy = gameState && gameState.frenzy;
        const vol = isFrenzy ? 0.08 : 0.04;
        const waveType = track === 'chiptune' ? 'square' : track === 'glitch' ? 'sawtooth' : 'sine';
        playTone(freq, waveType, 0.18, vol);
        // Bass on every other beat
        if (beat % 2 === 0) playTone(freq / 2, 'sine', 0.2, vol * 0.7);
        // Pulse particles on beat during frenzy
        if (isFrenzy && beat % 4 === 0 && gameState) {
            const rp = gameState.players[Math.floor(Math.random() * gameState.players.length)];
            if (rp) spawnParticles(rp.x, rp.y, PLAYER_COLORS[rp.colorIdx].bg, 3);
        }
        beat++;
    }, interval);
}

function stopMusic() {
    if (musicBeatInterval) clearInterval(musicBeatInterval);
    musicBeatInterval = null;
    currentTrack = 'off';
}

if ($('music-track-select')) {
    $('music-track-select').addEventListener('change', (e) => {
        startMusic(e.target.value);
    });
}
if ($('music-toggle-btn')) {
    $('music-toggle-btn').addEventListener('click', () => {
        if (currentTrack !== 'off') {
            stopMusic();
            $('music-track-name').textContent = 'OFF';
            $('music-track-select').value = 'off';
        } else {
            const track = $('music-track-select').value;
            if (track !== 'off') startMusic(track);
        }
    });
}

// ============================================
// JUMP PADS
// ============================================
let jumpPads = [];

function spawnJumpPads(rng) {
    jumpPads = [];
    const arena = getArena();
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
        const pad = {
            x: (0.1 + rng() * 0.8) * arena.w,
            y: (0.1 + rng() * 0.8) * arena.h,
            w: 36, h: 36,
            id: 'jpad_' + i,
            cooldowns: {},
        };
        jumpPads.push(pad);
        const el = document.createElement('div');
        el.id = pad.id;
        el.style.cssText = `position:absolute;left:${pad.x}px;top:${pad.y}px;width:${pad.w}px;height:${pad.h}px;background:rgba(0,255,136,0.15);border:2px solid var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;z-index:2;pointer-events:none;animation:jump-pad-pulse 1s infinite;`;
        el.textContent = '⬆';
        $('arena-inner').appendChild(el);
    }
}

function checkJumpPads() {
    if (!gameState) return;
    const now = Date.now();
    gameState.players.forEach(p => {
        if (p.eliminated) return;
        jumpPads.forEach(pad => {
            if (now - (pad.cooldowns[p.id] || 0) < 800) return;
            if (Math.abs(p.x + PW/2 - pad.x - pad.w/2) < pad.w/2 + PW/2 &&
                Math.abs(p.y + PH/2 - pad.y - pad.h/2) < pad.h/2 + PH/2) {
                // Bounce!
                pad.cooldowns[p.id] = now;
                const arena = getArena();
                const bx = Math.random() > 0.5 ? -1 : 1;
                const by = Math.random() > 0.5 ? -1 : 1;
                p.x = Math.max(0, Math.min(arena.w - PW, p.x + bx * 80 + (Math.random() - 0.5) * 60));
                p.y = Math.max(0, Math.min(arena.h - PH, p.y + by * 80 + (Math.random() - 0.5) * 60));
                p.momentum = { x: bx * SPEED * 4, y: by * SPEED * 4 };
                const el = document.getElementById('player_' + p.id);
                if (el) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; }
                spawnParticles(p.x + PW/2, p.y + PH/2, '#00ff88', 8);
                playTone(1200, 'sine', 0.12, 0.3);
                playTone(1600, 'sine', 0.08, 0.2, 0.08);
                screenShake(100);
                log(`// ${p.name} BOUNCED OFF JUMP PAD!`);
            }
        });
    });
}

// ============================================
// MAP EDITOR
// ============================================
let customMaps = {};
let currentCustomMap = null;
let mapEditorTool = 'obstacle';
let mapEditorDrawing = false;
let mapEditorStartPos = null;
let mapEditorPreviewEl = null;
let mapEditorElements = []; // {type, x, y, w, h}

function loadCustomMaps() {
    const saved = localStorage.getItem('glitch_custom_maps');
    customMaps = saved ? JSON.parse(saved) : {};
    renderMapSlotList();
}

function renderMapSlotList() {
    const el = $('map-slot-list');
    if (!el) return;
    const keys = Object.keys(customMaps);
    if (!keys.length) { el.textContent = 'No saved maps'; return; }
    el.innerHTML = keys.map(k => `<span style="cursor:pointer;color:var(--accent);margin-right:0.5rem;" class="map-slot-item" data-key="${k}">📦 ${k}</span>`).join('');
    el.querySelectorAll('.map-slot-item').forEach(item => {
        item.addEventListener('click', () => {
            currentCustomMap = customMaps[item.dataset.key];
            log(`// MAP LOADED: ${item.dataset.key}`);
            item.style.color = 'var(--warn)';
        });
    });
}

if ($('map-editor-btn')) {
    $('map-editor-btn').addEventListener('click', () => {
        $('map-editor-modal').style.display = 'flex';
        setupMapEditorArena();
    });
}
if ($('close-map-editor-btn')) {
    $('close-map-editor-btn').addEventListener('click', () => $('map-editor-modal').style.display = 'none');
}
if ($('map-save-btn')) {
    $('map-save-btn').addEventListener('click', () => {
        const name = ($('map-name-input').value.trim().toUpperCase() || 'MAP_' + Date.now());
        customMaps[name] = { elements: mapEditorElements.slice() };
        localStorage.setItem('glitch_custom_maps', JSON.stringify(customMaps));
        currentCustomMap = customMaps[name];
        renderMapSlotList();
        log(`// MAP SAVED: ${name}`);
        $('map-editor-modal').style.display = 'none';
    });
}
if ($('map-use-btn')) {
    $('map-use-btn').addEventListener('click', () => {
        currentCustomMap = { elements: mapEditorElements.slice() };
        $('map-editor-modal').style.display = 'none';
        log(`// CUSTOM MAP ACTIVE — START GAME TO PLAY IT`);
    });
}
if ($('map-clear-btn')) {
    $('map-clear-btn').addEventListener('click', () => {
        currentCustomMap = null;
        mapEditorElements = [];
        setupMapEditorArena();
        log(`// CUSTOM MAP CLEARED`);
    });
}
if ($('map-load-btn')) {
    $('map-load-btn').addEventListener('click', () => {
        $('map-editor-modal').style.display = 'flex';
        setupMapEditorArena();
    });
}

document.querySelectorAll('.map-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        mapEditorTool = btn.dataset.tool;
        document.querySelectorAll('.map-tool-btn').forEach(b => b.classList.remove('btn-accent'));
        btn.classList.add('btn-accent');
    });
});

function setupMapEditorArena() {
    const arena = $('map-editor-arena');
    if (!arena) return;
    arena.innerHTML = '';
    // Redraw existing elements
    mapEditorElements.forEach((elem, i) => renderMapEditorElement(elem, i));
    arena.addEventListener('mousedown', startMapDraw);
    arena.addEventListener('mousemove', continueMapDraw);
    arena.addEventListener('mouseup', endMapDraw);
}

function getEditorPos(e) {
    const arena = $('map-editor-arena');
    if (!arena) return { x: 0, y: 0 };
    const rect = arena.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startMapDraw(e) {
    if (mapEditorTool === 'erase') {
        // Find element at click and remove
        const pos = getEditorPos(e);
        mapEditorElements = mapEditorElements.filter(el => {
            return !(pos.x >= el.x && pos.x <= el.x + el.w && pos.y >= el.y && pos.y <= el.y + el.h);
        });
        setupMapEditorArena();
        return;
    }
    mapEditorDrawing = true;
    mapEditorStartPos = getEditorPos(e);
    // Create preview element
    mapEditorPreviewEl = document.createElement('div');
    mapEditorPreviewEl.id = 'map-editor-preview';
    mapEditorPreviewEl.style.cssText = getMapToolStyle(mapEditorTool);
    mapEditorPreviewEl.style.left = mapEditorStartPos.x + 'px';
    mapEditorPreviewEl.style.top = mapEditorStartPos.y + 'px';
    $('map-editor-arena').appendChild(mapEditorPreviewEl);
}

function continueMapDraw(e) {
    if (!mapEditorDrawing || !mapEditorPreviewEl) return;
    const pos = getEditorPos(e);
    const x = Math.min(pos.x, mapEditorStartPos.x);
    const y = Math.min(pos.y, mapEditorStartPos.y);
    const w = Math.abs(pos.x - mapEditorStartPos.x);
    const h = Math.abs(pos.y - mapEditorStartPos.y);
    mapEditorPreviewEl.style.left = x + 'px';
    mapEditorPreviewEl.style.top = y + 'px';
    mapEditorPreviewEl.style.width = Math.max(10, w) + 'px';
    mapEditorPreviewEl.style.height = Math.max(10, h) + 'px';
}

function endMapDraw(e) {
    if (!mapEditorDrawing) return;
    mapEditorDrawing = false;
    if (!mapEditorPreviewEl) return;
    const pos = getEditorPos(e);
    const x = Math.min(pos.x, mapEditorStartPos.x);
    const y = Math.min(pos.y, mapEditorStartPos.y);
    const w = Math.max(10, Math.abs(pos.x - mapEditorStartPos.x));
    const h = Math.max(10, Math.abs(pos.y - mapEditorStartPos.y));
    if (w > 8 && h > 8) {
        mapEditorElements.push({ type: mapEditorTool, x, y, w, h });
    }
    mapEditorPreviewEl.remove();
    mapEditorPreviewEl = null;
    setupMapEditorArena();
}

function getMapToolStyle(tool) {
    const styles = {
        obstacle: 'position:absolute;background:#1a1a2e;border:2px solid #353560;border-radius:3px;',
        'zone-boost': 'position:absolute;background:rgba(68,255,204,0.15);border:1px solid #44ffcc;border-radius:4px;',
        'zone-slow': 'position:absolute;background:rgba(255,204,0,0.15);border:1px solid #ffcc00;border-radius:4px;',
        'zone-danger': 'position:absolute;background:rgba(255,34,85,0.15);border:1px solid #ff2255;border-radius:4px;',
    };
    return styles[tool] || styles.obstacle;
}

function renderMapEditorElement(elem, i) {
    const arena = $('map-editor-arena');
    if (!arena) return;
    const el = document.createElement('div');
    el.style.cssText = getMapToolStyle(elem.type);
    el.style.left = elem.x + 'px';
    el.style.top = elem.y + 'px';
    el.style.width = elem.w + 'px';
    el.style.height = elem.h + 'px';
    el.style.cursor = 'pointer';
    el.title = elem.type + ' — click to erase';
    arena.appendChild(el);
}

function applyCustomMap() {
    if (!currentCustomMap || !currentCustomMap.elements) return;
    const arena = getArena();
    const editorW = 640, editorH = 260; // map editor canvas size
    const scaleX = arena.w / editorW;
    const scaleY = arena.h / editorH;
    currentCustomMap.elements.forEach(elem => {
        if (elem.type === 'obstacle') {
            obstacles.push({
                px: (elem.x * scaleX) / arena.w,
                py: (elem.y * scaleY) / arena.h,
                pw: (elem.w * scaleX) / arena.w,
                ph: (elem.h * scaleY) / arena.h,
            });
        } else if (elem.type.startsWith('zone-')) {
            const zoneType = elem.type.replace('zone-', '');
            zones.push({
                px: (elem.x * scaleX) / arena.w,
                py: (elem.y * scaleY) / arena.h,
                pw: (elem.w * scaleX) / arena.w,
                ph: (elem.h * scaleY) / arena.h,
                type: zoneType,
            });
        }
    });
}

// ============================================
// TOURNAMENT MODE
// ============================================
let tournament = null;

class Tournament {
    constructor(playersList) {
        this.players = [...playersList].slice(0, 8);
        // Pad to 8 with bots if needed
        while (this.players.length < 4) {
            const names = ['VOLT', 'NEXUS', 'ECHO', 'CIPHER'];
            this.players.push({ name: names[this.players.length], scheme: 'ai', net: false, id: 'ai_t_' + this.players.length, ai: true, aiDifficulty: 'medium' });
        }
        // Build bracket (single elimination)
        this.bracket = [];
        const n = Math.pow(2, Math.ceil(Math.log2(this.players.length)));
        const padded = [...this.players];
        while (padded.length < n) padded.push(null); // byes
        this.bracket.push(padded);
        this.currentRound = 0;
        this.currentMatch = 0;
        this.results = [];
        this.done = false;
        this.winner = null;
    }

    getCurrentMatch() {
        const round = this.bracket[this.currentRound];
        if (!round) return null;
        const i = this.currentMatch * 2;
        return [round[i], round[i + 1]];
    }

    advanceMatch(winnerIdx) {
        const round = this.bracket[this.currentRound];
        const i = this.currentMatch * 2;
        const winner = round[winnerIdx === 0 ? i : i + 1];
        this.results.push({ round: this.currentRound, match: this.currentMatch, winner });
        this.currentMatch++;
        if (this.currentMatch * 2 >= round.length) {
            // Next round
            const nextRound = this.results.filter(r => r.round === this.currentRound).map(r => r.winner);
            if (nextRound.length === 1) {
                this.done = true;
                this.winner = nextRound[0];
            } else {
                this.bracket.push(nextRound);
                this.currentRound++;
                this.currentMatch = 0;
            }
        }
        renderTournamentBracket();
    }
}

function renderTournamentBracket() {
    const el = $('tournament-bracket');
    if (!el || !tournament) return;
    el.style.display = 'block';
    el.innerHTML = '';
    tournament.bracket.forEach((round, ri) => {
        const roundDiv = document.createElement('div');
        roundDiv.style.cssText = 'display:flex;gap:0.3rem;margin-bottom:0.4rem;align-items:center;flex-wrap:wrap;';
        const label = document.createElement('span');
        label.style.cssText = 'font-size:0.52rem;color:var(--muted);min-width:48px;font-family:Orbitron;';
        label.textContent = ri === 0 ? 'ROUND 1' : ri === tournament.bracket.length - 1 ? 'FINAL' : `ROUND ${ri + 1}`;
        roundDiv.appendChild(label);
        for (let i = 0; i < round.length; i += 2) {
            const p1 = round[i], p2 = round[i + 1];
            const matchDiv = document.createElement('div');
            const isCurrentMatch = ri === tournament.currentRound && Math.floor(i / 2) === tournament.currentMatch;
            matchDiv.style.cssText = `display:flex;gap:3px;background:${isCurrentMatch ? 'rgba(0,255,136,0.08)' : 'var(--surface)'};border:1px solid ${isCurrentMatch ? 'var(--accent)' : 'var(--border)'};border-radius:4px;padding:2px 5px;font-size:0.55rem;`;
            const won = tournament.results.find(r => r.round === ri && r.match === Math.floor(i / 2));
            const p1style = won && won.winner && p1 && won.winner.id === p1.id ? 'color:var(--accent);font-weight:bold;' : '';
            const p2style = won && won.winner && p2 && won.winner.id === p2.id ? 'color:var(--accent);font-weight:bold;' : '';
            matchDiv.innerHTML = `<span style="${p1style}">${p1 ? p1.name : 'BYE'}</span><span style="color:var(--muted)"> vs </span><span style="${p2style}">${p2 ? p2.name : 'BYE'}</span>`;
            roundDiv.appendChild(matchDiv);
        }
        el.appendChild(roundDiv);
    });
    if (tournament.done && tournament.winner) {
        const winDiv = document.createElement('div');
        winDiv.style.cssText = 'font-family:Orbitron;font-size:0.75rem;color:var(--warn);text-align:center;padding:0.4rem;border:1px solid var(--warn);border-radius:4px;';
        winDiv.textContent = `🏆 TOURNAMENT WINNER: ${tournament.winner.name}`;
        el.appendChild(winDiv);
        $('tournament-start-btn').textContent = 'TOURNAMENT DONE';
        $('tournament-start-btn').disabled = true;
        $('tournament-reset-btn').style.display = 'block';
    }
}

if ($('tournament-start-btn')) {
    $('tournament-start-btn').addEventListener('click', () => {
        const all = [...players, ...Object.values(netPlayers)];
        if (all.length < 2) {
            alert('Add at least 2 players to start a tournament!');
            return;
        }
        tournament = new Tournament(all);
        renderTournamentBracket();
        $('tournament-start-btn').textContent = 'PLAY NEXT MATCH';
        $('tournament-start-btn').onclick = playNextTournamentMatch;
        $('tournament-reset-btn').style.display = 'block';
    });
}
if ($('tournament-reset-btn')) {
    $('tournament-reset-btn').addEventListener('click', () => {
        tournament = null;
        if ($('tournament-bracket')) $('tournament-bracket').style.display = 'none';
        const btn = $('tournament-start-btn');
        if (btn) { btn.textContent = '🏆 START TOURNAMENT'; btn.disabled = false; btn.onclick = null; }
        $('tournament-reset-btn').style.display = 'none';
    });
}

function playNextTournamentMatch() {
    if (!tournament || tournament.done) return;
    const match = tournament.getCurrentMatch();
    if (!match || !match[0] || !match[1]) {
        tournament.advanceMatch(0); // auto-advance bye
        return;
    }
    // Set up players for this match
    players = [match[0], match[1]];
    const seed = Math.random();
    const mode = $('game-mode').value;
    const intensity = $('glitch-intensity').value;
    const dur = parseInt($('round-duration').value);
    // Start game, when done advance tournament
    startGame(seed, mode, intensity, dur, true, $('arena-theme').value);
    // Hook into endGame to detect winner
    window._tournamentMatchActive = true;
}

// ============================================
// EASTER EGGS
// ============================================
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;
let secretClickCount = 0;

window.addEventListener('keydown', (e) => {
    if (e.key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
            konamiIdx = 0;
            activateDevRoom();
        }
    } else {
        konamiIdx = 0;
    }
});

// Click on title 7 times for secret
const mainTitle = $('main-title');
if (mainTitle) {
    mainTitle.addEventListener('click', () => {
        secretClickCount++;
        if (secretClickCount === 7) {
            secretClickCount = 0;
            activateGoldenMode();
        }
    });
}

function activateDevRoom() {
    const modal = $('easter-egg-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    $('easter-egg-content').innerHTML = `
        <div style="color:var(--accent);">SECRET ACHIEVEMENT UNLOCKED: KONAMI MASTER 🎮</div>
        <br>
        <div>You found the developer room. Rewards:</div>
        <br>
        <div>• +500 Glitch Coins added to your wallet</div>
        <div>• All trails temporarily unlocked</div>
        <div>• Secret "VOID" color scheme active</div>
        <div>• ∞ LEGEND rank preview</div>
        <br>
        <div style="color:var(--danger);">THIS MESSAGE WILL SELF-DESTRUCT... just kidding.</div>
    `;
    metaProfile.addCoins(500);
    metaProfile.save();
    renderProfile();
    achievementSystem.unlock('chaos_master');
    playTone(440, 'sine', 0.5, 0.3);
    playTone(554, 'sine', 0.5, 0.3, 0.1);
    playTone(659, 'sine', 0.5, 0.3, 0.2);
    playTone(880, 'sine', 0.5, 0.4, 0.3);
    if ($('close-easter-egg-btn')) $('close-easter-egg-btn').addEventListener('click', () => { modal.style.display = 'none'; });
}

function activateGoldenMode() {
    // Rare golden powerup spawn trigger + XP bonus
    metaProfile.addXP(999);
    metaProfile.addCoins(100);
    metaProfile.save();
    renderProfile();
    log('// 🌟 SECRET: GOLDEN MODE ACTIVATED — BONUS XP & COINS');
    showBanner('🌟 GOLDEN MODE UNLOCKED!', '#ffcc00');
    setTimeout(hideBanner, 3000);
    // Flash title gold
    const title = $('main-title');
    if (title) {
        const orig = title.style.color;
        title.style.color = '#ffcc00';
        title.style.textShadow = '0 0 30px rgba(255,204,0,0.8)';
        setTimeout(() => { title.style.color = ''; title.style.textShadow = ''; }, 3000);
    }
}


// ============================================
// CSS for Jump Pads & New Features
// ============================================
const jumpPadStyle = document.createElement('style');
jumpPadStyle.textContent = `
@keyframes jump-pad-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(0,255,136,0.4); }
    50% { box-shadow: 0 0 20px rgba(0,255,136,0.8); transform: scale(1.05); }
}
`;
document.head.appendChild(jumpPadStyle);

// ============================================
// BOOT
// ============================================
loadGraphicsSettings();
loadCustomMaps();
renderProfile();
renderDailyChallenges();
updateLobby();
startTitleGlitch();