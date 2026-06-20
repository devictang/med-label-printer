import { HiOutlineXMark } from 'react-icons/hi2';

export interface IngredientEntry {
  name: string;
  dosage: string;
}

/** Parse the stored text format into ingredient entries.
 *  Format: one ingredient per line → "Name, Dosage" */
export function parseIngredients(value: string): IngredientEntry[] {
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const commaIdx = line.lastIndexOf(',');
      if (commaIdx === -1) return { name: line, dosage: '' };
      return {
        name: line.slice(0, commaIdx).trim(),
        dosage: line.slice(commaIdx + 1).trim(),
      };
    });
}

/** Serialise ingredient entries back to text */
export function ingredientsToString(entries: IngredientEntry[]): string {
  return entries
    .map((e) => {
      const parts: string[] = [];
      if (e.name) parts.push(e.name);
      if (e.dosage) parts.push(e.dosage);
      return parts.join(', ');
    })
    .join('\n');
}

interface IngredientEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function IngredientEditor({ value, onChange }: IngredientEditorProps) {
  const entries = parseIngredients(value);

  // Ensure there's always one empty row at the bottom for adding new entries
  const showEmptyRow = entries.length === 0 || entries[entries.length - 1].name !== '';
  const displayEntries = showEmptyRow
    ? [...entries, { name: '', dosage: '' }]
    : entries;

  const updateEntry = (idx: number, field: 'name' | 'dosage', val: string) => {
    if (idx < entries.length) {
      // Editing a saved entry — update immediately
      const updated = entries.map((e, i) =>
        i === idx ? { ...e, [field]: val } : e,
      );
      onChange(ingredientsToString(updated));
    } else if (field === 'name' && val.trim()) {
      // Typing in the empty trailing row — auto-add new entry
      const newEntry: IngredientEntry = { name: val.trim(), dosage: '' };
      onChange(ingredientsToString([...entries, newEntry]));
    }
  };

  const removeEntry = (idx: number) => {
    if (idx >= entries.length) return; // don't remove the trailing empty row
    const updated = entries.filter((_, i) => i !== idx);
    onChange(ingredientsToString(updated));
  };

  return (
    <div className="space-y-2">
      {displayEntries.map((entry, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-slate-50/80 border border-slate-200/70 rounded-lg px-3 py-2 group"
        >
          <div className="flex-1 grid grid-cols-[1fr_auto] gap-2">
            <input
              type="text"
              value={entry.name}
              onChange={(e) => updateEntry(i, 'name', e.target.value)}
              placeholder={
                i < entries.length
                  ? '成分名稱'
                  : '新增成分名稱，輸入後自動加入…'
              }
              className="w-full bg-transparent border-none p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
            <input
              type="text"
              value={entry.dosage}
              onChange={(e) => updateEntry(i, 'dosage', e.target.value)}
              placeholder="劑量"
              className="w-24 bg-transparent border-none p-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-right font-mono"
            />
          </div>
          {i < entries.length && (
            <button
              type="button"
              onClick={() => removeEntry(i)}
              className="flex-shrink-0 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {entries.length === 0 && (
        <p className="text-[10px] text-slate-400">
          直接輸入成分名稱即可自動加入
        </p>
      )}
    </div>
  );
}

/** Format ingredient text for display (e.g. in drug picker).
 *  Returns: "Pseudoephedrine HCl 120mg + Loratadine 5mg" */
export function formatIngredientsDisplay(value: string): string {
  const entries = parseIngredients(value);
  return entries
    .map((e) => [e.name, e.dosage].filter(Boolean).join(' '))
    .join(' + ');
}
