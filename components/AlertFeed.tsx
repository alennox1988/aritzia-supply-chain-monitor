'use client';

import { useState } from 'react';
import type { WeatherResult, AlertSeverity } from '@/lib/types';

const SEVERITY_ORDER: AlertSeverity[] = ['extreme', 'severe', 'moderate', 'minor', 'clear'];

const SEVERITY_CONFIG = {
  extreme: { label: 'Critical', dot: 'bg-red-500', badge: 'bg-red-900/60 text-red-300 border-red-700', border: 'border-l-red-500' },
  severe:  { label: 'Severe',   dot: 'bg-orange-500', badge: 'bg-orange-900/60 text-orange-300 border-orange-700', border: 'border-l-orange-500' },
  moderate:{ label: 'Watch',    dot: 'bg-yellow-500', badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-700', border: 'border-l-yellow-500' },
  minor:   { label: 'Advisory', dot: 'bg-blue-500', badge: 'bg-blue-900/40 text-blue-300 border-blue-700', border: 'border-l-blue-500' },
  clear:   { label: 'Clear',    dot: 'bg-green-500', badge: 'bg-green-900/30 text-green-400 border-green-800', border: 'border-l-slate-700' },
};

type FilterType = 'all' | 'alerts' | 'Store' | 'DC';

interface AlertFeedProps {
  weatherData: WeatherResult[];
  onSelectLocation?: (id: string | null) => void;
  selectedLocation?: string | null;
}

export default function AlertFeed({ weatherData, onSelectLocation, selectedLocation }: AlertFeedProps) {
  const [filter, setFilter] = useState<FilterType>('alerts');

  const filtered = weatherData
    .filter((w) => {
      if (filter === 'alerts') return w.severity !== 'clear';
      if (filter === 'Store') return w.location.type === 'Store';
      if (filter === 'DC') return w.location.type === 'DC';
      return true;
    })
    .sort((a, b) => {
      const ai = SEVERITY_ORDER.indexOf(a.severity);
      const bi = SEVERITY_ORDER.indexOf(b.severity);
      return ai - bi;
    });

  const alertCount = weatherData.filter((w) => w.severity !== 'clear').length;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700">
      {/* Filter bar */}
      <div className="px-3 py-2 border-b border-slate-700 flex gap-1 flex-shrink-0">
        {(['alerts', 'all', 'Store', 'DC'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f === 'alerts' ? `Alerts (${alertCount})` : f === 'all' ? 'All' : f === 'Store' ? 'Stores' : 'DCs'}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            <div className="text-2xl mb-2">✓</div>
            {filter === 'alerts' ? 'No active alerts' : 'No locations found'}
          </div>
        )}

        {filtered.map((item) => {
          const config = SEVERITY_CONFIG[item.severity];
          const isSelected = selectedLocation === item.location.id;

          return (
            <div
              key={item.location.id}
              onClick={() => onSelectLocation?.(isSelected ? null : item.location.id)}
              className={`border-l-4 ${config.border} border-b border-slate-800 px-3 py-2.5 cursor-pointer transition-colors ${
                isSelected ? 'bg-slate-700' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${config.badge}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {item.location.type === 'DC' ? 'DC' : 'Store'}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-100 truncate leading-tight">
                    {item.location.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {item.location.city}, {item.location.state} &mdash; DC: {item.location.primaryDC || item.location.id}
                  </p>

                  {item.currentWeather && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.currentWeather.temperatureC.toFixed(0)}°C &nbsp;&bull;&nbsp; {item.currentWeather.description}
                    </p>
                  )}

                  {item.alerts.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {item.alerts.slice(0, 2).map((alert, i) => (
                        <p key={i} className="text-xs text-slate-300 leading-snug">
                          {alert.headline}
                        </p>
                      ))}
                      {item.alerts.length > 2 && (
                        <p className="text-xs text-slate-500">+{item.alerts.length - 2} more alerts</p>
                      )}
                    </div>
                  )}

                  {item.earthquakes.length > 0 && (
                    <div className="mt-1">
                      {item.earthquakes.map((eq, i) => (
                        <p key={i} className="text-xs text-orange-400">
                          M{eq.magnitude.toFixed(1)} earthquake — {eq.place} ({eq.distanceKm}km away)
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${config.dot}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-500 flex-shrink-0">
        {filtered.length} location{filtered.length !== 1 ? 's' : ''} shown &bull; Refreshes every 6 hours
      </div>
    </div>
  );
}
