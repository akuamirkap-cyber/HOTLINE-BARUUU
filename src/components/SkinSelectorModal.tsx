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

      // Background
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f0eee8';
      ctx.fillRect(0, 0, w, h);

      // Subtle tactical floor grid
      ctx.strokeStyle = '#e2dfd7';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0d0f1199] backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#f5f4f0] border border-[#dcdcd6] p-5 sm:p-7 shadow-2xl text-left flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Skin Karakter"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#deded8] pb-3.5 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Space_Grotesk'] font-bold text-xs tracking-[0.25em] text-[#e51d2e] uppercase">
                SHAPE CUSTOMIZATION
              </span>
              <span className="font-['IBM_Plex_Mono'] text-[11px] text-[#6b7280]">
                · {SKIN_LIST.length} PILIHAN BENTUK
              </span>
            </div>
            <h2 className="font-['Anton'] text-3xl sm:text-4xl text-[#1a1d1f] uppercase mt-0.5">
              <span className="text-[#e51d2e] mr-2">//</span>SKIN KARAKTER
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-[#dcdcd6] text-[#6b726a] hover:text-[#1a1d1f] hover:border-[#1a1d1f] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Content Body: Two columns (Skin list & Interactive Live Preview) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto pr-1 flex-1">
          {/* Left Column: Skin List (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.16em] text-[#6b726a] uppercase mb-0.5">
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
                  className={`p-3.5 border text-left transition-all cursor-pointer relative ${
                    isHighlighted
                      ? 'border-[#e51d2e] bg-[#e51d2e0a] shadow-sm'
                      : 'border-[#deded8] hover:border-[#1a1d1f] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-['Anton'] text-xl sm:text-2xl text-[#1a1d1f] uppercase leading-none">
                          {skin.name}
                        </span>
                        {isSelected && (
                          <span className="bg-[#e51d2e] text-white font-['IBM_Plex_Mono'] text-[9px] font-bold px-1.5 py-0.5 uppercase">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <div className="font-['Space_Grotesk'] text-xs font-semibold text-[#e51d2e] uppercase mt-0.5">
                        {skin.tagline}
                      </div>
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#6b7280] tracking-wider uppercase bg-[#f0eee8] px-2 py-0.5 border border-[#deded8]">
                      {skin.badge}
                    </span>
                  </div>

                  <p className="font-['Space_Grotesk'] text-xs text-[#525657] mt-2 leading-relaxed">
                    {skin.description}
                  </p>

                  <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-[#f0eee8] font-['IBM_Plex_Mono'] text-[10px] text-[#6b7280]">
                    <div>
                      PLAYER: <span className="text-[#1a1d1f] font-semibold">{skin.playerTag}</span>
                    </div>
                    <div>
                      ENEMY: <span className="text-[#e51d2e] font-semibold">{skin.enemyTag}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Interactive Visualizer (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.16em] text-[#6b726a] uppercase">
              LIVE PREVIEW (ANIMASI):
            </div>

            {/* Preview Canvas Box */}
            <div className="relative border border-[#deded8] bg-white overflow-hidden shadow-sm flex flex-col items-center justify-center p-3">
              <canvas
                ref={canvasRef}
                width={260}
                height={210}
                className="w-full max-w-[260px] h-[210px] block"
              />

              {/* Watermark badge on canvas */}
              <div className="absolute top-2.5 left-2.5 font-['IBM_Plex_Mono'] text-[9px] text-[#8b9196] uppercase bg-[#f5f4f0c0] px-1.5 py-0.5 border border-[#deded8]">
                {previewRole === 'player' ? 'PREVIEW: PEMAIN' : 'PREVIEW: MUSUH'}
              </div>
            </div>

            {/* Controls for Preview: Toggle Player vs Enemy */}
            <div className="flex items-center gap-1.5 p-1 bg-[#eae8e1] border border-[#dcdcd6]">
              <button
                type="button"
                onClick={() => setPreviewRole('player')}
                className={`flex-1 py-1.5 text-xs font-['IBM_Plex_Mono'] font-bold transition-all cursor-pointer ${
                  previewRole === 'player'
                    ? 'bg-[#1a1d1f] text-white shadow-xs'
                    : 'text-[#6b7280] hover:text-[#1a1d1f]'
                }`}
              >
                PEMAIN (PLAYER)
              </button>
              <button
                type="button"
                onClick={() => setPreviewRole('enemy')}
                className={`flex-1 py-1.5 text-xs font-['IBM_Plex_Mono'] font-bold transition-all cursor-pointer ${
                  previewRole === 'enemy'
                    ? 'bg-[#e51d2e] text-white shadow-xs'
                    : 'text-[#6b7280] hover:text-[#1a1d1f]'
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
                  className={`py-1 px-2 text-[10px] font-['IBM_Plex_Mono'] border text-center transition-colors cursor-pointer ${
                    previewWeapon === pw.id
                      ? 'border-[#1a1d1f] bg-white text-[#1a1d1f] font-bold'
                      : 'border-[#deded8] bg-[#f5f4f0] text-[#6b726a] hover:border-[#1a1d1f]'
                  }`}
                >
                  {pw.label}
                </button>
              ))}
            </div>

            {/* Selected Skin Overview Box */}
            <div className="border border-[#deded8] bg-white p-3 space-y-1.5">
              <div className="font-['Anton'] text-lg text-[#1a1d1f] uppercase leading-tight">
                {selectedDef.name}
              </div>
              <div className="font-['Space_Grotesk'] text-xs text-[#525657]">
                Kategori:{' '}
                <span className="font-['IBM_Plex_Mono'] font-semibold text-[#1a1d1f]">
                  {selectedDef.category}
                </span>
              </div>
              <div className="font-['Space_Grotesk'] text-xs text-[#525657]">
                Badge:{' '}
                <span className="font-['IBM_Plex_Mono'] font-semibold text-[#e51d2e]">
                  {selectedDef.badge}
                </span>
              </div>
            </div>

            {/* Action Button: GUNAKAN SKIN INI */}
            <button
              type="button"
              onClick={() => handleApply(highlightedSkin)}
              className="w-full bg-[#e51d2e] hover:bg-[#c91423] text-white font-['Anton'] tracking-[0.08em] text-lg uppercase py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md mt-auto"
            >
              <span>{currentSkin === highlightedSkin ? '✓ SKIN INI SEDANG AKTIF' : 'GUNAKAN SKIN INI'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-[#deded8] pt-3 mt-4 flex items-center justify-between text-[11px] font-['IBM_Plex_Mono'] text-[#6b7280] uppercase shrink-0">
          <div>SKIN BISA DIGANTI KAPAN SAJA LEWAT MENU ATAU PAUSE GAME</div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-[#1a1d1f] underline cursor-pointer"
          >
            TUTUP [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}
