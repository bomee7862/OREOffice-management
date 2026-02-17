import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Building,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  ClipboardList,
  TrendingUp,
  Users,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '대시보드' },
  { path: '/floor-plan', icon: Building2, label: '호실 현황' },
  { path: '/tenants', icon: FileText, label: '계약 관리' },
  { type: 'divider' as const, label: '재무 관리' },
  { path: '/income', icon: ArrowDownCircle, label: '수입 관리' },
  { path: '/expense', icon: ArrowUpCircle, label: '지출 관리' },
  { path: '/search', icon: Search, label: '거래/현황 조회' },
  { type: 'divider' as const, label: '분석' },
  { path: '/settlements', icon: ClipboardList, label: '월별 정산' },
  { path: '/report', icon: TrendingUp, label: '손익 분석' },
  { type: 'divider' as const, label: '관리', adminOnly: true },
  { path: '/users', icon: Users, label: '사용자 관리', adminOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isFloorPlan = location.pathname === '/floor-plan';
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex">
      {/* 사이드바 */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">공유오피스</h1>
              <p className="text-xs text-slate-400">관리 시스템</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems
              .filter(item => !item.adminOnly || isAdmin)
              .map((item, index) => (
              item.type === 'divider' ? (
                <li key={`divider-${index}`} className="pt-4 pb-2">
                  <span className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {item.label}
                  </span>
                </li>
              ) : (
                <li key={item.path}>
                  <NavLink
                    to={item.path!}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    {item.icon && <item.icon className="w-5 h-5" />}
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              )
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{user?.display_name}</p>
                <p className="text-xs text-slate-400">
                  {user?.role === 'admin' ? '관리자' : '뷰어'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 ml-64">
        <div className={isFloorPlan ? 'p-8' : 'p-8 max-w-5xl mx-auto'}>
          {children}
        </div>
      </main>
    </div>
  );
}
