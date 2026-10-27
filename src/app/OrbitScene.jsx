import React, { useEffect, useId, useState } from 'react';
import './OrbitScene.css';

const PALETTE = ['#7899ee', '#d4b392', '#a4b9c1', '#ae9bda', '#a5bb99', '#c78979'];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * A content-agnostic map of linked spaces.
 * Up to four objects share one period and evenly spaced phases, so their labels
 * never catch one another. Narrow containers and larger collections use fixed
 * constellation positions; the same links and keyboard order remain available.
 */
export default function OrbitScene({ items = [], brand = 'Seung', className = '' }) {
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const sceneId = useId();
  const spaces = (Array.isArray(items) ? items : []).filter(item => item && item.id && item.title && item.href);
  const count = spaces.length;
  const expanded = count > 4;
  const fixed = expanded || reducedMotion;
  const staticRows = Math.max(1, Math.ceil(Math.max(0, count - 1) / 2));

  return (
    <section
      className={`orbit-universe${expanded ? ' orbit-expanded' : ''}${fixed ? ' orbit-fixed' : ''} ${className}`.trim()}
      aria-label={`${brand}의 탐험 지도`}
      data-paused={paused || fixed ? 'true' : 'false'}
      style={{ '--orbit-count': Math.max(1, count), '--orbit-static-rows': staticRows }}
    >
      <div className="orbit-topline">
        <span className="orbit-eyebrow"><i aria-hidden="true" />EXPLORE THE LABS</span>
        {!fixed && <button
          className="orbit-motion-toggle"
          type="button"
          aria-pressed={paused}
          aria-describedby={`${sceneId}-motion`}
          onClick={() => setPaused(value => !value)}
        ><span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>{paused ? '공전 재개' : '공전 정지'}</button>}
        <span className={`orbit-motion-state${fixed ? ' is-fixed' : ''}`}>고정된 지도</span>
      </div>

      <div className="orbit-stage">
        <div className="orbit-starlight" aria-hidden="true" />
        <div className="orbit-reticle orbit-reticle-horizontal" aria-hidden="true" />
        <div className="orbit-reticle orbit-reticle-vertical" aria-hidden="true" />
        <div className="orbit-ring orbit-ring-outer" aria-hidden="true" />
        <div className="orbit-ring orbit-ring-inner" aria-hidden="true" />
        <div className="orbit-core" aria-hidden="true">
          <span className="orbit-core-light" />
          <span className="orbit-core-mark">S</span>
          <span className="orbit-core-name">{brand}</span>
          <span className="orbit-core-caption">AI LABS</span>
        </div>

        {count > 0 ? <ol className="orbit-spaces" aria-label="실습 공간 선택">
          {spaces.map((item, index) => {
            // Fixed equal spacing keeps the three primary destinations legible
            // throughout the complete 120-second revolution.
            const phase = 12 + index * 360 / count;
            const row = index === 0 ? 0 : Math.ceil(index / 2);
            const x = index === 0 ? '50%' : index % 2 === 1 ? '22%' : '78%';
            return <li
              className={`orbit-track orbit-track-${index % PALETTE.length}`}
              key={item.id}
              style={{ '--orbit-phase': `${phase}deg`, '--planet-accent': item.color || PALETTE[index % PALETTE.length], '--orbit-static-x': x, '--orbit-static-row': row }}
            >
              <div className="orbit-rotor">
                <div className="orbit-satellite">
                  <div className="orbit-upright">
                    <a className="orbit-link" href={item.href} title={item.title} aria-describedby={item.description ? `${sceneId}-description-${index}` : undefined}>
                      <span className="orbit-planet" aria-hidden="true"><span className="orbit-planet-detail" /></span>
                      <span className="orbit-label">
                        <span className="orbit-index">{String(index + 1).padStart(2, '0')}{item.label ? ` / ${item.label}` : ''}</span>
                        <strong>{item.title}</strong>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
              {item.description && <span id={`${sceneId}-description-${index}`} className="orbit-sr">{item.description}</span>}
            </li>;
          })}
        </ol> : <p className="orbit-empty">새로운 탐험 공간을 준비하고 있습니다.</p>}
      </div>

      <div className="orbit-bottomline" aria-hidden="true"><span>{String(count).padStart(2, '0')} SPACES</span><span>IDEAS IN ORBIT</span><span className="orbit-north">N ↑</span></div>
      <p id={`${sceneId}-motion`} className="orbit-sr">행성이나 지도 위에 마우스를 올리거나 링크에 초점을 맞추면 움직임이 멈춥니다. 공전 정지 버튼으로 계속 멈춰 둘 수 있습니다.</p>
    </section>
  );
}
