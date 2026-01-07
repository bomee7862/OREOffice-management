import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Mailbox,
  AlertCircle,
  Plus,
  FileBarChart,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { dashboardApi, billingsApi } from '../api';
import { DashboardSummary, Transaction, Contract, Billing } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [pendingBillings, setPendingBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  const yearMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [summaryRes, transactionsRes, contractsRes, billingsRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getRecentTransactions(5),
        dashboardApi.getExpiringContracts(30),
        billingsApi.getAll({ year_month: yearMonth, status: '대기' })
      ]);
      
      setSummary(summaryRes.data);
      setRecentTransactions(transactionsRes.data);
      setExpiringContracts(contractsRes.data);
      setPendingBillings(billingsRes.data);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyIncome = () => {
    if (!summary) return 0;
    const income = summary.monthly_finance.find(f => f.type === '입금');
    return income ? parseInt(income.total) : 0;
  };

  const getMonthlyExpense = () => {
    if (!summary) return 0;
    const expense = summary.monthly_finance.find(f => f.type === '지출');
    return expense ? parseInt(expense.total) : 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-500 mt-1">
          {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* 입주율 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">호실 입주율</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary?.occupancy_rate}%
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {summary?.occupied_rooms} / {summary?.total_rooms} 호실
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* POST BOX (비상주) */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">POST BOX (비상주)</p>
              <p className="text-2xl font-bold text-violet-600 mt-1">
                {summary?.occupied_postbox || 0}개사
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {summary?.occupied_postbox || 0} / {summary?.total_postbox || 70} 입주중
              </p>
            </div>
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Mailbox className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>

        {/* 보유 보증금 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">보유 보증금</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {formatCurrency(summary?.total_deposit || 0)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                예수금 (부채)
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* 이번 달 수입 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">이번 달 수입</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(getMonthlyIncome())}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {format(new Date(), 'M월', { locale: ko })} 누적
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* 이번 달 지출 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">이번 달 지출</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(getMonthlyExpense())}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                순이익: {formatCurrency(getMonthlyIncome() - getMonthlyExpense())}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 액션 & 미수금 알림 */}
      {pendingBillings.length > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  이번 달 미수금 {pendingBillings.length}건
                </p>
                <p className="text-sm text-amber-600">
                  총 {formatCurrency(pendingBillings.reduce((sum, b) => sum + b.amount, 0))} 입금 대기 중
                </p>
              </div>
            </div>
            <Link to="/income" className="btn btn-primary flex items-center gap-2">
              입금 확인하기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/income" className="card p-4 hover:shadow-lg transition-shadow flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-xl">
            <Plus className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">수입 등록</p>
            <p className="text-xs text-slate-500">입금 내역 기록</p>
          </div>
        </Link>
        <Link to="/expense" className="card p-4 hover:shadow-lg transition-shadow flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-xl">
            <Plus className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">지출 등록</p>
            <p className="text-xs text-slate-500">지출 내역 기록</p>
          </div>
        </Link>
        <Link to="/report" className="card p-4 hover:shadow-lg transition-shadow flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FileBarChart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">월별 리포트</p>
            <p className="text-xs text-slate-500">정산 현황 확인</p>
          </div>
        </Link>
        <Link to="/search" className="card p-4 hover:shadow-lg transition-shadow flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <RefreshCw className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">거래 조회</p>
            <p className="text-xs text-slate-500">수입/지출 검색</p>
          </div>
        </Link>
      </div>

      {/* 호실 현황 & 알림 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 호실 현황 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">호실 현황</h2>
            <Link to="/floor-plan" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              전체 보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {summary?.room_stats.map((stat) => (
              <div
                key={stat.status}
                className={`p-4 rounded-xl ${
                  stat.status === '입주' ? 'bg-green-50 border border-green-200' :
                  stat.status === '공실' ? 'bg-slate-50 border border-slate-200' :
                  stat.status === '예약' ? 'bg-amber-50 border border-amber-200' :
                  'bg-red-50 border border-red-200'
                }`}
              >
                <p className={`text-sm font-medium ${
                  stat.status === '입주' ? 'text-green-600' :
                  stat.status === '공실' ? 'text-slate-600' :
                  stat.status === '예약' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {stat.status}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.count}개
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 만료 예정 계약 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              만료 예정 계약 ({expiringContracts.length})
            </h2>
            <Link to="/contracts" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              전체 보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {expiringContracts.length === 0 ? (
            <p className="text-slate-500 text-center py-8">30일 이내 만료 예정인 계약이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {expiringContracts.slice(0, 5).map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <p className="font-medium text-slate-900">{contract.company_name}</p>
                    <p className="text-sm text-slate-500">{contract.room_number}호</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-amber-600">
                      {format(new Date(contract.end_date), 'M월 d일', { locale: ko })} 만료
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 최근 거래 */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">최근 거래 내역</h2>
          <Link to="/transactions" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            전체 보기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentTransactions.length === 0 ? (
          <p className="text-slate-500 text-center py-8">거래 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">날짜</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">구분</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">카테고리</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">입주사</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">금액</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {format(new Date(tx.transaction_date), 'M/d', { locale: ko })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        tx.type === '입금' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{tx.category}</td>
                    <td className="py-3 px-4 text-sm text-slate-900">{tx.company_name || '-'}</td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${
                      tx.type === '입금' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === '입금' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

