import { useEffect, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineCog6Tooth,
  HiOutlineCheckCircle,
  HiOutlineScale,
} from 'react-icons/hi2';
import { saveGridConfig } from '../lib/storage';
import type { LabelGridConfig } from '../types';
import { DEFAULT_GRID, PRESET_GRIDS } from '../types';

export default function LabelSettingsPage() {
  const [config, setConfig] = useState<LabelGridConfig>(DEFAULT_GRID);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedStr = localStorage.getItem('med-label-printer:grid-config');
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr) as LabelGridConfig;
        setConfig(parsed);
      } catch {}
    }
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
              <h3 className="text-sm font-semibold text-slate-700">詳細設定</h3>
              <p className="text-[10px] text-slate-400">所有數值單位為毫米 (mm)</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="行數 (Rows)" value={config.rows} onChange={(v) => update('rows', v)} min={1} max={20} />
          <Field label="列數 (Cols)" value={config.cols} onChange={(v) => update('cols', v)} min={1} max={10} />
          <Field label="標籤寬度" value={config.labelWidth} onChange={(v) => update('labelWidth', v)} min={10} max={210} step={0.1} />
          <Field label="標籤高度" value={config.labelHeight} onChange={(v) => update('labelHeight', v)} min={10} max={297} step={0.1} />
          <Field label="上邊距" value={config.marginTop} onChange={(v) => update('marginTop', v)} min={0} max={50} step={0.5} />
          <Field label="下邊距" value={config.marginBottom} onChange={(v) => update('marginBottom', v)} min={0} max={50} step={0.5} />
          <Field label="左邊距" value={config.marginLeft} onChange={(v) => update('marginLeft', v)} min={0} max={50} step={0.5} />
          <Field label="右邊距" value={config.marginRight} onChange={(v) => update('marginRight', v)} min={0} max={50} step={0.5} />
          <Field label="水平間距" value={config.gapX} onChange={(v) => update('gapX', v)} min={0} max={20} step={0.5} />
          <Field label="垂直間距" value={config.gapY} onChange={(v) => update('gapY', v)} min={0} max={20} step={0.5} />
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

      {/* Visual preview */}
      <div className="card-elevated overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">版面預覽</h3>
        </div>
        <div className="p-6">
          <div className="aspect-[210/297] max-w-xs bg-white border border-slate-200 rounded-xl mx-auto p-3 relative overflow-hidden shadow-inner">
            <svg viewBox="0 0 210 297" className="w-full h-full">
              <rect x="0" y="0" width="210" height="297" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />

              {/* Label grid */}
              {(() => {
                const totalGridH = config.rows * config.labelHeight + (config.rows - 1) * config.gapY;
                const totalUsedH = config.marginTop + totalGridH + config.marginBottom;
                const extraPad = Math.max(0, (297 - totalUsedH) / 2);
                return Array.from({ length: config.rows * config.cols }, (_, i) => {
                  const col = i % config.cols;
                  const row = Math.floor(i / config.cols);
                  const x = config.marginLeft + col * (config.labelWidth + config.gapX);
                  const y = config.marginTop + extraPad + row * (config.labelHeight + config.gapY);
                  return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={config.labelWidth}
                    height={config.labelHeight}
                    fill="rgba(99, 102, 241, 0.06)"
                    stroke="rgba(99, 102, 241, 0.4)"
                    strokeWidth="0.3"
                    rx="0.5"
                  />
                );
              })()}

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
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
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
