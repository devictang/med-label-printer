import type { PharmacyProfile, LabelGridConfig } from '../types';

const PROFILE_KEY = 'med-label-printer:profile';
const GRID_KEY = 'med-label-printer:grid-config';

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
