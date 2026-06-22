import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineEye,
  HiOutlineArrowDownTray,
  HiOutlineExclamationTriangle,
  HiOutlineBuildingOffice2,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronDown,
  HiOutlineCheck,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import { loadProfile } from '../lib/storage';
import { fetchDrugs, fetchWarningTemplates } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { mergeDrugs } from '../lib/localPending';
import { downloadLabelPDF, previewLabelPDF } from '../lib/pdfGenerator';
import PrecautionEditor from '../components/PrecautionEditor';
import { formatIngredientsDisplay } from '../components/IngredientEditor';
import type { Drug, PharmacyProfile, LabelItem, LabelGridConfig } from '../types';
import { loadGridConfig } from '../lib/storage';
import { DEFAULT_GRID } from '../types';

/** Fallback warnings when Supabase is not connected. */
const FALLBACK_WARNINGS = [
  'This medication may cause drowsiness. Avoid driving or operating machinery.||此藥引致昏睡，服藥後避免駕駛或操作機械。',
  'This medication may cause gastrointestinal discomfort. Take with food.||此藥可能引致腸胃不適，請飽肚服用。',
  'Prescription Drug||處方藥物 Prescription Drug',
];

interface LabelRow {
  id: string;
  patientName: string;
  selectedDrug: Drug | null;
  customUsage: string;
  customPrecautions: string;
  copies: number;
  copiesText: string;
  quantity: number;
  quantityText: string;
  unit: string;
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
    copies: 1,
    copiesText: '1',
    quantity: 0,
    quantityText: '',
    unit: '粒',
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
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [templates, setTemplates] = useState<string[]>(FALLBACK_WARNINGS);
  const pickerInputRef = useRef<HTMLInputElement | null>(null);

  const supabaseOk = isSupabaseConfigured();

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    const g = loadGridConfig();
    if (g) setGridConfig(g);
  }, []);

  useEffect(() => {
    if (!supabaseOk) return;
    fetchDrugs().then((baseData) => {
      const merged = mergeDrugs(baseData);
      setDrugs(merged);
    }).catch(() => {});
    fetchWarningTemplates()
      .then((data) => setTemplates(data.map((t) => `${t.text_en}||${t.text_zh}`)))
      .catch(() => {});
  }, [supabaseOk]);

  const addRow = () => setRows((prev) => [...prev, createEmptyRow()]);

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
      prev.map((r) => (r.id === rowId ? { ...r, selectedDrug: drug, customUsage: drug.default_usage || '', customPrecautions: drug.default_precautions || '', unit: drug.unit || r.unit } : r)),
    );
    setShowDrugPicker(null);
    setPickerPos(null);
    setDrugSearch('');
  };

  const openPicker = useCallback((rowId: string, inputEl: HTMLInputElement | null) => {
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    setPickerPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
    setShowDrugPicker(rowId);
    setDrugSearch('');
  }, []);

  const filteredDrugs = useMemo(() => {
    if (!drugSearch) return drugs;
    const q = drugSearch.toLowerCase();
    return drugs.filter(
      (d) =>
        d.brand_name.toLowerCase().includes(q) ||
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
      .flatMap((r) => {
        const item: LabelItem = {
          patientName: r.patientName,
          date: today,
          pharmacy: profile,
          drug: r.selectedDrug!,
          quantity: r.quantity > 0 ? r.quantity : 0,
          unit: r.unit || '',
          customUsage: r.customUsage || undefined,
          customPrecautions: r.customPrecautions || undefined,
        };
        return Array.from({ length: r.copies }, () => ({ ...item }));
      });
  };

  const handlePreview = async () => {
    const items = buildLabelItems();
    if (items.length === 0) return;
    await previewLabelPDF(items, gridConfig);
  };

  const handleDownload = async () => {
    const items = buildLabelItems();
    if (items.length === 0) return;
    setGenerating(true);
    try {
      await downloadLabelPDF(items, gridConfig);
    } finally {
      setGenerating(false);
    }
  };

  const validRows = rows.filter((r) => r.patientName.trim() && r.selectedDrug);
  const totalLabels = validRows.reduce((sum, r) => sum + r.copies, 0);
  const labelsPerPage = gridConfig.cols * gridConfig.rows;
  const totalPages = Math.ceil(totalLabels / labelsPerPage);
  const hasProfile = !!profile;

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">配發標籤</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {today}
                {profile && <span className="mx-1.5">·</span>}
                {profile ? (
                  <span className="text-indigo-500 font-medium">{profile.name}</span>
                ) : (
                  <span className="text-amber-500 font-medium">尚未設定藥房資料</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {validRows.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              disabled={generating}
              className="btn-modern bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            >
              <HiOutlineEye className="w-4 h-4" />
              預覽
            </button>
            <button
              onClick={handleDownload}
              disabled={generating}
              className="btn-modern bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              {generating ? '生成中…' : '下載 PDF'}
            </button>
          </div>
        )}
      </div>

      {/* Warnings */}
      {!hasProfile && (
        <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">尚未設定藥房資料</p>
            <p className="text-xs text-amber-600/80 mt-0.5">
              請先到「藥房資料」頁面填寫你的藥房或診所資訊，這些資料會印在每一張標籤上。
            </p>
          </div>
        </div>
      )}

      {!supabaseOk && (
        <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">尚未設定 Supabase 藥物數據庫</p>
            <p className="text-xs text-amber-600/80 mt-0.5">
              藥物數據庫需要連接 Supabase 才能使用。你仍可手動輸入藥物資料，或先到「藥物數據庫」頁面設定。
            </p>
          </div>
        </div>
      )}

      {/* Label rows */}
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="card-elevated animate-fade-in-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-100/80 rounded-t-xl overflow-hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-slate-600">
                  標籤 #{idx + 1}
                </span>
                {row.patientName && (
                  <span className="text-xs text-indigo-500 font-medium ml-1">
                    · {row.patientName}
                  </span>
                )}
                {row.selectedDrug && (
                  <span className="flex items-center gap-1 ml-2 text-xs text-slate-400">
                    <span className="text-slate-300">×</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={row.copiesText}
                      onChange={(e) => updateRow(row.id, 'copiesText', e.target.value)}
                      onBlur={() => {
                        const v = parseInt(row.copiesText, 10);
                        if (!isNaN(v) && v >= 1 && v <= 999) {
                          updateRow(row.id, 'copies', v);
                        } else {
                          // revert
                          updateRow(row.id, 'copiesText', String(row.copies));
                        }
                      }}
                      className="w-10 px-1 py-0.5 bg-white border border-slate-200 rounded-md text-xs text-center text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </span>
                )}
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    病人姓名 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={row.patientName}
                      onChange={(e) => updateRow(row.id, 'patientName', e.target.value)}
                      placeholder="輸入病人姓名"
                      className="input-modern pl-9 pr-3.5"
                    />
                    <HiOutlineBuildingOffice2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Drug selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    藥物 <span className="text-red-400">*</span>
                  </label>
                  {row.selectedDrug ? (
                    <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200/60 rounded-xl px-4 py-2.5 group hover:bg-indigo-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <HiOutlineCheck className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-indigo-800">
                            {row.selectedDrug.brand_name}
                          </p>
                          <p className="text-xs text-indigo-500/80">
                            {formatIngredientsDisplay(row.selectedDrug.ingredient)}
                            {row.selectedDrug.hk_number && (
                              <>
                                <span className="mx-1">·</span>
                                {row.selectedDrug.hk_number}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateRow(row.id, 'selectedDrug', null)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium px-2 py-1 rounded-lg hover:bg-indigo-100/50 transition-colors"
                      >
                        更換
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          ref={showDrugPicker === row.id ? pickerInputRef : undefined}
                          type="text"
                          value={showDrugPicker === row.id ? drugSearch : ''}
                          onFocus={(e) => openPicker(row.id, e.currentTarget)}
                          onChange={(e) => setDrugSearch(e.target.value)}
                          placeholder={
                            supabaseOk
                              ? '搜尋或選擇藥物…'
                              : '請先設定 Supabase 藥物數據庫'
                          }
                          disabled={!supabaseOk}
                          className="input-modern pl-9 pr-9"
                        />
                        <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity & Unit — only when drug selected */}
              {row.selectedDrug && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      數量 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={row.quantityText}
                      onChange={(e) => updateRow(row.id, 'quantityText', e.target.value)}
                      onBlur={() => {
                        const v = parseInt(row.quantityText, 10);
                        if (!isNaN(v) && v >= 1 && v <= 9999) {
                          updateRow(row.id, 'quantity', v);
                        } else {
                          updateRow(row.id, 'quantityText', row.quantity > 0 ? String(row.quantity) : '');
                        }
                      }}
                      placeholder="14"
                      className="input-modern px-3.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      單位
                    </label>
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                      placeholder="粒"
                      list="unit-options"
                      className="input-modern px-3.5"
                    />
                  </div>
                </div>
              )}

              {/* Custom usage & precautions */}
              {row.selectedDrug && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      用法 <span className="text-slate-300 font-normal normal-case">(直接修改)</span>
                    </label>
                    <textarea
                      value={row.customUsage}
                      onChange={(e) => updateRow(row.id, 'customUsage', e.target.value)}
                      rows={2}
                      className="input-modern px-3.5 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      注意事項 <span className="text-slate-300 font-normal normal-case">(最多 3 項)</span>
                    </label>
                    <PrecautionEditor
                      value={row.customPrecautions}
                      onChange={(v) => updateRow(row.id, 'customPrecautions', v)}
                      commonPrecautions={templates}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Portal drug picker dropdown */}
      {showDrugPicker && pickerPos && supabaseOk && createPortal(
        <div
          className="fixed z-50 animate-scale-in"
          style={{
            top: pickerPos.top,
            left: pickerPos.left,
            width: pickerPos.width,
          }}
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 max-h-56 overflow-y-auto">
            {/* Search input inside dropdown */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  placeholder="搜尋藥物…"
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>
            {filteredDrugs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <HiOutlineMagnifyingGlass className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  {drugSearch ? '找不到相符藥物' : '尚未加入任何藥物'}
                </p>
              </div>
            ) : (
              filteredDrugs.map((drug) => (
                <button
                  key={drug.id}
                  onClick={() => selectDrug(showDrugPicker, drug)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 transition-colors border-b border-slate-50 last:border-0 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {drug.brand_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {drug.hk_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    {formatIngredientsDisplay(drug.ingredient) || drug.brand_name}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Add more button */}
      <button
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 border-2 border-dashed border-slate-300/70 hover:border-indigo-300 rounded-2xl text-sm font-medium text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all group"
      >
        <HiOutlinePlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        新增標籤
      </button>

      {/* Common unit options for datalist */}
      <datalist id="unit-options">
        <option value="粒" />
        <option value="包" />
        <option value="毫升" />
        <option value="支" />
        <option value="揿" />
        <option value="瓶" />
        <option value="片" />
        <option value="丸" />
        <option value="劑" />
      </datalist>

      {/* Summary bar */}
      {validRows.length > 0 && profile && (
        <div className="card-elevated px-5 py-4 flex items-center justify-between flex-wrap gap-3 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <HiOutlineBuildingOffice2 className="w-4 h-4" />
              共 <strong className="text-slate-800">{totalLabels}</strong> 張標籤
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <HiOutlineDocumentText className="w-4 h-4" />
              每頁 <strong className="text-slate-800">{labelsPerPage}</strong> 格
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <HiOutlinePrinter className="w-4 h-4" />
              共 <strong className="text-slate-800">{totalPages}</strong> 頁 A4
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="btn-modern bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            下載 PDF
          </button>
        </div>
      )}

      {/* Empty state */}
      {validRows.length === 0 && (
        <div className="card-elevated px-12 py-16 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <HiOutlinePrinter className="w-8 h-8 text-indigo-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">準備好配發藥物了嗎？</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            填寫病人姓名及選擇藥物即可生成 A4 標籤 PDF，你可為多位病人一次過批量列印。
          </p>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDrugPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDrugPicker(null);
            setPickerPos(null);
            setDrugSearch('');
          }}
        />
      )}
    </div>
  );
}
