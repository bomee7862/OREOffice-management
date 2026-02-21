import { useEffect, useState } from 'react';
import { settlementsApi } from '../api';
import { Settlement } from '../types';
import { Calendar, TrendingUp, TrendingDown, PieChart, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { showSuccess, showError } from '../utils/toast';

interface MonthlyDetail {
  year_month: string;
  settlement: Settlement | null;
  income: {
    total: number;
    details: { category: string; total: string; count: string }[];
  };
  expense: {
    total: number;
    details: { category: string; total: string; count: string }[];
  };
  netProfit: number;
  outstanding: {
    total: number;
    count: number;
    items: any[];
  };
  occupancy: {
    occupied: number;
    total: number;
    rate: number;
  };
  changes: {
    newTenants: any[];
    expiring: any[];
    rentFree: any[];
  };
}

export default function Settlements() {
  const { isAdmin } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyDetail, setMonthlyDetail] = useState<MonthlyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadSettlements();
  }, []);

  useEffect(() => {
    loadMonthlyDetail();
  }, [selectedYear, selectedMonth]);

  const loadSettlements = async () => {
    try {
      const response = await settlementsApi.getAll();
      setSettlements(response.data);
    } catch (error) {
      console.error('정산 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyDetail = async () => {
    setDetailLoading(true);
    try {
      const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const response = await settlementsApi.getDetail(yearMonth);
      setMonthlyDetail(response.data);
    } catch (error) {
      console.error('월별 상세 로드 실패:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const generateSettlement = async () => {
    try {
      const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      await settlementsApi.create(yearMonth);
      await loadSettlements();
      await loadMonthlyDetail();
      showSuccess('정산이 생성되었습니다.');
    } catch (error) {
      console.error('정산 생성 실패:', error);
      showError('정산 생성에 실패했습니다.');
    }
  };


  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 카테고리별 요약
  const incomeSummary = monthlyDetail?.income?.details || [];
  const expenseSummary = monthlyDetail?.expense?.details || [];

  const totalIncome = monthlyDetail?.income?.total || 0;
  const totalExpense = monthlyDetail?.expense?.total || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">월별 정산</h1>
          <p className="text-slate-500 mt-1">월별 수입/지출 내역을 정산합니다</p>
        </div>
      </div>

      {/* 월 선택 */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input w-auto"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input w-auto"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={generateSettlement}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              정산 갱신
            </button>
          )}
        </div>
      </div>

      {detailLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card border-l-[3px] border-l-teal-400">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm text-slate-500">총 수입</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="card border-l-[3px] border-l-rose-400">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="text-sm text-slate-500">총 지출</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </div>
            <div className="card border-l-[3px] border-l-slate-400">
              <div className="flex items-center gap-3">
                <PieChart className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">순이익</p>
                  <p className="text-xl font-bold text-slate-900">
                    {formatCurrency(totalIncome - totalExpense)}
                  </p>
                </div>
              </div>
            </div>
            <div className="card border-l-[3px] border-l-amber-400">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm text-slate-500">입주율</p>
                  <p className="text-xl font-bold text-slate-900">{monthlyDetail?.occupancy?.rate || 0}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 내역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 수입 내역 */}
            <div className="card">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                수입 내역
              </h3>
              {incomeSummary.length === 0 ? (
                <p className="text-slate-500 text-center py-8">수입 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {incomeSummary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-teal-300">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(parseInt(item.total))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-teal-400 bg-slate-50">
                    <span className="font-semibold text-slate-900">합계</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 지출 내역 */}
            <div className="card">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-500" />
                지출 내역
              </h3>
              {expenseSummary.length === 0 ? (
                <p className="text-slate-500 text-center py-8">지출 내역이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {expenseSummary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-rose-300">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(parseInt(item.total))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-rose-400 bg-slate-50">
                    <span className="font-semibold text-slate-900">합계</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalExpense)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 미수금 및 입주 변동 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 미수금 */}
            <div className="card">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                미수금 현황
              </h3>
              {(monthlyDetail?.outstanding?.count || 0) === 0 ? (
                <p className="text-slate-500 text-center py-8">미수금이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    {monthlyDetail?.outstanding?.count}건 / {formatCurrency(monthlyDetail?.outstanding?.total || 0)}
                  </p>
                </div>
              )}
            </div>

            {/* 입주 변동 */}
            <div className="card">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                {selectedYear}년 {selectedMonth}월 입주 변동
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-blue-300">
                  <span className="font-medium text-slate-700">신규 입주</span>
                  <span className="font-bold text-slate-900">{monthlyDetail?.changes?.newTenants?.length || 0}건</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-amber-300">
                  <span className="font-medium text-slate-700">퇴실 예정</span>
                  <span className="font-bold text-slate-900">{monthlyDetail?.changes?.expiring?.length || 0}건</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border-l-2 border-l-green-300">
                  <span className="font-medium text-slate-700">렌트프리</span>
                  <span className="font-bold text-slate-900">{monthlyDetail?.changes?.rentFree?.length || 0}건</span>
                </div>
              </div>
            </div>
          </div>

          {/* 과거 정산 목록 */}
          <div className="card">
            <h3 className="text-base font-semibold text-slate-900 mb-4">정산 히스토리</h3>
            
            {settlements.length === 0 ? (
              <p className="text-slate-500 text-center py-8">정산 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">기간</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">수입</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">지출</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">순이익</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">입주율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.slice(0, 12).map((settlement) => (
                      <tr 
                        key={settlement.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                          settlement.year_month === `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => {
                          const [y, m] = settlement.year_month.split('-');
                          setSelectedYear(parseInt(y));
                          setSelectedMonth(parseInt(m));
                        }}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {settlement.year_month.split('-')[0]}년 {parseInt(settlement.year_month.split('-')[1])}월
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-slate-900">
                          {formatCurrency(settlement.total_income)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-slate-900">
                          {formatCurrency(settlement.total_expense)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-right text-slate-900">
                          {formatCurrency(settlement.net_profit)}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-slate-600">
                          {settlement.occupancy_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}










