'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { WeatherResult, AlertSeverity } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  extreme: '#ef4444',
  severe: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6',
  clear: '#22c55e',
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  extreme: 'CRITICAL',
  severe: 'SEVERE',
  moderate: 'WATCH',
  minor: 'ADVISORY',
  clear: 'CLEAR',
};

function FlyToSelected({ weatherData, selectedId }: { weatherData: WeatherResult[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const item = weatherData.find((w) => w.location.id === selectedId);
    if (item) {
      map.flyTo([item.location.lat, item.location.lng], 10, { duration: 1.2 });
    }
  }, [selectedId, weatherData, map]);
  return null;
}

interface MapProps {
  weatherData: WeatherResult[];
  selectedLocation: string | null;
  onSelectLocation: (id: string | null) => void;
}

export default function Map({ weatherData, selectedLocation, onSelectLocation }: MapProps) {
  const markerRefs = useRef<Record<string, L.CircleMarker | null>>({});

  return (
    <MapContainer
      center={[45, -95]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={18}
      />

      <FlyToSelected weatherData={weatherData} selectedId={selectedLocation} />

      {weatherData.map((item) => {
        const color = SEVERITY_COLORS[item.severity];
        const isDC = item.location.type === 'DC';
        const isSelected = selectedLocation === item.location.id;

        return (
          <CircleMarker
            key={item.location.id}
            ref={(ref) => { markerRefs.current[item.location.id] = ref; }}
            center={[item.location.lat, item.location.lng]}
            radius={isDC ? 14 : isSelected ? 10 : 7}
            fillColor={color}
            color={isSelected ? '#ffffff' : isDC ? '#ffffff' : color}
            weight={isDC ? 2 : isSelected ? 2 : 1}
            fillOpacity={0.9}
            eventHandlers={{
              click: () => onSelectLocation(isSelected ? null : item.location.id),
            }}
          >
            <Popup maxWidth={280}>
              <div className="text-sm space-y-1.5" style={{ fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      background: color + '33',
                      color: color,
                      border: `1px solid ${color}66`,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {SEVERITY_LABELS[item.severity]}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {isDC ? 'Distribution Centre' : 'Store'}
                  </span>
                </div>

                <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{item.location.name}</p>
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                  {item.location.address}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                  {item.location.city}, {item.location.state} {item.location.postalCode}
                </p>

                {item.location.primaryDC && (
                  <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                    Primary DC: {item.location.primaryDC} &bull; TZ: {item.location.timezone}
                  </p>
                )}

                {item.currentWeather && (
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
                    <p style={{ color: '#cbd5e1', fontSize: '12px', margin: 0 }}>
                      {item.currentWeather.temperatureC.toFixed(0)}°C &bull; {item.currentWeather.description}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                      Wind {item.currentWeather.windSpeedKmh.toFixed(0)} km/h
                      {item.currentWeather.precipitationMm > 0
                        ? ` &bull; Precip ${item.currentWeather.precipitationMm.toFixed(1)}mm`
                        : ''}
                    </p>
                  </div>
                )}

                {item.alerts.length > 0 && (
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
                    {item.alerts.slice(0, 3).map((alert, i) => (
                      <p key={i} style={{ color: '#fca5a5', fontSize: '12px', margin: '2px 0' }}>
                        {alert.headline}
                      </p>
                    ))}
                  </div>
                )}

                {item.earthquakes.length > 0 && (
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
                    {item.earthquakes.map((eq, i) => (
                      <p key={i} style={{ color: '#fdba74', fontSize: '12px', margin: '2px 0' }}>
                        M{eq.magnitude.toFixed(1)} &bull; {eq.place} ({eq.distanceKm}km)
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          color: '#94a3b8',
          backdropFilter: 'blur(4px)',
        }}
      >
        {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
            <span>{SEVERITY_LABELS[key as AlertSeverity]}</span>
          </div>
        ))}
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #334155', color: '#64748b' }}>
          Larger circle = DC
        </div>
      </div>
    </MapContainer>
  );
}
