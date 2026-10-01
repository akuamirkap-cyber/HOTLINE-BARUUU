import { useEffect, useRef, useState } from 'react';
import { Game } from './game/engine';
import type { GameSnapshot } from './game/engine';
import { LEVELS } from './game/levels';
import { initAudio } from './game/audio';
import { enterMobileLandscape, isPortrait, isTouchDevice, releaseMobileLandscape } from './game/mobile';
import { Menu } from './components/Menu';
import { ControlsDialog } from './components/ControlsDialog';
import { GameControls } from './components/GameControls';

const SAVE_KEY = 'hotline-superhot-save';

interface Save {
  unlocked: number;
  best: Record<number, number>;
}

function loadSave(): Save {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '');
    if (saved) {
      const best: Record<number, number> = {};
      for (const [key, value] of Object.entries(saved.best || {})) {
        const level = Number(key);
        if (Number.isInteger(level) && level >= 0 && level < LEVELS.length && typeof value === 'number' && Number.isFinite(value) && value >= 0) best[level] = value;
      }
      return {
        unlocked: LEVELS.length,
        best,
      };
    }
  } catch { /* A missing or invalid save starts a new run. */ }
  return { unlocked: LEVELS.length, best: {} };
}

interface GameViewProps {
  level: number;
  mobileControls: boolean;
  touchDevice: boolean;
  onToggleControls: () => void;
  onLandscape: () => void;
  onExit: () => void;
  onDone: (level: number, score: number) => void;
}

function GameView({ level, mobileControls, touchDevice, onToggleControls, onLandscape, onExit, onDone }: GameViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onExit, onDone });
  callbacks.current = { onExit, onDone };
  const [game, setGame] = useState<Game | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [portrait, setPortrait] = useState(isPortrait);
  const rotateRequired = touchDevice && mobileControls && portrait;

  useEffect(() => {
    const instance = new Game(canvas.current!, level, {
      onQuit: () => callbacks.current.onExit(),
      onLevelComplete: (l, s) => callbacks.current.onDone(l, s),
      onUIChange: setSnapshot,
    });
    setGame(instance);
    return () => instance.destroy();
  }, [level]);

  useEffect(() => {
    const onResize = () => setPortrait(isPortrait());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { game?.setTouchControls(mobileControls); }, [game, mobileControls]);
  useEffect(() => { game?.setSuspended(rotateRequired); }, [game, rotateRequired]);

  return (
    <>
      <canvas ref={canvas} className="fixed inset-0 block" style={{ cursor: mobileControls ? 'default' : 'none', touchAction: 'none' }} aria-label="Game HOT//LINE" />
      <GameControls game={game} snapshot={snapshot} enabled={mobileControls} rotateRequired={rotateRequired} onToggle={onToggleControls} onLandscape={onLandscape} />
    </>
  );
}

export default function App() {
  const [save, setSave] = useState<Save>(loadSave);
  const [playing, setPlaying] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [touchDevice] = useState(isTouchDevice);
  const [mobileControls, setMobileControls] = useState(touchDevice);
  const ownsFullscreen = useRef(false);
  const mobileSession = useRef(0);

  const requestLandscape = () => {
    const session = mobileSession.current;
    void enterMobileLandscape().then((owned) => {
      if (session !== mobileSession.current) { releaseMobileLandscape(owned); return; }
      ownsFullscreen.current ||= owned;
    });
  };

  const startGame = () => {
    initAudio();
    if (touchDevice && mobileControls) requestLandscape();
    setPlaying(selected);
  };

  const onExit = () => {
    mobileSession.current++;
    if (touchDevice) releaseMobileLandscape(ownsFullscreen.current);
    ownsFullscreen.current = false;
    setSave(loadSave());
    setPlaying(null);
  };

  const onDone = (level: number, score: number) => {
    const next = loadSave();
    next.unlocked = Math.max(next.unlocked, Math.min(LEVELS.length, level + 2));
    next.best[level] = Math.max(next.best[level] || 0, score);
    setSave(next);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch { /* Gameplay still works without browser storage. */ }
  };

  useEffect(() => {
    if (playing !== null || controlsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === '?') { event.preventDefault(); setControlsOpen(true); return; }
      const onButton = target instanceof HTMLElement && !!target.closest('button, a');
      if (onButton && !target.closest('.level-option')) return;
      if (event.code === 'ArrowDown' || event.code === 'KeyS') { event.preventDefault(); setSelected((value) => Math.min(save.unlocked - 1, value + 1)); }
      if (event.code === 'ArrowUp' || event.code === 'KeyW') { event.preventDefault(); setSelected((value) => Math.max(0, value - 1)); }
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        initAudio();
        if (touchDevice && mobileControls) requestLandscape();
        setPlaying(selected);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playing, controlsOpen, selected, save.unlocked, touchDevice, mobileControls]);

  if (playing !== null) {
    return <GameView level={playing} mobileControls={mobileControls} touchDevice={touchDevice} onToggleControls={() => setMobileControls((enabled) => !enabled)} onLandscape={requestLandscape} onExit={onExit} onDone={onDone} />;
  }

  return (
    <>
      <Menu
        unlocked={save.unlocked}
        best={save.best}
        selected={selected}
        mobileControls={mobileControls}
        touchDevice={touchDevice}
        onToggleControls={() => setMobileControls((enabled) => !enabled)}
        onSelect={(level) => { setSelected(level); if (touchDevice && mobileControls) requestLandscape(); }}
        onStart={startGame}
        onGuide={() => setControlsOpen(true)}
      />
      {controlsOpen && <ControlsDialog onClose={() => setControlsOpen(false)} />}
    </>
  );
}
