export interface WeatherData {
  temp: number;
  city: string;
  country: string;
  description: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  weatherCode: number;
  loading: boolean;
  error?: string;
}

// Map WMO Weather Interpretation Codes (Open-Meteo) to readable strings
export function getWMOText(code: number): string {
  if (code === 0) return 'clear sky';
  if (code === 1) return 'mainly clear';
  if (code === 2) return 'partly cloudy';
  if (code === 3) return 'overcast clouds';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 55) return 'light drizzle';
  if (code >= 56 && code <= 57) return 'freezing drizzle';
  if (code >= 61 && code <= 65) return 'rain showers';
  if (code >= 66 && code <= 67) return 'freezing rain';
  if (code >= 71 && code <= 77) return 'snow fall';
  if (code >= 80 && code <= 82) return 'rain showers';
  if (code >= 85 && code <= 86) return 'snow showers';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'cloudy';
}

export async function fetchLiveWeather(): Promise<WeatherData> {
  let lat = 14.6488;
  let lon = 121.0509;
  let cityName = 'Quezon City';
  let countryCode = 'PH';

  try {
    // Step 1: Try browser HTML5 geolocation API first
    const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });

    if (coords) {
      lat = coords.latitude;
      lon = coords.longitude;

      // Reverse geocode to get city name
      try {
        const revRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          cityName = revData.city || revData.locality || revData.principalSubdivision || 'Local City';
          countryCode = revData.countryCode || '';
        }
      } catch {
        // Fallback city name if reverse geocode fails
        cityName = 'My Location';
      }
    } else {
      // Step 2: Fallback to IP-based location lookup
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            lat = ipData.latitude;
            lon = ipData.longitude;
            cityName = ipData.city || 'Local City';
            countryCode = ipData.country_code || '';
          }
        }
      } catch {
        // Continue with default coords if IP lookup fails
      }
    }

    // Step 3: Fetch Open-Meteo Weather Data (100% Free, No API Key Required)
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&windspeed_unit=ms`
    );

    if (!weatherRes.ok) {
      throw new Error(`Open-Meteo HTTP Error ${weatherRes.status}`);
    }

    const weatherData = await weatherRes.json();
    const current = weatherData.current_weather;
    const hourly = weatherData.hourly;

    const currentHourIndex = new Date().getHours();
    const humidity = hourly?.relativehumidity_2m?.[currentHourIndex] ?? 75;
    const feelsLike = hourly?.apparent_temperature?.[currentHourIndex] ?? current.temperature;

    return {
      temp: Math.round(current.temperature * 10) / 10,
      city: cityName,
      country: countryCode,
      description: getWMOText(current.weathercode),
      humidity: Math.round(humidity),
      windSpeed: Math.round(current.windspeed * 10) / 10,
      feelsLike: Math.round(feelsLike * 10) / 10,
      weatherCode: current.weathercode,
      loading: false
    };
  } catch (err: any) {
    return {
      temp: 25.2,
      city: cityName,
      country: countryCode,
      description: 'partly cloudy',
      humidity: 80,
      windSpeed: 4.2,
      feelsLike: 26.0,
      weatherCode: 2,
      loading: false,
      error: err?.message || 'Failed to fetch weather'
    };
  }
}
