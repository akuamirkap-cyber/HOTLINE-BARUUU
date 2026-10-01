import type { LevelDef } from '../game/levels';
import { Icon } from './Icon';

export function countTargets(level: LevelDef): number {
  return level.map.join('').match(/[mkpsurfB]/g)?.length || 0;
}

export function Floorplan({ level, index }: { level: LevelDef; index: number }) {
  const width = Math.max(...level.map.map((row) => row.length));
  const height = level.map.length;
  const targets = countTargets(level);

  return (
    <figure className="intel-card">
      <div className="intel-topline">
        <span><Icon name="crosshair" size={14} /> TACTICAL VIEW</span>
        <span className="signal-status"><i /> LIVE</span>
      </div>
      <div className="floorplan-stage" key={level.name}>
        <svg className="floorplan-map" viewBox={`-2 -2 ${width + 4} ${height + 4}`} role="img" aria-label={`Denah ${level.name}, ${targets} target`}>
          <rect x="0" y="0" width={width} height={height} fill="#25282b" rx="0.2" />
          {level.helipad && <g stroke="#58636a" fill="none" strokeWidth="0.13"><circle cx={level.helipad.x + 0.5} cy={level.helipad.y + 0.5} r={level.helipad.radius} /><path d={`M${level.helipad.x - 0.5} ${level.helipad.y - 1}v3m2-3v3m-2-1.5h2`} /></g>}
          {level.map.flatMap((row, y) => [...row].map((tile, x) => {
            const key = `${x}-${y}`;
            const cx = x + 0.5;
            const cy = y + 0.5;
            if (tile === '#') return <rect key={key} x={x} y={y} width="1" height="1" fill="#8c9297" opacity="0.68" />;
            if (tile === 'T') return <rect key={key} x={x + 0.12} y={y + 0.12} width="0.76" height="0.76" rx="0.08" fill="#485057" />;
            if (tile === 'G') {
              const vertical = level.map[y - 1]?.[x] === 'G' || level.map[y + 1]?.[x] === 'G';
              return <line key={key} x1={vertical ? cx : x} y1={vertical ? y : cy} x2={vertical ? cx : x + 1} y2={vertical ? y + 1 : cy} stroke="#a2b1b7" strokeWidth="0.18" strokeDasharray="0.18 0.1" opacity="0.75" />;
            }
            if (tile === 'D') return <rect key={key} x={x + 0.12} y={y + 0.12} width="0.76" height="0.76" fill="#ec3944" opacity="0.38" />;
            if (/[mkpsurfB]/.test(tile)) {
              return <g key={key}><circle className="target-halo" cx={cx} cy={cy} r="0.6" fill="#f23c45" opacity="0.15" /><circle cx={cx} cy={cy} r={tile === 'B' ? 0.42 : 0.23} fill="#ff4650" />{tile === 'B' && <circle cx={cx} cy={cy} r="0.78" fill="none" stroke="#ff8790" strokeWidth="0.1" />}</g>;
            }
            if (tile === 'P') return <g key={key}><circle cx={cx} cy={cy} r="0.68" fill="none" stroke="#ffffff" strokeWidth="0.08" opacity="0.55" /><circle cx={cx} cy={cy} r="0.23" fill="#ffffff" /></g>;
            if (tile === 'E') return <rect key={key} x={x + 0.18} y={y + 0.18} width="0.64" height="0.64" rx="0.07" fill="none" stroke="#d8dce0" strokeWidth="0.12" />;
            return null;
          }))}
        </svg>
      </div>
      <span className="intel-corner intel-corner-tl" aria-hidden="true" />
      <span className="intel-corner intel-corner-br" aria-hidden="true" />
      <figcaption className="intel-caption">
        <span><b>{String(index + 1).padStart(2, '0')}</b> / {level.name}</span>
        <span className="intel-targets"><i /> {String(targets).padStart(2, '0')} TARGETS</span>
      </figcaption>
    </figure>
  );
}
