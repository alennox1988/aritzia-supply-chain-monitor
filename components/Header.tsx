'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  total: number;
  stores: number;
  dcs: number;
  extreme: number;
  severe: number;
  moderate: number;
}

interface HeaderProps {
  stats: Stats;
  lastUpdated: string;
}

export default function Header({ stats, lastUpdated }: HeaderProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetch('/api/cron');
    router.refresh();
    setTimeout(() => setRefreshing(false), 2000);
  };

  const updated = new Date(lastUpdated);
  const timeStr = updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = updated.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-lg font-semibold tracking-widest uppercase text-white">
            Aritzia
          </h1>
          <p className="text-xs text-slate-400 tracking-wider uppercase">
            Supply Chain Monitor
          </p>
        </div>

        <div className="hidden md:flex items-center gap-4 text-sm">
          <StatPill label="Locations" value={stats.total} color="slate" />
          <StatPill label="Stores" value={stats.stores} color="slate" />
          <StatPill label="DCs" value={stats.dcs} color="blue" />
          {stats.extreme > 0 && <StatPill label="Critical" value={stats.extreme} color="red" />}
          {stats.severe > 0 && <StatPill label="Severe" value={stats.severe} color="orange" />}
          {stats.moderate > 0 && <StatPill label="Watch" value={stats.moderate} color="yellow" />}
          {stats.extreme === 0 && stats.severe === 0 && (
            <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              All Clear
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Updated {dateStr} {timeStr}</span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 disabled:opacity-50 transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'slate' | 'blue' | 'red' | 'orange' | 'yellow' | 'green';
}) {
  const colorMap = {
    slate: 'bg-slate-700 text-slate-200',
    blue: 'bg-blue-900/50 text-blue-300',
    red: 'bg-red-900/60 text-red-300',
    orange: 'bg-orange-900/60 text-orange-300',
    yellow: 'bg-yellow-900/50 text-yellow-300',
    green: 'bg-green-900/50 text-green-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[color]}`}>
      {value} {label}
    </span>
  );
}
