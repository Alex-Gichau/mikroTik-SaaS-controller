'use client';

type DiffLine =
  | { type: 'added';   key: string; newVal: unknown }
  | { type: 'removed'; key: string; oldVal: unknown }
  | { type: 'changed'; key: string; oldVal: unknown; newVal: unknown }
  | { type: 'same';    key: string; val: unknown };

function diffObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): DiffLine[] {
  const keys = Array.from(new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])).sort();
  return keys.map((key): DiffLine => {
    const inA = key in (a ?? {});
    const inB = key in (b ?? {});
    if (!inA) return { type: 'added',   key, newVal: b[key] };
    if (!inB) return { type: 'removed', key, oldVal: a[key] };
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
      return { type: 'changed', key, oldVal: a[key], newVal: b[key] };
    return { type: 'same', key, val: a[key] };
  });
}

function fmt(v: unknown) {
  if (Array.isArray(v)) return `[${(v as string[]).join(', ')}]`;
  return JSON.stringify(v);
}

interface SnapshotDiffProps {
  blobA: Record<string, unknown>;
  blobB: Record<string, unknown>;
  labelA?: string;
  labelB?: string;
}

export function SnapshotDiff({
  blobA,
  blobB,
  labelA = 'Previous',
  labelB = 'Current',
}: SnapshotDiffProps) {
  const lines = diffObjects(blobA, blobB);
  const changed = lines.filter(l => l.type !== 'same');

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 font-mono text-xs">
      {/* Diff header */}
      <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex gap-6 text-white/40">
          <span className="text-red-400/80">--- {labelA}</span>
          <span className="text-emerald-400/80">+++ {labelB}</span>
        </div>
        <span className="text-white/20 text-[10px]">
          {changed.length} change{changed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {changed.length === 0 ? (
        <div className="px-4 py-6 text-center text-white/30">
          No differences — configs are identical.
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {lines.map((line, i) => {
            if (line.type === 'same') return null;
            return (
              <div key={i}>
                {(line.type === 'removed' || line.type === 'changed') && (
                  <div className="flex gap-3 px-4 py-1.5 bg-red-500/[0.07] border-l-2 border-red-500/60">
                    <span className="text-red-500/60 select-none w-3 shrink-0">-</span>
                    <span className="text-red-300/80 break-all">
                      <span className="text-red-500/60 mr-2">[{line.key}]</span>
                      {fmt(line.type === 'removed' ? line.oldVal : line.oldVal)}
                    </span>
                  </div>
                )}
                {(line.type === 'added' || line.type === 'changed') && (
                  <div className="flex gap-3 px-4 py-1.5 bg-emerald-500/[0.07] border-l-2 border-emerald-500/60">
                    <span className="text-emerald-500/60 select-none w-3 shrink-0">+</span>
                    <span className="text-emerald-300/80 break-all">
                      <span className="text-emerald-500/60 mr-2">[{line.key}]</span>
                      {fmt(line.type === 'added' ? line.newVal : line.newVal)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
