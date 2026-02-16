import { useEffect, useState } from 'react';
import { settlementsApi } from '../api';
import { Settlement, Transaction } from '../types';
import { Calendar, TrendingUp, TrendingDown, PieChart, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthlyDetail {
  settlement: Settlement | null;
  transactions: Transaction[];
  summary: { type: string; category: string; total: string }[];
  occupancy_rate: string;
}

export default function Settlements() {
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
      const response = await settlementsApi.getByMonth(selectedYear, selectedMonth);
      setMonthlyDetail(response.data);
    } catch (error) {
      console.error('월별 상세 로드 실패:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const generateSettlement = async () => {
    try {
      await settlementsApi.create(selectedYear, selectedMonth);
      await loadSettlements();
      await loadMonthlyDetail();
      alert('정산이 생성되었습니다.');
    } catch (error) {
      console.error('정산 생성 실패:', error);
      alert('정산 생성에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 카테고리별 요약
  const incomeSummary = monthlyDetail?.summary.filter(s => s.type === '입금') || [];
  const expenseSummary = monthlyDetail?.summary.filter(s => s.type === '지출') || [];

  const totalIncome = incomeSummary.reduce((sum, s) => sum + parseInt(s.total), 0);
  const totalExpense = expenseSummary.reduce((sum, s) => sum + parseInt(s.total), 0);

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
          <button
            onClick={generateSettlement}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            정산 갱신
          </button>
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
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">총 수입</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">총 지출</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">순이익</p>
                  <p className="text-xl font-bold text-slate-900">
                    {formatCurrency(totalIncome - totalExpense)}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">입주율</p>
                  <p className="text-xl font-bold text-slate-900">{monthlyDetail?.occupancy_rate || 0}%</p>
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
                <div className="space-y-3">
                  {incomeSummary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(parseInt(item.total))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-teal-100 rounded-lg border-2 border-teal-200">
                    <span className="font-semibold text-slate-900">합계</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 지출 내역 */}
            <div className="card">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                지출 내역
              </h3>
              {expenseSummary.length === 0 ? (
                <p className="text-slate-500 text-center py-8">지출 내역이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {expenseSummary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(parseInt(item.total))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-rose-100 rounded-lg border-2 border-rose-200">
                    <span className="font-semibold text-slate-900">합계</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalExpense)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 거래 상세 */}
          <div className="card">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {selectedYear}년 {selectedMonth}월 전체 거래 내역
            </h3>
            
            {monthlyDetail?.transactions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">거래 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">날짜</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">유형</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">카테고리</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">입주사</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">설명</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyDetail?.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(tx.transaction_date), 'M/d', { locale: ko })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === '입금' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{tx.category}</td>
                        <td className="py-3 px-4 text-sm text-slate-900">{tx.company_name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{tx.description || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium text-right text-slate-900">
                          {tx.type === '입금' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                          settlement.year === selectedYear && settlement.month === selectedMonth ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedYear(settlement.year);
                          setSelectedMonth(settlement.month);
                        }}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {settlement.year}년 {settlement.month}월
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










