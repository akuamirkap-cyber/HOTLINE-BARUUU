import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

const basicControls = [
  { label: 'Bergerak', detail: 'Posisi menentukan segalanya.', keys: ['W', 'A', 'S', 'D'] },
  { label: 'Arahkan', detail: 'Bidik dengan gerakan mouse.', keys: ['MOUSE'] },
  { label: 'Combo serangan', detail: 'Jab → Cross → Hook → Spin kick', keys: ['KLIK KIRI ×4'] },
  { label: 'Ambil / lempar senjata', detail: 'Manfaatkan apa yang ada.', keys: ['KLIK KANAN'] },
  { label: 'Tendang', detail: 'Buat musuh terpental.', keys: ['F', 'E'] },
];

const tacticalControls = [
  { label: 'Focus / slow motion', detail: 'Tahan tombol untuk memperlambat.', keys: ['C', 'RODA'] },
  { label: 'Sandera / sprint / finish', detail: 'Aksi berubah sesuai target terdekat.', keys: ['SPASI'] },
  { label: 'Mode SUPERHOT', detail: 'Waktu bergerak saat kamu bergerak.', keys: ['T'] },
  { label: 'Matikan semua slow-mo', detail: 'Kembali ke kecepatan normal.', keys: ['N'] },
  { label: 'Restart / pause', detail: 'Saat pause, Q kembali ke menu.', keys: ['R', 'ESC'] },
];

export function ControlsDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Guard the repeated effect setup in React StrictMode. Closing in effect
    // cleanup would fire onClose and immediately dismiss the new dialog.
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="controls-dialog"
      aria-labelledby="controls-title"
      aria-describedby="controls-description"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) ref.current?.close();
      }}
    >
      <div className="guide-content">
        <div className="guide-topline"><span className="eyebrow"><span className="overline-mark" /> FIELD MANUAL / 01</span><button className="icon-button" type="button" onClick={() => ref.current?.close()} aria-label="Tutup panduan" autoFocus><Icon name="close" size={20} /></button></div>
        <h2 id="controls-title">Kenali gerakanmu.</h2>
        <p id="controls-description">Kuasai gerakan. Kendalikan waktu. Tetap hidup.</p>
        <div className="guide-mobile-info"><Icon name="device" size={22} /><div><strong>Mode mobile / landscape</strong><p>Joystick kiri untuk gerak. Joystick kanan untuk bidik + auto serang. TENDANG, AKSI, LEMPAR/AMBIL, dan tahan FOKUS tersedia di layar. Di PC, aktifkan lewat tombol mobile di menu atau toolbar game.</p></div></div>
        <div className="guide-grid">
          {[{ title: '01 / DASAR', controls: basicControls }, { title: '02 / TAKTIK', controls: tacticalControls }].map((group) => (
            <section className="control-group" key={group.title} aria-label={group.title}>
              <h3 className="eyebrow">{group.title}</h3>
              <dl>
                {group.controls.map((control) => (
                  <div className="control-row" key={control.label}>
                    <dt><span>{control.label}</span><small>{control.detail}</small></dt>
                    <dd>{control.keys.map((key) => <kbd key={key}>{key}</kbd>)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <div className="guide-tip"><Icon name="crosshair" size={22} /><p><strong>Jadikan musuh perisaimu.</strong> Tekan SPASI di dekat musuh yang berdiri untuk menyandera. Tekan lagi untuk melemparnya. Tanpa target? Kamu akan sprint.</p></div>
        <div className="guide-footer"><span>Keyboard & mouse / layar sentuh.</span><button className="guide-done-button" type="button" onClick={() => ref.current?.close()}>MENGERTI <kbd>ESC</kbd></button></div>
      </div>
    </dialog>
  );
}
