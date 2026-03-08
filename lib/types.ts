export type LocationType = 'Store' | 'DC';
export type AlertSeverity = 'extreme' | 'severe' | 'moderate' | 'minor' | 'clear';

export interface Location {
  id: string;
  status: string;
  type: LocationType;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  primaryDC: string;
  lat: number;
  lng: number;
}

export interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
  description?: string;
  expires?: string;
  source: 'NWS' | 'EnvironmentCanada' | 'OpenMeteo';
}

export interface Earthquake {
  magnitude: number;
  place: string;
  time: string;
  distanceKm: number;
}

export interface CurrentWeather {
  temperatureC: number;
  weatherCode: number;
  description: string;
  windSpeedKmh: number;
  precipitationMm: number;
}

export interface WeatherResult {
  location: Location;
  severity: AlertSeverity;
  alerts: WeatherAlert[];
  earthquakes: Earthquake[];
  currentWeather: CurrentWeather | null;
  lastUpdated: string;
}
