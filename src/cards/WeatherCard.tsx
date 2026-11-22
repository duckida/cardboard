import { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Thermometer } from 'lucide-react';
import type { Card, WeatherConfig } from '@shared/types';
import { weatherInfo, type WeatherIconName } from '@shared/weather';

interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function WeatherIcon({ name }: { name: WeatherIconName }) {
  const Icon = {
    sun: Sun,
    'partly-cloudy': CloudSun,
    cloud: Cloud,
    fog: CloudFog,
    drizzle: CloudDrizzle,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
    thermometer: Thermometer,
  }[name];
  return <Icon aria-hidden="true" className="cb-weather-svg" strokeWidth={1.7} />;
}

export function WeatherCard({ card }: { card: Card }) {
  const cfg = card.config as WeatherConfig;
  const [data, setData] = useState<WeatherData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          latitude: String(cfg.lat),
          longitude: String(cfg.lon),
          current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min',
          timezone: 'auto',
          forecast_days: String(Math.max(1, Math.min(7, cfg.days || 1))),
          temperature_unit: cfg.units === 'imperial' ? 'fahrenheit' : 'celsius',
          wind_speed_unit: cfg.units === 'imperial' ? 'mph' : 'kmh',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) throw new Error('weather');
        const json = (await response.json()) as WeatherData;
        if (alive) {
          setData(json);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [cfg.lat, cfg.lon, cfg.units, cfg.days]);

  if (failed) {
    return (
      <div className="cb-weather">
        <div className="cb-eyebrow">{cfg.label}</div>
        <div className="cb-muted">Weather unavailable</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="cb-weather">
        <div className="cb-eyebrow">{cfg.label}</div>
        <div className="cb-muted">Loading weather…</div>
      </div>
    );
  }

  const info = weatherInfo(data.current.weather_code);
  const unit = cfg.units === 'imperial' ? '°F' : '°C';
  const speed = cfg.units === 'imperial' ? 'mph' : 'km/h';

  return (
    <div className="cb-weather">
      <div className="cb-weather-top">
        <div>
          <div className="cb-eyebrow">{cfg.label}</div>
          <div className="cb-weather-temp">
            {Math.round(data.current.temperature_2m)}
            <span>{unit}</span>
          </div>
          <div className="cb-weather-condition">
            <span className="cb-weather-icon"><WeatherIcon name={info.icon} /></span> {info.label}
          </div>
        </div>
        <div className="cb-weather-meta">
          <div>{data.current.relative_humidity_2m}% humidity</div>
          <div>{Math.round(data.current.wind_speed_10m)} {speed}</div>
        </div>
      </div>

      {cfg.showForecast && data.daily?.time?.length ? (
        <div className="cb-forecast">
          {data.daily.time.slice(0, Math.max(1, cfg.days)).map((day, index) => {
            const dayInfo = weatherInfo(data.daily.weather_code[index]);
            const label = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${day}T12:00:00`));
            return (
              <div className="cb-forecast-day" key={day}>
                <div className="cb-forecast-label">{index === 0 ? 'Today' : label}</div>
                <div className="cb-forecast-icon"><WeatherIcon name={dayInfo.icon} /></div>
                <div className="cb-forecast-temp">
                  {Math.round(data.daily.temperature_2m_max[index])}°
                  <span>{Math.round(data.daily.temperature_2m_min[index])}°</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
