const EMSIFA_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

export interface Province {
  code: string;
  name: string;
}

export interface Regency {
  code: string;
  name: string;
  province_code?: string;
}

let provincesCache: Province[] | null = null;
const regenciesCache = new Map<string, Regency[]>();

export async function getProvinces(): Promise<Province[]> {
  if (provincesCache) return provincesCache;
  const res = await fetch(`${EMSIFA_BASE}/provinces.json`);
  if (!res.ok) throw new Error('Failed to fetch provinces');
  const data: any[] = await res.json();
  provincesCache = data.map(p => ({ code: p.id, name: p.name }));
  return provincesCache;
}

export async function getRegencies(provinceCode: string): Promise<Regency[]> {
  const cached = regenciesCache.get(provinceCode);
  if (cached) return cached;
  const res = await fetch(`${EMSIFA_BASE}/regencies/${provinceCode}.json`);
  if (!res.ok) throw new Error('Failed to fetch regencies');
  const data: any[] = await res.json();
  const regencies = data.map(r => ({
    code: r.id,
    name: r.name,
    province_code: r.province_id,
  }));
  regenciesCache.set(provinceCode, regencies);
  return regencies;
}
