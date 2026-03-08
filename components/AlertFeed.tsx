'use client';

import { useState, useMemo } from 'react';
import type { WeatherResult, AlertSeverity } from '@/lib/types';

const SEVERITY_ORDER: AlertSeverity[] = ['extreme', 'severe', 'moderate', 'minor', 'clear'];

const SEVERITY_CONFIG = {
  extreme: { label: 'Critical', dot: 'bg-red-500',    badge: 'bg-red-900/60 text-red-300 border-red-700',       border: 'border-l-red-500' },
  severe:  { label: 'Severe',   dot: 'bg-orange-500', badge: 'bg-orange-900/60 text-orange-300 border-orange-700', border: 'border-l-orange-500' },
  moderate:{ label: 'Watch',    dot: 'bg-yellow-500', badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-700', border: 'border-l-yellow-500' },
  minor:   { label: 'Advisory', dot: 'bg-blue-500',   badge: 'bg-blue-900/40 text-blue-300 border-blue-700',      border: 'border-l-blue-500' },
  clear:   { label: 'Clear',    dot: 'bg-green-500',  badge: 'bg-green-900/30 text-green-400 border-green-800',   border: 'border-l-slate-700' },
};

const REGIONS = ['PACIFIC', 'MOUNTAIN', 'CENTRAL', 'EASTERN', 'HAWAII'];

type TypeFilter = 'all' | 'alerts' | 'Store' | 'DC';

interface AlertFeedProps {
  weatherData: WeatherResult[];
  onSelectLocation?: (id: string | null) => void;
  selectedLocation?: string | null;
}

export default function AlertFeed({ weatherData, onSelectLocation, selectedLocation }: AlertFeedProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('alerts');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');

  // Build dynamic state list based on selected country
  const stateOptions = useMemo(() => {
    const base = countryFilter
      ? weatherData.filter((w) => w.location.country === countryFilter)
      : weatherData;
    const states = Array.from(new Set(base.map((w) => w.location.state))).sort();
    return states;
  }, [weatherData, countryFilter]);

  // Reset state when country changes
  const handleCountryChange = (val: string) => {
    setCountryFilter(val);
    setStateFilter('');
  };

  const filtered = weatherData
    .filter((w) => {
      if (typeFilter === 'alerts') return w.severity !== 'clear';
      if (typeFilter === 'Store') return w.location.type === 'Store';
      if (typeFilter === 'DC') return w.location.type === 'DC';
      return true;
    })
    .filter((w) => !regionFilter || w.location.timezone === regionFilter)
    .filter((w) => !countryFilter || w.location.country === countryFilter)
    .filter((w) => !stateFilter || w.location.state === stateFilter)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  const alertCount = weatherData.filter((w) => w.severity !== 'clear').length;
  const activeFilterCount = [regionFilter, countryFilter, stateFilter].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700">

      {/* Type filter tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-slate-800 flex gap-1 flex-shrink-0">
        {(['alerts', 'all', 'Store', 'DC'] as TypeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              typeFilter === f ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f === 'alerts' ? `Alerts (${alertCount})` : f === 'all' ? 'All' : f === 'Store' ? 'Stores' : 'DCs'}
          </button>
        ))}
      </div>

      {/* Region filter */}
      <div className="px-3 py-1.5 border-b border-slate-800 flex-shrink-0">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setRegionFilter('')}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              !regionFilter ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            All Regions
          </button>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(regionFilter === r ? '' : r)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                regionFilter === r ? 'bg-blue-700 text-blue-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Country + State/Province dropdowns */}
      <div className="px-3 py-1.5 border-b border-slate-700 flex gap-2 flex-shrink-0 flex-wrap">
        <select
          value={countryFilter}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-slate-500"
        >
          <option value="">All Countries</option>
          <option value="Canada">Canada</option>
          <option value="United States">United States</option>
        </select>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-slate-500"
          disabled={stateOptions.length === 0}
        >
          <option value="">All {countryFilter === 'Canada' ? 'Provinces' : countryFilter === 'United States' ? 'States' : 'States/Provs'}</option>
          {stateOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={() => { setRegionFilter(''); setCountryFilter(''); setStateFilter(''); }}
            className="text-xs text-slate-500 hover:text-slate-300 px-1 flex-shrink-0"
            title="Clear filters"
          >
            ✕
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            <div className="text-lg mb-1">✓</div>
            {typeFilter === 'alerts' ? 'No active alerts' : 'No locations match filters'}
          </div>
        )}

        {filtered.map((item) => {
          const config = SEVERITY_CONFIG[item.severity];
          const isSelected = selectedLocation === item.location.id;
          const isStore = item.location.type === 'Store';

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
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${config.badge}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {item.location.type}
                    </span>
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {item.location.timezone}
                    </span>
                  </div>

                  {/* Store number + name */}
                  <p className="text-sm font-medium text-slate-100 truncate leading-tight">
                    {isStore && (
                      <span className="text-slate-500 font-normal mr-1">#{item.location.id}</span>
                    )}
                    {item.location.name}
                  </p>

                  <p className="text-xs text-slate-400 truncate">
                    {item.location.city}, {item.location.state}, {item.location.country === 'Canada' ? 'CA' : 'US'}
                    {item.location.primaryDC && ` — DC: ${item.location.primaryDC}`}
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

                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${config.dot}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-500 flex-shrink-0 flex justify-between">
        <span>{filtered.length} location{filtered.length !== 1 ? 's' : ''} shown</span>
        <span>Refreshes every 6h</span>
      </div>
    </div>
  );
}
