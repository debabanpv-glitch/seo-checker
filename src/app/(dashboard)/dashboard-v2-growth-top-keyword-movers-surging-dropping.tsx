'use client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeywordMover {
  keyword: string;
  position: number;
  change: number;
}

interface Props {
  surging: KeywordMover[];
  dropping: KeywordMover[];
}

// ---------------------------------------------------------------------------
// Position tier badge
// ---------------------------------------------------------------------------

function PositionBadge({ position }: { position: number }) {
  if (position <= 0) {
    return (
      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-[#8888a0]">
        --
      </span>
    );
  }
  if (position <= 3) {
    return (
      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-500/20 text-yellow-400">
        Top 3
      </span>
    );
  }
  if (position <= 10) {
    return (
      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-400">
        Top 10
      </span>
    );
  }
  if (position <= 30) {
    return (
      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-600/15 text-yellow-600">
        Top 30
      </span>
    );
  }
  return (
    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-[#8888a0]">
      #{position}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single mover row
// ---------------------------------------------------------------------------

function MoverRow({ item, type }: { item: KeywordMover; type: 'surging' | 'dropping' }) {
  const isSurging = type === 'surging';
  const absChange = Math.abs(item.change);

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-xs font-bold shrink-0 ${isSurging ? 'text-green-400' : 'text-red-400'}`}
        >
          {isSurging ? '↑' : '↓'}
        </span>
        <span
          className="text-xs text-[var(--text-primary)] truncate"
          title={item.keyword}
        >
          {item.keyword}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] font-semibold ${isSurging ? 'text-green-400' : 'text-red-400'}`}
        >
          {isSurging ? '+' : '-'}{absChange}
        </span>
        <PositionBadge position={item.position} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardV2GrowthTopKeywordMoversSurgingDropping
// ---------------------------------------------------------------------------

export default function DashboardV2GrowthTopKeywordMoversSurgingDropping({
  surging,
  dropping,
}: Props) {
  const surgingList = surging.slice(0, 10);
  const droppingList = dropping.slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Tăng mạnh */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-green-400 text-base font-bold">↑</span>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Tăng mạnh</h3>
          {surgingList.length > 0 && (
            <span className="ml-auto text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">
              {surgingList.length} từ khóa
            </span>
          )}
        </div>
        {surgingList.length === 0 ? (
          <p className="text-xs text-[#8888a0] text-center py-6">Không có thay đổi</p>
        ) : (
          <div>
            {surgingList.map((item, i) => (
              <MoverRow key={i} item={item} type="surging" />
            ))}
          </div>
        )}
      </div>

      {/* Giảm mạnh */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-red-400 text-base font-bold">↓</span>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Giảm mạnh</h3>
          {droppingList.length > 0 && (
            <span className="ml-auto text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-medium">
              {droppingList.length} từ khóa
            </span>
          )}
        </div>
        {droppingList.length === 0 ? (
          <p className="text-xs text-[#8888a0] text-center py-6">Không có thay đổi</p>
        ) : (
          <div>
            {droppingList.map((item, i) => (
              <MoverRow key={i} item={item} type="dropping" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
