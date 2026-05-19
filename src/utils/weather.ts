import * as Location from 'expo-location';

export interface WeatherNews {
  tag: string;
  title: string;
  sub: string;
  type: 'weather' | 'advice';
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'leaf';
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
}

const WMO_LABELS: Record<number, { label: string; icon: WeatherNews['icon'] }> = {
  0:  { label: 'Ciel dégagé', icon: 'sun' },
  1:  { label: 'Principalement dégagé', icon: 'sun' },
  2:  { label: 'Partiellement nuageux', icon: 'cloud' },
  3:  { label: 'Couvert', icon: 'cloud' },
  45: { label: 'Brouillard', icon: 'cloud' },
  48: { label: 'Brouillard givrant', icon: 'cloud' },
  51: { label: 'Bruine légère', icon: 'rain' },
  53: { label: 'Bruine modérée', icon: 'rain' },
  55: { label: 'Bruine dense', icon: 'rain' },
  61: { label: 'Pluie faible', icon: 'rain' },
  63: { label: 'Pluie modérée', icon: 'rain' },
  65: { label: 'Pluie forte', icon: 'rain' },
  71: { label: 'Neige légère', icon: 'snow' },
  73: { label: 'Neige modérée', icon: 'snow' },
  75: { label: 'Neige forte', icon: 'snow' },
  80: { label: 'Averses faibles', icon: 'rain' },
  81: { label: 'Averses modérées', icon: 'rain' },
  82: { label: 'Averses fortes', icon: 'rain' },
  95: { label: 'Orage', icon: 'storm' },
  96: { label: 'Orage avec grêle', icon: 'storm' },
  99: { label: 'Orage violent', icon: 'storm' },
};

const getWmo = (code: number) =>
  WMO_LABELS[code] ?? { label: 'Conditions variables', icon: 'cloud' as const };

const buildAdvice = (data: OpenMeteoResponse): WeatherNews => {
  const maxTemps = data.daily.temperature_2m_max;
  const minTemps = data.daily.temperature_2m_min;
  const precipSums = data.daily.precipitation_sum;

  const maxTemp = Math.max(...maxTemps);
  const minTemp = Math.min(...minTemps);
  const totalPrecip = precipSums.reduce((a, b) => a + b, 0);
  const windSpeed = data.current.wind_speed_10m;
  const humidity = data.current.relative_humidity_2m;

  if (minTemp <= 2) {
    return {
      tag: 'Alerte Gel',
      title: `Risque de gel à ${minTemp.toFixed(0)}°C — protégez vos cultures`,
      sub: 'Couvrez les plants sensibles et anticipez les pertes sur jeunes pousses.',
      type: 'advice',
      icon: 'snow',
    };
  }
  if (maxTemp >= 32) {
    return {
      tag: 'Conseil IA',
      title: `Canicule à ${maxTemp.toFixed(0)}°C prévue — stress hydrique élevé`,
      sub: 'Augmentez les apports en eau et surveillez le flétrissement des feuilles.',
      type: 'advice',
      icon: 'sun',
    };
  }
  if (totalPrecip >= 15) {
    return {
      tag: 'Conseil IA',
      title: `${totalPrecip.toFixed(0)} mm de pluie sur 3 jours — sols saturés`,
      sub: 'Évitez les traitements phytosanitaires et les passages d\'engins lourds.',
      type: 'advice',
      icon: 'rain',
    };
  }
  if (windSpeed >= 40) {
    return {
      tag: 'Conseil IA',
      title: `Vents forts à ${windSpeed.toFixed(0)} km/h — différez vos épandages`,
      sub: 'Risque de dérive des produits. Attendez une accalmie avant traitement.',
      type: 'advice',
      icon: 'storm',
    };
  }
  if (humidity <= 30 && totalPrecip < 3) {
    return {
      tag: 'Conseil IA',
      title: `Humidité à ${humidity}% — conditions sèches sur 3 jours`,
      sub: 'Pensez à vérifier l\'humidité des sols et à programmer l\'irrigation.',
      type: 'advice',
      icon: 'leaf',
    };
  }
  return {
    tag: 'Conseil IA',
    title: 'Conditions favorables aux travaux agricoles',
    sub: `Températures entre ${minTemp.toFixed(0)}°C et ${maxTemp.toFixed(0)}°C, idéal pour vos interventions.`,
    type: 'advice',
    icon: 'leaf',
  };
};

export const fetchWeatherNews = async (): Promise<WeatherNews[] | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;

    const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const city = geocode?.city ?? geocode?.subregion ?? 'votre zone';

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&timezone=auto&forecast_days=3`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data: OpenMeteoResponse = await res.json();
    const { temperature_2m, weather_code } = data.current;
    const wmo = getWmo(weather_code);

    const weatherCard: WeatherNews = {
      tag: `Météo — ${city}`,
      title: `${temperature_2m.toFixed(0)}°C · ${wmo.label}`,
      sub: `Humidité ${data.current.relative_humidity_2m}% · Vent ${data.current.wind_speed_10m.toFixed(0)} km/h`,
      type: 'weather',
      icon: wmo.icon,
    };

    const adviceCard = buildAdvice(data);

    return [weatherCard, adviceCard];
  } catch {
    return null;
  }
};
