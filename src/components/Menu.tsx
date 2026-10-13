import { useEffect, useState, useMemo } from 'react';
import { LEVELS } from '../game/levels';
import { Floorplan, countTargets } from './Floorplan';
import { Icon } from './Icon';
import { SKINS, type SkinId } from '../game/skins';
import { SkinSelectorModal } from './SkinSelectorModal';
import '../menu.css';

interface MenuProps {
  unlocked: number;
  best: Record<number, number>;
  selected: number;
  currentSkin: SkinId;
  onSelectSkin: (skin: SkinId) => void;
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
  currentSkin,
  onSelectSkin,
  onSelect,
  onStart,
  onGuide,
  mobileControls,
  touchDevice: _touchDevice,
  onToggleControls,
}: MenuProps) {
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [notice, setNotice] = useState('');
  const [skinSelectOpen, setSkinSelectOpen] = useState(false);

  const level = LEVELS[selected] || LEVELS[0];
  const totalBest = useMemo(
    () => Object.values(best).reduce((sum, score) => sum + score, 0),
    [best]
  );

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
      else setNotice('Mode layar penuh tidak didukung di browser ini.');
    } catch {
      setNotice('Browser membatasi layar penuh. Buka preview di tab baru.');
    }
  };

  return (
    <div className="menu-page">
      <div className="menu-container">
        {/* HEADER */}
        <header className="menu-header">
          <div className="brand">
            <span className="brand-symbol" aria-hidden="true">
              <i />
              <i />
            </span>
            <span>
              HOT<span className="brand-period">.</span>LINE
            </span>
            <span className="header-motto">TOP-DOWN RETRO ACTION // SUPERHOT × HOTLINE</span>
          </div>

          <nav className="menu-nav">
            <button
              type="button"
              className="menu-mobile-toggle"
              onClick={() => setSkinSelectOpen(true)}
              title="Pilih skin karakter"
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--red)',
                  display: 'inline-block',
                }}
              />
              <span>SKIN: {SKINS[currentSkin]?.name.split('//')[0].trim() || 'SUPERHOT'}</span>
            </button>

            <button
              type="button"
              className={`menu-mobile-toggle ${mobileControls ? 'is-enabled' : ''}`}
              onClick={onToggleControls}
              title="Toggle kontrol sentuh layar"
            >
              <Icon name="device" size={14} />
              <span>{mobileControls ? 'SENTUH AKTIF' : 'SENTUH OFF'}</span>
            </button>

            <button
              type="button"
              className="guide-button"
              onClick={onGuide}
            >
              <Icon name="keyboard" size={16} />
              <span>PANDUAN</span>
              <kbd>?</kbd>
            </button>

            <span className="nav-divider" />

            <button
              type="button"
              className="icon-button"
              onClick={toggleFullscreen}
              title={fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              aria-label={fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              <Icon name={fullscreen ? 'collapse' : 'expand'} size={18} />
            </button>
          </nav>
        </header>

        {/* MAIN BODY */}
        <main className="menu-main">
          {/* HERO SECTION */}
          <section className="hero">
            <p className="eyebrow hero-overline">
              <span className="overline-mark" aria-hidden="true" />
              RETRO TOP-DOWN ACTION // SUPERHOT MEETS HOTLINE
            </p>
            <h1 className="hero-title">
              <span className="title-line">
                HOT<span className="title-slashes">//</span>
              </span>
              <span className="title-line">
                LINE<span className="title-stop">.</span>
              </span>
            </h1>
            <div className="hero-copy">
              <p className="hero-tagline">
                Gerakanmu adalah waktu. <span>Satu pukulan menentukan hidup dan mati.</span>
              </p>
              <p className="hero-description">
                Bersihkan setiap lantai dari gangster berjas merah. Waktu melambat saat diam, melesat saat bergerak.
              </p>
            </div>
            <Floorplan level={level} index={selected} />
          </section>

          {/* MISSION PANEL */}
          <section className="mission-panel" aria-label="Pemilihan Lantai">
            <div className="mission-heading">
              <div>
                <span className="eyebrow">DAFTAR LANTAI</span>
                <h2>PILIH LANTAI</h2>
              </div>
              <div className="mission-progress">
                <div className="progress-count">
                  <strong>{unlocked}</strong> / {LEVELS.length}
                </div>
                <div className="progress-bars" aria-hidden="true">
                  {LEVELS.map((_, i) => (
                    <i key={i} className={i < unlocked ? 'is-unlocked' : ''} />
                  ))}
                </div>
              </div>
            </div>

            <ul className="level-list">
              {LEVELS.map((lvl, index) => {
                const isSelected = selected === index;
                const isLocked = index >= unlocked;
                const targetCount = countTargets(lvl);
                return (
                  <li key={lvl.name}>
                    <button
                      type="button"
                      className={`level-option ${isSelected ? 'is-selected' : ''} ${
                        isLocked ? 'is-locked' : ''
                      }`}
                      onClick={() => {
                        if (!isLocked) onSelect(index);
                      }}
                      disabled={isLocked}
                    >
                      <span className="level-index">{String(index + 1).padStart(2, '0')}</span>
                      <div className="level-information">
                        <span className="level-name">{lvl.name}</span>
                        <span className="level-subtitle">
                          {lvl.sub || `${targetCount} TARGET`}
                        </span>
                      </div>
                      <div className="level-trailing">
                        {best[index] ? (
                          <div className="level-best">
                            {formatScore(best[index])}
                            <small>REKOR</small>
                          </div>
                        ) : null}
                        <div className="level-state">
                          <Icon
                            name={isLocked ? 'lock' : isSelected ? 'check' : 'arrow'}
                            size={14}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="unlock-note">
              <Icon name="crosshair" size={13} />
              <p>Selesaikan lantai untuk membuka misi berikutnya.</p>
            </div>

            <button
              type="button"
              className="start-button"
              onClick={onStart}
            >
              <div>
                <span className="start-label">MULAI MISI</span>
                <span className="start-destination">
                  LANTAI {String(selected + 1).padStart(2, '0')}: {level.name.toUpperCase()}
                </span>
              </div>
              <span className="start-arrow">
                <Icon name="arrow" size={20} />
              </span>
            </button>

            <div className="start-hint">
              <span>
                Tekan <kbd>SPASI</kbd> atau <kbd>ENTER</kbd> untuk mulai
              </span>
              <span className="hint-separator">·</span>
              <span>
                <kbd>W</kbd>/<kbd>S</kbd> pilih lantai
              </span>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="menu-footer">
          <div className="quick-controls">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> Gerak
            </span>
            <span>
              <kbd>MOUSE</kbd> Bidik & Serang
            </span>
            <span>
              <kbd>SPASI</kbd> Sandera / Sprint
            </span>
            <span>
              <kbd>KLIK KANAN</kbd> Lempar
            </span>
          </div>
          <div className="footer-right">
            <div className="save-indicator">
              <Icon name="check" size={13} /> Tersimpan otomatis
            </div>
            <div className="total-score">
              <span>TOTAL SKOR</span>
              <strong>
                {formatScore(totalBest)} <span className="score-unit">PTS</span>
              </strong>
            </div>
          </div>
        </footer>
      </div>

      {/* Skin Selector Modal */}
      {skinSelectOpen && (
        <SkinSelectorModal
          currentSkin={currentSkin}
          onSelectSkin={(id) => {
            onSelectSkin(id);
            setNotice(`Skin ${SKINS[id]?.name || id} aktif.`);
          }}
          onClose={() => setSkinSelectOpen(false)}
        />
      )}

      {/* Notification Toast */}
      {notice && <div className="menu-notice">{notice}</div>}
    </div>
  );
}
