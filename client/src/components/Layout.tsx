import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  Receipt, 
  Calculator,
  Building,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  FileBarChart
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '대시보드' },
  { path: '/floor-plan', icon: Building2, label: '호실 현황' },
  { path: '/tenants', icon: Users, label: '입주사 관리' },
  { path: '/contracts', icon: FileText, label: '계약 관리' },
  { type: 'divider', label: '재무 관리' },
  { path: '/income', icon: ArrowDownCircle, label: '수입 관리' },
  { path: '/expense', icon: ArrowUpCircle, label: '지출 관리' },
  { path: '/search', icon: Search, label: '거래 조회' },
  { path: '/report', icon: FileBarChart, label: '기간별 손익' },
];

export default function Layout({ children }: LayoutProps) {
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
            {navItems.map((item, index) => (
              item.type === 'divider' ? (
                <li key={index} className="pt-4 pb-2">
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
            <p className="text-xs text-slate-400 mb-1">3층 전체 운영</p>
            <p className="text-sm font-medium">총 35개 호실</p>
          </div>
        </div>
      </aside>
      
      {/* 메인 콘텐츠 */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}



