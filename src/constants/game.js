export const MODE_META = {
  classic: {
    title: 'Classic Tag',
    desc: 'One player is IT and drains faster. Tag to pass pressure.',
  },
  team: {
    title: 'Team Clash 2v2',
    desc: 'Two teams battle for control. Objective captures grant shared team score.',
  },
  tournament: {
    title: 'Tournament',
    desc: 'Best of 3 rounds. Highest HP each round gets the point.',
  },
  custom: {
    title: 'Custom',
    desc: 'Tune timer, speed, and powerups for your own arena rules.',
  },
};

export const CONTROL_SCHEMES = [
  { name: 'WASD + F', up: 'w', down: 's', left: 'a', right: 'd', ability: 'f' },
  { name: 'Arrows + /', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', ability: '/' },
  { name: 'IJKL + P', up: 'i', down: 'k', left: 'j', right: 'l', ability: 'p' },
  { name: 'Numpad + 0', up: '8', down: '5', left: '4', right: '6', ability: '0' },
  { name: 'TFGH + R', up: 't', down: 'g', left: 'f', right: 'h', ability: 'r' },
  { name: 'YUHJ + U', up: 'y', down: 'h', left: 'u', right: 'j', ability: 'u' },
  { name: 'O K L ; + ]', up: 'o', down: 'l', left: 'k', right: ';', ability: ']' },
  { name: 'Keypad 8456 + 7', up: 'numpad8', down: 'numpad5', left: 'numpad4', right: 'numpad6', ability: 'numpad7' },
];

export const PLAYER_COLORS = ['#56bfff', '#ff9156', '#7aff9f', '#f6ff7a', '#ff75b8', '#a48bff', '#79ffe7', '#ffcf72'];

export const CHARACTER_TYPES = {
  sprinter: {
    label: 'Sprinter',
    speedMul: 1.12,
    hpMul: 0.94,
    drainMul: 1.02,
    shape: 'diamond',
    ability: { name: 'Dash Burst', cooldown: 6.5 },
  },
  sentinel: {
    label: 'Sentinel',
    speedMul: 0.95,
    hpMul: 1.12,
    drainMul: 0.88,
    shape: 'square',
    ability: { name: 'Shield Pulse', cooldown: 9 },
  },
  trickster: {
    label: 'Trickster',
    speedMul: 1.04,
    hpMul: 1.0,
    drainMul: 1.0,
    shape: 'hex',
    ability: { name: 'Blink Warp', cooldown: 8 },
  },
  balanced: {
    label: 'Balanced',
    speedMul: 1.0,
    hpMul: 1.0,
    drainMul: 1.0,
    shape: 'circle',
    ability: { name: 'Nano Repair', cooldown: 10 },
  },
};

export const MAP_PRESETS = {
  core: {
    label: 'Core Grid',
    obstacles: [
      { id: 'o1', x: 205, y: 140, w: 88, h: 48 },
      { id: 'o2', x: 395, y: 140, w: 88, h: 48 },
      { id: 'o3', x: 205, y: 280, w: 88, h: 48 },
      { id: 'o4', x: 395, y: 280, w: 88, h: 48 },
      { id: 'm1', x: 300, y: 210, w: 40, h: 40, motion: { axis: 'x', amplitude: 55, speed: 1.6 } },
    ],
    zones: [
      { id: 'z1', type: 'boost', x: 90, y: 90, r: 26 },
      { id: 'z2', type: 'slow', x: 510, y: 310, r: 30 },
    ],
    hazards: [
      { id: 'h1', x: 320, y: 210, length: 130, width: 8, speed: 1.2 },
    ],
  },
  maze: {
    label: 'Neon Maze',
    obstacles: [
      { id: 'o1', x: 150, y: 95, w: 40, h: 220 },
      { id: 'o2', x: 300, y: 40, w: 40, h: 180 },
      { id: 'o3', x: 300, y: 255, w: 40, h: 150 },
      { id: 'o4', x: 450, y: 95, w: 40, h: 220 },
    ],
    zones: [
      { id: 'z1', type: 'slow', x: 320, y: 220, r: 34 },
      { id: 'z2', type: 'boost', x: 510, y: 80, r: 24 },
    ],
    hazards: [
      { id: 'h1', x: 320, y: 215, length: 96, width: 8, speed: -1.45 },
    ],
  },
  ring: {
    label: 'Ring Clash',
    obstacles: [
      { id: 'o1', x: 280, y: 140, w: 80, h: 40 },
      { id: 'o2', x: 280, y: 250, w: 80, h: 40 },
      { id: 'o3', x: 220, y: 180, w: 40, h: 70 },
      { id: 'o4', x: 380, y: 180, w: 40, h: 70 },
    ],
    zones: [
      { id: 'z1', type: 'boost', x: 320, y: 215, r: 42 },
      { id: 'z2', type: 'slow', x: 100, y: 330, r: 26 },
    ],
    hazards: [
      { id: 'h1', x: 320, y: 215, length: 160, width: 10, speed: 0.8 },
      { id: 'h2', x: 320, y: 215, length: 96, width: 8, speed: -1.25, offset: 1.2 },
    ],
  },
};

export function createInitialPlayers(playerCount, options = {}) {
  const { aiBots = 0, botPersonality = 'aggressive', aiSkills = {}, mode = 'classic' } = options;
  const base = Array.from({ length: playerCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / playerCount;
    const radiusX = 250;
    const radiusY = 150;
    return {
      x: Math.round(320 + Math.cos(angle) * radiusX),
      y: Math.round(210 + Math.sin(angle) * radiusY),
    };
  });

  const archetypeIds = Object.keys(CHARACTER_TYPES);
  const botStart = Math.max(0, playerCount - aiBots);

  return Array.from({ length: playerCount }, (_, i) => {
    const archetypeId = archetypeIds[i % archetypeIds.length];
    const archetype = CHARACTER_TYPES[archetypeId];
    const isBot = i >= botStart;

    return {
      id: `p${i + 1}`,
      name: isBot ? `BOT${i - botStart + 1}` : `P${i + 1}`,
      x: base[i].x,
      y: base[i].y,
      vx: 0,
      vy: 0,
      hp: Math.round(100 * archetype.hpMul),
      score: 0,
      isIt: i === 0,
      tagCd: 0,
      speedUntil: 0,
      dashUntil: 0,
      shieldUntil: 0,
      abilityCd: 0,
      abilityHintUntil: 0,
      botSkill: isBot ? (aiSkills[botPersonality] ?? 65) : 0,
      botNextThink: 0,
      botGoalX: 0,
      botGoalY: 0,
      isBot,
      botPersonality,
      team: mode === 'team' ? (i % 2 === 0 ? 'alpha' : 'beta') : null,
      eliminated: false,
      controls: CONTROL_SCHEMES[i % CONTROL_SCHEMES.length],
      archetypeId,
      maxHp: Math.round(100 * archetype.hpMul),
      shape: archetype.shape,
    };
  });
}

export function getArchetypeById(id) {
  return CHARACTER_TYPES[id] || CHARACTER_TYPES.balanced;
}
