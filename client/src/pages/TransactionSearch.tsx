import { useEffect, useState } from 'react';
import { transactionsApi, tenantsApi, roomsApi, billingsApi } from '../api';
import { Transaction, Tenant, Room, Billing } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Search, Download, Filter, ArrowUpCircle, ArrowDownCircle, 
  Building2, Calendar, X, TrendingUp, Calculator
} from 'lucide-react';

const INCOME_CATEGORIES = ['월사용료', '관리비', '보증금입금', '위약금', '사용료전환', '비상주사용료', '회의실사용료', '1day사용료', '기타수입'];
const EXPENSE_CATEGORIES = ['임대료', '관리비', '공과금', '청소미화', '유지보수', '소모품', '마케팅', '기타지출'];
// 보증금입금은 현금 유입이지만 매출이 아님
const NON_REVENUE_CATEGORIES = ['보증금입금'];

export default function TransactionSearch() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [monthlyBillings, setMonthlyBillings] = useState<Billing[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showForecast, setShowForecast] = useState(false);

  const [filters, setFilters] = useState({
    type: '',
    categories: [] as string[],
    tenant_id: '',
    room_id: '',
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    status: ['완료', '대기'] as string[]
  });

  const currentYearMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    loadMasterData();
    loadMonthlyForecast();
  }, []);

  useEffect(() => {
    searchTransactions();
  }, [filters]);

  const loadMasterData = async () => {
    try {
      const [tenantsRes, roomsRes] = await Promise.all([
        tenantsApi.getAll(),
        roomsApi.getAll()
      ]);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data.filter((r: Room) => r.room_type !== 'POST BOX'));
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    }
  };

  const loadMonthlyForecast = async () => {
    try {
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const [billingsRes, expensesRes] = await Promise.all([
        billingsApi.getAll({ year_month: currentYearMonth }),
        transactionsApi.getAll({ type: '지출', start_date: startDate, end_date: endDate })
      ]);
      
      setMonthlyBillings(billingsRes.data);
      setMonthlyExpenses(expensesRes.data);
    } catch (error) {
      console.error('예상 손익 로딩 오류:', error);
    }
  };

  const searchTransactions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.type) params.type = filters.type;
      if (filters.categories.length > 0) params.category = filters.categories.join(',');
      if (filters.tenant_id) params.tenant_id = filters.tenant_id;
      if (filters.room_id) params.room_id = filters.room_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status.length > 0) params.status = filters.status.join(',');

      const result = await transactionsApi.getAll(params);
      setTransactions(result.data);
    } catch (error) {
      console.error('검색 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const toggleCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      categories: [],
      tenant_id: '',
      room_id: '',
      start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      status: ['완료', '대기']
    });
  };

  const exportToCSV = () => {
    const headers = ['날짜', '유형', '호실', '입주사', '카테고리', '금액', '상태', '결제방법', '설명'];
    const rows = transactions.map(t => [
      t.transaction_date.split('T')[0],
      t.type,
      t.room_number || '',
      t.company_name || '',
      t.category,
      t.amount,
      t.status,
      t.payment_method || '',
      t.description || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `거래내역_${filters.start_date}_${filters.end_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 통계 계산 (보증금입금은 매출에서 제외)
  const incomeTotal = transactions
    .filter(t => t.type === '입금' && t.status === '완료' && !NON_REVENUE_CATEGORIES.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const depositIncomeTotal = transactions
    .filter(t => t.type === '입금' && t.status === '완료' && t.category === '보증금입금')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions
    .filter(t => t.type === '지출' && t.status === '완료')
    .reduce((sum, t) => sum + t.amount, 0);

  const availableCategories = filters.type === '입금' 
    ? INCOME_CATEGORIES 
    : filters.type === '지출' 
    ? EXPENSE_CATEGORIES 
    : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">📊 거래 조회</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            필터 {showFilters ? '숨기기' : '보기'}
          </button>
          <button
            onClick={exportToCSV}
            className="btn btn-primary flex items-center gap-2"
            disabled={transactions.length === 0}
          >
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 필터 */}
      {showFilters && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">검색 조건</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              초기화
            </button>
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">시작일</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">종료일</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">입주사</label>
              <select
                value={filters.tenant_id}
                onChange={(e) => setFilters(prev => ({ ...prev, tenant_id: e.target.value }))}
                className="input"
              >
                <option value="">전체</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">호실</label>
              <select
                value={filters.room_id}
                onChange={(e) => setFilters(prev => ({ ...prev, room_id: e.target.value }))}
                className="input"
              >
                <option value="">전체</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_number}호
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 유형 */}
          <div>
            <label className="label">유형</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: '', categories: [] }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !filters.type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: '입금', categories: [] }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  filters.type === '입금' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                수입
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: '지출', categories: [] }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  filters.type === '지출' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                지출
              </button>
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <label className="label">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.categories.includes(cat)
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label className="label">상태</label>
            <div className="flex gap-2">
              {['완료', '대기', '연체'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.status.includes(status)
                      ? status === '완료' ? 'bg-green-600 text-white' 
                        : status === '대기' ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 이번 달 예상 손익 */}
      <div className="card">
        <button
          onClick={() => setShowForecast(!showForecast)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">
                📊 {format(new Date(), 'M월', { locale: ko })} 예상 손익
              </h3>
              <p className="text-sm text-slate-500">클릭하여 상세 보기</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              (monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)) >= 0
                ? 'text-blue-600' : 'text-red-600'
            }`}>
              {formatCurrency(monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </div>
            <div className="text-xs text-slate-500">예상 순이익</div>
          </div>
        </button>
        
        {showForecast && (
          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 예상 수입 */}
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">예상 수입</span>
                </div>
                <div className="text-2xl font-bold text-green-700 mb-2">
                  {formatCurrency(monthlyBillings.reduce((sum, b) => sum + b.amount, 0))}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">입금 완료</span>
                    <span className="font-medium text-green-700">
                      {formatCurrency(monthlyBillings.filter(b => b.status === '완료').reduce((sum, b) => sum + b.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-600">입금 대기</span>
                    <span className="font-medium text-amber-700">
                      {formatCurrency(monthlyBillings.filter(b => b.status === '대기').reduce((sum, b) => sum + b.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* 예상 지출 */}
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">예상 지출</span>
                </div>
                <div className="text-2xl font-bold text-red-700 mb-2">
                  {formatCurrency(monthlyExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </div>
                <div className="space-y-1 text-sm">
                  {(() => {
                    const grouped: { [key: string]: number } = {};
                    monthlyExpenses.forEach(e => {
                      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
                    });
                    return Object.entries(grouped).slice(0, 3).map(([cat, amount]) => (
                      <div key={cat} className="flex justify-between">
                        <span className="text-red-600">{cat}</span>
                        <span className="font-medium text-red-700">{formatCurrency(amount)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 예상 순이익 */}
              <div className={`p-4 rounded-xl ${
                (monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)) >= 0
                  ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-slate-800">예상 순이익</span>
                </div>
                <div className={`text-2xl font-bold mb-2 ${
                  (monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)) >= 0
                    ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {formatCurrency(monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </div>
                <div className="text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>청구 건수</span>
                    <span className="font-medium">{monthlyBillings.length}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span>지출 건수</span>
                    <span className="font-medium">{monthlyExpenses.length}건</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
              💡 <strong>예상 손익</strong>은 이번 달 청구된 금액(입금 대기 + 완료)에서 지출을 뺀 값입니다.
              실제 수입은 입금 완료된 금액만 포함됩니다.
            </div>
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-slate-50">
          <div className="text-sm text-slate-500">검색 결과</div>
          <div className="text-2xl font-bold text-slate-900">{transactions.length}건</div>
        </div>
        <div className="card p-4 bg-green-50">
          <div className="text-sm text-green-600">총 매출</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(incomeTotal)}</div>
          <div className="text-xs text-green-500">보증금입금 제외</div>
        </div>
        <div className="card p-4 bg-amber-50">
          <div className="text-sm text-amber-600">보증금 입금</div>
          <div className="text-2xl font-bold text-amber-700">{formatCurrency(depositIncomeTotal)}</div>
          <div className="text-xs text-amber-500">예수금 (부채)</div>
        </div>
        <div className="card p-4 bg-red-50">
          <div className="text-sm text-red-600">총 지출</div>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(expenseTotal)}</div>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">날짜</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">유형</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">호실</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">입주사</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">카테고리</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">금액</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">결제방법</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {format(new Date(t.transaction_date), 'M/d (EEE)', { locale: ko })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        t.type === '입금' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.type === '입금' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{t.room_number ? `${t.room_number}호` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{t.company_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === '완료' ? 'bg-green-100 text-green-700' 
                          : t.status === '대기' ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{t.payment_method || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

