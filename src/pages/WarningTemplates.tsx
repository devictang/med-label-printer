import { useEffect, useState, useCallback } from 'react';
import {
  HiOutlineExclamationTriangle,
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineShieldExclamation,
} from 'react-icons/hi2';
import {
  fetchWarningTemplates,
  createWarningTemplate,
  updateWarningTemplate,
  deleteWarningTemplate,
  isSupabaseConfigured,
} from '../lib/supabase';
import type { WarningTemplate } from '../types';

export default function WarningTemplatesPage() {
  const [templates, setTemplates] = useState<WarningTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEn, setEditEn] = useState('');
  const [editZh, setEditZh] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newZh, setNewZh] = useState('');

  const supabaseOk = isSupabaseConfigured();

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!supabaseOk) { setLoading(false); return; }
    try {
      setLoading(true);
      setError('');
      const data = await fetchWarningTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [supabaseOk]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const en = newEn.trim();
    const zh = newZh.trim();
    if (!en && !zh) return;
    try {
      await createWarningTemplate({ text_en: en, text_zh: zh });
      showToast('success', '注意事項已新增');
      setNewEn('');
      setNewZh('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '新增失敗');
    }
  };

  const handleUpdate = async (id: number) => {
    const en = editEn.trim();
    const zh = editZh.trim();
    if (!en && !zh) return;
    try {
      await updateWarningTemplate(id, { text_en: en, text_zh: zh });
      showToast('success', '注意事項已更新');
      setEditingId(null);
      setEditEn('');
      setEditZh('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '更新失敗');
    }
  };

  const handleDelete = async (tpl: WarningTemplate) => {
    const label = tpl.text_en || tpl.text_zh || tpl.text;
    if (!confirm(`確定刪除「${label}」？`)) return;
    try {
      await deleteWarningTemplate(tpl.id!);
      showToast('success', '注意事項已刪除');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '刪除失敗');
    }
  };

  const startEdit = (tpl: WarningTemplate) => {
    setEditingId(tpl.id!);
    setEditEn(tpl.text_en || '');
    setEditZh(tpl.text_zh || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditEn('');
    setEditZh('');
  };

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <HiOutlineShieldExclamation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">注意事項模板</h2>
            <p className="text-sm text-slate-400 mt-0.5">管理中英文雙語注意事項，配發標籤時可直接選用。</p>
          </div>
        </div>
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
        <div className="card-elevated px-5 py-3 flex items-center gap-3">
          <HiOutlineShieldExclamation className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-slate-500">
            共 <strong className="text-slate-800">{templates.length}</strong> 個模板
          </span>
        </div>
      )}

      {/* Add new — bilingual */}
      {supabaseOk && (
        <div className="card-elevated p-4 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
            <input
              type="text"
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="English warning text…"
              className="input-modern px-3.5 text-sm"
            />
            <input
              type="text"
              value={newZh}
              onChange={(e) => setNewZh(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="中文注意事項文字…"
              className="input-modern px-3.5 text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={!newEn.trim() && !newZh.trim()}
              className="btn-modern bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <HiOutlinePlusCircle className="w-4 h-4" />
              新增
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card-elevated p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14 w-full" />
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

      {/* Template list */}
      {!loading && supabaseOk && templates.length === 0 && (
        <div className="card-elevated px-12 py-16 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <HiOutlineShieldExclamation className="w-8 h-8 text-amber-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">尚未加入任何模板</h3>
          <p className="text-sm text-slate-400">在上方分別輸入英文及中文後點擊「新增」開始建立</p>
        </div>
      )}

      {!loading && supabaseOk && templates.length > 0 && (
        <div className="card-elevated overflow-hidden animate-fade-in-up">
          <ul className="divide-y divide-slate-100">
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group"
              >
                {editingId === tpl.id ? (
                  <div className="flex-1 flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={editEn}
                      onChange={(e) => setEditEn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleUpdate(tpl.id!); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="English"
                      autoFocus
                      className="input-modern flex-1 px-3 py-1.5 text-sm min-w-0"
                    />
                    <input
                      type="text"
                      value={editZh}
                      onChange={(e) => setEditZh(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleUpdate(tpl.id!); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="中文"
                      className="input-modern flex-1 px-3 py-1.5 text-sm min-w-0"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleUpdate(tpl.id!)}
                        disabled={!editEn.trim() && !editZh.trim()}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="儲存"
                      >
                        <HiOutlineCheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="取消"
                      >
                        <HiOutlineXMark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {tpl.text_en || <span className="italic text-slate-300">(no English)</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {tpl.text_zh || <span className="italic text-slate-300">(無中文)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => startEdit(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="編輯"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="刪除"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg shadow-slate-200/50 text-sm font-medium animate-fade-in-up z-50 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-500 text-white'
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
