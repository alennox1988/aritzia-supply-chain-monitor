'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import AlertFeed from './AlertFeed';
import type { WeatherResult } from '@/lib/types';

// Leaflet cannot run on the server — must be imported in a Client Component
const Map = dynamic(() => import('./Map'), { ssr: false });

interface DashboardClientProps {
  weatherData: WeatherResult[];
}

export default function DashboardClient({ weatherData }: DashboardClientProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Map — takes remaining width */}
      <div className="flex-1 relative">
        <Map
          weatherData={weatherData}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
      </div>

      {/* Alert feed sidebar */}
      <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
        <AlertFeed
          weatherData={weatherData}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
        />
      </div>
    </div>
  );
}
