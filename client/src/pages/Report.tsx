import { useEffect, useState, useMemo } from 'react';
import { transactionsApi, billingsApi, dashboardApi, contractsApi } from '../api';
import { Transaction, Billing } from '../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  TrendingUp, TrendingDown, Search, Download, Calendar,
  BarChart3, Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatCurrency } from '../utils/format';

// 수입 카테고리
const INCOME_CATEGORIES = [
  { value: '월사용료', label: '호실별 임대료' },
  { value: '비상주사용료', label: '비상주 사용료' },
  { value: '위약금', label: '위약금 (중도종료)' },
  { value: '사용료전환', label: '사용료전환 (만기종료)' },
  { value: '회의실사용료', label: '회의실 사용료' },
  { value: '1day사용료', label: '1day 사용료' },
];

// 지출 카테고리
const EXPENSE_CATEGORIES = [
  { value: '임대료', label: '사무실 임대료' },
  { value: '관리비', label: '관리비' },
  { value: '공과금', label: '공과금' },
  { value: '수선유지비', label: '수선유지비' },
  { value: '소모품비', label: '소모품비' },
  { value: '기타', label: '기타 지출' },
];

// 고정비 카테고리 (손익분기점 계산용 - 지출 항목 전체에서 선택 가능)
const FIXED_COST_CATEGORIES = [
  { value: '임대료', label: '임대료' },
  { value: '관리비', label: '관리비' },
  { value: '공과금', label: '공과금' },
  { value: '수선유지비', label: '수선유지비' },
  { value: '소모품비', label: '소모품비' },
  { value: '기타', label: '기타' },
];

export default function Report() {
  // 기간 설정
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 5);
    return format(startOfMonth(date), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // 카테고리 선택
  const [selectedIncomeCategories, setSelectedIncomeCategories] = useState<string[]>(
    INCOME_CATEGORIES.map(c => c.value)
  );
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>(
    EXPENSE_CATEGORIES.map(c => c.value)
  );
  
  // 데이터
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [totalDepositHeld, setTotalDepositHeld] = useState(0);
  const [occupancyStats, setOccupancyStats] = useState({
    occupiedRooms: 0,
    totalRooms: 35,
    occupiedPostbox: 0,
    totalPostbox: 70
  });
  const [loading, setLoading] = useState(true);
  
  // 펼침/접힘 상태
  const [showIncomeFilter, setShowIncomeFilter] = useState(false);
  const [showExpenseFilter, setShowExpenseFilter] = useState(false);
  const [showFixedCostFilter, setShowFixedCostFilter] = useState(false);
  
  // 고정비 선택 (손익분기점 계산용) - 기본값: 임대료, 관리비
  const [selectedFixedCosts, setSelectedFixedCosts] = useState<string[]>(['임대료', '관리비']);
  
  // 평균 호실 임대료
  const [avgRoomRent, setAvgRoomRent] = useState(0);

  // 초기 로드만 실행 (조회 버튼 클릭 시에만 데이터 갱신)
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 기간 내 모든 월의 billings를 가져오기 위해 월 목록 생성
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const months = eachMonthOfInterval({ start, end });
      
      const [transRes, dashboardRes, contractsRes, ...billingsRes] = await Promise.all([
        transactionsApi.getAll({
          start_date: startDate,
          end_date: endDate
        }),
        dashboardApi.getSummary(),
        contractsApi.getAll(true), // 활성 계약만 가져오기
        ...months.map(month => billingsApi.getAll({ year_month: format(month, 'yyyy-MM') }))
      ]);
      
      setTransactions(transRes.data);
      setTotalDepositHeld(dashboardRes.data.total_deposit || 0);
      setOccupancyStats({
        occupiedRooms: dashboardRes.data.occupied_rooms || 0,
        totalRooms: dashboardRes.data.total_rooms || 35,
        occupiedPostbox: dashboardRes.data.occupied_postbox || 0,
        totalPostbox: dashboardRes.data.total_postbox || 70
      });
      
      // 평균 호실 임대료 계산 (POST BOX 제외, 호실만)
      const roomContracts = contractsRes.data.filter((c: any) => 
        c.room_type && !c.room_type.includes('POST BOX')
      );
      if (roomContracts.length > 0) {
        const totalRent = roomContracts.reduce((sum: number, c: any) => 
          sum + (c.monthly_rent_vat || 0), 0
        );
        setAvgRoomRent(Math.round(totalRent / roomContracts.length));
      }
      
      // 모든 월의 billings를 합침
      const allBillings = billingsRes.flatMap(res => res.data);
      setBillings(allBillings);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 거래
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.type === '입금') {
        return selectedIncomeCategories.includes(t.category);
      } else {
        return selectedExpenseCategories.includes(t.category);
      }
    });
  }, [transactions, selectedIncomeCategories, selectedExpenseCategories]);

  // 호실별 임대료 (billing 기준)
  const billingIncome = useMemo(() => {
    if (!selectedIncomeCategories.includes('월사용료')) return 0;
    return billings
      .filter(b => b.status === '완료')
      .reduce((sum, b) => sum + b.amount, 0);
  }, [billings, selectedIncomeCategories]);

  // 기타 수입 (transactions 기준, 월사용료 제외)
  const otherIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === '입금' && t.status === '완료' && t.category !== '월사용료')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // 총 수입 = 호실별 임대료(billing) + 기타 수입(transactions)
  const totalIncome = billingIncome + otherIncome;

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === '지출')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const netProfit = totalIncome - totalExpense;

  // 예수금 변동 계산 (전체 transactions에서 - 필터와 무관)
  const depositChanges = useMemo(() => {
    const newDeposits = transactions
      .filter(t => t.category === '보증금입금')
      .reduce((sum, t) => sum + t.amount, 0);
    const newDepositsCount = transactions.filter(t => t.category === '보증금입금').length;
    
    const penaltyConversion = transactions
      .filter(t => t.category === '위약금')
      .reduce((sum, t) => sum + t.amount, 0);
    const penaltyCount = transactions.filter(t => t.category === '위약금').length;
    
    const usageConversion = transactions
      .filter(t => t.category === '사용료전환')
      .reduce((sum, t) => sum + t.amount, 0);
    const usageCount = transactions.filter(t => t.category === '사용료전환').length;
    
    const netChange = newDeposits - penaltyConversion - usageConversion;
    
    return {
      newDeposits,
      newDepositsCount,
      penaltyConversion,
      penaltyCount,
      usageConversion,
      usageCount,
      netChange
    };
  }, [transactions]);

  // 손익분기점 계산
  const breakEvenPoint = useMemo(() => {
    // 선택된 고정비 항목의 월평균 계산 (10월부터만 - 7,8,9월 제외)
    const bepStartDate = new Date(2025, 9, 1); // 2025년 10월 1일
    
    const fixedCostTransactions = transactions.filter(t => {
      if (t.type !== '지출' || !selectedFixedCosts.includes(t.category)) return false;
      const txDate = new Date(t.transaction_date);
      return txDate >= bepStartDate; // 10월 이후만
    });
    
    // 조회 기간에서 10월 이후 월 수만 계산
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const allMonths = eachMonthOfInterval({ start, end });
    const validMonths = allMonths.filter(month => month >= bepStartDate);
    const monthCount = validMonths.length || 1;
    
    const totalFixedCost = fixedCostTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyFixedCost = Math.round(totalFixedCost / monthCount);
    
    // 비상주 수입 월평균 계산 (10월 이후)
    const postboxIncomeTransactions = transactions.filter(t => {
      if (t.category !== '비상주사용료' || t.type !== '입금') return false;
      const txDate = new Date(t.transaction_date);
      return txDate >= bepStartDate;
    });
    const totalPostboxIncome = postboxIncomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyPostboxIncome = Math.round(totalPostboxIncome / monthCount);
    
    // 실질 고정비 (고정비 - 비상주 기여)
    const netFixedCost = Math.max(0, monthlyFixedCost - monthlyPostboxIncome);
    
    // 100% 입주 시 예상 월 수입 (호실만)
    const fullOccupancyIncome = avgRoomRent * occupancyStats.totalRooms;
    
    // 손익분기점 입주율 (비상주 기여 반영 전)
    const bepRateGross = fullOccupancyIncome > 0 
      ? Math.round((monthlyFixedCost / fullOccupancyIncome) * 100) 
      : 0;
    
    // 손익분기점 입주율 (비상주 기여 반영 후 - 실질)
    const bepRateNet = fullOccupancyIncome > 0 
      ? Math.round((netFixedCost / fullOccupancyIncome) * 100) 
      : 0;
    
    // 손익분기점 호실 수
    const bepRoomsGross = Math.ceil((bepRateGross / 100) * occupancyStats.totalRooms);
    const bepRoomsNet = Math.ceil((bepRateNet / 100) * occupancyStats.totalRooms);
    const bepRoomsSaved = bepRoomsGross - bepRoomsNet; // 비상주로 절감된 호실 수
    
    // 현재 입주율
    const currentRate = Math.round((occupancyStats.occupiedRooms / occupancyStats.totalRooms) * 100);
    
    // 여유분 (실질 BEP 기준)
    const margin = currentRate - bepRateNet;
    
    return {
      monthlyFixedCost,
      monthlyPostboxIncome,
      netFixedCost,
      fullOccupancyIncome,
      bepRateGross,
      bepRateNet,
      bepRoomsGross,
      bepRoomsNet,
      bepRoomsSaved,
      currentRate,
      margin,
      isAboveBEP: margin >= 0
    };
  }, [transactions, selectedFixedCosts, avgRoomRent, occupancyStats, startDate, endDate]);

  // 월별 데이터 (차트용)
  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const months = eachMonthOfInterval({ start, end });
    
    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const monthLabel = format(month, 'M월', { locale: ko });
      
      const monthTransactions = filteredTransactions.filter(t => {
        const tDate = t.transaction_date.substring(0, 7);
        return tDate === monthStr;
      });
      
      // 전체 transactions에서 예수금 관련 (필터와 무관)
      const allMonthTransactions = transactions.filter(t => {
        const tDate = t.transaction_date.substring(0, 7);
        return tDate === monthStr;
      });
      
      // 해당 월의 billings (완료된 것만)
      const monthBillings = billings.filter(b => 
        b.year_month === monthStr && b.status === '완료'
      );
      
      // 호실별 임대료 (billing 기준)
      const billingAmount = selectedIncomeCategories.includes('월사용료')
        ? monthBillings.reduce((sum, b) => sum + b.amount, 0)
        : 0;
      
      // 기타 수입 (transactions 기준, 월사용료 제외)
      const otherIncomeAmount = monthTransactions
        .filter(t => t.type === '입금' && t.status === '완료' && t.category !== '월사용료')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const income = billingAmount + otherIncomeAmount;
      
      const expense = monthTransactions
        .filter(t => t.type === '지출')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // 예수금 (신규 입금)
      const newDeposit = allMonthTransactions
        .filter(t => t.category === '보증금입금')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        month: monthLabel,
        지출: expense,
        수입: income,
        예수금: newDeposit,
        손익: income - expense,
        BEP: breakEvenPoint.netFixedCost // 손익분기점 라인 (실질 고정비)
      };
    });
  }, [filteredTransactions, transactions, billings, selectedIncomeCategories, startDate, endDate, breakEvenPoint.netFixedCost]);

  // 카테고리별 합계 (테이블용)
  const categoryTotals = useMemo(() => {
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};
    
    // 호실별 임대료는 billing 기준
    incomeByCategory['월사용료'] = billings
      .filter(b => b.status === '완료')
      .reduce((sum, b) => sum + b.amount, 0);
    
    // 기타 수입은 transactions 기준 (월사용료 제외)
    filteredTransactions.forEach(t => {
      if (t.type === '입금' && t.status === '완료' && t.category !== '월사용료') {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      } else if (t.type === '지출') {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      }
    });
    
    return { incomeByCategory, expenseByCategory };
  }, [filteredTransactions, billings]);


  // CSV 다운로드
  const exportCSV = () => {
    const headers = ['월', '지출', '수입', '예수금', '손익'];
    const rows = monthlyData.map(d => [
      d.month,
      d.지출,
      d.수입,
      d.예수금,
      d.손익
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `기간별손익_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-slate-700">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-end">
        <button
          onClick={exportCSV}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          CSV 다운로드
        </button>
      </div>

      {/* 상단 컨트롤 바 */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 설정 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input text-sm py-1.5 w-36"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input text-sm py-1.5 w-36"
            />
            <button onClick={loadData} className="btn-primary btn-sm flex items-center gap-2">
              <Search className="w-4 h-4" />
              조회
            </button>
          </div>

          {/* 필터 버튼들 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowIncomeFilter(!showIncomeFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                showIncomeFilter ? 'bg-coral-50 text-coral-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              수입 {selectedIncomeCategories.length}/{INCOME_CATEGORIES.length}
            </button>
            <button
              onClick={() => setShowExpenseFilter(!showExpenseFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                showExpenseFilter ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              지출 {selectedExpenseCategories.length}/{EXPENSE_CATEGORIES.length}
            </button>
            <button
              onClick={() => setShowFixedCostFilter(!showFixedCostFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                showFixedCostFilter ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              고정비 {selectedFixedCosts.length}/{FIXED_COST_CATEGORIES.length}
            </button>
          </div>
        </div>

        {/* 필터 상세 (토글) */}
        {(showIncomeFilter || showExpenseFilter || showFixedCostFilter) && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-4">
            {showIncomeFilter && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-slate-600 font-medium mr-1">수입:</span>
                {INCOME_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      if (selectedIncomeCategories.includes(cat.value)) {
                        setSelectedIncomeCategories(prev => prev.filter(c => c !== cat.value));
                      } else {
                        setSelectedIncomeCategories(prev => [...prev, cat.value]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      selectedIncomeCategories.includes(cat.value)
                        ? 'bg-coral-400 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            {showExpenseFilter && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-slate-600 font-medium mr-1">지출:</span>
                {EXPENSE_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      if (selectedExpenseCategories.includes(cat.value)) {
                        setSelectedExpenseCategories(prev => prev.filter(c => c !== cat.value));
                      } else {
                        setSelectedExpenseCategories(prev => [...prev, cat.value]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      selectedExpenseCategories.includes(cat.value)
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            {showFixedCostFilter && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-slate-600 font-medium mr-1">고정비:</span>
                {FIXED_COST_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      if (selectedFixedCosts.includes(cat.value)) {
                        setSelectedFixedCosts(prev => prev.filter(c => c !== cat.value));
                      } else {
                        setSelectedFixedCosts(prev => [...prev, cat.value]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      selectedFixedCosts.includes(cat.value)
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BEP 분석 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BEP 프로그레스 바 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900">BEP 달성도</h4>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              breakEvenPoint.isAboveBEP ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-700'
            }`}>
              {breakEvenPoint.isAboveBEP ? '달성' : '미달성'} ({breakEvenPoint.margin >= 0 ? '+' : ''}{breakEvenPoint.margin}%p)
            </span>
          </div>
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((breakEvenPoint.currentRate / (breakEvenPoint.bepRateNet || 1)) * 100, 100)}%`,
                backgroundColor: breakEvenPoint.isAboveBEP ? '#4f46e5' : '#818cf8'
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
            <span>현재 {breakEvenPoint.currentRate}%</span>
            <span>BEP {breakEvenPoint.bepRateNet}% ({breakEvenPoint.bepRoomsNet}개 호실)</span>
          </div>
        </div>

        {/* BEP 분석 상세 */}
        <div className="card p-5">
          <h4 className="text-sm font-bold mb-3 text-slate-900">BEP 분석</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>월 고정비</span>
              <span className="font-medium">{formatCurrency(breakEvenPoint.monthlyFixedCost)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>비상주 기여</span>
              <span className="font-medium">-{formatCurrency(breakEvenPoint.monthlyPostboxIncome)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1">
              <span>실질 고정비</span>
              <span>{formatCurrency(breakEvenPoint.netFixedCost)}</span>
            </div>
            <div className="flex justify-between text-slate-500 mt-2">
              <span>호실당 평균</span>
              <span>{formatCurrency(avgRoomRent)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>BEP 호실</span>
              <span>{breakEvenPoint.bepRoomsNet}개 이상</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-coral-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-coral-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-700 font-medium">총 수입</p>
                  <p className="text-lg font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-700 font-medium">총 지출</p>
                  <p className="text-lg font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-blue-100' : 'bg-rose-100'}`}>
                  <BarChart3 className={`w-6 h-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">순이익</p>
                  <p className="text-lg font-bold text-slate-900 whitespace-nowrap">{formatCurrency(netProfit)}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <Wallet className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-700 font-medium">예수금 잔액</p>
                  <p className="text-lg font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalDepositHeld)}</p>
                  <p className="text-xs text-slate-500">현재 보유 기준</p>
                </div>
              </div>
            </div>

          </div>

          {/* 예수금 변동 섹션 */}
          <div className="card p-5">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary-700" />
              💰 예수금 변동 (조회 기간)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowUpRight className="w-3 h-3 text-indigo-600" />
                  <span className="text-xs text-slate-700 font-medium">신규 입금</span>
                </div>
                <p className="text-lg font-bold text-slate-900">+{formatCurrency(depositChanges.newDeposits)}</p>
                <p className="text-xs text-slate-500">{depositChanges.newDepositsCount}건</p>
              </div>
              
              <div className="p-3 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-600" />
                  <span className="text-xs text-slate-700 font-medium">위약금 전환</span>
                </div>
                <p className="text-lg font-bold text-slate-900">-{formatCurrency(depositChanges.penaltyConversion)}</p>
                <p className="text-xs text-slate-500">{depositChanges.penaltyCount}건</p>
              </div>
              
              <div className="p-3 bg-slate-100 rounded-xl">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowDownRight className="w-3 h-3 text-slate-600" />
                  <span className="text-xs text-slate-600 font-medium">사용료 전환</span>
                </div>
                <p className="text-lg font-bold text-slate-700">-{formatCurrency(depositChanges.usageConversion)}</p>
                <p className="text-xs text-slate-500">{depositChanges.usageCount}건</p>
              </div>
            </div>
          </div>

          {/* 월별 라인 차트 */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              월별 추이
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={11}
                    width={60}
                    tickFormatter={(value) => {
                      const absValue = Math.abs(value);
                      if (absValue >= 100000000) {
                        return `${(value / 100000000).toFixed(1)}억`;
                      }
                      return `${Math.round(value / 10000)}만`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="지출" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="수입" 
                    stroke="#0d9488" 
                    strokeWidth={2}
                    dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="예수금" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="손익" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {/* 손익분기점 라인 (실질 고정비 - 비상주 기여 반영) */}
                  {breakEvenPoint.netFixedCost > 0 && (
                    <ReferenceLine 
                      y={breakEvenPoint.netFixedCost} 
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      label={{ 
                        value: `BEP ${formatCurrency(breakEvenPoint.netFixedCost)}`, 
                        position: 'right',
                        fill: '#f43f5e',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 상세 테이블 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 수입 상세 */}
            <div className="card">
              <div className="p-4 border-b border-slate-200 border-l-[3px] border-l-coral-300">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-coral-500" />
                  수입 상세
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">항목</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {INCOME_CATEGORIES
                      .filter(cat => selectedIncomeCategories.includes(cat.value))
                      .map(cat => {
                        const amount = categoryTotals.incomeByCategory[cat.value] || 0;
                        return (
                          <tr key={cat.value} className={amount === 0 ? 'text-slate-400' : ''}>
                            <td className="px-4 py-3 text-sm">{cat.label}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        );
                      })}
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3">합계</td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 지출 상세 */}
            <div className="card">
              <div className="p-4 border-b border-slate-200 border-l-[3px] border-l-rose-400">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                  지출 상세
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">항목</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {EXPENSE_CATEGORIES
                      .filter(cat => selectedExpenseCategories.includes(cat.value))
                      .map(cat => {
                        const amount = categoryTotals.expenseByCategory[cat.value] || 0;
                        return (
                          <tr key={cat.value} className={amount === 0 ? 'text-slate-400' : ''}>
                            <td className="px-4 py-3 text-sm">{cat.label}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        );
                      })}
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3">합계</td>
                      <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 월별 상세 테이블 */}
          <div className="card">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                월별 상세
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">월</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">지출</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">수입</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">예수금</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-500">손익</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.map((data, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{data.month}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700 font-medium">
                        {formatCurrency(data.지출)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700 font-medium">
                        {formatCurrency(data.수입)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700 font-medium">
                        {formatCurrency(data.예수금)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        {formatCurrency(data.손익)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="px-4 py-3">합계</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totalExpense)}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totalIncome)}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(depositChanges.newDeposits)}</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {formatCurrency(netProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
