import { useEffect, useState } from 'react';
import { HiOutlineArrowPath } from 'react-icons/hi2';
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">標籤設定</h2>
        <p className="text-sm text-slate-500 mt-1">
          設定標籤紙的格式，令列印位置準確對應你的標籤紙。
        </p>
      </div>

      {/* Presets */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">常用格式預設</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRESET_GRIDS.map((preset) => {
            const isActive =
              config.cols === preset.config.cols &&
              config.rows === preset.config.rows;
            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.config)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  isActive
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual config */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">詳細設定</h3>
          <p className="text-xs text-slate-400 mt-0.5">所有數值單位為毫米 (mm)</p>
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

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <HiOutlineArrowPath className="w-3.5 h-3.5" />
            重設預設值
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? '✓ 已儲存' : '儲存設定'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">版面預覽</h3>
        <div className="aspect-[210/297] max-w-xs bg-white border border-slate-300 rounded-lg mx-auto p-2 relative overflow-hidden">
          {/* A4 preview */}
          <svg viewBox="0 0 210 297" className="w-full h-full">
            <rect x="0" y="0" width="210" height="297" fill="white" stroke="#d1d5db" strokeWidth="0.5" />

            {/* Label grid */}
            {Array.from({ length: config.rows * config.cols }, (_, i) => {
              const col = i % config.cols;
              const row = Math.floor(i / config.cols);
              const x = config.marginLeft + col * (config.labelWidth + config.gapX);
              const y = config.marginTop + row * (config.labelHeight + config.gapY);
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={config.labelWidth}
                  height={config.labelHeight}
                  fill="#f0f9ff"
                  stroke="#0e7490"
                  strokeWidth="0.3"
                  rx="0.5"
                />
              );
            })}

            {/* Dimensions label */}
            <text x="105" y="10" textAnchor="middle" fontSize="3" fill="#9ca3af">
              A4 (210 × 297 mm)
            </text>
          </svg>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          每頁 {config.cols * config.rows} 格 · 每個標籤 {config.labelWidth} × {config.labelHeight} mm
        </p>
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
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
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
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        />
        <span className="text-xs text-slate-400 w-6">mm</span>
      </div>
    </div>
  );
}
