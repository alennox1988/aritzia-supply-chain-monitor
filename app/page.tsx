import { fetchWeatherForAllLocations } from '@/lib/weather';
import Header from '@/components/Header';
import DashboardClient from '@/components/DashboardClient';

export const revalidate = 21600; // 6 hours

export default async function Page() {
  const weatherData = await fetchWeatherForAllLocations();

  const stats = {
    total: weatherData.length,
    stores: weatherData.filter((w) => w.location.type === 'Store').length,
    dcs: weatherData.filter((w) => w.location.type === 'DC').length,
    extreme: weatherData.filter((w) => w.severity === 'extreme').length,
    severe: weatherData.filter((w) => w.severity === 'severe').length,
    moderate: weatherData.filter((w) => w.severity === 'moderate').length,
  };

  const lastUpdated = weatherData[0]?.lastUpdated ?? new Date().toISOString();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header stats={stats} lastUpdated={lastUpdated} />
      <DashboardClient weatherData={weatherData} />
    </div>
  );
}
