import { useEffect, useState } from 'react';
import { LEVELS } from '../game/levels';
import { Floorplan } from './Floorplan';
import { Icon } from './Icon';

interface MenuProps {
  unlocked: number;
  best: Record<number, number>;
  selected: number;
  onSelect: (level: number) => void;
  onStart: () => void;
  onGuide: () => void;
  mobileControls: boolean;
  touchDevice: boolean;
  onToggleControls: () => void;
}

const formatScore = (score: number) => Math.floor(score).toString().padStart(6, '0');

export function Menu({
  unlocked,
  best,
  selected,
  onSelect,
  onStart,
  onGuide,
  mobileControls,
  touchDevice,
  onToggleControls,
}: MenuProps) {
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [notice, setNotice] = useState('');
  const [floorSelectOpen, setFloorSelectOpen] = useState(false);
  const [challengesOpen, setChallengesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const level = LEVELS[selected] || LEVELS[0];
  const totalBest = Object.values(best).reduce((sum, score) => sum + score, 0);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
      else setNotice('Mode layar penuh tidak tersedia di browser ini.');
    } catch {
      setNotice('Browser membatasi mode layar penuh. Buka preview di tab baru.');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f4f0] text-[#1a1d1f] font-['Space_Grotesk'] select-none flex flex-col justify-between p-6 sm:p-12 md:p-16">
      {/* ===== BACKGROUND ARCHITECTURAL WIREFRAME (Gambar 1 Right Side) ===== */}
      <svg
        className="absolute right-0 bottom-0 w-[55vw] max-w-[800px] h-[75vh] pointer-events-none select-none z-0 overflow-visible opacity-85"
        viewBox="0 0 600 600"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="facetGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#edebe4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#dedcd4" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="facetGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e5e3db" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d3d0c7" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="facetGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d9d7ce" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#c7c4b9" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Angular 3D isometric faceted geometry from Gambar 1 */}
        <polygon points="340,600 580,240 600,280 600,600" fill="url(#facetGrad1)" />
        <polygon points="260,600 340,600 580,240 450,180" fill="url(#facetGrad2)" />
        <polygon points="450,180 580,240 520,380 380,320" fill="url(#facetGrad3)" />
        <polygon points="380,320 520,380 430,550 290,480" fill="url(#facetGrad1)" />
        <polygon points="450,180 360,260 290,480 380,320" fill="url(#facetGrad2)" />
        <polygon points="450,180 540,110 590,170 580,240" fill="url(#facetGrad1)" />

        {/* Delicate structural architectural wireframe lines */}
        <g stroke="#b8b5ab" strokeWidth="1.2" fill="none">
          <line x1="260" y1="600" x2="450" y2="180" />
          <line x1="450" y1="180" x2="580" y2="240" />
          <line x1="580" y1="240" x2="340" y2="600" />
          <line x1="380" y1="320" x2="520" y2="380" />
          <line x1="290" y1="480" x2="430" y2="550" />
          <line x1="450" y1="180" x2="540" y2="110" />
          <line x1="540" y1="110" x2="590" y2="170" />
          <line x1="590" y1="170" x2="580" y2="240" />
          <line x1="360" y1="260" x2="450" y2="180" />
          <line x1="360" y1="260" x2="290" y2="480" />
        </g>
        {/* Subtle grid lines */}
        <g stroke="#c7c4ba" strokeWidth="0.7" strokeDasharray="3 4" fill="none">
          <line x1="300" y1="600" x2="490" y2="210" />
          <line x1="350" y1="600" x2="540" y2="210" />
          <line x1="400" y1="200" x2="550" y2="300" />
          <line x1="330" y1="380" x2="470" y2="480" />
        </g>
      </svg>

      {/* ===== TOP BAR / UTILITIES ===== */}
      <header className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {totalBest > 0 && (
            <div className="font-['IBM_Plex_Mono'] text-[11px] tracking-[0.16em] text-[#6b726a] uppercase">
              RECORD: <span className="text-[#1a1d1f] font-bold">{formatScore(totalBest)}</span> PTS
            </div>
          )}
        </div>

        <nav className="flex items-center gap-3" aria-label="Quick settings">
          <button
            type="button"
            onClick={onToggleControls}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-['IBM_Plex_Mono'] border transition-colors cursor-pointer ${
              mobileControls
                ? 'border-[#e51d2e] text-[#e51d2e] bg-[#e51d2e0d]'
                : 'border-[#deded8] text-[#525657] hover:border-[#1a1d1f]'
            }`}
            title="Toggle tombol mobile"
          >
            <Icon name="device" size={15} />
            <span className="hidden sm:inline">{mobileControls ? 'SEMBUNYIKAN TOMBOL MOBILE' : 'PERLIHATKAN TOMBOL MOBILE'}</span>
          </button>

          <button
            type="button"
            onClick={onGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-['IBM_Plex_Mono'] border border-[#deded8] text-[#525657] hover:border-[#1a1d1f] transition-colors cursor-pointer"
            title="Panduan kontrol"
          >
            <Icon name="keyboard" size={15} />
            <span className="hidden sm:inline">PANDUAN</span>
            <kbd className="text-[10px] text-[#9ca3af] ml-1">?</kbd>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center border border-[#deded8] text-[#525657] hover:border-[#1a1d1f] transition-colors cursor-pointer"
            title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <Icon name={fullscreen ? 'collapse' : 'expand'} size={16} />
          </button>
        </nav>
      </header>

      {/* ===== MAIN CONTENT (Gambar 1 Layout) ===== */}
      <main className="relative z-10 flex flex-col justify-center my-auto py-4">
        {/* LOGO: HOT // LINE ™ */}
        <div className="mb-9 sm:mb-12">
          <div className="font-['Anton'] text-[86px] sm:text-[116px] md:text-[132px] leading-[0.85] tracking-[-0.03em] text-[#1a1d1f] uppercase select-none">
            HOT
          </div>
          <div className="font-['Anton'] text-[86px] sm:text-[116px] md:text-[132px] leading-[0.85] tracking-[-0.03em] text-[#1a1d1f] uppercase select-none flex items-baseline">
            <span className="text-[#e51d2e] inline-block tracking-normal transform -skew-x-[18deg] mr-2">//</span>
            <span>LINE</span>
            <span className="text-[18px] sm:text-[22px] font-['Space_Grotesk'] font-bold text-[#e51d2e] ml-1.5 self-start mt-2">™</span>
          </div>
          <div className="font-['Space_Grotesk'] font-bold text-xs sm:text-sm tracking-[0.28em] text-[#1a1d1f] uppercase mt-3.5">
            FAST. BRUTAL. TACTICAL.
          </div>
        </div>

        {/* MENU OPTIONS (Gambar 1) */}
        <nav className="flex flex-col w-full max-w-[340px]" aria-label="Menu Utama">
          {/* Active Highlighted Option: CONTINUE */}
          <div className="relative group mb-5">
            <button
              type="button"
              onClick={onStart}
              className="w-full text-left cursor-pointer flex items-center justify-between pb-3.5 pt-1 border-b border-[#e2e2dc] transition-all hover:border-[#e51d2e]"
              aria-label={`Continue Floor ${selected + 1} ${level.name}`}
            >
              <div className="flex items-center gap-3.5">
                {/* Red angled slash marker from Gambar 1 */}
                <span className="w-2.5 h-8 bg-[#e51d2e] transform -skew-x-[18deg] inline-block shrink-0 shadow-sm" />
                <div>
                  <div className="font-['Anton'] text-[28px] sm:text-[32px] tracking-[0.06em] text-[#e51d2e] leading-none uppercase">
                    CONTINUE
                  </div>
                  <div className="font-['IBM_Plex_Mono'] text-xs font-semibold tracking-[0.14em] text-[#6b7280] uppercase mt-1">
                    FLOOR {String(selected + 1).padStart(2, '0')} · {level.name}
                  </div>
                </div>
              </div>
              <span className="text-[#e51d2e] text-2xl font-bold transition-transform group-hover:translate-x-1.5">
                →
              </span>
            </button>
          </div>

          {/* Standard Navigation Options */}
          <div className="flex flex-col gap-4 font-['Anton'] text-[24px] sm:text-[27px] tracking-[0.06em] uppercase">
            <button
              type="button"
              onClick={() => {
                onSelect(0);
                onStart();
              }}
              className="text-left text-[#1a1d1f] hover:text-[#e51d2e] transition-colors cursor-pointer w-fit"
            >
              NEW RUN
            </button>

            <button
              type="button"
              onClick={() => setFloorSelectOpen(true)}
              className="text-left text-[#1a1d1f] hover:text-[#e51d2e] transition-colors cursor-pointer w-fit"
            >
              FLOOR SELECT
            </button>

            <button
              type="button"
              onClick={() => setChallengesOpen(true)}
              className="text-left text-[#1a1d1f] hover:text-[#e51d2e] transition-colors cursor-pointer w-fit"
            >
              CHALLENGES
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-left text-[#1a1d1f] hover:text-[#e51d2e] transition-colors cursor-pointer w-fit"
            >
              SETTINGS
            </button>
          </div>
        </nav>
      </main>

      {/* ===== BOTTOM HINT ===== */}
      <footer className="relative z-10 flex items-center justify-between text-[#8b9196] font-['IBM_Plex_Mono'] text-xs tracking-[0.14em] uppercase pt-4">
        <div>
          {touchDevice && mobileControls ? (
            <span>SENTUH CONTINUE UNTUK MULAI · LANDSCAPE</span>
          ) : (
            <span>ENTER MULAI · ↑ ↓ PILIH LANTAI · ? PANDUAN</span>
          )}
        </div>
        <div className="text-[11px] text-[#a0a5aa]">
          {unlocked} / {LEVELS.length} FLOORS UNLOCKED
        </div>
      </footer>

      {/* ===== MODAL: FLOOR SELECT ===== */}
      {floorSelectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d0f1190] backdrop-blur-sm"
          onClick={() => setFloorSelectOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#f5f4f0] border border-[#dcdcd6] p-6 sm:p-8 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Floor Selection"
          >
            <div className="flex items-center justify-between border-b border-[#deded8] pb-4 mb-6">
              <div>
                <span className="font-['Space_Grotesk'] font-bold text-xs tracking-[0.25em] text-[#e51d2e] uppercase">
                  MISSION DATABASE
                </span>
                <h2 className="font-['Anton'] text-4xl text-[#1a1d1f] uppercase mt-0.5">
                  <span className="text-[#e51d2e] mr-2">//</span>FLOOR SELECT
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFloorSelectOpen(false)}
                className="w-8 h-8 flex items-center justify-center border border-[#dcdcd6] text-[#6b7280] hover:text-[#1a1d1f] transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Floor list */}
              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {LEVELS.map((fl, idx) => {
                  const locked = false;
                  const active = idx === selected;
                  return (
                    <button
                      key={fl.name}
                      type="button"
                      disabled={locked}
                      onClick={() => onSelect(idx)}
                      className={`p-3.5 border text-left transition-all cursor-pointer flex items-center justify-between ${
                        active
                          ? 'border-[#e51d2e] bg-[#e51d2e0c]'
                          : 'border-[#deded8] hover:border-[#1a1d1f] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-['Anton'] text-xl ${
                            active ? 'text-[#e51d2e]' : 'text-[#1a1d1f]'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="font-['Anton'] text-lg text-[#1a1d1f] uppercase leading-none">
                            {fl.name}
                          </div>
                          <div className="font-['IBM_Plex_Mono'] text-[11px] text-[#6b7280] uppercase mt-0.5">
                            {fl.sub}
                          </div>
                        </div>
                      </div>
                      {best[idx] ? (
                        <div className="text-right font-['IBM_Plex_Mono'] text-xs">
                          <span className="font-bold text-[#1a1d1f]">{best[idx]}</span>
                          <span className="text-[10px] text-[#6b7280] block">BEST</span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Tactical Floorplan Preview */}
              <div className="flex flex-col justify-between border border-[#deded8] p-4 bg-white">
                <div>
                  <div className="font-['IBM_Plex_Mono'] text-xs tracking-wider text-[#6b7280] uppercase mb-2 flex justify-between">
                    <span>FLOOR TACTICAL INTEL</span>
                    <span className="text-[#e51d2e] font-bold">READY</span>
                  </div>
                  <Floorplan level={level} index={selected} />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFloorSelectOpen(false);
                    onStart();
                  }}
                  className="w-full mt-4 bg-[#e51d2e] hover:bg-[#c91423] text-white font-['Anton'] text-base tracking-[0.1em] uppercase py-3 px-4 flex items-center justify-between transition-colors shadow-md cursor-pointer"
                >
                  <span>START {level.name}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHALLENGES ===== */}
      {challengesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d0f1190] backdrop-blur-sm"
          onClick={() => setChallengesOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-[#f5f4f0] border border-[#dcdcd6] p-6 sm:p-8 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Challenges"
          >
            <div className="flex items-center justify-between border-b border-[#deded8] pb-4 mb-6">
              <div>
                <span className="font-['Space_Grotesk'] font-bold text-xs tracking-[0.25em] text-[#e51d2e] uppercase">
                  TACTICAL MODIFIERS
                </span>
                <h2 className="font-['Anton'] text-4xl text-[#1a1d1f] uppercase mt-0.5">
                  <span className="text-[#e51d2e] mr-2">//</span>CHALLENGES
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setChallengesOpen(false)}
                className="w-8 h-8 flex items-center justify-center border border-[#dcdcd6] text-[#6b7280] hover:text-[#1a1d1f] transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-['Space_Grotesk']">
              {[
                {
                  title: 'SUPERHOT MODE',
                  tag: 'KEY: [T]',
                  desc: 'Waktu hanya bergerak saat kamu bergerak atau menembak. Perhitungkan lintasan peluru dengan presisi.',
                },
                {
                  title: 'NO SLOW-MO',
                  tag: 'KEY: [N]',
                  desc: 'Kecepatan penuh tanpa kompromi. Tanpa pelambat waktu — murni refleks tempur langsung.',
                },
                {
                  title: 'BAREHANDS RUN',
                  tag: 'FISTS ONLY',
                  desc: 'Tidak menggunakan senjata api. Manfaatkan pukulan 4-hit combo, tendangan pelontar, dan lemparan sandera.',
                },
                {
                  title: 'ROOFTOP SHOWDOWN',
                  tag: 'BOSS ARENA',
                  desc: 'Lompat langsung ke arena rooftop melawan bos bersenapan serbu dan sniper berjarak tembak jauh.',
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="p-4 border border-[#deded8] bg-white hover:border-[#1a1d1f] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-['Anton'] text-xl text-[#1a1d1f] uppercase tracking-wide">
                      {c.title}
                    </span>
                    <span className="font-['IBM_Plex_Mono'] text-xs font-bold text-[#e51d2e] px-2 py-0.5 bg-[#e51d2e10] border border-[#e51d2e30]">
                      {c.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[#6b726a] mt-1.5 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setChallengesOpen(false);
                onStart();
              }}
              className="w-full mt-6 bg-[#e51d2e] hover:bg-[#c91423] text-white font-['Anton'] text-base tracking-[0.1em] uppercase py-3.5 px-6 flex items-center justify-between transition-colors shadow-md cursor-pointer"
            >
              <span>MULAI DENGAN MODIFIER</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL: SETTINGS ===== */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d0f1190] backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-[#f5f4f0] border border-[#dcdcd6] p-6 sm:p-8 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <div className="flex items-center justify-between border-b border-[#deded8] pb-4 mb-6">
              <div>
                <span className="font-['Space_Grotesk'] font-bold text-xs tracking-[0.25em] text-[#e51d2e] uppercase">
                  CONFIGURATION
                </span>
                <h2 className="font-['Anton'] text-4xl text-[#1a1d1f] uppercase mt-0.5">
                  <span className="text-[#e51d2e] mr-2">//</span>SETTINGS
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 flex items-center justify-center border border-[#dcdcd6] text-[#6b726a] hover:text-[#1a1d1f] transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-['Space_Grotesk']">
              <div className="flex items-center justify-between p-4 border border-[#deded8] bg-white">
                <div>
                  <div className="font-bold text-sm text-[#1a1d1f]">KONTROL MOBILE / TOUCHSCREEN</div>
                  <div className="text-xs text-[#6b726a] mt-0.5">
                    Tampilkan virtual joystick dan tombol aksi di layar
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleControls}
                  className={`px-4 py-2 font-['IBM_Plex_Mono'] font-bold text-xs border transition-colors cursor-pointer ${
                    mobileControls
                      ? 'bg-[#e51d2e] text-white border-[#e51d2e]'
                      : 'bg-[#f5f4f0] text-[#1a1d1f] border-[#deded8]'
                  }`}
                >
                  {mobileControls ? 'AKTIF' : 'NONAKTIF'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-[#deded8] bg-white">
                <div>
                  <div className="font-bold text-sm text-[#1a1d1f]">MODE LAYAR PENUH</div>
                  <div className="text-xs text-[#6b726a] mt-0.5">
                    Maksimalkan tampilan game tanpa gangguan peramban
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-4 py-2 font-['IBM_Plex_Mono'] font-bold text-xs border border-[#deded8] bg-[#f5f4f0] text-[#1a1d1f] hover:border-[#1a1d1f] transition-colors cursor-pointer"
                >
                  {fullscreen ? 'KELUAR' : 'AKTIFKAN'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-[#deded8] bg-white">
                <div>
                  <div className="font-bold text-sm text-[#1a1d1f]">PANDUAN KONTROL LENGKAP</div>
                  <div className="text-xs text-[#6b726a] mt-0.5">
                    Buka buku panduan taktis WASD, combat, dan tombol aksi
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    onGuide();
                  }}
                  className="px-4 py-2 font-['IBM_Plex_Mono'] font-bold text-xs border border-[#1a1d1f] bg-[#1a1d1f] text-white transition-colors cursor-pointer"
                >
                  BUKA PANDUAN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#1a1d1f] text-white text-xs font-['IBM_Plex_Mono'] shadow-xl">
          {notice}
        </div>
      )}
    </div>
  );
}
