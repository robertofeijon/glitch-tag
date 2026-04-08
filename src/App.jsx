import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MAP_PRESETS } from './constants/game';
import { MainMenu } from './components/MainMenu';
import { GameSetup } from './components/GameSetup';
import { GameScreen } from './components/GameScreen';
import { MapEditorScreen } from './components/MapEditorScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { useAudioSettings } from './hooks/useAudioSettings';

const GAME_KEY = 'glitch-react-game-v1';
const MAPS_KEY = 'glitch-react-custom-maps-v1';

function loadGameSettings() {
  const defaults = {
    mode: 'classic',
    playerCount: 2,
    aiBots: 0,
    botPersonality: 'aggressive',
    teamProfile: 'defensive',
    classicProfile: 'precision',
    aiSkillAggressive: 70,
    aiSkillEvasive: 65,
    aiSkillSupport: 60,
    duration: 120,
    speed: 260,
    mapId: 'core',
    roundModifier: 'random',
    powerups: true,
    maxHp: 100,
    itDrainTick: 3,
    runnerRecoveryTick: 1,
    recoveryRequiresPriorIt: true,
    antiSnowball: false,
    antiSnowballBoost: 0.45,
    playerNames: [],
    playerControls: [],
  };

  try {
    const stored = localStorage.getItem(GAME_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

function loadCustomMaps() {
  try {
    const stored = localStorage.getItem(MAPS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const { settings, updateSettings, activateAudio, importTrack } = useAudioSettings();
  const [gameSettings, setGameSettings] = useState(loadGameSettings);
  const [customMaps, setCustomMaps] = useState(loadCustomMaps);
  const mapsCatalog = { ...MAP_PRESETS, ...customMaps };

  useEffect(() => {
    localStorage.setItem(GAME_KEY, JSON.stringify(gameSettings));
  }, [gameSettings]);

  useEffect(() => {
    localStorage.setItem(MAPS_KEY, JSON.stringify(customMaps));
  }, [customMaps]);

  const saveCustomMap = (map) => {
    const id = `custom:${Date.now()}`;
    setCustomMaps((prev) => ({ ...prev, [id]: map }));
    setGameSettings((prev) => ({ ...prev, mapId: id }));
    return id;
  };

  const deleteCustomMap = (id) => {
    setCustomMaps((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setGameSettings((prev) => (prev.mapId === id ? { ...prev, mapId: 'core' } : prev));
  };

  return (
    <Routes>
      <Route path="/" element={<MainMenu activateAudio={activateAudio} />} />
      <Route
        path="/setup"
        element={
          <GameSetup
            gameSettings={gameSettings}
            setGameSettings={setGameSettings}
            activateAudio={activateAudio}
          />
        }
      />
      <Route
        path="/editor"
        element={
          <MapEditorScreen
            mapsCatalog={mapsCatalog}
            saveCustomMap={saveCustomMap}
            deleteCustomMap={deleteCustomMap}
          />
        }
      />
      <Route
        path="/settings"
        element={
          <SettingsScreen
            settings={settings}
            updateSettings={updateSettings}
            activateAudio={activateAudio}
            importTrack={importTrack}
            gameSettings={gameSettings}
            setGameSettings={setGameSettings}
          />
        }
      />
      <Route
        path="/leaderboard"
        element={<LeaderboardScreen />}
      />
      <Route
        path="/game"
        element={
          <GameScreen
            settings={settings}
            updateSettings={updateSettings}
            activateAudio={activateAudio}
            importTrack={importTrack}
            gameSettings={gameSettings}
            mapsCatalog={mapsCatalog}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
