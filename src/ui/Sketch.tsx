/**
 * Line drawings (R7 §3.4): one stroke weight, night ink. They illustrate services, not proof;
 * real photos go into the care section (decisions D35).
 */
import type { ReactNode } from 'react';
import { cx } from './cx';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Frame({
  children,
  viewBox = '0 0 120 80',
  className,
  title,
}: {
  children: ReactNode;
  viewBox?: string;
  className?: string;
  title: string;
}) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={title} className={cx('h-auto w-full', className)}>
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function CrateSketch({ title, className }: { title: string; className?: string }) {
  return (
    <Frame title={title} className={className}>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${28 + i * 3} ${52 - i * 16})`}>
          <path d="M0 0 h56 v14 h-56 z" {...S} />
          <path d="M-2 0 h60" {...S} />
          <path d="M20 5 h16" {...S} />
        </g>
      ))}
    </Frame>
  );
}

export function WardrobeBoxSketch({ title, className }: { title: string; className?: string }) {
  return (
    <Frame title={title} className={className}>
      <path d="M38 8 h44 v62 h-44 z" {...S} />
      <path d="M42 16 h36" {...S} />
      {[48, 58, 68].map((x) => (
        <g key={x}>
          <path d={`M${x} 16 v4 l-6 6 h12 l-6 -6`} {...S} />
          <path d={`M${x - 6} 26 v26 h12 v-26`} {...S} strokeDasharray="3 3" />
        </g>
      ))}
    </Frame>
  );
}

export function MattressBagSketch({ title, className }: { title: string; className?: string }) {
  return (
    <Frame title={title} className={className}>
      <path d="M14 30 q2 -8 10 -8 h72 q8 0 10 8 v18 q-2 8 -10 8 h-72 q-8 0 -10 -8 z" {...S} />
      <path d="M20 34 h80 M20 44 h80" {...S} strokeDasharray="1 4" />
      <path d="M100 22 l8 -8 M104 26 l8 -6" {...S} />
    </Frame>
  );
}

export function AssemblySketch({ title, className }: { title: string; className?: string }) {
  return (
    <Frame title={title} className={className}>
      <path d="M18 14 h26 v52 h-26 z" {...S} />
      <path d="M50 10 l8 0 v56 h-8 z" {...S} />
      <path d="M64 14 h26 v52 h-26 z" {...S} />
      <path d="M31 40 v0 M77 40 v0" {...S} strokeWidth={3} />
      <g transform="translate(92 46)">
        <path d="M0 0 h16 v8 h-16 z M6 8 v12 h5 v-12 M16 4 h8" {...S} />
      </g>
    </Frame>
  );
}

export function PackingSketch({ title, className }: { title: string; className?: string }) {
  return (
    <Frame title={title} className={className}>
      <path d="M26 30 l34 -12 l34 12 v32 l-34 12 l-34 -12 z" {...S} />
      <path d="M26 30 l34 12 l34 -12 M60 42 v32" {...S} />
      <path d="M43 24 l34 12" {...S} strokeDasharray="3 3" />
    </Frame>
  );
}

export function VisitSketch({ title, className }: { title: string; className?: string }) {
  return (
    <Frame title={title} className={className}>
      <path d="M38 12 h44 v62 h-44 z" {...S} />
      <path d="M52 8 h16 v8 h-16 z" {...S} />
      {[28, 42, 56].map((y) => (
        <g key={y}>
          <path d={`M45 ${y} l3 3 l6 -6`} {...S} />
          <path d={`M60 ${y} h15`} {...S} />
        </g>
      ))}
    </Frame>
  );
}

export function VanSketch({ className, title }: { className?: string; title: string }) {
  return (
    <svg viewBox="0 0 48 24" role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <path d="M2 18 V6 h28 v12 M30 9 h8 l6 6 v3 h-14" {...S} strokeWidth={1.6} />
      <circle cx="11" cy="19" r="3" {...S} strokeWidth={1.6} />
      <circle cx="36" cy="19" r="3" {...S} strokeWidth={1.6} />
    </svg>
  );
}

/**
 * Lift cabins seen from above, at one scale (1 cm = 0.45 px): the class reads from what fits.
 * none = a staircase, unknown = dashed cabin with a question mark.
 */
export function LiftPlan({
  kind,
  className,
  title,
}: {
  kind: 'none' | 'small' | 'medium' | 'large' | 'unknown';
  className?: string;
  title: string;
}) {
  const k = 0.45;
  const cab = { small: [90, 100], medium: [100, 125], large: [110, 210] }[kind === 'unknown' ? 'small' : kind === 'none' ? 'small' : kind];
  const w = cab[0] * k;
  const d = cab[1] * k;
  const x = (100 - w) / 2;
  const y = 6;
  return (
    <svg viewBox="0 0 100 108" role="img" aria-label={title} className={cx('h-auto w-full', className)}>
      <title>{title}</title>
      {kind === 'none' ? (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${22 + i * 9} ${82 - i * 12} h9 v12`} {...S} />
          ))}
        </g>
      ) : (
        <g>
          <rect x={x} y={y} width={w} height={d} rx={1.5} {...S} strokeDasharray={kind === 'unknown' ? '3 3' : undefined} />
          <path
            d={`M${x + w / 2 - ((kind === 'large' ? 90 : kind === 'medium' ? 80 : 70) * k) / 2} ${y + d} h${(kind === 'large' ? 90 : kind === 'medium' ? 80 : 70) * k}`}
            {...S}
            strokeWidth={3.2}
          />
          {kind === 'unknown' ? (
            <text
              x={50}
              y={y + d / 2 + 5}
              fontSize="16"
              textAnchor="middle"
              fill="currentColor"
              fontFamily="var(--font-display)"
              fontWeight={800}
            >
              ?
            </text>
          ) : (
            <>
              {/* fridge 60×65 always fits */}
              <rect x={x + 3} y={y + 3} width={60 * k} height={65 * k} {...S} strokeWidth={1.2} />
              {kind === 'large' && (
                <rect
                  x={x + 3}
                  y={y + 3 + 65 * k + 4}
                  width={95 * k}
                  height={210 * k - 65 * k - 12}
                  {...S}
                  strokeWidth={1.2}
                  strokeDasharray="4 2"
                />
              )}
            </>
          )}
        </g>
      )}
    </svg>
  );
}
