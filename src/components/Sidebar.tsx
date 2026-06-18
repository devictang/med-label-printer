import { NavLink } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineCircleStack, HiOutlineUser, HiOutlineCog6Tooth } from 'react-icons/hi2';

const navItems = [
  { to: '/', label: '配發標籤', icon: HiOutlineDocumentText },
  { to: '/drugs', label: '藥物數據庫', icon: HiOutlineCircleStack },
  { to: '/profile', label: '藥房資料', icon: HiOutlineUser },
  { to: '/settings', label: '標籤設定', icon: HiOutlineCog6Tooth },
];

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 z-40 w-60 h-screen bg-slate-900 text-white flex flex-col no-print">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-700/50">
        <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-sm font-bold">
          Rx
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">藥物標籤系統</h1>
          <p className="text-[10px] text-slate-400">Med Label Printer</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500">v1.0.0</p>
      </div>
    </aside>
  );
}
