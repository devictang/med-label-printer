import { useEffect, useState, useCallback } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineCircleStack,
  HiOutlineTableCells,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { fetchDrugs } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatIngredientsDisplay } from '../components/IngredientEditor';
import type { Drug } from '../types';
import DrugFormModal from '../components/DrugForm';
import {
  addPendingChange,
  removePendingChange,
  mergeDrugs,
  getDraftChanges,
  markAsSubmitted,
  syncProposalStatus,
  type MergedDrug,
} from '../lib/localPending';
import { submitProposals, checkOyxAuth } from '../lib/proposals';

export default function DrugDatabasePage() {
  const [allDrugs, setAllDrugs] = useState<MergedDrug[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | MergedDrug | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const supabaseOk = isSupabaseConfigured();

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMerged = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      let base: Drug[] = [];
      if (supabaseOk) {
        base = await fetchDrugs(q || undefined);
      }
      const merged = mergeDrugs(base);
      setAllDrugs(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drugs');
    } finally {
      setLoading(false);
    }
  }, [supabaseOk]);

  useEffect(() => {
    loadMerged();
  }, [loadMerged]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMerged(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadMerged]);

  // Poll proposal status so admin edits are reflected once approved
  useEffect(() => {
    const interval = setInterval(() => {
      syncProposalStatus().then(() => loadMerged(search)).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadMerged, search]);

  /* ─── CRUD handlers — localStorage-first + auto-submit ──── */

  const handleCreate = async (data: Omit<Drug, 'id' | 'created_at'>) => {
    addPendingChange('drug_create', data as unknown as Record<string, unknown>);
    setShowForm(false);
    await autoSubmitAndToast('藥物已新增');
    loadMerged(search);
  };

  const handleUpdate = async (id: number, data: Partial<Omit<Drug, 'id' | 'created_at'>>) => {
    addPendingChange('drug_update', { id, ...data } as unknown as Record<string, unknown>);
    setEditingDrug(null);
    setShowForm(false);
    await autoSubmitAndToast('藥物已更新');
    loadMerged(search);
  };

  const handleDelete = async (drug: MergedDrug) => {
    if (!confirm(`確定刪除「${drug.brand_name}」？`)) return;
    if (drug._isLocalOnly && drug._localId) {
      // Local-only drug: just remove the pending change entirely
      removePendingChange(drug._localId);
      showToast('info', '已取消新增');
    } else {
      addPendingChange('drug_delete', { id: drug.id } as Record<string, unknown>);
      await autoSubmitAndToast('藥物已刪除');
    }
    loadMerged(search);
  };

  const openEdit = (drug: MergedDrug) => {
    setEditingDrug(drug);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingDrug(null);
    setShowForm(true);
  };

  /* ─── Auto-submit helper ──────────────────────────────────── */

  const autoSubmitAndToast = async (actionLabel: string) => {
    const drafts = getDraftChanges();
    if (drafts.length === 0) return;

    const auth = await checkOyxAuth();
    if (!auth.authenticated) {
      showToast('error', `${actionLabel}，但需要先登入 oyx.app (oyx.app/login) 完成提交`);
      return;
    }

    try {
      const proposals = drafts.map((d) => ({
        proposalType: d.proposalType,
        payload: d.payload,
      }));

      const result = await submitProposals(proposals);

      const successLocalIds: string[] = [];
      const successProposalIds: number[] = [];

      for (const r of result.results) {
        if (r.proposalId !== undefined) {
          successLocalIds.push(drafts[r.localIndex].localId);
          successProposalIds.push(r.proposalId);
        }
      }

      if (successLocalIds.length > 0) {
        markAsSubmitted(successLocalIds, successProposalIds);
      }

      const failCount = result.results.length - successLocalIds.length;
      if (failCount > 0) {
        showToast('error', `${actionLabel}，但 ${failCount} 項未能提交`);
      } else {
        showToast('success', `${actionLabel}並提交審批`);
      }

      loadMerged(search);
    } catch {
      showToast('error', `${actionLabel}，但自動提交失敗（修改已暫存於本地）`);
    }
  };

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <HiOutlineCircleStack className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">藥物數據庫</h2>
            <p className="text-sm text-slate-400 mt-0.5">管理藥劑製品資料 — 所有編輯先存於本地，經審批後同步至雲端。</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          disabled={!supabaseOk}
          className="btn-modern bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HiOutlinePlusCircle className="w-4 h-4" />
          新增藥物
        </button>
      </div>

      {/* Supabase not configured warning */}
      {!supabaseOk && (
        <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">尚未設定 Supabase</p>
            <p className="text-xs text-amber-600/80 mt-0.5">
              請在專案根目錄建立 <code className="bg-amber-100 px-1 rounded">.env</code> 檔案，並設定{' '}
              <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> 及{' '}
              <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>。
            </p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {supabaseOk && !loading && !error && (
        <div className="card-elevated px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <HiOutlineCircleStack className="w-4 h-4 text-indigo-400" />
            共 <strong className="text-slate-800">{allDrugs.length}</strong> 種藥物
          </div>
          {allDrugs.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <HiOutlineTableCells className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-400">
                  {allDrugs.filter((d) => d.default_usage).length} 種有預設用法
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search */}
      {supabaseOk && (
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋藥物名稱或成分…"
            className="input-modern pl-10 pr-3.5"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-300 hover:text-slate-500"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card-elevated p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-5 flex-1" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-5 w-20" />
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50/80 border border-red-200/70 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineExclamationTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Drug table */}
      {!loading && supabaseOk && allDrugs.length === 0 && (
        <div className="card-elevated px-12 py-16 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <HiOutlinePlusCircle className="w-8 h-8 text-indigo-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">尚未加入任何藥物</h3>
          <p className="text-sm text-slate-400 mb-4">點擊「新增藥物」開始建立數據庫</p>
          <button
            onClick={openCreate}
            className="btn-modern bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md"
          >
            <HiOutlinePlusCircle className="w-4 h-4" />
            新增藥物
          </button>
        </div>
      )}

      {!loading && supabaseOk && allDrugs.length > 0 && (
        <div className="card-elevated overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5 pl-5">品牌名稱</th>
                  <th className="px-4 py-3.5">藥物成分</th>
                  <th className="px-4 py-3.5">HK 編號</th>
                  <th className="px-4 py-3.5">預設用法</th>
                  <th className="px-4 py-3.5 pr-5 w-20 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDrugs.map((drug) => (
                  <tr
                    key={drug._localId || drug.id}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 pl-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100">
                          <span className="text-[10px] font-bold text-indigo-600">{drug.brand_name.charAt(0)}</span>
                        </div>
                        <p className="font-semibold text-slate-800">{drug.brand_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">
                      {formatIngredientsDisplay(drug.ingredient) || <span className="italic text-slate-300">無</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block bg-indigo-50 text-indigo-600 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border border-indigo-100">
                        {drug.hk_number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs max-w-[200px] truncate">
                      {drug.default_usage || <span className="italic text-slate-300">無預設</span>}
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => openEdit(drug)}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="編輯"
                        >
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(drug)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
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
          className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg shadow-slate-200/50 text-sm font-medium animate-fade-in-up z-50 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <HiOutlineCheckCircle className="w-4 h-4" />
          ) : toast.type === 'error' ? (
            <HiOutlineXMark className="w-4 h-4" />
          ) : (
            <HiOutlineShieldCheck className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
