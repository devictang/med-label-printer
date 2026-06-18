import { useState, useRef, useEffect, useMemo } from 'react';
import { HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlineChevronDown } from 'react-icons/hi2';

export function getPrecautionsList(value: string): string[] {
  return value.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function precautionsToString(items: string[]): string {
  return items.join('\n');
}

interface PrecautionEditorProps {
  value: string;
  onChange: (v: string) => void;
  commonPrecautions: string[];
}

export default function PrecautionEditor({ value, onChange, commonPrecautions }: PrecautionEditorProps) {
  const items = getPrecautionsList(value);
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX = 3;
  const remaining = MAX - items.length;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay so click-on-item fires first
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const addItem = (text: string) => {
    if (items.length >= MAX) return;
    if (items.includes(text)) return;
    onChange(precautionsToString([...items, text]));
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(precautionsToString(next));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = inputVal.trim();
      if (!text) return;
      // If there's a filtered match not yet added, add that instead
      const match = filteredNotAdded.length > 0 ? filteredNotAdded[0] : null;
      if (match && match.toLowerCase() === text.toLowerCase()) {
        addItem(match);
      } else {
        addItem(text);
      }
      setInputVal('');
      // Keep focus
      inputRef.current?.focus();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const selectItem = (text: string) => {
    addItem(text);
    setInputVal('');
    inputRef.current?.focus();
  };

  // Filter common precautions by input text, exclude already-added items
  const filteredNotAdded = useMemo(() => {
    if (!inputVal) return commonPrecautions.filter((p) => !items.includes(p));
    const q = inputVal.toLowerCase();
    return commonPrecautions.filter(
      (p) => !items.includes(p) && p.toLowerCase().includes(q),
    );
  }, [commonPrecautions, items, inputVal]);

  const showCustomOption = inputVal.trim() && !commonPrecautions.some(
    (p) => p.toLowerCase() === inputVal.trim().toLowerCase(),
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Selected items as chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200/60 rounded-lg text-xs font-medium text-indigo-700 leading-tight"
            >
              <span className="max-w-[200px] truncate">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="flex-shrink-0 p-0.5 rounded text-indigo-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <HiOutlineXMark className="w-3 h-3" />
              </button>
            </span>
          ))}
          <span className="text-[10px] text-slate-400 self-center ml-1">
            {items.length}/{MAX}
          </span>
        </div>
      )}

      {/* Search / input field */}
      <div className="relative">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (remaining > 0) setOpen(true); }}
          placeholder={
            remaining > 0
              ? '搜尋常用注意事項或輸入自訂…'
              : '已達上限 3 項'
          }
          disabled={remaining <= 0}
          className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        />
        <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
      </div>

      {/* Dropdown */}
      {open && remaining > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 max-h-56 overflow-y-auto animate-scale-in">
          {filteredNotAdded.length === 0 && !showCustomOption && (
            <div className="px-4 py-6 text-center">
              <HiOutlineMagnifyingGlass className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400">
                {inputVal ? '沒有相符的常用事項' : '所有常用事項已加入'}
              </p>
            </div>
          )}

          {/* Matching common items */}
          {filteredNotAdded.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => selectItem(p)}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/60 transition-colors border-b border-slate-50 last:border-0 text-xs text-slate-700 hover:text-indigo-700 leading-tight"
            >
              {p}
            </button>
          ))}

          {/* Custom text option */}
          {showCustomOption && (
            <button
              type="button"
              onClick={() => selectItem(inputVal.trim())}
              className="w-full text-left px-4 py-2.5 bg-amber-50/60 hover:bg-amber-100/60 transition-colors border-t border-amber-100 text-xs font-medium text-amber-800 flex items-center gap-2"
            >
              <span>+ 自訂：</span>
              <span className="font-semibold">{inputVal.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
