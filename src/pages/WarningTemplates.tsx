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
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');

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
    const text = newText.trim();
    if (!text) return;
    try {
      await createWarningTemplate({ text });
      showToast('success', '注意事項已新增');
      setNewText('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '新增失敗');
    }
  };

  const handleUpdate = async (id: number) => {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateWarningTemplate(id, { text });
      showToast('success', '注意事項已更新');
      setEditingId(null);
      setEditText('');
      load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '更新失敗');
    }
  };

  const handleDelete = async (tpl: WarningTemplate) => {
    if (!confirm(`確定刪除「${tpl.text}」？`)) return;
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
    setEditText(tpl.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
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
            <p className="text-sm text-slate-400 mt-0.5">管理常用注意事項，配發標籤時可直接選用。</p>
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

      {/* Add new */}
      {supabaseOk && (
        <div className="card-elevated p-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="輸入新注意事項文字…"
              className="input-modern flex-1 px-3.5"
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
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
              <div key={i} className="skeleton h-5 w-full" />
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
          <p className="text-sm text-slate-400">在上方輸入文字並點擊「新增」開始建立</p>
        </div>
      )}

      {!loading && supabaseOk && templates.length > 0 && (
        <div className="card-elevated overflow-hidden animate-fade-in-up">
          <ul className="divide-y divide-slate-100">
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
              >
                {editingId === tpl.id ? (
                  <>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleUpdate(tpl.id!); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="input-modern flex-1 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleUpdate(tpl.id!)}
                      disabled={!editText.trim()}
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
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700 leading-tight">{tpl.text}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
