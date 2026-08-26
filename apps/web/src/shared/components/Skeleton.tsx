/**
 * Shimmer placeholders shaped like the content they replace. A skeleton that
 * matches the final layout stops the page jumping when data lands, which a
 * centred spinner never does.
 */
export function Skeleton({ width = '100%', height = 14 }: { width?: number | string; height?: number }) {
  return <span className="skeleton" style={{ display: 'block', width, height }} />;
}

export function SkeletonRows({ rows = 5, height = 38 }: { rows?: number; height?: number }) {
  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  );
}

export function SkeletonCards({ cards = 4 }: { cards?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--space-3)',
      }}
    >
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton key={index} height={96} />
      ))}
    </div>
  );
}
