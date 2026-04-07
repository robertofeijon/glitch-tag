import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AudioPanel } from './AudioPanel';

const PRESET_SLOTS_KEY = 'glitch-react-competitive-presets-v1';

const DEFAULT_GAME_SETTINGS = {
  duration: 120,
  speed: 260,
  roundModifier: 'random',
  powerups: true,
  maxHp: 100,
  itDrainTick: 3,
  runnerRecoveryTick: 1,
  recoveryRequiresPriorIt: true,
  antiSnowball: false,
  antiSnowballBoost: 0.45,
};

function loadPresetSlots() {
  const defaults = [
    { id: 'duel', name: 'Duel', rules: null },
    { id: 'scrim', name: 'Scrim', rules: null },
    { id: 'chaos-cup', name: 'Chaos Cup', rules: null },
  ];

  try {
    const raw = localStorage.getItem(PRESET_SLOTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return defaults;
    return defaults.map((slot, index) => ({
      ...slot,
      ...(parsed[index] || {}),
    }));
  } catch {
    return defaults;
  }
}

export function SettingsScreen({
  settings,
  updateSettings,
  activateAudio,
  importTrack,
  gameSettings,
  setGameSettings,
}) {
  const [presetSlots, setPresetSlots] = useState(loadPresetSlots);

  const currentRules = useMemo(() => ({
    maxHp: gameSettings.maxHp ?? 100,
    itDrainTick: gameSettings.itDrainTick ?? 3,
    runnerRecoveryTick: gameSettings.runnerRecoveryTick ?? 1,
    recoveryRequiresPriorIt: gameSettings.recoveryRequiresPriorIt ?? true,
    antiSnowball: gameSettings.antiSnowball ?? false,
    antiSnowballBoost: gameSettings.antiSnowballBoost ?? 0.45,
  }), [gameSettings]);

  const savePresetSlots = (nextSlots) => {
    setPresetSlots(nextSlots);
    localStorage.setItem(PRESET_SLOTS_KEY, JSON.stringify(nextSlots));
  };

  const saveToSlot = (slotId) => {
    const nextSlots = presetSlots.map((slot) => (
      slot.id === slotId ? { ...slot, rules: { ...currentRules } } : slot
    ));
    savePresetSlots(nextSlots);
  };

  const loadFromSlot = (slotId) => {
    const slot = presetSlots.find((item) => item.id === slotId);
    if (!slot?.rules) return;
    setGameSettings((prev) => ({ ...prev, ...slot.rules }));
  };

  const renameSlot = (slotId) => {
    const slot = presetSlots.find((item) => item.id === slotId);
    const currentName = slot?.name || 'Preset';
    const nextName = window.prompt('Rename preset slot', currentName);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;

    const nextSlots = presetSlots.map((item) => (
      item.id === slotId ? { ...item, name: trimmed.slice(0, 24) } : item
    ));
    savePresetSlots(nextSlots);
  };

  const resetGameplayDefaults = () => {
    setGameSettings((prev) => ({
      ...prev,
      ...DEFAULT_GAME_SETTINGS,
    }));
  };

  const applyCompetitivePreset = () => {
    setGameSettings((prev) => ({
      ...prev,
      maxHp: 100,
      itDrainTick: 2.6,
      runnerRecoveryTick: 0.8,
      recoveryRequiresPriorIt: true,
      antiSnowball: false,
      antiSnowballBoost: 0.45,
    }));
  };

  return (
    <main className="layout">
      <section className="hero panel menu-shell">
        <div className="menu-topline">
          <span>SYSTEM PANEL</span>
          <span>SETTINGS</span>
        </div>
        <p className="eyebrow">Configure Audio and Default Match Rules</p>
        <h1>Game Settings</h1>
        <p className="menu-description">
          Tune your audio mix and set global defaults for new matches.
        </p>

        <div className="menu-separator" aria-hidden="true" />

        <div className="menu-section-title">Gameplay Defaults</div>
        <div className="menu-config simple-config">
          <label>
            Default Duration
            <select
              value={gameSettings.duration}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, duration: Number(event.target.value) }))}
            >
              <option value={60}>60 seconds</option>
              <option value={120}>2 minutes</option>
              <option value={180}>3 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </label>

          <label>
            Default Speed
            <select
              value={gameSettings.speed}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, speed: Number(event.target.value) }))}
            >
              <option value={200}>Slow</option>
              <option value={260}>Balanced</option>
              <option value={320}>Fast</option>
            </select>
          </label>

          <label>
            Round Modifier
            <select
              value={gameSettings.roundModifier}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, roundModifier: event.target.value }))}
            >
              <option value="random">Random</option>
              <option value="none">None</option>
              <option value="lowgravity">Low Gravity</option>
              <option value="speedstorm">Speed Storm</option>
              <option value="hazardsurge">Hazard Surge</option>
            </select>
          </label>

          <label>
            Powerups
            <select
              value={gameSettings.powerups ? 'on' : 'off'}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, powerups: event.target.value === 'on' }))}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label>
            Max HP
            <input
              type="number"
              min="40"
              max="300"
              step="5"
              value={gameSettings.maxHp ?? 100}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, maxHp: Math.max(40, Number(event.target.value) || 100) }))}
            />
          </label>

          <label>
            IT Drain Tick (HP/s)
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={gameSettings.itDrainTick ?? 3}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, itDrainTick: Math.max(0, Number(event.target.value) || 0) }))}
            />
          </label>

          <label>
            Non-IT Recovery Tick (HP/s)
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={gameSettings.runnerRecoveryTick ?? 1}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, runnerRecoveryTick: Math.max(0, Number(event.target.value) || 0) }))}
            />
          </label>

          <label>
            Recovery Rule
            <select
              value={(gameSettings.recoveryRequiresPriorIt ?? true) ? 'prior-it' : 'all-non-it'}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, recoveryRequiresPriorIt: event.target.value === 'prior-it' }))}
            >
              <option value="prior-it">Only players who were IT before</option>
              <option value="all-non-it">All non-IT players</option>
            </select>
          </label>

          <label>
            Anti-Snowball Catch-up
            <select
              value={gameSettings.antiSnowball ? 'on' : 'off'}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, antiSnowball: event.target.value === 'on' }))}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>

          <label>
            Catch-up Boost (HP/s)
            <input
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={gameSettings.antiSnowballBoost ?? 0.45}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, antiSnowballBoost: Math.max(0, Number(event.target.value) || 0) }))}
            />
          </label>
        </div>

        <div className="menu-section-title">Competitive Preset Slots</div>
        <div className="preset-slot-grid">
          {presetSlots.map((slot) => (
            <article key={slot.id} className="preset-slot-card">
              <h4>{slot.name}</h4>
              <p>{slot.rules ? `HP ${slot.rules.maxHp} | IT ${slot.rules.itDrainTick}/s | REC ${slot.rules.runnerRecoveryTick}/s` : 'Empty slot'}</p>
              <div className="chip-stack">
                <button className="chip" onClick={() => saveToSlot(slot.id)}>Save</button>
                <button className="chip" onClick={() => loadFromSlot(slot.id)} disabled={!slot.rules}>Load</button>
                <button className="chip" onClick={() => renameSlot(slot.id)}>Rename</button>
              </div>
            </article>
          ))}
        </div>

        <div className="launch-bar settings-actions">
          <button className="cta secondary" onClick={applyCompetitivePreset}>Recommended Competitive Preset</button>
          <button className="cta secondary" onClick={resetGameplayDefaults}>Reset Gameplay Defaults</button>
          <Link className="cta" to="/">Back To Main Menu</Link>
        </div>
      </section>

      <AudioPanel
        settings={settings}
        updateSettings={updateSettings}
        activateAudio={activateAudio}
        importTrack={importTrack}
      />
    </main>
  );
}
