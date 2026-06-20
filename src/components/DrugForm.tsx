import { useState, useEffect } from 'react';
import { HiOutlineXMark, HiOutlineBeaker, HiOutlineCheckCircle } from 'react-icons/hi2';
import type { Drug } from '../types';
import PrecautionEditor from './PrecautionEditor';
import IngredientEditor from './IngredientEditor';
import { fetchWarningTemplates, isSupabaseConfigured } from '../lib/supabase';

const COMMON_PRECAUTIONS = [
  '此藥引致昏睡，服藥後避免駕駛或操作機械。',
  '此藥可能引致腸胃不適，請飽肚服用。',
  '處方藥物 Prescription Drug',
];

interface Props {
  drug: Drug | null;
  onSave: (data: Partial<Omit<Drug, 'id' | 'created_at'>>) => void;
  onClose: () => void;
}

const emptyForm = {
  brand_name: '',
  hk_number: '',
  ingredient: '',
  default_usage: '',
  default_precautions: '',
  unit: '',
};

const USAGE_PRESETS: Record<string, { usage: string; precautions: string }> = {
  Panadol: {
    usage: '每日 3-4 次，每次 1-2 粒，需要時服用。24 小時內不應超過 8 粒。',
    precautions: '此藥引致昏睡，服藥後避免駕駛或操作機械。避免與其他含撲熱息痛之藥物同時服用。',
  },
  Nurofen: {
    usage: '每日 2-3 次，每次 1 粒，飽肚服用。',
    precautions: '此藥可能引致腸胃不適，請飽肚服用。哮喘患者及胃潰瘍患者請咨詢醫生。',
  },
  'Amoxicillin Capsules': {
    usage: '每日 3 次，每次 1 粒，依照醫生指示完成整個療程。',
    precautions: '完成整個抗生素療程。如出現過敏反應（皮疹、呼吸困難）請立即求醫。',
  },
  Losec: {
    usage: '每日 1 次，每次 1 粒，空腹服用（早餐前最少 30 分鐘）。',
    precautions: '長期服用可能增加骨折風險，請定期覆診。',
  },
  Glucophage: {
    usage: '每日 2-3 次，每次 1 粒，餐後服用。',
    precautions: '此藥可能引致腸胃不適，初期服用常見。如出現嚴重嘔吐或呼吸困難請立即求醫。',
  },
  'Ventolin Inhaler': {
    usage: '需要時使用，每次 1-2 揿。每日不應超過 8 揿。',
    precautions: '此藥可能引致心跳加速及手震。如藥效減弱請立即求醫。',
  },
  Aspirin: {
    usage: '每日 1 次，每次 1 粒，餐後服用。',
    precautions: '此藥可能增加出血風險。手術前請告知醫生正在服用此藥。',
  },
  Diclofenac: {
    usage: '每日 2-3 次，每次 1 粒，飽肚服用。',
    precautions: '此藥可能引致腸胃不適及水腫。心臟病及腎病患者慎用。',
  },
  Zyrtec: {
    usage: '每日 1 次，每次 1 粒，需要時服用。',
    precautions: '此藥引致昏睡，服藥後避免駕駛或操作機械。',
  },
};

export default function DrugFormModal({ drug, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...emptyForm });
  const [templates, setTemplates] = useState<string[]>(COMMON_PRECAUTIONS);
  const isEditing = !!drug;

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchWarningTemplates()
        .then((data) => setTemplates(data.map((t) => t.text)))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (drug) {
      setForm({
        brand_name: drug.brand_name,
        hk_number: drug.hk_number,
        ingredient: drug.ingredient,
        default_usage: drug.default_usage,
        default_precautions: drug.default_precautions,
        unit: drug.unit || '',
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [drug]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrandSelect = (name: string) => {
    update('brand_name', name);
    const preset = USAGE_PRESETS[name];
    if (preset && !isEditing) {
      update('default_usage', preset.usage);
      update('default_precautions', preset.precautions);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
              <HiOutlineBeaker className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {isEditing ? '編輯藥物' : '新增藥物'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? '修改藥物資料及預設用法' : '加入新藥物到數據庫'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                品牌名稱 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.brand_name}
                onChange={(e) => handleBrandSelect(e.target.value)}
                list="brand-list"
                placeholder="e.g. Panadol"
                required
                className="input-modern px-3.5"
              />
              <datalist id="brand-list">
                {Object.keys(USAGE_PRESETS).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {!isEditing && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <HiOutlineCheckCircle className="w-3 h-3" />
                  選擇品牌名稱會自動填入預設用法
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                單位  <span className="text-slate-300 font-normal normal-case">(劑型)</span>
              </label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => update('unit', e.target.value)}
                placeholder="粒"
                list="drug-unit-list"
                className="input-modern px-3.5"
              />
              <datalist id="drug-unit-list">
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
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                HK 註冊編號 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.hk_number}
                onChange={(e) => update('hk_number', e.target.value)}
                placeholder="e.g. HK-65432"
                required
                className="input-modern px-3.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              藥物成分 <span className="text-slate-300 font-normal normal-case">(每種成分名稱 + 劑量)</span>
            </label>
            <IngredientEditor
              value={form.ingredient}
              onChange={(v) => update('ingredient', v)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              預設用量及用法
            </label>
            <textarea
              value={form.default_usage}
              onChange={(e) => update('default_usage', e.target.value)}
              rows={2}
              placeholder="每日 3 次，每次 1 粒，餐後服用"
              className="input-modern px-3.5 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              預設注意事項 <span className="text-slate-300 font-normal normal-case">(最多 3 項)</span>
            </label>
            <PrecautionEditor
              value={form.default_precautions}
              onChange={(v) => update('default_precautions', v)}
              commonPrecautions={templates}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-modern bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-modern bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              {isEditing ? '更新藥物' : '新增藥物'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
