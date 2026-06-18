import { useState, useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import type { Drug } from '../types';

interface Props {
  drug: Drug | null;
  onSave: (data: Partial<Omit<Drug, 'id' | 'created_at'>>) => void;
  onClose: () => void;
}

const emptyForm = {
  generic_name: '',
  brand_name: '',
  hk_number: '',
  ingredient: '',
  dosage: '',
  default_usage: '',
  default_precautions: '',
};

const COMMON_GENERICS = [
  'Paracetamol',
  'Ibuprofen',
  'Amoxicillin',
  'Omeprazole',
  'Metformin',
  'Atorvastatin',
  'Lisinopril',
  'Amlodipine',
  'Salbutamol',
  'Cetirizine',
  'Loratadine',
  'Aspirin',
  'Diclofenac',
  'Prednisolone',
  'Furosemide',
];

const USAGE_PRESETS: Record<string, { usage: string; precautions: string }> = {
  Paracetamol: {
    usage: '每日 3-4 次，每次 1-2 粒，需要時服用。24 小時內不應超過 8 粒。',
    precautions: '此藥引致昏睡，服藥後避免駕駛或操作機械。避免與其他含撲熱息痛之藥物同時服用。',
  },
  Ibuprofen: {
    usage: '每日 2-3 次，每次 1 粒，飽肚服用。',
    precautions: '此藥可能引致腸胃不適，請飽肚服用。哮喘患者及胃潰瘍患者請咨詢醫生。',
  },
  Amoxicillin: {
    usage: '每日 3 次，每次 1 粒，依照醫生指示完成整個療程。',
    precautions: '完成整個抗生素療程。如出現過敏反應（皮疹、呼吸困難）請立即求醫。',
  },
  Omeprazole: {
    usage: '每日 1 次，每次 1 粒，空腹服用（早餐前最少 30 分鐘）。',
    precautions: '長期服用可能增加骨折風險，請定期覆診。',
  },
  Metformin: {
    usage: '每日 2-3 次，每次 1 粒，餐後服用。',
    precautions: '此藥可能引致腸胃不適，初期服用常見。如出現嚴重嘔吐或呼吸困難請立即求醫。',
  },
  Salbutamol: {
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
  Cetirizine: {
    usage: '每日 1 次，每次 1 粒，需要時服用。',
    precautions: '此藥引致昏睡，服藥後避免駕駛或操作機械。',
  },
};

export default function DrugFormModal({ drug, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    if (drug) {
      setForm({
        generic_name: drug.generic_name,
        brand_name: drug.brand_name,
        hk_number: drug.hk_number,
        ingredient: drug.ingredient,
        dosage: drug.dosage,
        default_usage: drug.default_usage,
        default_precautions: drug.default_precautions,
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [drug]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenericSelect = (name: string) => {
    update('generic_name', name);
    const preset = USAGE_PRESETS[name];
    if (preset) {
      // Only auto-fill if creating new (not editing)
      if (!drug) {
        update('default_usage', preset.usage);
        update('default_precautions', preset.precautions);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">
            {drug ? '編輯藥物' : '新增藥物'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">成分 (Generic Name) *</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.generic_name}
                  onChange={(e) => handleGenericSelect(e.target.value)}
                  list="generic-list"
                  placeholder="e.g. Paracetamol"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
                <datalist id="generic-list">
                  {COMMON_GENERICS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">選擇或輸入 generic name 會自動填入預設用法</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">品牌名稱 (Brand Name)</label>
              <input
                type="text"
                value={form.brand_name}
                onChange={(e) => update('brand_name', e.target.value)}
                placeholder="e.g. Panadol"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">HK 註冊編號 *</label>
              <input
                type="text"
                value={form.hk_number}
                onChange={(e) => update('hk_number', e.target.value)}
                placeholder="e.g. HK-65432"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">劑量 *</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => update('dosage', e.target.value)}
                placeholder="e.g. 500mg"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">藥物成分 (Active Ingredient)</label>
            <input
              type="text"
              value={form.ingredient}
              onChange={(e) => update('ingredient', e.target.value)}
              placeholder="e.g. Paracetamol 500mg, Caffeine 65mg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">預設用量及用法</label>
            <textarea
              value={form.default_usage}
              onChange={(e) => update('default_usage', e.target.value)}
              rows={2}
              placeholder="每日 3 次，每次 1 粒，餐後服用"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">預設注意事項</label>
            <textarea
              value={form.default_precautions}
              onChange={(e) => update('default_precautions', e.target.value)}
              rows={2}
              placeholder="此藥引致昏睡，服藥後避免駕駛。"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {drug ? '更新藥物' : '新增藥物'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
