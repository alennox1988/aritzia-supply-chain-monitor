import type { Location, WeatherResult, WeatherAlert, AlertSeverity, Earthquake, CurrentWeather } from './types';
import locationsData from '../data/locations.json';

const locations = locationsData as Location[];

// WMO weather code descriptions (Open-Meteo)
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Heavy freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Heavy rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

// WMO code → severity (for inferring CA alert level from weather codes)
function wmoToSeverity(code: number): AlertSeverity {
  if ([99, 96, 82, 75, 67, 57].includes(code)) return 'severe';
  if ([95, 65, 66, 73, 77, 86, 55].includes(code)) return 'moderate';
  if ([63, 71, 85, 51, 53, 56, 45, 48].includes(code)) return 'minor';
  return 'clear';
}

// NWS severity string → AlertSeverity
function nwsSeverityToLevel(severity: string, event: string): AlertSeverity {
  const ev = event.toLowerCase();
  if (
    ev.includes('tornado warning') ||
    ev.includes('hurricane warning') ||
    ev.includes('blizzard warning') ||
    ev.includes('flash flood emergency') ||
    ev.includes('extreme wind warning') ||
    severity === 'Extreme'
  ) return 'extreme';

  if (
    ev.includes('winter storm warning') ||
    ev.includes('ice storm warning') ||
    ev.includes('tropical storm warning') ||
    ev.includes('severe thunderstorm warning') ||
    ev.includes('flash flood warning') ||
    ev.includes('hurricane watch') ||
    severity === 'Severe'
  ) return 'severe';

  if (
    ev.includes('watch') ||
    ev.includes('winter weather advisory') ||
    ev.includes('wind advisory') ||
    ev.includes('flood advisory') ||
    severity === 'Moderate'
  ) return 'moderate';

  if (severity === 'Minor' || ev.includes('advisory') || ev.includes('statement')) return 'minor';
  return 'clear';
}

// Haversine distance in km
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fetch NWS alerts for a specific US state (batched by state = fewer API calls)
async function fetchNWSByState(state: string): Promise<NWSFeature[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?area=${encodeURIComponent(state)}`,
      {
        headers: { 'User-Agent': 'AritziaSupplyChainMonitor/1.0' },
        next: { revalidate: 21600 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
  } catch {
    return [];
  }
}

// Fetch current weather from Open-Meteo (free, no key, global)
async function fetchOpenMeteo(lat: number, lng: number): Promise<CurrentWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    return {
      temperatureC: c.temperature_2m,
      weatherCode: c.weather_code,
      description: WMO_DESCRIPTIONS[c.weather_code] ?? 'Unknown',
      windSpeedKmh: c.wind_speed_10m,
      precipitationMm: c.precipitation,
    };
  } catch {
    return null;
  }
}

// Fetch recent earthquakes globally (USGS)
async function fetchEarthquakes(): Promise<USGSFeature[]> {
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.0&orderby=time&limit=100&starttime=${since}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
  } catch {
    return [];
  }
}

// Fetch Environment Canada RSS warning feed for a province
async function fetchCAAlerts(provinceCode: string): Promise<CAAlert[]> {
  const prov = provinceCode.toLowerCase();
  try {
    const url = `https://weather.gc.ca/rss/warning/${prov}_e.xml`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AritziaSupplyChainMonitor/1.0' },
      next: { revalidate: 21600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseCAXML(xml, provinceCode);
  } catch {
    return [];
  }
}

function parseCAXML(xml: string, province: string): CAAlert[] {
  const alerts: CAAlert[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? '';
    if (!title || title.toLowerCase().includes('no watches or warnings')) continue;

    const updatedMatch = entry.match(/<updated>(.*?)<\/updated>/);
    const updated = updatedMatch?.[1] ?? '';

    // Extract affected areas from title: "Warning type in effect for: Area1, Area2"
    const areasMatch = title.match(/in effect for:\s*(.+)/i);
    const areas = areasMatch ? areasMatch[1].split(',').map((a) => a.trim()) : [];

    alerts.push({ title, areas, updated, province });
  }
  return alerts;
}

function caAlertSeverity(title: string): AlertSeverity {
  const t = title.toLowerCase();
  if (t.includes('tornado') || t.includes('hurricane') || t.includes('extreme cold emergency')) return 'extreme';
  if (t.includes('blizzard') || t.includes('ice storm') || t.includes('freezing rain warning') || t.includes('heavy snow warning') || t.includes('snowfall warning') || t.includes('wind warning') || t.includes('rainfall warning')) return 'severe';
  if (t.includes('warning')) return 'severe';
  if (t.includes('watch') || t.includes('advisory') || t.includes('special weather')) return 'moderate';
  if (t.includes('statement')) return 'minor';
  return 'minor';
}

// Match CA alert areas to a city name
function matchCAAlertToCity(alert: CAAlert, city: string): boolean {
  const cityLower = city.toLowerCase().replace(/-/g, ' ');
  return alert.areas.some((area) => {
    const areaLower = area.toLowerCase().replace(/-/g, ' ');
    return areaLower.includes(cityLower) || cityLower.includes(areaLower.split(' ')[0]);
  });
}

// Match NWS alerts to a location by checking areaDesc
function matchNWSAlertToLocation(alert: NWSFeature, location: Location): boolean {
  const areaDesc = (alert.properties.areaDesc ?? '').toLowerCase();
  const city = location.city.toLowerCase();

  // Direct city match
  if (areaDesc.includes(city)) return true;

  // State-level matches for common metro naming conventions
  const metroMap: Record<string, string[]> = {
    'new york': ['new york city', 'manhattan', 'brooklyn', 'queens', 'bronx'],
    'los angeles': ['greater los angeles', 'metro los angeles'],
    'chicago': ['greater chicago', 'chicagoland'],
    'philadelphia': ['greater philadelphia'],
    'miami': ['greater miami', 'miami-dade'],
    'boston': ['greater boston', 'metro boston'],
    'seattle': ['greater seattle', 'metro seattle'],
    'washington': ['greater washington', 'metro dc', 'district of columbia'],
    'bloomington': ['twin cities metro', 'minneapolis'],
  };

  const aliases = metroMap[city] ?? [];
  return aliases.some((alias) => areaDesc.includes(alias));
}

// Types for raw API responses
interface NWSFeature {
  properties: {
    event: string;
    severity: string;
    headline: string;
    description: string;
    expires: string;
    areaDesc: string;
  };
}

interface USGSFeature {
  properties: { mag: number; place: string; time: number };
  geometry: { coordinates: [number, number, number] };
}

interface CAAlert {
  title: string;
  areas: string[];
  updated: string;
  province: string;
}

export function getAllLocations(): Location[] {
  return locations;
}

export async function fetchWeatherForAllLocations(): Promise<WeatherResult[]> {
  // --- Group US locations by state for batched NWS calls ---
  const usLocations = locations.filter((l) => l.country === 'United States');
  const caLocations = locations.filter((l) => l.country === 'Canada');

  const usStates = Array.from(new Set(usLocations.map((l) => l.state)));
  const caProvinces = Array.from(new Set(caLocations.map((l) => l.state)));

  // --- Deduplicate coordinates for Open-Meteo calls ---
  const coordKey = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const uniqueCoords = new Map<string, { lat: number; lng: number }>();
  for (const loc of locations) {
    uniqueCoords.set(coordKey(loc.lat, loc.lng), { lat: loc.lat, lng: loc.lng });
  }

  // --- Run all fetches in parallel ---
  const [nwsByState, caAlertsByProvince, weatherByCoord, earthquakeFeatures] = await Promise.all([
    // NWS: one call per US state
    Promise.all(usStates.map((s) => fetchNWSByState(s).then((alerts) => ({ state: s, alerts })))),
    // Environment Canada: one call per province
    Promise.all(caProvinces.map((p) => fetchCAAlerts(p).then((alerts) => ({ province: p, alerts })))),
    // Open-Meteo: one call per unique coordinate pair
    Promise.all(
      Array.from(uniqueCoords.entries()).map(([key, { lat, lng }]) =>
        fetchOpenMeteo(lat, lng).then((weather) => ({ key, weather }))
      )
    ),
    // USGS: one global call
    fetchEarthquakes(),
  ]);

  // Build lookup maps
  const nwsAlertMap = new Map<string, NWSFeature[]>();
  for (const { state, alerts } of nwsByState) {
    nwsAlertMap.set(state, alerts);
  }

  const caAlertMap = new Map<string, CAAlert[]>();
  for (const { province, alerts } of caAlertsByProvince) {
    caAlertMap.set(province, alerts);
  }

  const weatherMap = new Map<string, CurrentWeather | null>();
  for (const { key, weather } of weatherByCoord) {
    weatherMap.set(key, weather);
  }

  // --- Build results for each location ---
  const results: WeatherResult[] = locations.map((location) => {
    const alerts: WeatherAlert[] = [];
    let topSeverity: AlertSeverity = 'clear';

    const updateSeverity = (s: AlertSeverity) => {
      const order: AlertSeverity[] = ['clear', 'minor', 'moderate', 'severe', 'extreme'];
      if (order.indexOf(s) > order.indexOf(topSeverity)) topSeverity = s;
    };

    // --- Weather alerts ---
    if (location.country === 'United States') {
      const stateAlerts = nwsAlertMap.get(location.state) ?? [];
      for (const alert of stateAlerts) {
        if (matchNWSAlertToLocation(alert, location)) {
          const severity = nwsSeverityToLevel(alert.properties.severity, alert.properties.event);
          alerts.push({
            event: alert.properties.event,
            severity: alert.properties.severity,
            headline: alert.properties.headline,
            description: alert.properties.description?.substring(0, 200),
            expires: alert.properties.expires,
            source: 'NWS',
          });
          updateSeverity(severity);
        }
      }
    } else {
      // Canada: check Environment Canada alerts
      const provAlerts = caAlertMap.get(location.state) ?? [];
      for (const alert of provAlerts) {
        if (matchCAAlertToCity(alert, location.city)) {
          const severity = caAlertSeverity(alert.title);
          alerts.push({
            event: alert.title.split(' in effect')[0].trim(),
            severity: severity.toUpperCase(),
            headline: alert.title,
            expires: alert.updated,
            source: 'EnvironmentCanada',
          });
          updateSeverity(severity);
        }
      }

      // Also infer from Open-Meteo weather code if no CA alerts matched
      if (alerts.length === 0) {
        const weather = weatherMap.get(coordKey(location.lat, location.lng));
        if (weather) {
          const inferred = wmoToSeverity(weather.weatherCode);
          if (inferred !== 'clear' && inferred !== 'minor') {
            alerts.push({
              event: weather.description,
              severity: inferred.toUpperCase(),
              headline: `${weather.description} - Temp: ${weather.temperatureC.toFixed(0)}°C`,
              source: 'OpenMeteo',
            });
            updateSeverity(inferred);
          }
        }
      }
    }

    // --- Earthquakes within 200km ---
    const nearbyQuakes: Earthquake[] = [];
    for (const eq of earthquakeFeatures) {
      const [eLng, eLat] = eq.geometry.coordinates;
      const dist = distanceKm(location.lat, location.lng, eLat, eLng);
      if (dist <= 200) {
        const mag = eq.properties.mag;
        nearbyQuakes.push({
          magnitude: mag,
          place: eq.properties.place,
          time: new Date(eq.properties.time).toISOString(),
          distanceKm: Math.round(dist),
        });
        if (mag >= 6.0) updateSeverity('extreme');
        else if (mag >= 5.0) updateSeverity('severe');
        else if (mag >= 4.0) updateSeverity('moderate');
      }
    }

    const currentWeather = weatherMap.get(coordKey(location.lat, location.lng)) ?? null;

    return {
      location,
      severity: topSeverity,
      alerts,
      earthquakes: nearbyQuakes,
      currentWeather,
      lastUpdated: new Date().toISOString(),
    };
  });

  return results;
}
