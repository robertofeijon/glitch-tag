import { useEffect, useState } from 'react';
import { musicEngine } from '../audio/musicEngine';
import { DEFAULT_AUDIO_SETTINGS } from '../data/soundtracks';

const STORAGE_KEY = 'glitch-react-audio-v1';

function loadAudioSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_AUDIO_SETTINGS };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function useAudioSettings() {
  const [settings, setSettings] = useState(loadAudioSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    musicEngine.setCustomTracks(settings.customTracks || []);
    musicEngine.setSettings(settings);
  }, [settings]);

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      musicEngine.playUiClick(next.uiSfxEnabled);
      return next;
    });
  };

  const activateAudio = () => {
    musicEngine.unlock();
    musicEngine.playUiClick(settings.uiSfxEnabled);
  };

  const importTrack = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read track'));
      reader.readAsDataURL(file);
    }).catch(() => null);

    if (!dataUrl) return;

    const id = `custom:${Date.now()}`;
    const nextTrack = {
      id,
      name: file.name.replace(/\.mp3$/i, ''),
      mood: 'Imported track',
      url: dataUrl,
    };

    setSettings((prev) => ({
      ...prev,
      customTracks: [...(prev.customTracks || []), nextTrack].slice(-8),
      selectedTrack: id,
    }));

    event.target.value = '';
  };

  return {
    settings,
    updateSettings,
    activateAudio,
    importTrack,
  };
}
