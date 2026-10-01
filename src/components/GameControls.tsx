import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Game, GameSnapshot } from '../game/engine';
import { LEVELS } from '../game/levels';
import { Icon } from './Icon';
import '../game-controls.css';

interface JoystickProps {
  kind: 'move' | 'aim';
  onChange: (x: number, y: number) => void;
}

function Joystick({ kind, onChange }: JoystickProps) {
  const pointer = useRef<number | null>(null);
  const element = useRef<HTMLButtonElement>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const releaseCapture = () => {
      const id = pointer.current;
      pointer.current = null;
      if (id !== null && element.current?.hasPointerCapture(id)) element.current.releasePointerCapture(id);
    };
    const cancel = () => {
      releaseCapture();
      setOffset({ x: 0, y: 0 }); setActive(false);
      callback.current(0, 0);
    };
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('blur', cancel); releaseCapture(); callback.current(0, 0); };
  }, []);

  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width * 0.32;
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const distance = Math.hypot(x, y);
    const ratio = distance > radius ? radius / distance : 1;
    setOffset({ x: x * ratio, y: y * ratio });
    if (distance < radius * 0.12) callback.current(0, 0);
    else callback.current(x * ratio / radius, y * ratio / radius);
  };

  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setOffset({ x: 0, y: 0 });
    setActive(false);
    callback.current(0, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={`joystick-zone joystick-${kind}`}>
      <button
        ref={element}
        type="button"
        className={`joystick${active ? ' is-active' : ''}`}
        aria-label={kind === 'move' ? 'Joystick gerak' : 'Joystick bidik dan serang'}
        onPointerDown={(event) => {
          if (pointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
          event.preventDefault();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setActive(true);
          move(event);
        }}
        onPointerMove={(event) => { if (pointer.current === event.pointerId) { event.preventDefault(); move(event); } }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <span className="joystick-axis axis-x" /><span className="joystick-axis axis-y" />
        <span className="joystick-inner-ring" />
        <span className="joystick-knob" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}><Icon name={kind === 'move' ? 'arrow-up-right' : 'crosshair'} size={23} /></span>
      </button>
      <span className="joystick-label">{kind === 'move' ? 'GERAK' : 'BIDIK + AUTO SERANG'}</span>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  icon: ReactNode;
  className?: string;
  detail?: string;
  onPress: () => void;
  onRelease?: () => void;
  children?: ReactNode;
}

function ActionButton({ label, icon, detail, className = '', onPress, onRelease, children }: ActionButtonProps) {
  const pointer = useRef<number | null>(null);
  const element = useRef<HTMLButtonElement>(null);
  const releaseCallback = useRef(onRelease);
  releaseCallback.current = onRelease;
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const releaseCapture = () => {
      const id = pointer.current;
      pointer.current = null;
      if (id !== null && element.current?.hasPointerCapture(id)) element.current.releasePointerCapture(id);
    };
    const cancel = () => { releaseCapture(); setPressed(false); releaseCallback.current?.(); };
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('blur', cancel); releaseCapture(); releaseCallback.current?.(); };
  }, []);

  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setPressed(false);
    onRelease?.();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <button
      ref={element}
      type="button"
      className={`touch-action ${label === 'LEMPAR / AMBIL' ? 'weapon-action ' : ''}${className}${pressed ? ' is-pressed' : ''}`}
      aria-label={label === 'FOKUS' ? 'Tahan FOKUS' : label}
      onPointerDown={(event) => {
        if (pointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        onPress();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onClick={(event) => { if (event.detail === 0) onPress(); }}
      onKeyDown={(event) => { if (onRelease && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); if (!event.repeat) onPress(); } }}
      onKeyUp={(event) => { if (onRelease && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); onRelease(); } }}
    >
      {icon}<span>{label === 'LEMPAR / AMBIL' ? 'LEMPAR/AMBIL' : label}</span>{detail && <small>{detail}</small>}{children}
    </button>
  );
}

interface GameControlsProps {
  game: Game | null;
  snapshot: GameSnapshot | null;
  enabled: boolean;
  rotateRequired: boolean;
  onToggle: () => void;
  onLandscape: () => void;
}

export function GameControls({ game, snapshot, enabled, rotateRequired, onToggle, onLandscape }: GameControlsProps) {
  const primaryButton = useRef<HTMLButtonElement>(null);
  const rotateButton = useRef<HTMLButtonElement>(null);
  const state = snapshot?.state || 'intro';
  const showDialog = state === 'paused' || state === 'dead' || !!snapshot?.showResults;
  const active = !!game && !showDialog && !rotateRequired;

  useEffect(() => {
    if (rotateRequired) rotateButton.current?.focus();
    else if (showDialog) primaryButton.current?.focus();
  }, [showDialog, state, rotateRequired]);

  return (
    <div className={`game-interface${enabled ? ' has-touch-controls' : ''}`}>
      {!showDialog && !rotateRequired && (
        <div className="game-toolbar">
          <button
            type="button"
            className={`game-tool-button mobile-controls-toggle${enabled ? ' is-on' : ''}`}
            onClick={onToggle}
            aria-pressed={enabled}
            aria-label={enabled ? 'Sembunyikan tombol mobile' : 'Perlihatkan tombol mobile'}
            title={enabled ? 'Sembunyikan tombol mobile' : 'Perlihatkan tombol mobile'}
          >
            <Icon name="device" size={18} />
            <span>{enabled ? 'SEMBUNYIKAN TOMBOL MOBILE' : 'PERLIHATKAN TOMBOL MOBILE'}</span>
          </button>
          <button type="button" className="game-tool-button game-pause-button" onClick={() => game?.togglePause()} aria-label="Pause game"><Icon name="pause" size={19} /></button>
        </div>
      )}

      {enabled && active && (
        <div className="touch-layout" aria-label="Kontrol mobile landscape">
          <Joystick kind="move" onChange={(x, y) => game.setTouchMove(x, y)} />
          <Joystick kind="aim" onChange={(x, y) => game.setTouchAim(x, y)} />
          <div className="touch-actions">
            <ActionButton label="TENDANG" icon={<Icon name="kick" size={24} />} onPress={() => game.pressTouchAction('kick')} />
            <ActionButton label="LEMPAR / AMBIL" detail={snapshot?.weaponAction} icon={<Icon name="swap" size={23} />} onPress={() => game.pressTouchAction('weapon')} />
            <ActionButton label="FOKUS" icon={<Icon name="crosshair" size={24} />} className={`focus-button${snapshot?.focusActive ? ' is-focusing' : ''}`} onPress={() => game.setTouchFocus(true)} onRelease={() => game.setTouchFocus(false)}><span className="touch-focus-meter"><i style={{ width: `${snapshot?.focusPercent ?? 100}%` }} /></span></ActionButton>
            <ActionButton label="AKSI" detail={snapshot?.action || 'SPRINT'} icon={<Icon name="bolt" size={25} />} className="context-action" onPress={() => game.pressTouchAction('action')} />
          </div>
        </div>
      )}

      {showDialog && !rotateRequired && game && snapshot && (
        <div className="game-state-backdrop">
          {state === 'dead' ? (
            /* ===== DEATH SCREEN (Gambar 4 Right) ===== */
            <section
              className="relative w-[390px] max-w-full bg-[#0d0f11] text-white border border-[#23272b] p-8 text-center shadow-2xl rounded-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="death-dialog-title"
            >
              {/* Shattered runner silhouette with red flying polygon shards */}
              <div className="w-full flex justify-center mb-1">
                <svg viewBox="0 0 200 120" className="w-52 h-28 overflow-visible" aria-hidden="true">
                  {/* Silhouette and fractured body */}
                  <path d="M96 20 C99 14 107 14 110 20 C112 25 108 30 102 31 C96 30 94 24 96 20 Z" fill="#e51d2e" />
                  <polygon points="98,34 118,50 112,70 92,74 82,56 90,36" fill="#e51d2e" />
                  <polygon points="118,50 142,60 134,72 114,66" fill="#b91c1c" />
                  <polygon points="80,58 60,66 66,78 84,70" fill="#e51d2e" />
                  <polygon points="92,74 106,96 94,108 82,90" fill="#b91c1c" />
                  <polygon points="106,96 126,104 120,116 100,110" fill="#991b1b" />
                  {/* Flying geometric shards */}
                  <polygon points="135,26 144,32 138,40" fill="#e51d2e" />
                  <polygon points="152,42 165,38 158,52" fill="#ef4444" />
                  <polygon points="146,65 158,72 148,80" fill="#dc2626" />
                  <polygon points="68,28 78,35 69,44" fill="#e51d2e" />
                  <polygon points="52,48 62,56 50,62" fill="#ef4444" />
                  <polygon points="60,78 72,82 64,92" fill="#dc2626" />
                  <polygon points="104,8 112,14 105,18" fill="#f87171" />
                  <polygon points="82,14 90,8 88,20" fill="#ef4444" />
                  <polygon points="125,85 136,92 128,100" fill="#b91c1c" />
                  <polygon points="75,98 84,106 72,112" fill="#991b1b" />
                  <polygon points="160,58 172,62 164,70" fill="#f87171" />
                  <polygon points="40,60 48,68 38,72" fill="#e51d2e" />
                  <polygon points="115,115 125,122 118,126" fill="#7f1d1d" />
                  <polygon points="85,116 92,124 82,126" fill="#7f1d1d" />
                </svg>
              </div>

              {/* Title: // YOU DIED */}
              <h2
                id="death-dialog-title"
                className="font-['Anton'] text-5xl md:text-6xl tracking-tight text-white uppercase my-3 flex items-center justify-center"
              >
                <span className="text-[#e51d2e] inline-block mr-2 tracking-normal">//</span>YOU DIED
              </h2>

              {/* Stats */}
              <div className="flex flex-col gap-2 my-5 font-['IBM_Plex_Mono'] text-center">
                <div className="text-base tracking-[0.2em] font-medium">
                  <span className="text-white font-bold">{String(snapshot.kills || 0).padStart(2, '0')}</span>&nbsp;&nbsp;&nbsp;
                  <span className="text-neutral-400 text-xs">KILLS</span>
                </div>
                <div className="text-base tracking-[0.2em] font-medium">
                  <span className="text-white font-bold">{Math.floor(snapshot.score || 0)}</span>&nbsp;&nbsp;&nbsp;
                  <span className="text-neutral-400 text-xs">SCORE</span>
                </div>
                <div className="text-xs tracking-[0.18em] text-neutral-400 uppercase mt-1">
                  FLOOR {String(snapshot.level + 1).padStart(2, '0')} · {LEVELS[snapshot.level]?.name}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <button
                  ref={primaryButton}
                  type="button"
                  className="w-full bg-[#e51d2e] hover:bg-[#c91423] text-white font-['Anton'] tracking-[0.1em] text-lg uppercase py-3.5 px-6 rounded-none flex items-center justify-center gap-3 transition-colors shadow-lg cursor-pointer"
                  onClick={() => game.restart()}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2">
                    <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>RESTART</span>
                </button>
                <button
                  type="button"
                  className="font-['IBM_Plex_Mono'] text-xs tracking-[0.22em] text-neutral-400 hover:text-white uppercase py-2 transition-colors cursor-pointer"
                  onClick={() => game.quit()}
                >
                  BACK TO FLOORS
                </button>
              </div>

              <div className="mt-3 text-[10px] font-['IBM_Plex_Mono'] text-neutral-500 tracking-wider">
                R ulangi / ESC menu
              </div>
            </section>
          ) : snapshot.showResults ? (
            /* ===== LEVEL COMPLETE (CLEAR) (Gambar 4 Left) ===== */
            <section
              className="relative w-[390px] max-w-full bg-[#f5f4f0] text-[#1a1d1f] border border-[#dcdcd6] p-8 text-left shadow-2xl rounded-none overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-dialog-title"
            >
              {/* Subtle background wireframe watermark */}
              <svg className="absolute right-0 top-0 w-44 h-full pointer-events-none opacity-20" viewBox="0 0 100 200" aria-hidden="true">
                <polygon points="20,0 100,0 100,160 50,200 10,140" fill="none" stroke="#1a1d1f" strokeWidth="0.8" />
                <line x1="20" y1="0" x2="50" y2="200" stroke="#1a1d1f" strokeWidth="0.5" />
                <line x1="100" y1="40" x2="10" y2="140" stroke="#1a1d1f" strokeWidth="0.5" />
                <line x1="40" y1="80" x2="100" y2="120" stroke="#1a1d1f" strokeWidth="0.5" />
              </svg>

              {/* Floor tag */}
              <div className="font-['Space_Grotesk'] font-bold text-xs tracking-[0.25em] text-[#1a1d1f] uppercase mb-1">
                FLOOR {String(snapshot.level + 1).padStart(2, '0')}
              </div>

              {/* Title: // CLEAR */}
              <h2
                id="clear-dialog-title"
                className="font-['Anton'] text-6xl tracking-tight text-[#1a1d1f] uppercase mb-7 flex items-center"
              >
                <span className="text-[#e51d2e] inline-block mr-2 tracking-normal">//</span>CLEAR
              </h2>

              {/* Stats table with vertical guide line */}
              <div className="space-y-3.5 my-6 font-['IBM_Plex_Mono']">
                {[
                  { label: 'TARGETS', val: String(snapshot.totalEnemies || 0).padStart(2, '0') },
                  {
                    label: 'TIME',
                    val: `${String(Math.floor((snapshot.timeSeconds || 0) / 60)).padStart(2, '0')}:${String((snapshot.timeSeconds || 0) % 60).padStart(2, '0')}`,
                  },
                  { label: 'KILLS', val: String(snapshot.kills || 0).padStart(2, '0') },
                  { label: 'COMBO', val: String(snapshot.maxCombo || 0).padStart(2, '0') },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-[96px_1fr] items-center">
                    <span className="font-bold text-xs tracking-[0.18em] text-[#1a1d1f] uppercase">{row.label}</span>
                    <div className="flex items-center">
                      <span className="w-[1px] h-5 bg-[#c8c8c2] mr-6" />
                      <span className="font-bold text-lg text-[#1a1d1f]">{row.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Horizontal divider with red accent notch */}
              <div className="relative w-full h-[1px] bg-[#d5d5cf] my-6">
                <span className="absolute left-0 top-0 w-8 h-[2px] bg-[#e51d2e]" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <button
                  ref={primaryButton}
                  type="button"
                  className="w-full bg-[#e51d2e] hover:bg-[#c91423] text-white font-['Anton'] tracking-[0.1em] text-base uppercase py-3.5 px-6 rounded-none flex items-center justify-between transition-colors shadow-lg cursor-pointer"
                  disabled={!snapshot.nextReady}
                  onClick={() => game.advance()}
                >
                  <span>{snapshot.level + 1 < LEVELS.length ? 'NEXT FLOOR' : 'FINISH'}</span>
                  <span className="text-xl">→</span>
                </button>
                <button
                  type="button"
                  className="font-['IBM_Plex_Mono'] text-xs tracking-[0.2em] text-[#6b726a] hover:text-[#1a1d1f] uppercase py-2 transition-colors cursor-pointer text-center"
                  onClick={() => game.quit()}
                >
                  BACK TO FLOORS
                </button>
              </div>
            </section>
          ) : (
            /* ===== PAUSED SCREEN ===== */
            <section
              className="relative w-[390px] max-w-full bg-[#f5f4f0] text-[#1a1d1f] border border-[#dcdcd6] p-8 text-left shadow-2xl rounded-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="paused-dialog-title"
            >
              <div className="font-['Space_Grotesk'] font-bold text-xs tracking-[0.25em] text-[#1a1d1f] uppercase mb-1">
                FLOOR {String(snapshot.level + 1).padStart(2, '0')} · {LEVELS[snapshot.level]?.name}
              </div>
              <h2
                id="paused-dialog-title"
                className="font-['Anton'] text-6xl tracking-tight text-[#1a1d1f] uppercase mb-4 flex items-center"
              >
                <span className="text-[#e51d2e] inline-block mr-2 tracking-normal">//</span>PAUSED
              </h2>
              <p className="text-xs text-[#6b726a] font-['Space_Grotesk'] mb-6">
                Susun langkah berikutnya. Jangan jadi target.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  ref={primaryButton}
                  type="button"
                  className="w-full bg-[#e51d2e] hover:bg-[#c91423] text-white font-['Anton'] tracking-[0.1em] text-base uppercase py-3.5 px-6 rounded-none flex items-center justify-between transition-colors shadow-lg cursor-pointer"
                  onClick={() => game.togglePause()}
                >
                  <span>LANJUT</span>
                  <span className="text-xl">→</span>
                </button>
                <button
                  type="button"
                  className="font-['IBM_Plex_Mono'] text-xs tracking-[0.2em] text-[#6b726a] hover:text-[#1a1d1f] uppercase py-2 transition-colors cursor-pointer text-center"
                  onClick={() => game.restart()}
                >
                  RESTART FLOOR
                </button>
                <button
                  type="button"
                  className="font-['IBM_Plex_Mono'] text-xs tracking-[0.2em] text-[#6b726a] hover:text-[#1a1d1f] uppercase py-2 transition-colors cursor-pointer text-center"
                  onClick={() => game.quit()}
                >
                  BACK TO FLOORS
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {rotateRequired && (
        <div className="rotate-backdrop">
          <section className="rotate-card" role="alertdialog" aria-modal="true" aria-labelledby="rotate-title" aria-describedby="rotate-description">
            <div className="rotate-symbol"><Icon name="rotate" size={54} /></div>
            <span className="game-dialog-eyebrow">BEST PLAYED WIDE</span>
            <h2 id="rotate-title">PUTAR<br />PERANGKATMU.</h2>
            <p id="rotate-description">Gunakan mode landscape untuk bergerak dan membidik dengan dua joystick. Game dijeda sampai layar diputar.</p>
            <button ref={rotateButton} type="button" className="game-primary-button" onClick={onLandscape}>COBA FULLSCREEN & LANDSCAPE<Icon name="arrow" size={20} /></button>
            <button type="button" className="rotate-exit" onClick={() => game?.quit()}>Kembali ke menu</button>
            <small>Jika browser tidak mendukung rotasi otomatis, putar perangkat secara manual.</small>
          </section>
        </div>
      )}
    </div>
  );
}
