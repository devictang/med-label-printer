import type { PharmacyProfile, LabelGridConfig, Drug } from '../types';
import { DEFAULT_GRID } from '../types';

const PROFILE_KEY = 'med-label-printer:profile';
const GRID_KEY = 'med-label-printer:grid-config';
const FONT_SCALE_KEY = 'med-label-printer:font-scale';
const LABEL_FORM_KEY = 'med-label-printer:label-form-rows';
const LABEL_RECORDS_KEY = 'med-label-printer:label-records';
const DRUG_UNITS_KEY = 'med-label-printer:drug-units';
const START_FROM_KEY = 'med-label-printer:start-from';

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

/** Load label grid configuration (merges with defaults for backward compat) */
export function loadGridConfig(): LabelGridConfig {
  try {
    const raw = localStorage.getItem(GRID_KEY);
    if (!raw) return { ...DEFAULT_GRID };
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields have fallback values
    return { ...DEFAULT_GRID, ...parsed };
  } catch {
    return { ...DEFAULT_GRID };
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

/* ─── Label form state preservation ────────────────────────── */

/** Save current label form rows so they survive page navigation */
export function saveLabelFormRows(rows: unknown[]): void {
  localStorage.setItem(LABEL_FORM_KEY, JSON.stringify(rows));
}

/** Load saved label form rows (returns null if none) */
export function loadLabelFormRows(): unknown[] | null {
  try {
    const raw = localStorage.getItem(LABEL_FORM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear saved label form rows (used on reset) */
export function clearLabelFormRows(): void {
  localStorage.removeItem(LABEL_FORM_KEY);
}

/* ─── Label records history ────────────────────────────────── */

export interface LabelRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  rows: unknown[];
}

function generateRecordId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function loadRecordsRaw(): LabelRecord[] {
  try {
    const raw = localStorage.getItem(LABEL_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecordsRaw(records: LabelRecord[]): void {
  localStorage.setItem(LABEL_RECORDS_KEY, JSON.stringify(records));
}

/**
 * Save a new label record (auto-saved on preview/download).
 * Keeps max 10 non-favorite records; favorites are never auto-removed.
 * If a record with identical rows already exists, updates it instead.
 */
export function saveLabelRecord(rows: unknown[], name?: string): LabelRecord {
  const records = loadRecordsRaw();

  // Check for identical rows (quick hash comparison)
  const rowsJson = JSON.stringify(rows);
  const existingIdx = records.findIndex(
    (r) => JSON.stringify(r.rows) === rowsJson,
  );
  if (existingIdx !== -1) {
    records[existingIdx].updatedAt = new Date().toISOString();
    records[existingIdx].name = name || records[existingIdx].name;
    saveRecordsRaw(records);
    return records[existingIdx];
  }

  const now = new Date().toISOString();
  const record: LabelRecord = {
    id: generateRecordId(),
    name: name || `標籤記錄 ${new Date().toLocaleString('zh-HK')}`,
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
    rows,
  };

  records.unshift(record);

  // Enforce limit: max 10 non-favorites (favorites never removed)
  const nonFavoriteCount = records.filter((r) => !r.isFavorite).length;
  if (nonFavoriteCount > 10) {
    // Remove oldest non-favorite
    for (let i = records.length - 1; i >= 0; i--) {
      if (!records[i].isFavorite) {
        records.splice(i, 1);
        break;
      }
    }
  }

  saveRecordsRaw(records);
  return record;
}

/** Get all label records (newest first) */
export function loadLabelRecords(): LabelRecord[] {
  return loadRecordsRaw();
}

/** Toggle a record's favorite status */
export function toggleFavoriteRecord(id: string): void {
  const records = loadRecordsRaw();
  const record = records.find((r) => r.id === id);
  if (record) {
    record.isFavorite = !record.isFavorite;
    saveRecordsRaw(records);
  }
}

/** Rename a record */
export function renameRecord(id: string, name: string): void {
  const records = loadRecordsRaw();
  const record = records.find((r) => r.id === id);
  if (record) {
    record.name = name;
    record.updatedAt = new Date().toISOString();
    saveRecordsRaw(records);
  }
}

/** Delete a record */
export function deleteRecord(id: string): void {
  const records = loadRecordsRaw().filter((r) => r.id !== id);
  saveRecordsRaw(records);
}

/* ─── Start-from offset ──────────────────────────────────── */

/** Save the label grid start-from offset (1-based, default 1) */
export function saveStartFrom(n: number): void {
  localStorage.setItem(START_FROM_KEY, JSON.stringify(n));
}

/** Load the start-from offset (1-based, defaults to 1) */
export function loadStartFrom(): number {
  try {
    const raw = localStorage.getItem(START_FROM_KEY);
    return raw ? Math.max(1, JSON.parse(raw)) : 1;
  } catch {
    return 1;
  }
}
