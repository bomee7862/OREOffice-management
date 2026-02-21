import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  AlertCircle,
  Wallet
} from 'lucide-react';

import PostBoxIcon from '../components/PostBoxIcon';
import { dashboardApi, billingsApi } from '../api';
import { formatCurrency } from '../utils/format';
import { DashboardSummary, Contract, Billing } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [pendingBillings, setPendingBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);

  const yearMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [summaryRes, contractsRes, billingsRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getExpiringContracts(30),
        billingsApi.getAll({ year_month: yearMonth, status: '대기' })
      ]);

      setSummary(summaryRes.data);
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
        <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-500 mt-1">
          {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 호실 입주율 (상주) */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">호실 입주율</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {summary?.occupancy_rate}%
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {summary?.occupied_rooms} / {summary?.total_rooms} 호실
              </p>
              <p className="text-xs text-primary-600 font-medium mt-1">
                예상 월 {formatCurrency(summary?.room_monthly_revenue || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* POST BOX 입주율 (비상주) */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">POST BOX (비상주)</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {summary?.total_postbox ? ((summary.occupied_postbox / summary.total_postbox) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {summary?.occupied_postbox || 0} / {summary?.total_postbox || 70} 구좌
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                예상 월 {formatCurrency(summary?.postbox_monthly_revenue || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-coral-100 rounded-2xl flex items-center justify-center">
              <PostBoxIcon className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* 이번 달 수입 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">이번 달 수입</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(getMonthlyIncome())}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {format(new Date(), 'M월', { locale: ko })} 누적
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-coral-500" />
            </div>
          </div>
        </div>

        {/* 이번 달 지출 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">이번 달 지출</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(getMonthlyExpense())}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                순이익: {formatCurrency(getMonthlyIncome() - getMonthlyExpense())}
              </p>
            </div>
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-rose-600" />
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
                <p className="font-medium text-slate-800">
                  이번 달 미수금 {pendingBillings.length}건
                </p>
                <p className="text-sm text-slate-600">
                  총 {formatCurrency(pendingBillings.reduce((sum, b) => sum + b.amount, 0))} 입금 대기 중
                </p>
              </div>
            </div>
            <Link to="/income" className="btn-primary flex items-center gap-2">
              입금 확인하기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 보유 보증금 & 만료 예정 계약 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 보유 보증금 */}
        <div className="card self-start">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" />
              보유 보증금
            </h2>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(summary?.total_deposit || 0)}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {summary?.deposit_count || 0}건
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-2">예수금 (부채)</p>
          </div>
        </div>

        {/* 만료 예정 계약 */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
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
                <div key={contract.id} className="flex items-center justify-between p-3 border-l-[1.5px] border-amber-400">
                  <div>
                    <p className="font-medium text-slate-900">{contract.company_name}</p>
                    <p className="text-sm text-slate-500">{contract.room_number}호</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-600">
                      {format(new Date(contract.end_date), 'M월 d일', { locale: ko })} 만료
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

