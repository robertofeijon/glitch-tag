import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODE_META, PLAYER_COLORS, getArchetypeById } from '../constants/game';
import { SOUNDTRACKS } from '../data/soundtracks';
import { useGameEngine } from '../hooks/useGameEngine';

const LEADERBOARD_KEY = 'glitch-react-leaderboard-v1';

function TeamHudMinimap({ players, objective }) {
  const width = 160;
  const height = 104;
  const sx = width / 640;
  const sy = height / 420;

  return (
    <div className="team-minimap">
      <div className="team-minimap-title">TEAM TACTICAL MAP</div>
      <div className="team-minimap-stage" style={{ width, height }}>
        {objective && (
          <div
            className="team-dot objective"
            style={{ left: objective.x * sx, top: objective.y * sy }}
          />
        )}
        {players.map((player) => (
          <div
            key={player.id}
            className={`team-dot ${player.team === 'alpha' ? 'ally' : 'enemy'} ${player.isIt ? 'it' : ''}`}
            style={{ left: player.x * sx, top: player.y * sy }}
            title={`${player.name} ${player.team ? `(${player.team})` : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

function formatModifiers(modifiers) {
  return [modifiers?.primary?.label, modifiers?.secondary?.label].filter(Boolean).join(' + ') || 'Normal';
}

function getWinnerSummary(view, gameSettings) {
  const players = [...(view.players || [])];
  const topTagger = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
  const survivor = [...players].sort((a, b) => (b.hp || 0) - (a.hp || 0))[0] || null;

  if (gameSettings.mode === 'team') {
    const winnerTeam = (view.winnerText || '').toLowerCase().includes('alpha') ? 'Alpha' : 'Beta';
    const teamPlayers = players.filter((p) => (winnerTeam === 'Alpha' ? p.team === 'alpha' : p.team === 'beta'));
    const mvp = [...teamPlayers].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || teamPlayers[0] || topTagger;
    return { mvp, topTagger, survivor, winnerTeam };
  }

  const mvp = [...players].sort((a, b) => ((b.score || 0) + (b.hp || 0) * 0.08) - ((a.score || 0) + (a.hp || 0) * 0.08))[0] || null;
  return { mvp, topTagger, survivor, winnerTeam: null };
}

function getPlayerColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export function GameScreen({ settings, updateSettings, activateAudio, importTrack, gameSettings, mapsCatalog }) {
  const navigate = useNavigate();
  const [rematchToken, setRematchToken] = useState(0);
  const [rematchCountdown, setRematchCountdown] = useState(null);
  const [showMiniSettings, setShowMiniSettings] = useState(false);
  const [summaryCopyState, setSummaryCopyState] = useState('');
  const savedResultRef = useRef(false);
  const [runtimeRules, setRuntimeRules] = useState(() => ({
    maxHp: gameSettings.maxHp ?? 100,
    itDrainTick: gameSettings.itDrainTick ?? 3,
    runnerRecoveryTick: gameSettings.runnerRecoveryTick ?? 1,
    powerups: gameSettings.powerups ?? true,
    antiSnowball: gameSettings.antiSnowball ?? false,
    antiSnowballBoost: gameSettings.antiSnowballBoost ?? 0.45,
    // UI / tuning options
    badgeItText: 'YOU — IT',
    badgeTaggedText: 'TAGGED',
    badgeLocalOnly: false,
    animIntensity: 1.0, // scale 0.5 - 2
    animSpeed: 1.0, // speed multiplier
    botAggressiveness: 50, // 0-100
    localPlayerId: null, // explicit local player selection
  }));
  const view = useGameEngine(gameSettings, mapsCatalog, rematchToken, runtimeRules, showMiniSettings);
  const arenaRef = useRef(null);
  const [arenaSize, setArenaSize] = useState({ width: 640, height: 420 });

  useEffect(() => {
    setRuntimeRules({
      maxHp: gameSettings.maxHp ?? 100,
      itDrainTick: gameSettings.itDrainTick ?? 3,
      runnerRecoveryTick: gameSettings.runnerRecoveryTick ?? 1,
      powerups: gameSettings.powerups ?? true,
      antiSnowball: gameSettings.antiSnowball ?? false,
      antiSnowballBoost: gameSettings.antiSnowballBoost ?? 0.45,
    });
  }, [gameSettings.maxHp, gameSettings.itDrainTick, gameSettings.runnerRecoveryTick, gameSettings.powerups, gameSettings.antiSnowball, gameSettings.antiSnowballBoost]);

  useEffect(() => {
    if (!arenaRef.current) return undefined;

    const arenaNode = arenaRef.current;
    const updateSize = () => {
      const rect = arenaNode.getBoundingClientRect();
      setArenaSize({ width: rect.width || 640, height: rect.height || 420 });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(arenaNode);
    return () => observer.disconnect();
  }, []);

  const sx = arenaSize.width / 640;
  const sy = arenaSize.height / 420;

  // apply CSS vars for animation intensity/speed
  useEffect(() => {
    const node = arenaRef.current;
    if (!node) return;
    node.style.setProperty('--anim-scale', String(runtimeRules.animIntensity || 1));
    node.style.setProperty('--anim-speed', String(runtimeRules.animSpeed || 1));
  }, [runtimeRules.animIntensity, runtimeRules.animSpeed]);

  const currentTrackName = useMemo(() => {
    const all = [...SOUNDTRACKS, ...(settings.customTracks || [])];
    return all.find((track) => track.id === settings.selectedTrack)?.name || 'Unknown';
  }, [settings]);

  const winSummary = useMemo(() => getWinnerSummary(view, gameSettings), [view, gameSettings]);
  const rulesSummary = useMemo(() => {
    const maxHp = runtimeRules.maxHp ?? 100;
    const itDrain = runtimeRules.itDrainTick ?? 3;
    const recover = runtimeRules.runnerRecoveryTick ?? 1;
    const recoveryRule = (gameSettings.recoveryRequiresPriorIt ?? true) ? 'prior-IT only' : 'all non-IT';
    const catchup = runtimeRules.antiSnowball ? ` | Catch-up +${runtimeRules.antiSnowballBoost}/s` : '';
    return `HP ${maxHp} | IT -${itDrain}/s | Recover +${recover}/s (${recoveryRule})${catchup}`;
  }, [runtimeRules, gameSettings.recoveryRequiresPriorIt]);

  const summaryText = useMemo(() => {
    const modeLabel = MODE_META[gameSettings.mode]?.title || gameSettings.mode;
    const lines = [
      'GLITCH TAG MATCH SUMMARY',
      `Winner: ${view.winnerText || 'N/A'}`,
      `Mode: ${modeLabel}`,
      `Duration: ${Math.max(0, Math.ceil(view.timeLeft))}s remaining`,
      `Rules: ${rulesSummary}`,
      'Top Players:',
    ];
    const topPlayers = [...(view.players || [])]
      .sort((a, b) => ((b.score || 0) - (a.score || 0)) || ((b.hp || 0) - (a.hp || 0)))
      .slice(0, 4)
      .map((player) => `${player.name} | Tags ${player.score || 0} | HP ${Math.round(player.hp || 0)}/${player.maxHp || 0}`);
    return [...lines, ...topPlayers].join('\n');
  }, [gameSettings.mode, view.winnerText, view.timeLeft, view.players, rulesSummary]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setSummaryCopyState('Copied');
      setTimeout(() => setSummaryCopyState(''), 1400);
    } catch {
      setSummaryCopyState('Copy failed');
      setTimeout(() => setSummaryCopyState(''), 1400);
    }
  };

  useEffect(() => {
    if (view.status !== 'finished') {
      savedResultRef.current = false;
      return;
    }

    if (savedResultRef.current) return;

    const winnerTeamKey = winSummary.winnerTeam === 'Alpha' ? 'alpha' : winSummary.winnerTeam === 'Beta' ? 'beta' : null;
    const winnerIds = new Set(
      winnerTeamKey
        ? view.players.filter((player) => player.team === winnerTeamKey).map((player) => player.id)
        : [winSummary.mvp?.id].filter(Boolean)
    );
    const winnerLabel = winnerTeamKey ? `Team ${winSummary.winnerTeam}` : (winSummary.mvp?.name || 'Unknown');
    const mode = gameSettings.mode;
    const profile = mode === 'classic'
      ? (gameSettings.classicProfile || 'precision')
      : mode === 'team'
        ? (gameSettings.teamProfile || 'defensive')
        : 'default';
    const bucketId = `${mode}:${profile}`;

    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const current = raw ? JSON.parse(raw) : { players: {}, matches: [], buckets: {} };
      const nextPlayers = { ...(current.players || {}) };
      const nextBuckets = { ...(current.buckets || {}) };
      const bucket = nextBuckets[bucketId] || {
        id: bucketId,
        mode,
        profile,
        label: `${mode.toUpperCase()} / ${profile.toUpperCase()}`,
        players: {},
      };
      const bucketPlayers = { ...(bucket.players || {}) };

      for (const player of view.players) {
        const prev = nextPlayers[player.name] || { name: player.name, wins: 0, tags: 0, games: 0 };
        nextPlayers[player.name] = {
          name: player.name,
          wins: prev.wins + (winnerIds.has(player.id) ? 1 : 0),
          tags: prev.tags + (player.score || 0),
          games: prev.games + 1,
        };

        const prevBucket = bucketPlayers[player.name] || { name: player.name, wins: 0, tags: 0, games: 0 };
        bucketPlayers[player.name] = {
          name: player.name,
          wins: prevBucket.wins + (winnerIds.has(player.id) ? 1 : 0),
          tags: prevBucket.tags + (player.score || 0),
          games: prevBucket.games + 1,
        };
      }

      nextBuckets[bucketId] = {
        ...bucket,
        players: bucketPlayers,
      };

      const nextMatches = [...(current.matches || []), {
        id: `${Date.now()}-${Math.random()}`,
        at: Date.now(),
        mode,
        profile,
        bucketId,
        winner: winnerLabel,
      }].slice(-40);

      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify({ players: nextPlayers, matches: nextMatches, buckets: nextBuckets }));
    } catch {
      // Ignore persistence failures and continue gameplay flow.
    }

    savedResultRef.current = true;
  }, [view.status, view.players, gameSettings.mode, gameSettings.classicProfile, gameSettings.teamProfile, winSummary]);

  useEffect(() => {
    if (rematchCountdown === null) return undefined;

    if (rematchCountdown <= 1) {
      const timer = setTimeout(() => {
        setRematchCountdown(null);
        setRematchToken((value) => value + 1);
      }, 620);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setRematchCountdown((value) => (value === null ? null : value - 1));
    }, 620);
    return () => clearTimeout(timer);
  }, [rematchCountdown]);

  const beginRematchCountdown = () => {
    if (rematchCountdown !== null) return;
    setRematchCountdown(3);
  };

  return (
    <main className="layout play-layout play-solo">
      <section className="panel game-panel">
        <div className="panel-head">
          <h3>{MODE_META[gameSettings.mode].title}</h3>
          <div className="chip-stack">
            <button className="chip" onClick={() => setShowMiniSettings((value) => !value)}>{showMiniSettings ? 'Resume' : 'Pause / Tuning'}</button>
            <button className="chip" onClick={() => navigate('/')}>Menu</button>
            <span className="chip">Track: {currentTrackName}</span>
          </div>
        </div>

        {showMiniSettings && (
          <div className="mini-settings-panel">
            <label>
              Max HP
              <input
                type="number"
                min="40"
                max="300"
                step="5"
                value={runtimeRules.maxHp}
                onChange={(event) => setRuntimeRules((prev) => ({ ...prev, maxHp: Math.max(40, Number(event.target.value) || 100) }))}
              />
            </label>
            <label>
              IT Tick
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={runtimeRules.itDrainTick}
                onChange={(event) => setRuntimeRules((prev) => ({ ...prev, itDrainTick: Math.max(0, Number(event.target.value) || 0) }))}
              />
            </label>
            <label>
              Recovery Tick
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={runtimeRules.runnerRecoveryTick}
                onChange={(event) => setRuntimeRules((prev) => ({ ...prev, runnerRecoveryTick: Math.max(0, Number(event.target.value) || 0) }))}
              />
            </label>
            <label>
              Powerups
              <select
                value={runtimeRules.powerups ? 'on' : 'off'}
                onChange={(event) => setRuntimeRules((prev) => ({ ...prev, powerups: event.target.value === 'on' }))}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label>
              Badge IT Text
              <input type="text" value={runtimeRules.badgeItText} onChange={(e) => setRuntimeRules((p) => ({ ...p, badgeItText: e.target.value }))} />
            </label>
            <label>
              Badge Tagged Text
              <input type="text" value={runtimeRules.badgeTaggedText} onChange={(e) => setRuntimeRules((p) => ({ ...p, badgeTaggedText: e.target.value }))} />
            </label>
            <label>
              Badge Local Only
              <input type="checkbox" checked={runtimeRules.badgeLocalOnly} onChange={(e) => setRuntimeRules((p) => ({ ...p, badgeLocalOnly: e.target.checked }))} />
            </label>
            <label>
              Animation Intensity (0.5-2)
              <input type="range" min="0.5" max="2" step="0.05" value={runtimeRules.animIntensity} onChange={(e) => setRuntimeRules((p) => ({ ...p, animIntensity: Number(e.target.value) }))} />
            </label>
            <label>
              Animation Speed (0.5-2)
              <input type="range" min="0.5" max="2" step="0.05" value={runtimeRules.animSpeed} onChange={(e) => setRuntimeRules((p) => ({ ...p, animSpeed: Number(e.target.value) }))} />
            </label>
            <label>
              Bot Aggressiveness (0-100)
              <input type="range" min="0" max="100" step="1" value={runtimeRules.botAggressiveness} onChange={(e) => setRuntimeRules((p) => ({ ...p, botAggressiveness: Number(e.target.value) }))} />
            </label>
            <label>
              Local Player
              <select value={runtimeRules.localPlayerId || ''} onChange={(e) => setRuntimeRules((p) => ({ ...p, localPlayerId: e.target.value || null }))}>
                <option value="">Auto (first human)</option>
                {view.players.map((player) => (
                  <option key={player.id} value={player.id}>{player.name} ({player.isBot ? 'Bot' : 'Human'})</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="hud-row">
          <strong>Round {view.round}</strong>
          <strong>{Math.max(0, Math.ceil(view.timeLeft))}s</strong>
          <strong>Map: {view.map?.label}</strong>
          <strong>Modifier: {formatModifiers(view.modifiers)}</strong>
          {gameSettings.mode === 'team' && (
            <strong>Team Score A {view.teamScores?.alpha || 0} : B {view.teamScores?.beta || 0}</strong>
          )}
          {gameSettings.mode === 'team' && (
            <strong>
              Focus: {gameSettings.teamProfile === 'rush'
                ? 'Objective Rush'
                : gameSettings.teamProfile === 'botplay'
                  ? 'Bot Teamplay'
                  : 'Defensive Positional'}
            </strong>
          )}
          {gameSettings.mode === 'classic' && (
            <strong>
              Focus: {gameSettings.classicProfile === 'chaos'
                ? 'Chaotic Pressure'
                : gameSettings.classicProfile === 'stalker'
                  ? 'Positional Mindgame'
                  : 'Precision Duel'}
            </strong>
          )}
          {view.nextGlitchIn !== null && view.nextGlitchIn !== undefined && (
            <strong>Glitch Pulse in {Math.ceil(view.nextGlitchIn)}s</strong>
          )}
          <strong>{rulesSummary}</strong>
          <strong>{view.winnerText || 'Fight'}</strong>
        </div>

        {gameSettings.mode === 'team' && (
          <TeamHudMinimap players={view.players} objective={view.objective} />
        )}

        <div className="arena" ref={arenaRef}>
          {view.map?.zones.map((zone) => (
            <div
              key={zone.id}
              className={`zone zone-${zone.type}`}
              style={{ left: zone.x * sx, top: zone.y * sy, width: zone.r * 2 * sx, height: zone.r * 2 * sy }}
            />
          ))}
          {view.map?.obstacles.map((obstacle) => (
            <div
              key={obstacle.id}
              className="obstacle"
              style={{ left: obstacle.x * sx, top: obstacle.y * sy, width: obstacle.w * sx, height: obstacle.h * sy }}
            />
          ))}
          {view.map?.hazards?.map((hazard) => (
            <div
              key={hazard.id}
              className="hazard-wall"
              style={{
                left: hazard.x * sx,
                top: hazard.y * sy,
                width: hazard.length * sx,
                height: hazard.width * sy,
                transform: `translate(-50%, -50%) rotate(${hazard.angle}rad)`,
              }}
            />
          ))}
          {view.objective && (
            <div
              className="objective-core"
              style={{ left: view.objective.x * sx, top: view.objective.y * sy, width: view.objective.r * 2 * sx, height: view.objective.r * 2 * sy }}
            />
          )}
          {view.pickups.map((pickup) => (
            <div
              key={pickup.id}
              className={`pickup ${pickup.type}`}
              style={{ left: pickup.x * sx, top: pickup.y * sy }}
            />
          ))}
                  {view.players.map((player, index) => {
                    const justTagged = player.justTaggedUntil && player.justTaggedUntil > view.simTime;
                    const localPlayerId = runtimeRules.localPlayerId || (view.players || []).find((p) => !p.isBot)?.id;
                    const showBadge = !runtimeRules.badgeLocalOnly || player.id === localPlayerId;
            return (
              <div
                key={player.id}
                className={`player ${player.shape || 'circle'} ${player.isIt ? 'it' : ''} ${justTagged ? 'just-tagged' : ''} ${player.eliminated ? 'eliminated' : ''} ${player.isBot ? 'bot' : 'human'}`}
                style={{ left: player.x * sx, top: player.y * sy, background: getPlayerColor(index) }}
              >
                <span>{player.name}</span>
                {!player.isBot && showBadge && (player.isIt || justTagged) && (
                  <span className="you-indicator">{player.isIt ? runtimeRules.badgeItText || 'YOU — IT' : runtimeRules.badgeTaggedText || 'TAGGED'}</span>
                )}
              </div>
            );
          })}
        </div>

        {(() => {
          const localPlayerId = runtimeRules.localPlayerId || (view.players || []).find((p) => !p.isBot)?.id;
          const localPlayer = view.players.find((p) => p.id === localPlayerId);
          const justTagged = localPlayer?.justTaggedUntil && localPlayer.justTaggedUntil > view.simTime;
          if (localPlayer && (localPlayer.isIt || justTagged)) {
            return (
              <div className="local-player-overlay">
                <div className="overlay-content">
                  <h1 className={localPlayer.isIt ? 'it-text' : 'tagged-text'}>
                    {localPlayer.isIt ? (runtimeRules.badgeItText || 'YOU — IT') : (runtimeRules.badgeTaggedText || 'TAGGED')}
                  </h1>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="score-list">
          {view.players.map((player, index) => (
            <article key={player.id} className="score-item" style={{ borderColor: getPlayerColor(index) }}>
              <h4>{player.name} · {player.controls.name}</h4>
              <p>
                {getArchetypeById(player.archetypeId).label}
                {player.isBot ? ' | BOT' : ''}
                {player.team ? ` | TEAM ${player.team === 'alpha' ? 'A' : 'B'}` : ''}
                {' | '}HP {Math.round(player.hp)}/{player.maxHp} | Tags {player.score} {player.isIt ? '| IT' : ''}
              </p>
              <p>
                Ability: {getArchetypeById(player.archetypeId).ability.name} ({player.controls.ability.toUpperCase()}) · CD {player.abilityCd > 0 ? player.abilityCd.toFixed(1) : 'Ready'}
              </p>
            </article>
          ))}
        </div>

        <div className="event-feed">
          {(view.feed || []).slice(-4).reverse().map((entry) => (
            <p key={entry.id}>{entry.text}</p>
          ))}
        </div>

        {view.status === 'finished' && (
          <div className="overlay win-overlay">
            <div className="win-burst" aria-hidden="true" />
            <div className="win-modal">
              <p className="win-label">Victory Confirmed</p>
              <h2>{view.winnerText}</h2>
              <p className="win-sub">
                {winSummary.winnerTeam
                  ? `Team ${winSummary.winnerTeam} controlled the arena.`
                  : `${winSummary.mvp?.name || 'Champion'} closes the round with authority.`}
              </p>
              <div className="win-stats">
                <article className="win-stat-card">
                  <h4>MVP</h4>
                  <p>{winSummary.mvp?.name || '-'}</p>
                </article>
                <article className="win-stat-card">
                  <h4>Top Tags</h4>
                  <p>{winSummary.topTagger?.name || '-'} · {winSummary.topTagger?.score || 0}</p>
                </article>
                <article className="win-stat-card">
                  <h4>Best HP</h4>
                  <p>{winSummary.survivor?.name || '-'} · {Math.max(0, Math.round(winSummary.survivor?.hp || 0))}</p>
                </article>
              </div>
              <div className="cta-row win-actions">
                <button className="chip" onClick={copySummary}>Copy Summary</button>
                <button className="ghost" onClick={beginRematchCountdown} disabled={rematchCountdown !== null}>
                  {rematchCountdown === null ? 'Rematch' : 'Starting...'}
                </button>
                {rematchCountdown !== null && (
                  <span className="rematch-countdown">{rematchCountdown}</span>
                )}
                <button className="cta" onClick={() => navigate('/')}>Back to Menu</button>
              </div>
              <pre className="match-summary-card">{summaryText}</pre>
              {summaryCopyState && <p className="summary-copy-state">{summaryCopyState}</p>}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
