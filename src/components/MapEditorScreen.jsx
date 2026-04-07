import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MAP_PRESETS } from '../constants/game';

const MAP_W = 640;
const MAP_H = 420;
const DRAFT_KEY = 'glitch-react-map-editor-draft-v1';

function encodeMap(map) {
  const json = JSON.stringify(map);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeMap(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mapPointFromEvent(event, rect) {
  const x = clamp(event.clientX - rect.left, 0, MAP_W);
  const y = clamp(event.clientY - rect.top, 0, MAP_H);
  return { x, y };
}

function cloneForRender(items) {
  return items.map((item) => ({ ...item }));
}

function normalizeMap(map) {
  return {
    label: map.label || 'Imported Map',
    obstacles: cloneForRender(map.obstacles || []),
    zones: cloneForRender(map.zones || []),
    hazards: cloneForRender(map.hazards || []).map((hazard) => ({ ...hazard, offset: hazard.offset || 0 })),
  };
}

function MinimapPreview({ map }) {
  const sx = 280 / MAP_W;
  const sy = 184 / MAP_H;

  return (
    <div className="minimap-frame">
      <div className="minimap-stage">
        {(map.zones || []).map((zone) => (
          <div
            key={zone.id}
            className={`zone zone-${zone.type}`}
            style={{
              left: zone.x * sx,
              top: zone.y * sy,
              width: zone.r * 2 * sx,
              height: zone.r * 2 * sy,
            }}
          />
        ))}
        {(map.obstacles || []).map((obstacle) => (
          <div
            key={obstacle.id}
            className="obstacle"
            style={{
              left: obstacle.x * sx,
              top: obstacle.y * sy,
              width: obstacle.w * sx,
              height: obstacle.h * sy,
            }}
          />
        ))}
        {(map.hazards || []).map((hazard) => (
          <div
            key={hazard.id}
            className="hazard-wall"
            style={{
              left: hazard.x * sx,
              top: hazard.y * sy,
              width: hazard.length * sx,
              height: Math.max(2, hazard.width * sy),
              transform: `translate(-50%, -50%) rotate(${hazard.offset || 0}rad)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MapEditorScreen({ mapsCatalog, saveCustomMap, deleteCustomMap }) {
  const navigate = useNavigate();
  const [mapName, setMapName] = useState('Custom Arena');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [tool, setTool] = useState('select');
  const [zoneType, setZoneType] = useState('boost');
  const [obstacleW, setObstacleW] = useState(90);
  const [obstacleH, setObstacleH] = useState(28);
  const [zoneR, setZoneR] = useState(28);
  const [hazardL, setHazardL] = useState(120);
  const [hazardW, setHazardW] = useState(8);
  const [hazardSpeed, setHazardSpeed] = useState(1.1);

  const [obstacles, setObstacles] = useState([
    { id: 'o1', x: 260, y: 120, w: 90, h: 24 },
    { id: 'o2', x: 260, y: 270, w: 90, h: 24 },
  ]);
  const [zones, setZones] = useState([
    { id: 'z1', type: 'boost', x: 90, y: 90, r: 24 },
    { id: 'z2', type: 'slow', x: 520, y: 320, r: 28 },
  ]);
  const [hazards, setHazards] = useState([
    { id: 'h1', x: 320, y: 210, length: 120, width: 8, speed: 1.2, offset: 0 },
  ]);

  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [message, setMessage] = useState('');
  const [lastSavedSerialized, setLastSavedSerialized] = useState('');
  const [lastDraftAt, setLastDraftAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const applyingHistoryRef = useRef(false);

  const snap = (value) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const snapPoint = (point) => ({ x: snap(point.x), y: snap(point.y) });

  const customMaps = useMemo(
    () => Object.entries(mapsCatalog).filter(([id]) => id.startsWith('custom:')),
    [mapsCatalog]
  );

  const mapData = useMemo(
    () => ({ label: mapName, obstacles, zones, hazards }),
    [mapName, obstacles, zones, hazards]
  );
  const serializedMap = useMemo(() => JSON.stringify(normalizeMap(mapData)), [mapData]);
  const isDirty = Boolean(lastSavedSerialized) && serializedMap !== lastSavedSerialized;

  const snapshotState = () => normalizeMap(mapData);

  const startDrag = (event, kind, id, action = 'move') => {
    event.stopPropagation();
    const rect = event.currentTarget.closest('.editor-canvas').getBoundingClientRect();
    const point = mapPointFromEvent(event, rect);
    setSelected({ kind, id });
    setDrag({ kind, id, action, point });
  };

  const onCanvasMouseDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = snapPoint(mapPointFromEvent(event, rect));

    if (tool === 'obstacle') {
      const id = `o${Date.now()}`;
      setObstacles((prev) => [...prev, {
        id,
        x: clamp(snap(point.x - obstacleW / 2), 0, MAP_W - obstacleW),
        y: clamp(snap(point.y - obstacleH / 2), 0, MAP_H - obstacleH),
        w: obstacleW,
        h: obstacleH,
      }]);
      setSelected({ kind: 'obstacle', id });
      return;
    }

    if (tool === 'zone') {
      const id = `z${Date.now()}`;
      setZones((prev) => [...prev, {
        id,
        type: zoneType,
        x: point.x,
        y: point.y,
        r: snap(zoneR),
      }]);
      setSelected({ kind: 'zone', id });
      return;
    }

    if (tool === 'hazard') {
      const id = `h${Date.now()}`;
      setHazards((prev) => [...prev, {
        id,
        x: point.x,
        y: point.y,
        length: snap(hazardL),
        width: clamp(snap(hazardW), 4, 40),
        speed: hazardSpeed,
        offset: 0,
      }]);
      setSelected({ kind: 'hazard', id });
      return;
    }

    setSelected(null);
  };

  const onCanvasMouseMove = (event) => {
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = snapPoint(mapPointFromEvent(event, rect));

    if (drag.kind === 'obstacle') {
      setObstacles((prev) => prev.map((item) => {
        if (item.id !== drag.id) return item;

        if (drag.action === 'resize') {
          const w = clamp(snap(point.x - item.x), 12, MAP_W - item.x);
          const h = clamp(snap(point.y - item.y), 12, MAP_H - item.y);
          return { ...item, w, h };
        }

        return {
          ...item,
          x: clamp(snap(point.x - item.w / 2), 0, MAP_W - item.w),
          y: clamp(snap(point.y - item.h / 2), 0, MAP_H - item.h),
        };
      }));
    }

    if (drag.kind === 'zone') {
      setZones((prev) => prev.map((item) => {
        if (item.id !== drag.id) return item;

        if (drag.action === 'resize') {
          const r = clamp(snap(Math.hypot(point.x - item.x, point.y - item.y)), 12, 150);
          return { ...item, r };
        }

        return { ...item, x: point.x, y: point.y };
      }));
    }

    if (drag.kind === 'hazard') {
      setHazards((prev) => prev.map((item) => {
        if (item.id !== drag.id) return item;

        if (drag.action === 'resize') {
          const half = Math.hypot(point.x - item.x, point.y - item.y);
          return { ...item, length: clamp(snap(half * 2), 40, 320) };
        }

        if (drag.action === 'rotate') {
          let angle = Math.atan2(point.y - item.y, point.x - item.x);
          if (snapToGrid) {
            const step = Math.PI / 12;
            angle = Math.round(angle / step) * step;
          }
          return { ...item, offset: angle };
        }

        return { ...item, x: point.x, y: point.y };
      }));
    }
  };

  const onCanvasMouseUp = () => {
    if (!drag) return;
    setDrag(null);
  };

  const removeSelected = () => {
    if (!selected) return;
    if (selected.kind === 'obstacle') setObstacles((prev) => prev.filter((item) => item.id !== selected.id));
    if (selected.kind === 'zone') setZones((prev) => prev.filter((item) => item.id !== selected.id));
    if (selected.kind === 'hazard') setHazards((prev) => prev.filter((item) => item.id !== selected.id));
    setSelected(null);
  };

  const duplicateSelected = () => {
    if (!selected || !selectedObject) return;
    const offset = snapToGrid ? gridSize : 14;

    if (selected.kind === 'obstacle') {
      const id = `o${Date.now()}`;
      setObstacles((prev) => [...prev, {
        ...selectedObject,
        id,
        x: clamp(selectedObject.x + offset, 0, MAP_W - selectedObject.w),
        y: clamp(selectedObject.y + offset, 0, MAP_H - selectedObject.h),
      }]);
      setSelected({ kind: 'obstacle', id });
    }

    if (selected.kind === 'zone') {
      const id = `z${Date.now()}`;
      setZones((prev) => [...prev, {
        ...selectedObject,
        id,
        x: clamp(selectedObject.x + offset, 0, MAP_W),
        y: clamp(selectedObject.y + offset, 0, MAP_H),
      }]);
      setSelected({ kind: 'zone', id });
    }

    if (selected.kind === 'hazard') {
      const id = `h${Date.now()}`;
      setHazards((prev) => [...prev, {
        ...selectedObject,
        id,
        x: clamp(selectedObject.x + offset, 0, MAP_W),
        y: clamp(selectedObject.y + offset, 0, MAP_H),
      }]);
      setSelected({ kind: 'hazard', id });
    }
  };

  const clearMap = () => {
    setObstacles([]);
    setZones([]);
    setHazards([]);
    setSelected(null);
    setMessage('Map cleared.');
  };

  const handleSave = () => {
    try {
      const id = saveCustomMap(mapData);
      setLastSavedSerialized(serializedMap);
      setMessage(`Saved as ${id}`);
    } catch {
      setMessage('Could not save map.');
    }
  };

  const handleShare = async () => {
    try {
      const code = encodeMap(mapData);
      setShareCode(code);
      await navigator.clipboard.writeText(code).catch(() => {});
      setMessage('Share code generated and copied.');
    } catch {
      setMessage('Could not generate share code.');
    }
  };

  const applyMap = (rawMap, context = 'Loaded map', markClean = true) => {
    const map = normalizeMap(rawMap);
    setMapName(map.label);
    setObstacles(map.obstacles);
    setZones(map.zones);
    setHazards(map.hazards);
    setSelected(null);
    if (markClean) setLastSavedSerialized(JSON.stringify(map));
    setMessage(context);
  };

  const handleImportCode = () => {
    try {
      const map = decodeMap(shareCode);
      if (!map?.label || !Array.isArray(map.obstacles)) throw new Error('bad map');
      applyMap(map, 'Share code imported.');
    } catch {
      setMessage('Invalid share code.');
    }
  };

  const handleLoadPreset = (id) => {
    const map = mapsCatalog[id];
    if (!map) return;
    applyMap(map, `Loaded ${id}`);
  };

  useEffect(() => {
    if (!lastSavedSerialized) setLastSavedSerialized(serializedMap);
  }, [lastSavedSerialized, serializedMap]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.map) return;
      applyMap(draft.map, 'Draft restored from previous session.', false);
      setLastDraftAt(draft.updatedAt || null);
    } catch {
      // Ignore invalid draft payloads.
    }
  }, []);

  useEffect(() => {
    const payload = {
      updatedAt: new Date().toISOString(),
      map: mapData,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    setLastDraftAt(payload.updatedAt);
  }, [mapData]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const entry = history[nextIndex];
    if (!entry) return;
    applyingHistoryRef.current = true;
    applyMap(entry.snapshot, 'Undo');
    setHistoryIndex(nextIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    if (!entry) return;
    applyingHistoryRef.current = true;
    applyMap(entry.snapshot, 'Redo');
    setHistoryIndex(nextIndex);
  };

  const selectedObject = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === 'obstacle') return obstacles.find((item) => item.id === selected.id) || null;
    if (selected.kind === 'zone') return zones.find((item) => item.id === selected.id) || null;
    if (selected.kind === 'hazard') return hazards.find((item) => item.id === selected.id) || null;
    return null;
  }, [selected, obstacles, zones, hazards]);

  const updateSelected = (patch) => {
    if (!selected) return;
    if (selected.kind === 'obstacle') {
      setObstacles((prev) => prev.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
    }
    if (selected.kind === 'zone') {
      setZones((prev) => prev.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
    }
    if (selected.kind === 'hazard') {
      setHazards((prev) => prev.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
    }
  };

  useEffect(() => {
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      return;
    }

    const snapshot = snapshotState();
    const serialized = JSON.stringify(snapshot);

    setHistory((prev) => {
      const truncate = prev.slice(0, historyIndex + 1);
      const last = truncate[truncate.length - 1];
      if (last?.serialized === serialized) return prev;

      const next = [...truncate, { snapshot, serialized }];
      if (next.length > 180) next.shift();
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [mapData, historyIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const editing = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (editing) return;

      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      const isRedo = ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z');
      if (isUndo) {
        event.preventDefault();
        undo();
        return;
      }
      if (isRedo) {
        event.preventDefault();
        redo();
        return;
      }

      if (!selected || !selectedObject) return;

      const key = event.key;
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);

      const isRotateKey = key.toLowerCase() === 'r';
      if (isRotateKey && selected.kind === 'hazard') {
        event.preventDefault();
        const step = event.shiftKey ? Math.PI / 18 : Math.PI / 36;
        const signed = event.shiftKey ? -step : step;
        updateSelected({ offset: (selectedObject.offset || 0) + signed });
        return;
      }

      if (!isArrow) return;
      event.preventDefault();

      const baseStep = event.altKey ? 1 : snapToGrid ? gridSize : 2;
      const moveStep = event.shiftKey ? baseStep * 4 : baseStep;
      const resizeStep = event.shiftKey ? baseStep * 2 : baseStep;

      let sx = 0;
      let sy = 0;
      if (key === 'ArrowLeft') sx = -1;
      if (key === 'ArrowRight') sx = 1;
      if (key === 'ArrowUp') sy = -1;
      if (key === 'ArrowDown') sy = 1;

      const resizing = event.ctrlKey || event.metaKey;
      if (resizing) {
        if (selected.kind === 'obstacle') {
          updateSelected({
            w: clamp(selectedObject.w + sx * resizeStep, 12, MAP_W - selectedObject.x),
            h: clamp(selectedObject.h + sy * resizeStep, 12, MAP_H - selectedObject.y),
          });
          return;
        }

        if (selected.kind === 'zone') {
          const delta = (sx !== 0 ? sx : sy) * resizeStep;
          updateSelected({
            r: clamp(selectedObject.r + delta, 12, 150),
          });
          return;
        }

        if (selected.kind === 'hazard') {
          updateSelected({
            length: clamp(selectedObject.length + sx * resizeStep, 40, 320),
            width: clamp(selectedObject.width + sy * resizeStep, 4, 40),
          });
          return;
        }
      }

      const dx = sx * moveStep;
      const dy = sy * moveStep;

      if (selected.kind === 'obstacle') {
        updateSelected({
          x: clamp(selectedObject.x + dx, 0, MAP_W - selectedObject.w),
          y: clamp(selectedObject.y + dy, 0, MAP_H - selectedObject.h),
        });
      }

      if (selected.kind === 'zone') {
        updateSelected({
          x: clamp(selectedObject.x + dx, 0, MAP_W),
          y: clamp(selectedObject.y + dy, 0, MAP_H),
        });
      }

      if (selected.kind === 'hazard') {
        updateSelected({
          x: clamp(selectedObject.x + dx, 0, MAP_W),
          y: clamp(selectedObject.y + dy, 0, MAP_H),
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, selectedObject, snapToGrid, gridSize, history, historyIndex]);

  return (
    <main className="layout single">
      <section className="panel editor-panel">
        <div className="panel-head">
          <div className="title-stack">
            <h3>Visual Map Editor</h3>
            <p className={`dirty-pill ${isDirty ? 'dirty' : 'clean'}`}>
              {isDirty ? 'Unsaved changes' : 'Saved'}
              {lastDraftAt ? ` · Draft ${new Date(lastDraftAt).toLocaleTimeString()}` : ''}
            </p>
          </div>
          <div className="chip-stack">
            <button className="chip" onClick={() => navigate('/')}>Back to Menu</button>
            <Link className="chip" to="/game">Start Game</Link>
          </div>
        </div>

        <div className="editor-top-row">
          <label>
            Map Label
            <input value={mapName} onChange={(event) => setMapName(event.target.value)} />
          </label>
        </div>

        <div className="editor-toolbar">
          <button className="chip" onClick={undo} disabled={historyIndex <= 0}>Undo</button>
          <button className="chip" onClick={redo} disabled={historyIndex >= history.length - 1}>Redo</button>
          <button className={`chip ${snapToGrid ? 'on' : ''}`} onClick={() => setSnapToGrid((prev) => !prev)}>
            Snap Grid {snapToGrid ? 'On' : 'Off'}
          </button>
          <label className="chip grid-chip">
            Grid
            <input
              type="number"
              min="8"
              max="64"
              step="2"
              value={gridSize}
              onChange={(event) => setGridSize(clamp(Number(event.target.value) || 20, 8, 64))}
            />
          </label>
          <button className={`chip ${tool === 'select' ? 'on' : ''}`} onClick={() => setTool('select')}>Select/Move</button>
          <button className={`chip ${tool === 'obstacle' ? 'on' : ''}`} onClick={() => setTool('obstacle')}>Add Obstacle</button>
          <button className={`chip ${tool === 'zone' ? 'on' : ''}`} onClick={() => setTool('zone')}>Add Zone</button>
          <button className={`chip ${tool === 'hazard' ? 'on' : ''}`} onClick={() => setTool('hazard')}>Add Hazard</button>
          <button className="chip" onClick={duplicateSelected} disabled={!selectedObject}>Duplicate</button>
          <button className="chip" onClick={removeSelected}>Delete Selected</button>
          <button className="chip" onClick={clearMap}>Clear Map</button>
        </div>

        <div className="editor-controls-grid">
          <label>
            Obstacle W
            <input type="number" min="12" max="240" value={obstacleW} onChange={(e) => setObstacleW(Number(e.target.value) || 20)} />
          </label>
          <label>
            Obstacle H
            <input type="number" min="12" max="180" value={obstacleH} onChange={(e) => setObstacleH(Number(e.target.value) || 20)} />
          </label>
          <label>
            Zone Type
            <select value={zoneType} onChange={(e) => setZoneType(e.target.value)}>
              <option value="boost">Boost</option>
              <option value="slow">Slow</option>
            </select>
          </label>
          <label>
            Zone Radius
            <input type="number" min="12" max="120" value={zoneR} onChange={(e) => setZoneR(Number(e.target.value) || 24)} />
          </label>
          <label>
            Hazard Length
            <input type="number" min="40" max="280" value={hazardL} onChange={(e) => setHazardL(Number(e.target.value) || 100)} />
          </label>
          <label>
            Hazard Width
            <input type="number" min="4" max="30" value={hazardW} onChange={(e) => setHazardW(Number(e.target.value) || 8)} />
          </label>
          <label>
            Hazard Spin
            <input type="number" min="-4" max="4" step="0.1" value={hazardSpeed} onChange={(e) => setHazardSpeed(Number(e.target.value) || 1)} />
          </label>
        </div>

        <div className="editor-workbench">
          <div
            className="editor-canvas"
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`editor-item zone zone-${zone.type} ${selected?.kind === 'zone' && selected?.id === zone.id ? 'selected' : ''}`}
                style={{ left: zone.x, top: zone.y, width: zone.r * 2, height: zone.r * 2 }}
                onMouseDown={(event) => startDrag(event, 'zone', zone.id, 'move')}
              >
                {selected?.kind === 'zone' && selected?.id === zone.id && (
                  <button
                    className="editor-handle resize"
                    style={{ left: '100%', top: '50%' }}
                    onMouseDown={(event) => startDrag(event, 'zone', zone.id, 'resize')}
                  />
                )}
              </div>
            ))}
            {obstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                className={`editor-item obstacle ${selected?.kind === 'obstacle' && selected?.id === obstacle.id ? 'selected' : ''}`}
                style={{ left: obstacle.x, top: obstacle.y, width: obstacle.w, height: obstacle.h }}
                onMouseDown={(event) => startDrag(event, 'obstacle', obstacle.id, 'move')}
              >
                {selected?.kind === 'obstacle' && selected?.id === obstacle.id && (
                  <button
                    className="editor-handle resize"
                    style={{ left: '100%', top: '100%' }}
                    onMouseDown={(event) => startDrag(event, 'obstacle', obstacle.id, 'resize')}
                  />
                )}
              </div>
            ))}
            {hazards.map((hazard) => (
              <div
                key={hazard.id}
                className={`editor-item editor-hazard ${selected?.kind === 'hazard' && selected?.id === hazard.id ? 'selected' : ''}`}
                style={{
                  left: hazard.x,
                  top: hazard.y,
                  width: hazard.length,
                  height: hazard.width,
                  transform: `translate(-50%, -50%) rotate(${hazard.offset || 0}rad)`,
                }}
                onMouseDown={(event) => startDrag(event, 'hazard', hazard.id, 'move')}
              >
                {selected?.kind === 'hazard' && selected?.id === hazard.id && (
                  <>
                    <button
                      className="editor-handle resize"
                      style={{ left: '100%', top: '50%' }}
                      onMouseDown={(event) => startDrag(event, 'hazard', hazard.id, 'resize')}
                    />
                    <button
                      className="editor-handle rotate"
                      style={{ left: '50%', top: '-18px' }}
                      onMouseDown={(event) => startDrag(event, 'hazard', hazard.id, 'rotate')}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="editor-side">
            <h4>Minimap Preview</h4>
            <MinimapPreview map={mapData} />
            <p className="editor-note">Drag objects to move. Selected objects show resize handles. Hazards also show a rotate handle.</p>
            <div className="cheatsheet-wrap">
              <button className={`chip ${showCheatsheet ? 'on' : ''}`} onClick={() => setShowCheatsheet((prev) => !prev)}>
                {showCheatsheet ? 'Hide' : 'Show'} Shortcut Cheatsheet
              </button>
              {showCheatsheet && (
                <div className="cheatsheet-box">
                  <p><strong>Move</strong> Arrow keys</p>
                  <p><strong>Fine Move</strong> Alt + Arrow (1px)</p>
                  <p><strong>Fast Move</strong> Shift + Arrow</p>
                  <p><strong>Resize</strong> Ctrl/Cmd + Arrow</p>
                  <p><strong>Rotate Hazard</strong> R / Shift+R</p>
                  <p><strong>Undo/Redo</strong> Ctrl/Cmd+Z, Ctrl/Cmd+Y</p>
                </div>
              )}
            </div>

            <div className="inspector">
              <h4>Selected Inspector</h4>
              {!selectedObject && <p className="editor-note">Select an object to edit numeric values.</p>}

              {selectedObject && selected?.kind === 'obstacle' && (
                <div className="inspector-grid">
                  <label>X<input type="number" value={Math.round(selectedObject.x)} onChange={(e) => updateSelected({ x: clamp(snap(Number(e.target.value) || 0), 0, MAP_W - selectedObject.w) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedObject.y)} onChange={(e) => updateSelected({ y: clamp(snap(Number(e.target.value) || 0), 0, MAP_H - selectedObject.h) })} /></label>
                  <label>W<input type="number" value={Math.round(selectedObject.w)} onChange={(e) => updateSelected({ w: clamp(snap(Number(e.target.value) || 12), 12, MAP_W - selectedObject.x) })} /></label>
                  <label>H<input type="number" value={Math.round(selectedObject.h)} onChange={(e) => updateSelected({ h: clamp(snap(Number(e.target.value) || 12), 12, MAP_H - selectedObject.y) })} /></label>
                </div>
              )}

              {selectedObject && selected?.kind === 'zone' && (
                <div className="inspector-grid">
                  <label>X<input type="number" value={Math.round(selectedObject.x)} onChange={(e) => updateSelected({ x: clamp(snap(Number(e.target.value) || 0), 0, MAP_W) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedObject.y)} onChange={(e) => updateSelected({ y: clamp(snap(Number(e.target.value) || 0), 0, MAP_H) })} /></label>
                  <label>Radius<input type="number" value={Math.round(selectedObject.r)} onChange={(e) => updateSelected({ r: clamp(snap(Number(e.target.value) || 12), 12, 150) })} /></label>
                  <label>Type
                    <select value={selectedObject.type} onChange={(e) => updateSelected({ type: e.target.value })}>
                      <option value="boost">Boost</option>
                      <option value="slow">Slow</option>
                    </select>
                  </label>
                </div>
              )}

              {selectedObject && selected?.kind === 'hazard' && (
                <div className="inspector-grid">
                  <label>X<input type="number" value={Math.round(selectedObject.x)} onChange={(e) => updateSelected({ x: clamp(snap(Number(e.target.value) || 0), 0, MAP_W) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedObject.y)} onChange={(e) => updateSelected({ y: clamp(snap(Number(e.target.value) || 0), 0, MAP_H) })} /></label>
                  <label>Length<input type="number" value={Math.round(selectedObject.length)} onChange={(e) => updateSelected({ length: clamp(snap(Number(e.target.value) || 40), 40, 320) })} /></label>
                  <label>Width<input type="number" value={Math.round(selectedObject.width)} onChange={(e) => updateSelected({ width: clamp(Number(e.target.value) || 4, 4, 40) })} /></label>
                  <label>Spin<input type="number" step="0.1" value={selectedObject.speed} onChange={(e) => updateSelected({ speed: clamp(Number(e.target.value) || 0, -6, 6) })} /></label>
                  <label>Angle<input type="number" step="0.1" value={selectedObject.offset || 0} onChange={(e) => updateSelected({ offset: Number(e.target.value) || 0 })} /></label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="cta-row">
          <button className="cta" onClick={handleSave}>Save Map</button>
          <button className="ghost" onClick={handleShare}>Generate Share Code</button>
          <button className="ghost" onClick={handleImportCode}>Load Share Code</button>
        </div>

        <label>
          Share Code
          <textarea value={shareCode} onChange={(event) => setShareCode(event.target.value)} rows={3} />
        </label>

        <p className="editor-note">{message}</p>

        <div className="saved-list">
          <h4>Built-in Presets</h4>
          {Object.keys(MAP_PRESETS).map((id) => (
            <div key={id} className="saved-row">
              <span>{id} · {MAP_PRESETS[id].label}</span>
              <button className="chip" onClick={() => handleLoadPreset(id)}>Load</button>
            </div>
          ))}

          <h4>Saved Custom Maps</h4>
          {customMaps.length === 0 && <p className="editor-note">No custom maps saved yet.</p>}
          {customMaps.map(([id, map]) => (
            <div key={id} className="saved-row">
              <span>{id} · {map.label}</span>
              <div className="chip-stack">
                <button className="chip" onClick={() => handleLoadPreset(id)}>Load</button>
                <button className="chip" onClick={() => deleteCustomMap(id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
