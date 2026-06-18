import { useEffect, useState, useMemo } from 'react';
import {
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineEye,
  HiOutlineArrowDownTray,
  HiOutlineExclamationTriangle,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import { loadProfile } from '../lib/storage';
import { fetchDrugs } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { downloadLabelPDF, previewLabelPDF } from '../lib/pdfGenerator';
import type { Drug, PharmacyProfile, LabelItem, LabelGridConfig } from '../types';
import { loadGridConfig } from '../lib/storage';
import { DEFAULT_GRID } from '../types';

interface LabelRow {
  id: string;
  patientName: string;
  selectedDrug: Drug | null;
  customUsage: string;
  customPrecautions: string;
}

let rowIdCounter = 0;
function newRowId() {
  return `row_${++rowIdCounter}_${Date.now()}`;
}

function createEmptyRow(): LabelRow {
  return {
    id: newRowId(),
    patientName: '',
    selectedDrug: null,
    customUsage: '',
    customPrecautions: '',
  };
}

export default function DispenseLabelsPage() {
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [rows, setRows] = useState<LabelRow[]>([createEmptyRow()]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugPicker, setShowDrugPicker] = useState<string | null>(null);
  const [gridConfig, setGridConfig] = useState<LabelGridConfig>(DEFAULT_GRID);
  const [generating, setGenerating] = useState(false);

  const supabaseOk = isSupabaseConfigured();

  // Load profile + grid config
  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    const g = loadGridConfig();
    if (g) setGridConfig(g);
  }, []);

  // Load drugs from Supabase
  useEffect(() => {
    if (!supabaseOk) return;
    fetchDrugs().then(setDrugs).catch(() => {});
  }, [supabaseOk]);

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  };

  const updateRow = (id: string, field: keyof LabelRow, value: unknown) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const selectDrug = (rowId: string, drug: Drug) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, selectedDrug: drug } : r)),
    );
    setShowDrugPicker(null);
    setDrugSearch('');
  };

  const filteredDrugs = useMemo(() => {
    if (!drugSearch) return drugs;
    const q = drugSearch.toLowerCase();
    return drugs.filter(
      (d) =>
        d.brand_name.toLowerCase().includes(q) ||
        d.generic_name.toLowerCase().includes(q) ||
        d.ingredient.toLowerCase().includes(q) ||
        d.hk_number.toLowerCase().includes(q),
    );
  }, [drugs, drugSearch]);

  const today = new Date().toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const buildLabelItems = (): LabelItem[] => {
    if (!profile) return [];
    return rows
      .filter((r) => r.patientName.trim() && r.selectedDrug)
      .map((r) => ({
        patientName: r.patientName,
        date: today,
        pharmacy: profile,
        drug: r.selectedDrug!,
        customUsage: r.customUsage || undefined,
        customPrecautions: r.customPrecautions || undefined,
      }));
  };

  const handlePreview = () => {
    const items = buildLabelItems();
    if (items.length === 0) return;
    previewLabelPDF(items, gridConfig);
  };

  const handleDownload = () => {
    const items = buildLabelItems();
    if (items.length === 0) return;
    setGenerating(true);
    // Small delay to show generating state
    setTimeout(() => {
      downloadLabelPDF(items, gridConfig);
      setGenerating(false);
    }, 300);
  };

  const validRows = rows.filter((r) => r.patientName.trim() && r.selectedDrug);
  const hasProfile = !!profile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">配發標籤</h2>
          <p className="text-sm text-slate-500 mt-1">
            {today} · {profile ? profile.name : '尚未設定藥房資料'}
          </p>
        </div>

        {validRows.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <HiOutlineEye className="w-4 h-4" />
              預覽
            </button>
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              {generating ? '生成中…' : '下載 PDF'}
            </button>
          </div>
        )}
      </div>

      {/* No profile warning */}
      {!hasProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">尚未設定藥房資料</p>
            <p className="text-xs text-amber-700 mt-0.5">
              請先到「藥房資料」頁面填寫你的藥房或診所資訊，這些資料會印在每一張標籤上。
            </p>
          </div>
        </div>
      )}

      {/* No Supabase warning */}
      {!supabaseOk && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">尚未設定 Supabase 藥物數據庫</p>
            <p className="text-xs text-amber-700 mt-0.5">
              藥物數據庫需要連接 Supabase 才能使用。你仍可手動輸入藥物資料，或先到「藥物數據庫」頁面設定。
            </p>
          </div>
        </div>
      )}

      {/* Label rows */}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 animate-fade-in"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                標籤 #{idx + 1}
              </span>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* Patient name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  病人姓名 *
                </label>
                <input
                  type="text"
                  value={row.patientName}
                  onChange={(e) => updateRow(row.id, 'patientName', e.target.value)}
                  placeholder="輸入病人姓名"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
              </div>

              {/* Drug selector */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  藥物 *
                </label>
                {row.selectedDrug ? (
                  <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-sky-800">
                        {row.selectedDrug.brand_name || row.selectedDrug.generic_name}
                      </p>
                      <p className="text-xs text-sky-600">
                        {row.selectedDrug.generic_name} · {row.selectedDrug.dosage}
                        {row.selectedDrug.hk_number && ` · ${row.selectedDrug.hk_number}`}
                      </p>
                    </div>
                    <button
                      onClick={() => updateRow(row.id, 'selectedDrug', null)}
                      className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                    >
                      更換
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={showDrugPicker === row.id ? drugSearch : ''}
                      onFocus={() => {
                        setShowDrugPicker(row.id);
                        setDrugSearch('');
                      }}
                      onChange={(e) => setDrugSearch(e.target.value)}
                      placeholder={
                        supabaseOk
                          ? '搜尋或選擇藥物…'
                          : '請先設定 Supabase 藥物數據庫'
                      }
                      disabled={!supabaseOk}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />

                    {/* Dropdown */}
                    {showDrugPicker === row.id && supabaseOk && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredDrugs.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-slate-400 text-center">
                            {drugSearch ? '找不到相符藥物' : '尚未加入任何藥物'}
                          </p>
                        ) : (
                          filteredDrugs.map((drug) => (
                            <button
                              key={drug.id}
                              onClick={() => selectDrug(row.id, drug)}
                              className="w-full text-left px-3 py-2 hover:bg-sky-50 transition-colors text-sm border-b border-slate-50 last:border-0"
                            >
                              <span className="font-medium text-slate-800">
                                {drug.brand_name || drug.generic_name}
                              </span>
                              <span className="text-slate-400 ml-2 text-xs">
                                {drug.dosage}
                              </span>
                              <span className="text-slate-400 ml-1 text-xs">
                                · {drug.generic_name}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom usage & precautions (if drug selected) */}
              {row.selectedDrug && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      用法（如修改）
                    </label>
                    <input
                      type="text"
                      value={row.customUsage}
                      onChange={(e) => updateRow(row.id, 'customUsage', e.target.value)}
                      placeholder={row.selectedDrug.default_usage || '自訂用法'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      注意事項（如修改）
                    </label>
                    <input
                      type="text"
                      value={row.customPrecautions}
                      onChange={(e) => updateRow(row.id, 'customPrecautions', e.target.value)}
                      placeholder={row.selectedDrug.default_precautions || '自訂注意事項'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add more button */}
      <button
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-primary-50/30 rounded-xl text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors"
      >
        <HiOutlinePlusCircle className="w-5 h-5" />
        新增標籤
      </button>

      {/* Summary */}
      {validRows.length > 0 && profile && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400" />
            共 <strong className="text-slate-800">{validRows.length}</strong> 張標籤
            · 每頁 {gridConfig.cols * gridConfig.rows} 格
            · 共 {Math.ceil(validRows.length / (gridConfig.cols * gridConfig.rows))} 頁
          </div>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            下載 PDF
          </button>
        </div>
      )}

      {/* No valid rows state */}
      {validRows.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <HiOutlinePrinter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">填寫病人姓名及選擇藥物即可生成標籤</p>
          <p className="text-slate-400 text-xs mt-1">
            你可為多位病人一次過生成整頁 A4 標籤
          </p>
        </div>
      )}
    </div>
  );
}
