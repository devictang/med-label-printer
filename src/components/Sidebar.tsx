import { NavLink } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineCircleStack,
  HiOutlineUser,
  HiOutlineCog6Tooth,
  HiOutlineShieldExclamation,
} from 'react-icons/hi2';

const navItems = [
  { to: '/', label: '配發標籤', icon: HiOutlineDocumentText },
  { to: '/drugs', label: '藥物數據庫', icon: HiOutlineCircleStack },
  { to: '/warnings', label: '注意事項模板', icon: HiOutlineShieldExclamation },
  { to: '/profile', label: '藥房資料', icon: HiOutlineUser },
  { to: '/settings', label: '標籤設定', icon: HiOutlineCog6Tooth },
];

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 z-40 w-60 h-screen sidebar-glass text-white flex flex-col no-print border-r border-white/[0.04]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.05]">
        <div className="relative">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M9 2h6v20H9z" />
              <path d="M3 7h4v12H3z" />
              <path d="M17 7h4v12h-4z" />
            </svg>
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0a0e1a]" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight tracking-tight">藥物標籤系統</h1>
          <p className="text-[10px] text-indigo-300/60 font-medium tracking-wide">Med Label Printer</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500/60">
          主選單
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/12 text-indigo-300 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full animate-scale-in" />
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                  isActive ? '' : 'group-hover:scale-105'
                }`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
          <p className="text-[10px] text-slate-600 font-medium">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
