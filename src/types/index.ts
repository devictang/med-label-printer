/** Pharmacy / Doctor profile stored in localStorage */
export interface PharmacyProfile {
  name: string;
  address: string;
}

/** A drug record from Supabase */
export interface Drug {
  id?: number;
  created_at?: string;
  brand_name: string;         // e.g. Panadol (primary display name)
  hk_number: string;          // HK-XXXXX
  ingredient: string;         // each line = "Name, Dosage", e.g. "Pseudoephedrine HCl, 120mg\nLoratadine, 5mg"
  default_usage: string;      // default usage instructions
  default_precautions: string; // default precautions/warnings
  unit?: string;              // dosage form unit e.g. 粒, 包, 毫升, 支
}

/** A reusable warning template managed from the Warning Templates page */
export interface WarningTemplate {
  id?: number;
  created_at?: string;
  text: string;             // legacy single field (keep for backward compat)
  text_en: string;          // English version
  text_zh: string;          // Chinese version
}

/** A single label to print */
export interface LabelItem {
  patientName: string;
  date: string;
  pharmacy: PharmacyProfile;
  drug: Drug;
  quantity: number;           // number of units dispensed, e.g. 14
  unit: string;               // dosage form unit, e.g. 粒, 包, 毫升
  customUsage?: string;
  /** Newline-separated precautions. Each line is one item, max 3. */
  customPrecautions?: string;
}

/** Label paper grid configuration */
export interface LabelGridConfig {
  cols: number;
  rows: number;
  marginTop: number;    // mm — distance from A4 top edge to first label row
  marginBottom: number; // mm — distance from A4 bottom edge to last label row
  marginLeft: number;   // mm — distance from A4 left edge to first label column
  marginRight: number;  // mm — distance from A4 right edge to last label column
  gapX: number;         // mm — horizontal gap between adjacent labels
  gapY: number;         // mm — vertical gap between adjacent label rows
  labelWidth: number;   // mm — width of one label
  labelHeight: number;  // mm — height of one label
  paddingTop: number;    // mm — inner padding inside label (content starts this far from label top edge)
  paddingBottom: number; // mm — inner padding from label bottom edge
  paddingLeft: number;   // mm — inner padding from label left edge
  paddingRight: number;  // mm — inner padding from label right edge
}

export const DEFAULT_GRID: LabelGridConfig = {
  cols: 2,
  rows: 5,
  marginTop: 13.5,
  marginBottom: 13.5,
  marginLeft: 6.5,
  marginRight: 6.5,
  gapX: 4,
  gapY: 0,
  labelWidth: 99.1,
  labelHeight: 42.3,
  paddingTop: 1.5,
  paddingBottom: 1.5,
  paddingLeft: 1.5,
  paddingRight: 1.5,
};

export const PRESET_GRIDS: { name: string; config: LabelGridConfig }[] = [
  {
    name: '10 格 (2×5)',
    config: { cols: 2, rows: 5, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 4, gapY: 0, labelWidth: 99.1, labelHeight: 42.3, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 1.5, paddingRight: 1.5 },
  },
  {
    name: '14 格 (2×7)',
    config: { cols: 2, rows: 7, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 4, gapY: 0, labelWidth: 99.1, labelHeight: 29.6, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 1.5, paddingRight: 1.5 },
  },
  {
    name: '21 格 (3×7)',
    config: { cols: 3, rows: 7, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 63.5, labelHeight: 29.6, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 1.5, paddingRight: 1.5 },
  },
  {
    name: '24 格 (3×8)',
    config: { cols: 3, rows: 8, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 63.5, labelHeight: 25.4, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 1.5, paddingRight: 1.5 },
  },
  {
    name: '30 格 (3×10)',
    config: { cols: 3, rows: 10, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 63.5, labelHeight: 25.4, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 1.5, paddingRight: 1.5 },
  },
  {
    name: '40 格 (4×10)',
    config: { cols: 4, rows: 10, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 45, labelHeight: 25.4, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 1.5, paddingRight: 1.5 },
  },
];
