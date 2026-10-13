import { useState, useEffect, useRef } from 'react';
import { SKINS, SKIN_LIST, type SkinId, setStoredSkin, renderCharacterSkin } from '../game/skins';
import type { WType } from '../game/engine';

interface SkinSelectorModalProps {
  currentSkin: SkinId;
  onSelectSkin: (skinId: SkinId) => void;
  onClose: () => void;
}

const PREVIEW_WEAPONS: { id: WType | null; label: string }[] = [
  { id: null, label: 'FISTS' },
  { id: 'pistol', label: '9MM PISTOL' },
  { id: 'katana', label: 'KATANA' },
  { id: 'shotgun', label: 'SHOTGUN' },
];

export function SkinSelectorModal({ currentSkin, onSelectSkin, onClose }: SkinSelectorModalProps) {
  const [highlightedSkin, setHighlightedSkin] = useState<SkinId>(currentSkin);
  const [previewRole, setPreviewRole] = useState<'player' | 'enemy'>('player');
  const [previewWeapon, setPreviewWeapon] = useState<WType | null>('pistol');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live Canvas Animation for Preview
  useEffect(() => {
    let animId: number;
    let time = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      time += 0.025;
      const w = canvas.width;
      const h = canvas.height;

      // Background - Dark Obsidian
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Subtle tactical floor grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw Animated Character in Center
      const cx = w / 2;
      const cy = h / 2 + 6;
      const walkT = time * 32;
      const aimAngle = Math.sin(time * 1.5) * 0.35;
      const isEnemy = previewRole === 'enemy';
      const attackAnim = Math.max(0, Math.sin(time * 3) > 0.7 ? (Math.sin(time * 3) - 0.7) * 0.4 : 0);

      ctx.save();
      // Scale up character in preview for glorious visual crispness
      ctx.translate(cx, cy);
      ctx.scale(2.2, 2.2);
      ctx.translate(-cx, -cy);

      renderCharacterSkin(
        ctx,
        highlightedSkin,
        cx,
        cy,
        aimAngle,
        isEnemy,
        previewWeapon,
        walkT,
        attackAnim,
        [1, 1.05, 0.95, 1.02, 0.98, 1.04],
        0,
        0,
        { moveSpeed: 140, side: Math.sin(time * 3) > 0 ? 1 : -1 },
        time
      );
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [highlightedSkin, previewRole, previewWeapon]);

  const selectedDef = SKINS[highlightedSkin];

  const handleApply = (id: SkinId) => {
    setStoredSkin(id);
    onSelectSkin(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#080a0e]/85 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0f141c] border border-white/15 p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-left flex flex-col overflow-hidden rounded-xs"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Skin Karakter"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3.5 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] font-bold text-xs tracking-[0.25em] text-[#38bdf8] uppercase">
                SHAPE CUSTOMIZATION // ARSENAL
              </span>
              <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#64748b]">
                · {SKIN_LIST.length} PILIHAN BENTUK
              </span>
            </div>
            <h2 className="font-['Anton'] text-3xl sm:text-4xl text-[#f8fafc] uppercase mt-0.5 flex items-center gap-2">
              <span className="text-[#38bdf8]">//</span> SKIN KARAKTER
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-white/15 text-[#94a3b8] hover:text-white hover:border-white/40 transition-colors cursor-pointer rounded-xs"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Content Body: Two columns (Skin list & Interactive Live Preview) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto pr-1 flex-1">
          {/* Left Column: Skin List (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.16em] text-[#94a3b8] uppercase mb-0.5">
              DAFTAR SKIN BENTUK (SHAPES):
            </div>
            {SKIN_LIST.map((skin) => {
              const isSelected = skin.id === currentSkin;
              const isHighlighted = skin.id === highlightedSkin;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => setHighlightedSkin(skin.id)}
                  className={`p-3.5 border text-left transition-all cursor-pointer relative rounded-xs ${
                    isHighlighted
                      ? 'border-[#38bdf8] bg-[#38bdf818] shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                      : 'border-white/10 hover:border-white/30 bg-white/5 text-[#94a3b8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-['Anton'] text-xl sm:text-2xl uppercase leading-none ${isHighlighted ? 'text-white' : 'text-[#cbd5e1]'}`}>
                          {skin.name}
                        </span>
                        {isSelected && (
                          <span className="bg-[#38bdf8] text-[#090d16] font-['IBM_Plex_Mono'] text-[9px] font-bold px-1.5 py-0.5 uppercase rounded-xs">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <div className="font-['Space_Grotesk'] text-xs font-semibold text-[#38bdf8] uppercase mt-0.5">
                        {skin.tagline}
                      </div>
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#94a3b8] tracking-wider uppercase bg-white/10 px-2 py-0.5 border border-white/10 rounded-xs">
                      {skin.badge}
                    </span>
                  </div>

                  <p className="font-['Space_Grotesk'] text-xs text-[#94a3b8] mt-2 leading-relaxed">
                    {skin.description}
                  </p>

                  <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-white/10 font-['IBM_Plex_Mono'] text-[10px] text-[#64748b]">
                    <div>
                      PLAYER: <span className="text-white font-semibold">{skin.playerTag}</span>
                    </div>
                    <div>
                      ENEMY: <span className="text-[#38bdf8] font-semibold">{skin.enemyTag}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Interactive Visualizer (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.16em] text-[#94a3b8] uppercase">
              LIVE PREVIEW (ANIMASI):
            </div>

            {/* Preview Canvas Box */}
            <div className="relative border border-white/15 bg-[#090d16] overflow-hidden shadow-inner flex flex-col items-center justify-center p-3 rounded-xs">
              <canvas
                ref={canvasRef}
                width={260}
                height={210}
                className="w-full max-w-[260px] h-[210px] block"
              />

              {/* Watermark badge on canvas */}
              <div className="absolute top-2.5 left-2.5 font-['IBM_Plex_Mono'] text-[9px] text-[#94a3b8] uppercase bg-black/60 px-1.5 py-0.5 border border-white/10 rounded-xs">
                {previewRole === 'player' ? 'PREVIEW: PEMAIN' : 'PREVIEW: MUSUH'}
              </div>
            </div>

            {/* Controls for Preview: Toggle Player vs Enemy */}
            <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xs">
              <button
                type="button"
                onClick={() => setPreviewRole('player')}
                className={`flex-1 py-1.5 text-xs font-['IBM_Plex_Mono'] font-bold transition-all cursor-pointer rounded-xs ${
                  previewRole === 'player'
                    ? 'bg-[#38bdf8] text-[#090d16] shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                PEMAIN (PLAYER)
              </button>
              <button
                type="button"
                onClick={() => setPreviewRole('enemy')}
                className={`flex-1 py-1.5 text-xs font-['IBM_Plex_Mono'] font-bold transition-all cursor-pointer rounded-xs ${
                  previewRole === 'enemy'
                    ? 'bg-[#f43f5e] text-white shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                MUSUH (ENEMY)
              </button>
            </div>

            {/* Weapon preview buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {PREVIEW_WEAPONS.map((pw) => (
                <button
                  key={pw.label}
                  type="button"
                  onClick={() => setPreviewWeapon(pw.id)}
                  className={`py-1.5 px-2 text-[10px] font-['IBM_Plex_Mono'] border text-center transition-colors cursor-pointer rounded-xs ${
                    previewWeapon === pw.id
                      ? 'border-[#38bdf8] bg-[#38bdf820] text-[#38bdf8] font-bold'
                      : 'border-white/10 bg-white/5 text-[#94a3b8] hover:border-white/30 hover:text-white'
                  }`}
                >
                  {pw.label}
                </button>
              ))}
            </div>

            {/* Selected Skin Overview Box */}
            <div className="border border-white/10 bg-white/5 p-3 space-y-1.5 rounded-xs">
              <div className="font-['Anton'] text-lg text-white uppercase leading-tight">
                {selectedDef.name}
              </div>
              <div className="font-['Space_Grotesk'] text-xs text-[#94a3b8]">
                Kategori:{' '}
                <span className="font-['IBM_Plex_Mono'] font-semibold text-white">
                  {selectedDef.category}
                </span>
              </div>
              <div className="font-['Space_Grotesk'] text-xs text-[#94a3b8]">
                Badge:{' '}
                <span className="font-['IBM_Plex_Mono'] font-semibold text-[#38bdf8]">
                  {selectedDef.badge}
                </span>
              </div>
            </div>

            {/* Action Button: GUNAKAN SKIN INI */}
            <button
              type="button"
              onClick={() => handleApply(highlightedSkin)}
              className="w-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#090d16] font-['Anton'] tracking-[0.08em] text-lg uppercase py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg mt-auto rounded-xs font-bold"
            >
              <span>{currentSkin === highlightedSkin ? '✓ SKIN INI SEDANG AKTIF' : 'GUNAKAN SKIN INI'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/10 pt-3 mt-4 flex items-center justify-between text-[11px] font-['IBM_Plex_Mono'] text-[#64748b] uppercase shrink-0">
          <div>SKIN BISA DIGANTI KAPAN SAJA LEWAT MENU ATAU PAUSE GAME</div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white underline cursor-pointer"
          >
            TUTUP [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}
