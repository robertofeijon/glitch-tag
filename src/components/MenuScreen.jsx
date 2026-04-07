import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CHARACTER_TYPES, MODE_META } from '../constants/game';
import { AudioPanel } from './AudioPanel';

export function MenuScreen({
  settings,
  updateSettings,
  activateAudio,
  importTrack,
  gameSettings,
  setGameSettings,
  mapsCatalog,
}) {
  const navigate = useNavigate();
  const isClassicPrecision = gameSettings.mode === 'classic' && (gameSettings.classicProfile || 'precision') === 'precision';
  const totalPlayers = Number(gameSettings.playerCount) || 0;
  const botPlayers = Math.min(Number(gameSettings.aiBots) || 0, Math.max(0, totalPlayers - 1));
  const humanPlayers = Math.max(0, totalPlayers - botPlayers);
  const [flashModeId, setFlashModeId] = useState(null);
  const flashTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
  }, []);

  const handleModeSelect = (id) => {
    setGameSettings((prev) => ({ ...prev, mode: id }));
    setFlashModeId(id);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = setTimeout(() => setFlashModeId(null), 260);
  };

  const startMode = () => {
    activateAudio();
    navigate('/game');
  };

  return (
    <main className="layout">
      <section className="hero panel menu-shell">
        <div className="menu-topline">
          <span>GLITCH TAG // COMMAND DECK</span>
          <span>PEAK BUILD</span>
        </div>
        <p className="eyebrow">Arena Setup</p>
        <h1>Choose mode, tune rules, then launch the arena.</h1>
        <p className="menu-description">{MODE_META[gameSettings.mode].desc}</p>
        <div className="menu-meta-strip" aria-hidden="true">
          <span>SECTOR: NEO-ARENA</span>
          <span>BUILD: LIVE</span>
          <span>SYNC: STABLE</span>
        </div>
        <div className="menu-separator" aria-hidden="true" />

        <div className="menu-section-title">Mode Select</div>
        <div className="menu-block mode-block">
          <div className="mode-grid">
            {Object.entries(MODE_META).map(([id, meta]) => (
              <button
                key={id}
                className={`mode-card ${gameSettings.mode === id ? 'active' : ''} ${flashModeId === id ? 'flash' : ''}`}
                onClick={() => handleModeSelect(id)}
              >
                <h4>{meta.title}</h4>
                <p>{meta.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="menu-section-title">Rules And Systems</div>
        <p className="setup-counter">{totalPlayers} total / {botPlayers} bots / {humanPlayers} humans</p>
        <div className="menu-config">
          <label>
            Players
            <select
              value={gameSettings.playerCount}
              onChange={(event) => setGameSettings((prev) => {
                const nextCount = Number(event.target.value);
                return { ...prev, playerCount: nextCount, aiBots: Math.min(prev.aiBots, nextCount - 1) };
              })}
            >
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
              <option value={5}>5 Players</option>
              <option value={6}>6 Players</option>
              <option value={7}>7 Players</option>
              <option value={8}>8 Players</option>
            </select>
          </label>

          <label>
            AI Bots
            <select
              value={gameSettings.aiBots}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, aiBots: Math.min(Number(event.target.value), prev.playerCount - 1) }))}
            >
              {Array.from({ length: Math.max(1, gameSettings.playerCount) }, (_, i) => i)
                .filter((count) => count <= gameSettings.playerCount - 1)
                .map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
            </select>
          </label>

          <label>
            Bot Personality
            <select
              value={gameSettings.botPersonality}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, botPersonality: event.target.value }))}
            >
              <option value="aggressive">Aggressive</option>
              <option value="evasive">Evasive</option>
              <option value="support">Support</option>
            </select>
          </label>

          {gameSettings.mode === 'team' && (
            <label>
              Team Profile
              <select
                value={gameSettings.teamProfile || 'defensive'}
                onChange={(event) => setGameSettings((prev) => ({ ...prev, teamProfile: event.target.value }))}
              >
                <option value="defensive">Defensive and Positional</option>
                <option value="rush">Objective Rush and High Pressure</option>
                <option value="botplay">Bot Teamplay Focus</option>
              </select>
            </label>
          )}

          {gameSettings.mode === 'classic' && (
            <label>
              Classic Profile
              <select
                value={gameSettings.classicProfile || 'precision'}
                onChange={(event) => setGameSettings((prev) => {
                  const nextProfile = event.target.value;
                  if (nextProfile === 'precision') {
                    return { ...prev, classicProfile: nextProfile, playerCount: 2, aiBots: Math.min(prev.aiBots, 1) };
                  }
                  return { ...prev, classicProfile: nextProfile };
                })}
              >
                <option value="precision">Precision Competitive</option>
                <option value="chaos">Chaotic Pressure</option>
                <option value="stalker">Positional Mindgame</option>
              </select>
            </label>
          )}

          <label>
            Aggressive Skill
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={gameSettings.aiSkillAggressive}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, aiSkillAggressive: Number(event.target.value) }))}
            />
          </label>

          <label>
            Evasive Skill
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={gameSettings.aiSkillEvasive}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, aiSkillEvasive: Number(event.target.value) }))}
            />
          </label>

          <label>
            Support Skill
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={gameSettings.aiSkillSupport}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, aiSkillSupport: Number(event.target.value) }))}
            />
          </label>

          <label>
            Duration
            <select
              value={gameSettings.duration}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, duration: Number(event.target.value) }))}
            >
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={180}>3 min</option>
              <option value={300}>5 min</option>
            </select>
          </label>

          <label>
            Map
            <select
              value={gameSettings.mapId}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, mapId: event.target.value }))}
            >
              {Object.entries(mapsCatalog).map(([id, map]) => (
                <option key={id} value={id}>{map.label}</option>
              ))}
            </select>
          </label>

          <label>
            Round Modifier
            <select
              value={gameSettings.roundModifier}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, roundModifier: event.target.value }))}
            >
              <option value="random">Random</option>
              <option value="lowgravity">Low Gravity</option>
              <option value="speedstorm">Speed Storm</option>
              <option value="hazardsurge">Hazard Surge</option>
            </select>
          </label>

          <label>
            Speed
            <input
              type="range"
              min="180"
              max="360"
              step="10"
              value={gameSettings.speed}
              onChange={(event) => setGameSettings((prev) => ({ ...prev, speed: Number(event.target.value) }))}
            />
          </label>

          <button
            className={`chip ${gameSettings.powerups ? 'on' : ''}`}
            onClick={() => setGameSettings((prev) => ({ ...prev, powerups: !prev.powerups }))}
          >
            Powerups {gameSettings.powerups ? 'On' : 'Off'}
          </button>
        </div>

        <div className="menu-separator" aria-hidden="true" />

        <div className="menu-section-title">Operator Archetypes</div>
        <div className="archetype-strip">
          {Object.values(CHARACTER_TYPES).map((type) => (
            <article key={type.label}>
              <h4>{type.label}</h4>
              <p>SPD {Math.round(type.speedMul * 100)}% · HP {Math.round(type.hpMul * 100)}%</p>
            </article>
          ))}
        </div>

        <div className="cta-row launch-bar">
          <span className="launch-hint">Press launch to deploy into the arena</span>
          <button className="cta" onClick={startMode}>Start {MODE_META[gameSettings.mode].title}</button>
          <Link className="ghost" to="/editor">Map Editor</Link>
          <Link className="ghost" to="/">Back</Link>
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
