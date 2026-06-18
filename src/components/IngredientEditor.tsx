import { useState, useRef } from 'react';
import { HiOutlineXMark, HiOutlinePlusCircle } from 'react-icons/hi2';

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
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const addEntry = () => {
    const name = newName.trim();
    const dosage = newDosage.trim();
    if (!name) return;
    const updated = [...entries, { name, dosage }];
    onChange(ingredientsToString(updated));
    setNewName('');
    setNewDosage('');
    nameRef.current?.focus();
  };

  const removeEntry = (idx: number) => {
    const updated = entries.filter((_, i) => i !== idx);
    onChange(ingredientsToString(updated));
  };

  const updateEntry = (idx: number, field: 'name' | 'dosage', val: string) => {
    const updated = entries.map((e, i) =>
      i === idx ? { ...e, [field]: val } : e,
    );
    onChange(ingredientsToString(updated));
  };

  return (
    <div className="space-y-2">
      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-slate-50/80 border border-slate-200/70 rounded-lg px-3 py-2 group"
            >
              <div className="flex-1 grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateEntry(i, 'name', e.target.value)}
                  placeholder="成分名稱"
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
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="flex-shrink-0 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new row */}
      <div className="flex items-center gap-2">
        <input
          ref={nameRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addEntry(); }
          }}
          placeholder="成分名稱"
          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        />
        <input
          type="text"
          value={newDosage}
          onChange={(e) => setNewDosage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addEntry(); }
          }}
          placeholder="劑量"
          className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-right font-mono"
        />
        <button
          type="button"
          onClick={addEntry}
          disabled={!newName.trim()}
          className="flex-shrink-0 p-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <HiOutlinePlusCircle className="w-4 h-4" />
        </button>
      </div>

      {entries.length === 0 && !newName && (
        <p className="text-[10px] text-slate-400">輸入成分名稱及劑量後按 Enter 或 + 新增</p>
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
