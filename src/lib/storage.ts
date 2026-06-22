import type { PharmacyProfile, LabelGridConfig, Drug } from '../types';

const PROFILE_KEY = 'med-label-printer:profile';
const GRID_KEY = 'med-label-printer:grid-config';
const FONT_SCALE_KEY = 'med-label-printer:font-scale';
const DRUG_UNITS_KEY = 'med-label-printer:drug-units';

/** Save pharmacy profile to localStorage */
export function saveProfile(profile: PharmacyProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** Load pharmacy profile from localStorage */
export function loadProfile(): PharmacyProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Check if profile exists */
export function hasProfile(): boolean {
  return !!loadProfile();
}

/** Save label grid configuration */
export function saveGridConfig(config: LabelGridConfig): void {
  localStorage.setItem(GRID_KEY, JSON.stringify(config));
}

/** Load label grid configuration */
export function loadGridConfig(): LabelGridConfig | null {
  try {
    const raw = localStorage.getItem(GRID_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Save a drug's unit to localStorage (fallback when Supabase column doesn't exist yet) */
export function saveDrugUnit(drugId: number | undefined, brandName: string, unit: string): void {
  if (!unit) return;
  try {
    const raw = localStorage.getItem(DRUG_UNITS_KEY);
    const units: Record<string, string> = raw ? JSON.parse(raw) : {};
    const key = drugId ? `id:${drugId}` : `name:${brandName}`;
    units[key] = unit;
    localStorage.setItem(DRUG_UNITS_KEY, JSON.stringify(units));
  } catch { /* ignore */ }
}

/** Load a drug's unit from localStorage fallback */
export function loadDrugUnit(drug: Drug): string | undefined {
  try {
    const raw = localStorage.getItem(DRUG_UNITS_KEY);
    if (!raw) return undefined;
    const units: Record<string, string> = JSON.parse(raw);
    // Try by ID first, then by name
    if (drug.id && units[`id:${drug.id}`]) return units[`id:${drug.id}`];
    if (units[`name:${drug.brand_name}`]) return units[`name:${drug.brand_name}`];
    return undefined;
  } catch {
    return undefined;
  }
}

/** Save font scale factor to localStorage */
export function saveFontScale(scale: number): void {
  localStorage.setItem(FONT_SCALE_KEY, JSON.stringify(scale));
}

/** Load font scale factor from localStorage (defaults to 1.0) */
export function loadFontScale(): number {
  try {
    const raw = localStorage.getItem(FONT_SCALE_KEY);
    return raw ? JSON.parse(raw) : 1;
  } catch {
    return 1;
  }
}
