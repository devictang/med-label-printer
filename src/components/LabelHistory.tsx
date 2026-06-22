import { useState, useEffect } from 'react';
import {
  HiOutlineClock,
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import {
  loadLabelRecords,
  toggleFavoriteRecord,
  renameRecord,
  deleteRecord,
  type LabelRecord,
} from '../lib/storage';

interface Props {
  onLoadRecord: (rows: unknown[]) => void;
}

export default function LabelHistory({ onLoadRecord }: Props) {
  const [records, setRecords] = useState<LabelRecord[]>([]);
  const [collapsed, setCollapsed] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refresh = () => setRecords(loadLabelRecords());

  useEffect(() => {
    refresh();
  }, []);

  const handleToggleFavorite = (id: string) => {
    toggleFavoriteRecord(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('確定刪除此紀錄？')) return;
    deleteRecord(id);
    refresh();
  };

  const startRename = (r: LabelRecord) => {
    setEditingId(r.id);
    setEditName(r.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameRecord(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
    refresh();
  };

  const handleLoad = (r: LabelRecord) => {
    onLoadRecord(r.rows);
  };

  if (records.length === 0 && collapsed) return null;

  const sorted = [
    ...records.filter((r) => r.isFavorite),
    ...records.filter((r) => !r.isFavorite),
  ];

  return (
    <div className="card-elevated overflow-hidden animate-fade-in-up">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <HiOutlineClock className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">標籤記錄</span>
          {records.length > 0 && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              {records.filter((r) => r.isFavorite).length > 0 && (
                <>⭐{records.filter((r) => r.isFavorite).length} </>
              )}
              {records.length}
            </span>
          )}
        </div>
        {collapsed ? (
          <HiOutlineChevronRight className="w-4 h-4 text-slate-400" />
        ) : (
          <HiOutlineChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Record list */}
      {!collapsed && (
        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
          {sorted.length === 0 && (
            <div className="px-5 py-8 text-center">
              <HiOutlineClock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">尚未有任何記錄</p>
              <p className="text-[10px] text-slate-300 mt-1">
                預覽或下載 PDF 時會自動儲存
              </p>
            </div>
          )}

          {sorted.map((r) => (
            <div
              key={r.id}
              className="px-5 py-3 hover:bg-slate-50/60 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === r.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-0.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        onClick={commitRename}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                      >
                        <HiOutlineCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded text-slate-400 hover:bg-slate-100"
                      >
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium truncate block ${
                          r.isFavorite ? 'text-amber-700' : 'text-slate-700'
                        }`}
                      >
                        {r.isFavorite && <span className="mr-1">⭐</span>}
                        {r.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(r.updatedAt).toLocaleDateString('zh-HK')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLoad(r)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="載入此記錄"
                  >
                    <HiOutlineArrowPath className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startRename(r)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    title="重新命名"
                  >
                    <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(r.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      r.isFavorite
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                    }`}
                    title={r.isFavorite ? '取消最愛' : '加到最愛'}
                  >
                    <HiOutlineStar className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="刪除"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
