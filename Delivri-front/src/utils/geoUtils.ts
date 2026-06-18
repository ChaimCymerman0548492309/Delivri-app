type Coordinates = [number, number];

export const haversineKm = (a: Coordinates, b: Coordinates): number => {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const normalizeCityName = (name: string): string =>
  name
    .replace(/['"״]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/-\s*/g, '-')
    .trim()
    .toLowerCase();

export const citiesMatch = (a: string, b: string): boolean => {
  const na = normalizeCityName(a);
  const nb = normalizeCityName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};
