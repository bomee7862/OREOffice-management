import { useEffect, useState, useMemo } from 'react';
import { transactionsApi, tenantsApi, roomsApi, billingsApi, contractsApi } from '../api';
import { Transaction, Tenant, Room, Billing, Contract } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Download, Filter, ArrowUpCircle, ArrowDownCircle,
  X, TrendingUp, Calculator, Wallet, AlertCircle, Clock, CheckCircle2, RefreshCw
} from 'lucide-react';

const INCOME_CATEGORIES = ['월사용료', '관리비', '보증금입금', '위약금', '사용료전환', '비상주사용료', '회의실사용료', '1day사용료', '기타수입'];
const EXPENSE_CATEGORIES = ['임대료', '관리비', '공과금', '청소미화', '유지보수', '소모품', '마케팅', '기타지출'];
const NON_REVENUE_CATEGORIES = ['보증금입금'];

type TabType = 'transactions' | 'deposits' | 'receivables';

export default function TransactionSearch() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  // 공통 데이터
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  // 전체 거래 탭 데이터
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBillings, setMonthlyBillings] = useState<Billing[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Transaction[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [showForecast, setShowForecast] = useState(false);

  // 보증금 현황 탭 데이터
  const [depositTransactions, setDepositTransactions] = useState<Transaction[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // 미수금 현황 탭 데이터
  const [allBillings, setAllBillings] = useState<Billing[]>([]);

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
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      searchTransactions();
      loadMonthlyForecast();
    } else if (activeTab === 'deposits') {
      loadDepositData();
    } else if (activeTab === 'receivables') {
      loadReceivablesData();
    }
  }, [activeTab, filters]);

  const loadMasterData = async () => {
    try {
      const [tenantsRes, roomsRes] = await Promise.all([
        tenantsApi.getAll(),
        roomsApi.getAll()
      ]);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
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

  const loadDepositData = async () => {
    setLoading(true);
    try {
      const [depositsRes, contractsRes] = await Promise.all([
        transactionsApi.getDeposits({}),
        contractsApi.getAll()
      ]);
      setDepositTransactions(depositsRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      console.error('보증금 데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReceivablesData = async () => {
    setLoading(true);
    try {
      // 최근 6개월치 billings 조회
      const months = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push(format(date, 'yyyy-MM'));
      }

      const billingsPromises = months.map(ym => billingsApi.getAll({ year_month: ym }));
      const results = await Promise.all(billingsPromises);
      const allData = results.flatMap(r => r.data);
      setAllBillings(allData);
    } catch (error) {
      console.error('미수금 데이터 로딩 오류:', error);
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

  // 전체 거래 탭 통계
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

  // 보증금 현황 계산
  const depositStats = useMemo(() => {
    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');

    // 보유 중인 보증금 (완료 상태)
    const holding = depositTransactions.filter(d =>
      d.status === '완료'
    );

    // 입금 대기 중인 보증금
    const pending = depositTransactions.filter(d => d.status === '대기');

    // 전환 예정 (계약 종료월이 이번달 또는 지난 것)
    const conversionPending = holding.filter(d => {
      const contract = contracts.find(c =>
        c.tenant_id === d.tenant_id && c.room_id === d.room_id && c.is_active
      );
      if (!contract) return false;
      const endMonth = contract.end_date?.substring(0, 7);
      return endMonth && endMonth <= currentMonth;
    });

    const totalHolding = holding.reduce((sum, d) => sum + d.amount, 0);
    const totalPending = pending.reduce((sum, d) => sum + d.amount, 0);
    const totalConversionPending = conversionPending.reduce((sum, d) => sum + d.amount, 0);

    return {
      holding,
      pending,
      conversionPending,
      totalHolding,
      totalPending,
      totalConversionPending,
      total: totalHolding + totalPending
    };
  }, [depositTransactions, contracts]);

  // 미수금 현황 계산
  const receivablesStats = useMemo(() => {
    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');

    // 미입금 청구 (대기 상태)
    const unpaid = allBillings.filter(b => b.status === '대기');

    // 이번 달 미수금
    const currentMonthUnpaid = unpaid.filter(b => b.year_month === currentMonth);

    // 연체 (이번 달 이전 + 납부일 지난 것)
    const overdue = unpaid.filter(b => {
      if (b.year_month >= currentMonth) return false;
      return true; // 이전 달 청구는 모두 연체로 간주
    });

    const totalUnpaid = unpaid.reduce((sum, b) => sum + b.amount, 0);
    const totalCurrentMonth = currentMonthUnpaid.reduce((sum, b) => sum + b.amount, 0);
    const totalOverdue = overdue.reduce((sum, b) => sum + b.amount, 0);

    return {
      unpaid,
      currentMonthUnpaid,
      overdue,
      totalUnpaid,
      totalCurrentMonth,
      totalOverdue
    };
  }, [allBillings]);

  // 탭 렌더링
  const renderTabs = () => (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      <button
        onClick={() => setActiveTab('transactions')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === 'transactions'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        전체 거래
      </button>
      <button
        onClick={() => setActiveTab('deposits')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
          activeTab === 'deposits'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Wallet className="w-4 h-4" />
        보증금 현황
      </button>
      <button
        onClick={() => setActiveTab('receivables')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
          activeTab === 'receivables'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <AlertCircle className="w-4 h-4" />
        미수금 현황
      </button>
    </div>
  );

  // 전체 거래 탭 컨텐츠
  const renderTransactionsTab = () => (
    <>
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
                {rooms.filter(r => r.room_type !== 'POST BOX').map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_number}호
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                  filters.type === '입금' ? 'bg-coral-400 text-white' : 'bg-coral-50 text-coral-500 hover:bg-coral-100'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                수입
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, type: '지출', categories: [] }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  filters.type === '지출' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                지출
              </button>
            </div>
          </div>

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

          <div>
            <label className="label">상태</label>
            <div className="flex gap-2">
              {['완료', '대기', '연체'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.status.includes(status)
                      ? status === '완료' ? 'bg-coral-400 text-white'
                        : status === '대기' ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
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
            <div className="p-2 bg-primary-100 rounded-lg">
              <Calculator className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">
                {format(new Date(), 'M월', { locale: ko })} 예상 손익
              </h3>
              <p className="text-sm text-slate-500">클릭하여 상세 보기</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${
              (monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)) >= 0
                ? 'text-primary-600' : 'text-slate-900'
            }`}>
              {formatCurrency(monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </div>
            <div className="text-xs text-slate-500">예상 순이익</div>
          </div>
        </button>

        {showForecast && (
          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-coral-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-coral-500" />
                  <span className="font-medium text-slate-700">예상 수입</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mb-2">
                  {formatCurrency(monthlyBillings.reduce((sum, b) => sum + b.amount, 0))}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">입금 완료</span>
                    <span className="font-medium text-slate-700">
                      {formatCurrency(monthlyBillings.filter(b => b.status === '완료').reduce((sum, b) => sum + b.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">입금 대기</span>
                    <span className="font-medium text-slate-700">
                      {formatCurrency(monthlyBillings.filter(b => b.status === '대기').reduce((sum, b) => sum + b.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpCircle className="w-5 h-5 text-rose-600" />
                  <span className="font-medium text-slate-700">예상 지출</span>
                </div>
                <div className="text-xl font-bold text-slate-900 mb-2">
                  {formatCurrency(monthlyExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </div>
              </div>

              <div className={`p-4 rounded-xl ${
                (monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)) >= 0
                  ? 'bg-primary-50' : 'bg-rose-50'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-slate-800">예상 순이익</span>
                </div>
                <div className={`text-xl font-bold mb-2 ${
                  (monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0)) >= 0
                    ? 'text-primary-700' : 'text-slate-900'
                }`}>
                  {formatCurrency(monthlyBillings.reduce((sum, b) => sum + b.amount, 0) - monthlyExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-slate-50">
          <div className="text-sm text-slate-500">검색 결과</div>
          <div className="text-xl font-bold text-slate-900">{transactions.length}건</div>
        </div>
        <div className="card p-4 bg-coral-50">
          <div className="text-sm text-slate-500">총 매출</div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(incomeTotal)}</div>
          <div className="text-xs text-slate-500">보증금입금 제외</div>
        </div>
        <div className="card p-4 bg-amber-50">
          <div className="text-sm text-slate-500">보증금 입금</div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(depositIncomeTotal)}</div>
          <div className="text-xs text-slate-500">예수금 (부채)</div>
        </div>
        <div className="card p-4 bg-rose-50">
          <div className="text-sm text-slate-500">총 지출</div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(expenseTotal)}</div>
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
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
                        t.type === '입금' ? 'bg-coral-50 text-coral-500' : 'bg-rose-100 text-rose-700'
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
                        t.status === '완료' ? 'bg-coral-50 text-coral-500'
                          : t.status === '대기' ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
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
    </>
  );

  // 보증금 현황 탭 컨텐츠
  const renderDepositsTab = () => (
    <>
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-200 rounded-lg">
              <Wallet className="w-5 h-5 text-primary-700" />
            </div>
            <span className="text-sm font-medium text-primary-700">총 보유 보증금</span>
          </div>
          <div className="text-xl font-bold text-primary-800">{formatCurrency(depositStats.totalHolding)}</div>
          <div className="text-xs text-primary-600 mt-1">{depositStats.holding.length}건</div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-coral-50 to-coral-100 border-coral-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-coral-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-coral-500" />
            </div>
            <span className="text-sm font-medium text-slate-700">입금 완료</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(depositStats.totalHolding)}</div>
          <div className="text-xs text-slate-500 mt-1">{depositStats.holding.length}건</div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-200 rounded-lg">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <span className="text-sm font-medium text-slate-700">입금 대기</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(depositStats.totalPending)}</div>
          <div className="text-xs text-slate-500 mt-1">{depositStats.pending.length}건</div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-coral-50 to-coral-100 border-coral-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-coral-200 rounded-lg">
              <RefreshCw className="w-5 h-5 text-coral-700" />
            </div>
            <span className="text-sm font-medium text-slate-700">전환 예정</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(depositStats.totalConversionPending)}</div>
          <div className="text-xs text-slate-500 mt-1">{depositStats.conversionPending.length}건 (계약종료 도래)</div>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="p-4 bg-slate-100 rounded-xl text-sm text-slate-600">
        <strong>보증금은 예수금(부채)</strong>으로 계약 종료 시 반환하거나 사용료로 전환됩니다.
        조회 시점: {format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
      </div>

      {/* 보증금 목록 테이블 */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900">보증금 상세 목록</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">호실</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">입주사</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">보증금액</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">입금일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">계약종료</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : [...depositStats.holding, ...depositStats.pending].length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    보증금 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                [...depositStats.holding, ...depositStats.pending].map((d) => {
                  const contract = contracts.find(c =>
                    c.tenant_id === d.tenant_id && c.room_id === d.room_id
                  );
                  const isConversionPending = depositStats.conversionPending.some(cp => cp.id === d.id);

                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {d.room_number ? `${d.room_number}호` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{d.company_name || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {d.status === '완료' && d.transaction_date
                          ? format(new Date(d.transaction_date), 'yy.MM.dd')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {contract?.end_date
                          ? format(new Date(contract.end_date), 'yy.MM.dd')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.status === '대기' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" />
                            입금대기
                          </span>
                        ) : isConversionPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-coral-100 text-coral-700">
                            <RefreshCw className="w-3 h-3" />
                            전환예정
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-coral-50 text-coral-500">
                            <CheckCircle2 className="w-3 h-3" />
                            보유중
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // 미수금 현황 탭 컨텐츠
  const renderReceivablesTab = () => (
    <>
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-700" />
            </div>
            <span className="text-sm font-medium text-slate-700">총 미수금</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(receivablesStats.totalUnpaid)}</div>
          <div className="text-xs text-slate-500 mt-1">{receivablesStats.unpaid.length}건</div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-200 rounded-lg">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <span className="text-sm font-medium text-slate-700">이번 달 미입금</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(receivablesStats.totalCurrentMonth)}</div>
          <div className="text-xs text-slate-500 mt-1">{receivablesStats.currentMonthUnpaid.length}건</div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-rose-700" />
            </div>
            <span className="text-sm font-medium text-slate-700">연체</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(receivablesStats.totalOverdue)}</div>
          <div className="text-xs text-slate-500 mt-1">{receivablesStats.overdue.length}건 (이전 달 미입금)</div>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="p-4 bg-slate-100 rounded-xl text-sm text-slate-600">
        <strong>미수금</strong>은 청구되었으나 아직 입금되지 않은 금액입니다.
        조회 시점: {format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
      </div>

      {/* 미수금 목록 테이블 */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900">미입금 청구 목록</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">청구월</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">호실</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">입주사</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">청구금액</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">납부일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : receivablesStats.unpaid.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    미수금이 없습니다.
                  </td>
                </tr>
              ) : (
                receivablesStats.unpaid
                  .sort((a, b) => a.year_month.localeCompare(b.year_month))
                  .map((b) => {
                    const isOverdue = receivablesStats.overdue.some(o => o.id === b.id);
                    return (
                      <tr key={b.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-rose-50/50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {b.year_month}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {b.room_number ? `${b.room_number}호` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{b.company_name || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(b.amount)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          매월 10일
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                              <AlertCircle className="w-3 h-3" />
                              연체
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <Clock className="w-3 h-3" />
                              대기
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">거래/현황 조회</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'transactions' && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                필터 {showFilters ? '숨기기' : '보기'}
              </button>
              <button
                onClick={exportToCSV}
                className="btn-primary flex items-center gap-2"
                disabled={transactions.length === 0}
              >
                <Download className="w-4 h-4" />
                엑셀 다운로드
              </button>
            </>
          )}
        </div>
      </div>

      {/* 탭 */}
      {renderTabs()}

      {/* 탭 컨텐츠 */}
      {activeTab === 'transactions' && renderTransactionsTab()}
      {activeTab === 'deposits' && renderDepositsTab()}
      {activeTab === 'receivables' && renderReceivablesTab()}
    </div>
  );
}
