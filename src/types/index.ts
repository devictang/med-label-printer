/** Pharmacy / Doctor profile stored in localStorage */
export interface PharmacyProfile {
  name: string;
  address: string;
}

/** A drug record from Supabase */
export interface Drug {
  id?: number;
  created_at?: string;
  generic_name: string;       // e.g. Paracetamol
  brand_name: string;         // e.g. Panadol
  hk_number: string;          // HK-XXXXX
  ingredient: string;         // active ingredient
  dosage: string;             // e.g. 500mg
  default_usage: string;      // default usage instructions
  default_precautions: string; // default precautions/warnings
}

/** A reusable warning template managed from the Warning Templates page */
export interface WarningTemplate {
  id?: number;
  created_at?: string;
  text: string;
}

/** A single label to print */
export interface LabelItem {
  patientName: string;
  date: string;
  pharmacy: PharmacyProfile;
  drug: Drug;
  customUsage?: string;
  /** Newline-separated precautions. Each line is one item, max 3. */
  customPrecautions?: string;
}

/** Label paper grid configuration */
export interface LabelGridConfig {
  cols: number;
  rows: number;
  marginTop: number;    // mm
  marginBottom: number; // mm
  marginLeft: number;   // mm
  marginRight: number;  // mm
  gapX: number;         // mm (horizontal gap between labels)
  gapY: number;         // mm (vertical gap between rows)
  labelWidth: number;   // mm
  labelHeight: number;  // mm
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
};

export const PRESET_GRIDS: { name: string; config: LabelGridConfig }[] = [
  {
    name: '10 格 (2×5)',
    config: { cols: 2, rows: 5, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 4, gapY: 0, labelWidth: 99.1, labelHeight: 42.3 },
  },
  {
    name: '14 格 (2×7)',
    config: { cols: 2, rows: 7, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 4, gapY: 0, labelWidth: 99.1, labelHeight: 29.6 },
  },
  {
    name: '21 格 (3×7)',
    config: { cols: 3, rows: 7, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 63.5, labelHeight: 29.6 },
  },
  {
    name: '24 格 (3×8)',
    config: { cols: 3, rows: 8, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 63.5, labelHeight: 25.4 },
  },
  {
    name: '30 格 (3×10)',
    config: { cols: 3, rows: 10, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 63.5, labelHeight: 25.4 },
  },
  {
    name: '40 格 (4×10)',
    config: { cols: 4, rows: 10, marginTop: 13.5, marginBottom: 13.5, marginLeft: 6.5, marginRight: 6.5, gapX: 2.5, gapY: 0, labelWidth: 45, labelHeight: 25.4 },
  },
];
