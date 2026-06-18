import { useEffect, useState, useCallback } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { fetchDrugs, createDrug, updateDrug, deleteDrug } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Drug } from '../types';
import DrugFormModal from '../components/DrugForm';

export default function DrugDatabasePage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDrugs = useCallback(async (q?: string) => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await fetchDrugs(q || undefined);
      setDrugs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drugs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrugs();
  }, [loadDrugs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) loadDrugs(search);
      else loadDrugs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadDrugs]);

  const handleCreate = async (data: Omit<Drug, 'id' | 'created_at'>) => {
    try {
      await createDrug(data);
      showToast('success', '藥物已新增');
      setShowForm(false);
      loadDrugs(search);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '新增失敗');
    }
  };

  const handleUpdate = async (id: number, data: Partial<Omit<Drug, 'id' | 'created_at'>>) => {
    try {
      await updateDrug(id, data);
      showToast('success', '藥物已更新');
      setEditingDrug(null);
      setShowForm(false);
      loadDrugs(search);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '更新失敗');
    }
  };

  const handleDelete = async (drug: Drug) => {
    if (!confirm(`確定刪除「${drug.brand_name || drug.generic_name}」？`)) return;
    try {
      await deleteDrug(drug.id!);
      showToast('success', '藥物已刪除');
      loadDrugs(search);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '刪除失敗');
    }
  };

  const openEdit = (drug: Drug) => {
    setEditingDrug(drug);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingDrug(null);
    setShowForm(true);
  };

  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">藥物數據庫</h2>
          <p className="text-sm text-slate-500 mt-1">
            管理藥劑製品資料，包括名稱、成分、劑量及預設用法。
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!supabaseOk}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <HiOutlinePlusCircle className="w-4 h-4" />
          新增藥物
        </button>
      </div>

      {/* Supabase not configured warning */}
      {!supabaseOk && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">尚未設定 Supabase</p>
            <p className="text-xs text-amber-700 mt-0.5">
              請在專案根目錄建立 <code className="bg-amber-100 px-1 rounded">.env</code> 檔案，並設定{' '}
              <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> 及{' '}
              <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>。
              設定完成後重新整理頁面即可使用。
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      {supabaseOk && (
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋藥物名稱或成分…"
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-sm"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">載入中…</div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Drug table */}
      {!loading && supabaseOk && drugs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <HiOutlinePlusCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">尚未加入任何藥物</p>
          <p className="text-slate-400 text-xs mt-1">點擊「新增藥物」開始建立數據庫</p>
        </div>
      )}

      {!loading && supabaseOk && drugs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">品牌名稱</th>
                  <th className="px-4 py-3">成分 ( Generic )</th>
                  <th className="px-4 py-3">HK 編號</th>
                  <th className="px-4 py-3">劑量</th>
                  <th className="px-4 py-3">預設用法</th>
                  <th className="px-4 py-3 w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drugs.map((drug) => (
                  <tr key={drug.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{drug.brand_name}</td>
                    <td className="px-4 py-3 text-slate-600">{drug.generic_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-sky-50 text-sky-700 text-xs font-mono px-2 py-0.5 rounded">
                        {drug.hk_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{drug.dosage}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                      {drug.default_usage}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(drug)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="編輯"
                        >
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(drug)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="刪除"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && supabaseOk && (
        <DrugFormModal
          drug={editingDrug}
          onSave={(data) =>
            editingDrug
              ? handleUpdate(editingDrug.id!, data)
              : handleCreate(data as Omit<Drug, 'id' | 'created_at'>)
          }
          onClose={() => {
            setShowForm(false);
            setEditingDrug(null);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <HiOutlineCheckCircle className="w-4 h-4" />
          ) : (
            <HiOutlineXMark className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
