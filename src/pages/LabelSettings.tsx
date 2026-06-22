import { useEffect, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineCog6Tooth,
  HiOutlineCheckCircle,
  HiOutlineScale,
  HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2';
import { saveGridConfig, saveFontScale, loadFontScale, loadGridConfig } from '../lib/storage';
import type { LabelGridConfig } from '../types';
import { DEFAULT_GRID, PRESET_GRIDS } from '../types';

export default function LabelSettingsPage() {
  const [config, setConfig] = useState<LabelGridConfig>(DEFAULT_GRID);
  const [fontScale, setFontScale] = useState(1);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(loadGridConfig());
    setFontScale(loadFontScale());
  }, []);

  const update = (field: keyof LabelGridConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const applyPreset = (preset: LabelGridConfig) => {
    setConfig(preset);
    setSaved(false);
  };

  const handleSave = () => {
    saveGridConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_GRID);
    setSaved(false);
  };

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <HiOutlineCog6Tooth className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">標籤設定</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            設定標籤紙的格式，令列印位置準確對應你的標籤紙。
          </p>
        </div>
      </div>

      {/* Presets */}
      <div className="card-elevated overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">常用格式預設</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {PRESET_GRIDS.map((preset) => {
              const isActive =
                config.cols === preset.config.cols &&
                config.rows === preset.config.rows;
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.config)}
                  className={`relative px-3 py-3 rounded-xl text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                      <HiOutlineCheckCircle className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <span className="block font-semibold">{preset.name}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {preset.config.cols}×{preset.config.rows} · {preset.config.labelWidth}×{preset.config.labelHeight}mm
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manual config */}
      <div className="card-elevated overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
              <HiOutlineScale className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">進階設定</h3>
              <p className="text-[10px] text-slate-400">所有數值單位為毫米 (mm)</p>
            </div>
          </div>
        </div>

        {/* Grid size */}
        <div className="px-6 pt-5 pb-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            標籤紙格數
            <span className="text-[10px] font-normal normal-case text-slate-400">— 每頁 A4 分為幾行幾列</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="行數 (Rows)" value={config.rows} onChange={(v) => update('rows', v)} min={1} max={20} />
            <Field label="列數 (Cols)" value={config.cols} onChange={(v) => update('cols', v)} min={1} max={10} />
            <Field label="標籤寬度" value={config.labelWidth} onChange={(v) => update('labelWidth', v)} min={10} max={210} step={0.1} />
            <Field label="標籤高度" value={config.labelHeight} onChange={(v) => update('labelHeight', v)} min={10} max={297} step={0.1} />
          </div>
        </div>

        {/* A4 margins */}
        <div className="px-6 pt-4 pb-2 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            A4 紙張邊距
            <span className="text-[10px] font-normal normal-case text-slate-400">— 標籤區域離紙張邊緣的距離</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="上邊距 (Top)" desc="第一行離 A4 頂部" value={config.marginTop} onChange={(v) => update('marginTop', v)} min={0} max={50} step={0.5} />
            <Field label="下邊距 (Bottom)" desc="最後一行離 A4 底部" value={config.marginBottom} onChange={(v) => update('marginBottom', v)} min={0} max={50} step={0.5} />
            <Field label="左邊距 (Left)" desc="第一列離 A4 左邊" value={config.marginLeft} onChange={(v) => update('marginLeft', v)} min={0} max={50} step={0.5} />
            <Field label="右邊距 (Right)" desc="最後一列離 A4 右邊" value={config.marginRight} onChange={(v) => update('marginRight', v)} min={0} max={50} step={0.5} />
          </div>
        </div>

        {/* Label inner padding */}
        <div className="px-6 pt-4 pb-2 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            標籤內邊距
            <span className="text-[10px] font-normal normal-case text-slate-400">— 內容離標籤邊緣的距離，避免列印時被裁切</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="上內邊距 (Padding Top)" desc="內容離標籤頂部" value={config.paddingTop} onChange={(v) => update('paddingTop', v)} min={0} max={15} step={0.5} />
            <Field label="下內邊距 (Padding Bottom)" desc="內容離標籤底部" value={config.paddingBottom} onChange={(v) => update('paddingBottom', v)} min={0} max={15} step={0.5} />
            <Field label="左內邊距 (Padding Left)" desc="內容離標籤左邊" value={config.paddingLeft} onChange={(v) => update('paddingLeft', v)} min={0} max={15} step={0.5} />
            <Field label="右內邊距 (Padding Right)" desc="內容離標籤右邊" value={config.paddingRight} onChange={(v) => update('paddingRight', v)} min={0} max={15} step={0.5} />
          </div>
        </div>

        {/* Gaps */}
        <div className="px-6 pt-4 pb-5 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            標籤間距
            <span className="text-[10px] font-normal normal-case text-slate-400">— 相鄰標籤之間的空白距離</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="水平間距 (Gap X)" desc="左右相鄰標籤的間距" value={config.gapX} onChange={(v) => update('gapX', v)} min={0} max={20} step={0.5} />
            <Field label="垂直間距 (Gap Y)" desc="上下相鄰標籤的間距" value={config.gapY} onChange={(v) => update('gapY', v)} min={0} max={20} step={0.5} />
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <HiOutlineArrowPath className="w-3.5 h-3.5" />
            重設預設值
          </button>
          <button
            onClick={handleSave}
            className={`btn-modern transition-all ${
              saved
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20'
            }`}
          >
            {saved ? (
              <>
                <HiOutlineCheckCircle className="w-4 h-4" />
                已儲存
              </>
            ) : (
              '儲存設定'
            )}
          </button>
        </div>
      </div>

      {/* Font scale */}
      <div className="card-elevated overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <HiOutlineAdjustmentsHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">字體大小</h3>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-medium w-6 text-center">A</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={fontScale}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setFontScale(v);
                saveFontScale(v);
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
              }}
              className="flex-1 accent-indigo-500 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200"
              style={{ accentColor: '#6366f1' }}
            />
            <span className="text-xs text-slate-400 font-medium w-6 text-center">A</span>
            <span className="text-sm font-semibold text-indigo-600 w-12 text-right tabular-nums">
              {fontScale.toFixed(2)}×
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 ml-6">
            所有文字按比例放大/縮小，各部分相對大小保持不變。
          </p>
        </div>
      </div>

      {/* Visual preview */}
      <div className="card-elevated overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">版面預覽</h3>
        </div>
        <div className="p-6">
          <div className="aspect-[210/297] max-w-xs bg-white border border-slate-200 rounded-xl mx-auto p-3 relative overflow-hidden shadow-inner">
            <svg viewBox="0 0 210 297" className="w-full h-full">
              <rect x="0" y="0" width="210" height="297" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />

              {/* Label grid — evenly divided across A4 */}
              {Array.from({ length: config.rows * config.cols }, (_, i) => {
                const col = i % config.cols;
                const row = Math.floor(i / config.cols);
                const cellW = 210 / config.cols;
                const cellH = 297 / config.rows;
                const x = col * cellW;
                const y = row * cellH;
                return (
                  <g key={i}>
                    {/* Cell background */}
                    <rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      fill={i % 2 === 0 ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)'}
                      stroke="rgba(99, 102, 241, 0.25)"
                      strokeWidth="0.2"
                    />
                    {/* Label outline within cell */}
                    <rect
                      x={x + (cellW - config.labelWidth) / 2}
                      y={y + (cellH - config.labelHeight) / 2}
                      width={config.labelWidth}
                      height={config.labelHeight}
                      fill="rgba(99, 102, 241, 0.07)"
                      stroke="rgba(99, 102, 241, 0.5)"
                      strokeWidth="0.3"
                      rx="0.5"
                    />
                  </g>
                );
              })}

              <text x="105" y="8" textAnchor="middle" fontSize="2.5" fill="#94a3b8" fontFamily="Inter, sans-serif">
                A4 (210 × 297 mm)
              </text>
            </svg>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3 font-medium">
            每頁 {config.cols * config.rows} 格 · 每個標籤 {config.labelWidth} × {config.labelHeight} mm
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  desc,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  desc?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const [text, setText] = useState(() => String(value));

  // Sync from parent when value changes externally
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      setText(String(value)); // revert to last valid
      return;
    }
    const v = parseFloat(trimmed);
    if (!isNaN(v)) {
      onChange(Math.min(max, Math.max(min, v)));
    } else {
      setText(String(value)); // revert invalid
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {desc && (
        <p className="text-[10px] text-slate-400 mb-1 leading-tight">{desc}</p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          min={min}
          max={max}
          step={step || 1}
          className="input-modern px-3.5"
        />
        <span className="text-xs text-slate-400 w-5 font-medium">mm</span>
      </div>
    </div>
  );
}
