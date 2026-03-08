'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import AlertFeed from './AlertFeed';
import type { WeatherResult } from '@/lib/types';

const Map = dynamic(() => import('./Map'), { ssr: false });

type MobileTab = 'map' | 'alerts';

interface DashboardClientProps {
  weatherData: WeatherResult[];
}

export default function DashboardClient({ weatherData }: DashboardClientProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');

  const alertCount = weatherData.filter((w) => w.severity !== 'clear').length;

  return (
    // flex-col on mobile (stack map/feed + tab bar), flex-row on desktop
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

      {/* Map — hidden on mobile when alerts tab is active */}
      <div className={`flex-1 relative ${mobileTab === 'alerts' ? 'hidden md:block' : 'block'}`}>
        <Map
          weatherData={weatherData}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
      </div>

      {/* Alert feed — full width on mobile, fixed sidebar on desktop */}
      <div
        className={`flex flex-col overflow-hidden flex-shrink-0
          md:flex md:w-80 xl:w-96
          ${mobileTab === 'map' ? 'hidden md:flex' : 'flex flex-1'}`}
      >
        <AlertFeed
          weatherData={weatherData}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
      </div>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <div className="md:hidden flex-shrink-0 flex border-t border-slate-700 bg-slate-900">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'text-white bg-slate-800' : 'text-slate-500'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setMobileTab('alerts')}
          className={`flex-1 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            mobileTab === 'alerts' ? 'text-white bg-slate-800' : 'text-slate-500'
          }`}
        >
          Alerts
          {alertCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {alertCount}
            </span>
          )}
        </button>
      </div>

    </div>
  );
}
