import { useEffect, useState } from 'react';
import { billingsApi, transactionsApi, tenantsApi, roomsApi } from '../api';
import { Billing, Tenant, Room, Transaction } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Check, ChevronLeft, ChevronRight, Plus, RefreshCw,
  Building2, CreditCard, AlertCircle, CheckCircle2, FileText, Calculator,
  CheckSquare, Square, X, AlertTriangle, Coffee, Mailbox,
  Landmark, ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { showSuccess, showError } from '../utils/toast';

export default function Income() {
  const { isAdmin } = useAuth();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [calcSelections, setCalcSelections] = useState<Record<string, number>>({});
  const [addType, setAddType] = useState<'회의실' | '1day' | '기타'>('회의실');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionTaxModal, setShowTransactionTaxModal] = useState(false);
  const [showTransactionEditModal, setShowTransactionEditModal] = useState(false);
  const [showBillingEditModal, setShowBillingEditModal] = useState(false);
  
  const [billingEditForm, setBillingEditForm] = useState({
    status: '완료',
    payment_date: '',
    payment_method: '계좌이체',
    notes: ''
  });
  
  const [confirmForm, setConfirmForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '계좌이체',
    payment_amount: 0,
    notes: ''
  });
  const [paymentMode, setPaymentMode] = useState<'vat_included' | 'vat_excluded' | 'custom'>('vat_included');

  const [taxInvoiceForm, setTaxInvoiceForm] = useState({
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_number: ''
  });

  const [addForm, setAddForm] = useState({
    tenant_id: '',
    room_id: '',
    category: '회의실사용료',
    amount: '',
    vat_amount: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '계좌이체',
    description: '',
    notes: ''
  });

  const [transactionEditForm, setTransactionEditForm] = useState({
    transaction_date: '',
    payment_method: '계좌이체',
    amount: '',
    notes: ''
  });

  const [transactionTaxForm, setTransactionTaxForm] = useState({
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_number: ''
  });

  // 보증금(예수금) 관련 상태
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [pendingConversions, setPendingConversions] = useState<Transaction[]>([]);
  const [, setConfirmedDeposits] = useState<Transaction[]>([]);
  const [, setAllActiveDeposits] = useState<Transaction[]>([]);
  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Transaction | null>(null);
  
  const [depositConfirmForm, setDepositConfirmForm] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '계좌이체',
    issue_tax_invoice: false,
    tax_invoice_date: format(new Date(), 'yyyy-MM-dd'),
    tax_invoice_number: ''
  });
  const [conversionForm, setConversionForm] = useState({
    conversion_date: ''
  });
  const yearMonth = format(currentDate, 'yyyy-MM');
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, [yearMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [billingsRes, transactionsRes, specialTransactionsRes, tenantsRes, roomsRes, depositsRes, pendingConversionsRes, confirmedDepositsRes, allDepositsRes] = await Promise.all([
        billingsApi.getAll({ year_month: yearMonth }),
        // 일반 수입 (1회성 사용 등) - transaction_date 기준
        transactionsApi.getAll({ type: '입금', start_date: monthStart, end_date: monthEnd }),
        // 비상주사용료, 위약금 - 계약 날짜 기준 필터링을 위해 전체 조회
        transactionsApi.getAll({ type: '입금', category: '비상주사용료,위약금' }),
        tenantsApi.getAll(),
        roomsApi.getAll(),
        // 보증금 입금 대기 (전체 - 대기 상태는 월 상관없이 표시)
        transactionsApi.getDeposits({ status: '대기' }),
        // 사용료 전환 대기 (계약 종료월 기준)
        transactionsApi.getPendingConversions(yearMonth),
        // 해당월 입금 확인된 보증금
        transactionsApi.getDeposits({ year_month: yearMonth, status: '완료' }),
        // 전체 보유 예수금 (완료 상태)
        transactionsApi.getDeposits({ status: '완료' })
      ]);
      setBillings(billingsRes.data);
      // 일반 트랜잭션과 특수 트랜잭션 병합 (중복 제거)
      const allTransactions = [...transactionsRes.data];
      specialTransactionsRes.data.forEach((t: Transaction) => {
        if (!allTransactions.find((at: Transaction) => at.id === t.id)) {
          allTransactions.push(t);
        }
      });
      setTransactions(allTransactions);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
      setDeposits(depositsRes.data);
      setPendingConversions(pendingConversionsRes.data);
      setConfirmedDeposits(confirmedDepositsRes.data);
      setAllActiveDeposits(allDepositsRes.data);
      setCalcSelections({});
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 데이터 분류
  const completedBillings = billings.filter(b => b.status === '완료');
  
  // 해당월에 입금 대상인 호실 (입금일까지 계약이 유효한 호실)
  const occupiedRooms = rooms.filter(room => {
    // POST BOX, 회의실 제외 (자유석은 포함)
    if (room.room_type === 'POST BOX' || room.room_type === '회의실') {
      return false;
    }
    // 계약 정보가 있는 경우
    if (room.start_date && room.end_date) {
      const contractStart = new Date(room.start_date);
      const contractEnd = new Date(room.end_date);
      const monthEndDate = endOfMonth(currentDate);
      
      // 해당월의 입금일 계산 (payment_day가 없으면 기본 10일)
      const paymentDay = room.payment_day || 10;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      // 해당월의 마지막 날보다 입금일이 크면 마지막 날로 설정
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const actualPaymentDay = Math.min(paymentDay, lastDayOfMonth);
      const paymentDate = new Date(year, month, actualPaymentDay);
      
      // 조건: 계약시작일 <= 해당월말 AND 계약종료일 >= 해당월 입금일
      // 입금일까지 계약이 유효해야 청구 대상
      return contractStart <= monthEndDate && contractEnd >= paymentDate;
    }
    return false;
  });

  // 각 호실에 대한 청구 상태 매핑
  const getRoomBillingStatus = (roomId: number) => {
    const billing = billings.find(b => b.room_id === roomId);
    if (!billing) return { status: '미생성', billing: null };
    return { status: billing.status, billing };
  };
  
  // 비상주 사용료 (POST BOX 계약 - 계약 시작월 기준으로 필터링)
  const postboxIncome = transactions.filter(t => {
    if (t.category !== '비상주사용료') return false;
    // contract_start_date 기준으로 해당월 필터링
    const targetDate = t.contract_start_date || t.transaction_date;
    return format(new Date(targetDate), 'yyyy-MM') === yearMonth;
  });
  
  // 위약금 (중도종료 - 계약 종료월 기준으로 필터링)
  const penaltyIncome = transactions.filter(t => {
    if (t.category !== '위약금') return false;
    // contract_end_date 기준으로 해당월 필터링
    const targetDate = t.contract_end_date || t.transaction_date;
    return format(new Date(targetDate), 'yyyy-MM') === yearMonth;
  });
  
  // 사용료전환 (만기종료 - 계약 종료월 기준으로 필터링)
  const depositConversionIncome = transactions.filter(t => {
    if (t.category !== '사용료전환') return false;
    // contract_end_date 기준으로 해당월 필터링
    const targetDate = t.contract_end_date || t.transaction_date;
    return format(new Date(targetDate), 'yyyy-MM') === yearMonth;
  });
  
  // 1회성 사용 (회의실/1day)
  const oneTimeIncome = transactions.filter(t => 
    t.category === '회의실사용료' || t.category === '1day사용료'
  );
  
  // 기타 수입 (위 카테고리에 포함되지 않는 완료된 입금)
  // 보증금입금: 예수금(부채)이므로 제외
  // 사용료전환: 별도 섹션에서 표시되므로 제외
  // 월사용료: billing 기반으로 관리되므로 제외
  const otherIncome = transactions.filter(t => 
    !['비상주사용료', '위약금', '회의실사용료', '1day사용료', '보증금입금', '사용료전환', '월사용료'].includes(t.category) &&
    t.status === '완료'
  );

  // 요약 계산
  // billing 데이터를 기준으로 합산 (해당 월 실제 청구 금액 = source of truth)
  // billing이 없는 입주 호실만 현재 계약 금액으로 보충
  const billingRoomIds = new Set(billings.map(b => b.room_id));
  const allBillingsTotal = billings.reduce((sum, b) => sum + b.amount, 0);
  const unbilledOccupiedTotal = occupiedRooms
    .filter(r => !billingRoomIds.has(r.id))
    .reduce((sum, r) => sum + (r.monthly_rent_vat || 0), 0);
  const completedBillingTotal = completedBillings.reduce((sum, b) => sum + b.amount, 0);
  const occupiedRoomsTotal = allBillingsTotal + unbilledOccupiedTotal;
  const unpaidTotal = occupiedRoomsTotal - completedBillingTotal;
  const billedRoomCount = billingRoomIds.size;
  const unbilledRoomCount = occupiedRooms.filter(r => !billingRoomIds.has(r.id)).length;
  const totalRoomCount = billedRoomCount + unbilledRoomCount;
  const postboxTotal = postboxIncome.reduce((sum, t) => sum + t.amount, 0);
  const penaltyTotal = penaltyIncome.reduce((sum, t) => sum + t.amount, 0);
  const depositConversionTotal = depositConversionIncome.reduce((sum, t) => sum + t.amount, 0);
  const oneTimeTotal = oneTimeIncome.reduce((sum, t) => sum + t.amount, 0);
  const otherTotal = otherIncome.reduce((sum, t) => sum + t.amount, 0);
  const totalExpected = occupiedRoomsTotal + postboxTotal + penaltyTotal + depositConversionTotal + oneTimeTotal + otherTotal;
  const totalCompleted = completedBillingTotal + postboxTotal + penaltyTotal + depositConversionTotal + oneTimeTotal + otherTotal;

  const handleGenerateBillings = async () => {
    if (!confirm(`${format(currentDate, 'yyyy년 M월', { locale: ko })} 입금관리를 생성하시겠습니까?`)) return;
    
    try {
      const result = await billingsApi.generate(yearMonth);
      showSuccess(`${result.data.count}건의 입금관리가 생성되었습니다.`);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.error || '입금관리 생성에 실패했습니다.');
    }
  };

  // 개별 호실 청구 생성
  const handleCreateSingleBilling = async (roomId: number, roomNumber: string) => {
    try {
      await billingsApi.createSingle(roomId, yearMonth);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.error || `${roomNumber}호 입금관리 생성에 실패했습니다.`);
    }
  };

  // 단건 입금 확인
  const handleConfirm = async () => {
    if (!selectedBilling) return;
    
    try {
      await billingsApi.confirm(selectedBilling.id, {
        payment_date: confirmForm.payment_date,
        payment_method: confirmForm.payment_method,
        payment_amount: confirmForm.payment_amount,
        notes: confirmForm.notes
      });
      setShowConfirmModal(false);
      setSelectedBilling(null);
      resetConfirmForm();
      loadData();
    } catch (error) {
      console.error('입금 확인 오류:', error);
      showError('입금 확인에 실패했습니다.');
    }
  };


  // 단건 세금계산서 발행
  const handleTaxInvoice = async () => {
    if (!selectedBilling) return;
    
    try {
      await billingsApi.updateTaxInvoice(selectedBilling.id, {
        issued: true,
        issue_date: taxInvoiceForm.issue_date,
        invoice_number: taxInvoiceForm.invoice_number || undefined
      });
      setShowTaxInvoiceModal(false);
      setSelectedBilling(null);
      resetTaxInvoiceForm();
      loadData();
    } catch (error) {
      console.error('세금계산서 발행 오류:', error);
      showError('세금계산서 발행 처리에 실패했습니다.');
    }
  };


  const handleAddIncome = async () => {
    try {
      await transactionsApi.create({
        ...addForm,
        type: '입금',
        tenant_id: addForm.tenant_id ? parseInt(addForm.tenant_id) : null,
        room_id: addForm.room_id ? parseInt(addForm.room_id) : null,
        amount: parseInt(addForm.amount) || 0,
        vat_amount: parseInt(addForm.vat_amount) || 0,
        status: '완료'
      });
      setShowAddModal(false);
      resetAddForm();
      loadData();
    } catch (error) {
      console.error('수입 등록 오류:', error);
      showError('수입 등록에 실패했습니다.');
    }
  };

  // 보증금 입금 확인 모달 열기
  const openDepositConfirmModal = (deposit: Transaction) => {
    setSelectedDeposit(deposit);
    setDepositConfirmForm({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '계좌이체',
      issue_tax_invoice: false,
      tax_invoice_date: format(new Date(), 'yyyy-MM-dd'),
      tax_invoice_number: ''
    });
    setShowDepositConfirmModal(true);
  };

  // 보증금 입금 확인 처리
  const handleDepositConfirm = async () => {
    if (!selectedDeposit) return;
    
    try {
      await transactionsApi.confirmDeposit(selectedDeposit.id, depositConfirmForm);
      setShowDepositConfirmModal(false);
      setSelectedDeposit(null);
      loadData();
      showSuccess('보증금 입금이 확인되었습니다.');
    } catch (error: any) {
      console.error('보증금 입금 확인 오류:', error);
      const detail = error?.response?.data?.detail;
      showError(detail ? `보증금 입금 확인 실패: ${detail}` : '보증금 입금 확인에 실패했습니다.');
    }
  };

  // 사용료 전환 모달 열기
  const openConversionModal = (deposit: Transaction) => {
    setSelectedDeposit(deposit);
    const endDate = deposit.contract_end_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd');
    setConversionForm({ conversion_date: endDate });
    setShowConversionModal(true);
  };

  // 보증금 → 사용료 전환 처리
  const handleConversion = async () => {
    if (!selectedDeposit) return;
    
    try {
      await transactionsApi.convertToRent(selectedDeposit.id, conversionForm);
      setShowConversionModal(false);
      setSelectedDeposit(null);
      loadData();
      showSuccess('보증금이 사용료로 전환되었습니다.');
    } catch (error) {
      console.error('보증금 전환 오류:', error);
      showError('보증금 전환에 실패했습니다.');
    }
  };

  // 트랜잭션 세금계산서 발행
  const handleTransactionTaxInvoice = async () => {
    if (!selectedTransaction) return;
    
    try {
      await transactionsApi.updateTaxInvoice(selectedTransaction.id, {
        issued: true,
        issue_date: transactionTaxForm.issue_date,
        invoice_number: transactionTaxForm.invoice_number || undefined
      });
      setShowTransactionTaxModal(false);
      setSelectedTransaction(null);
      setTransactionTaxForm({ issue_date: format(new Date(), 'yyyy-MM-dd'), invoice_number: '' });
      loadData();
    } catch (error) {
      console.error('세금계산서 발행 오류:', error);
      showError('세금계산서 발행에 실패했습니다.');
    }
  };

  // 트랜잭션 수정 (입금확인내역)
  const handleTransactionEdit = async () => {
    if (!selectedTransaction) return;
    
    try {
      await transactionsApi.updateDetails(selectedTransaction.id, {
        transaction_date: transactionEditForm.transaction_date,
        payment_method: transactionEditForm.payment_method,
        amount: parseInt(transactionEditForm.amount) || selectedTransaction.amount,
        notes: transactionEditForm.notes
      });
      setShowTransactionEditModal(false);
      setSelectedTransaction(null);
      loadData();
    } catch (error) {
      console.error('거래 수정 오류:', error);
      showError('거래 수정에 실패했습니다.');
    }
  };

  // 트랜잭션 세금계산서 모달 열기
  const openTransactionTaxModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setTransactionTaxForm({
      issue_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_number: ''
    });
    setShowTransactionTaxModal(true);
  };

  // 트랜잭션 수정 모달 열기
  const openTransactionEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setTransactionEditForm({
      transaction_date: transaction.transaction_date.split('T')[0],
      payment_method: transaction.payment_method || '계좌이체',
      amount: transaction.amount.toString(),
      notes: transaction.notes || ''
    });
    setShowTransactionEditModal(true);
  };

  // Billing 수정 모달 열기
  const openBillingEditModal = (billing: Billing) => {
    setSelectedBilling(billing);
    setBillingEditForm({
      status: billing.status || '완료',
      payment_date: billing.payment_date ? billing.payment_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
      payment_method: '계좌이체',
      notes: billing.notes || ''
    });
    setShowBillingEditModal(true);
  };

  // Billing 수정 처리
  const handleBillingEdit = async () => {
    if (!selectedBilling) return;
    
    try {
      await billingsApi.updateStatus(selectedBilling.id, {
        status: billingEditForm.status,
        payment_date: billingEditForm.status === '완료' ? billingEditForm.payment_date : undefined,
        notes: billingEditForm.notes
      });
      setShowBillingEditModal(false);
      setSelectedBilling(null);
      loadData();
    } catch (error) {
      console.error('청구 수정 오류:', error);
      showError('청구 수정에 실패했습니다.');
    }
  };

  // 입금 취소 처리
  const handleCancelPayment = async (billing: Billing) => {
    if (!confirm(`${billing.room_number}호 ${billing.company_name}의 입금을 취소하시겠습니까?\n\n취소 시 입금 기록이 삭제되고 대기 상태로 돌아갑니다.`)) return;
    
    try {
      await billingsApi.cancelPayment(billing.id);
      loadData();
      showSuccess('입금이 취소되었습니다.');
    } catch (error: any) {
      console.error('입금 취소 오류:', error);
      showError(error.response?.data?.error || '입금 취소에 실패했습니다.');
    }
  };

  const resetConfirmForm = () => {
    setConfirmForm({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '계좌이체',
      payment_amount: 0,
      notes: ''
    });
    setPaymentMode('vat_included');
  };

  const resetTaxInvoiceForm = () => {
    setTaxInvoiceForm({
      issue_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_number: ''
    });
  };

  const resetAddForm = () => {
    setAddForm({
      tenant_id: '',
      room_id: '',
      category: '회의실사용료',
      amount: '',
      vat_amount: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '계좌이체',
      description: '',
      notes: ''
    });
  };

  const openConfirmModal = (billing: Billing) => {
    setSelectedBilling(billing);
    setConfirmForm(prev => ({
      ...prev,
      payment_amount: billing.amount
    }));
    setPaymentMode('vat_included');
    setShowConfirmModal(true);
  };

  const openTaxInvoiceModal = (billing: Billing) => {
    setSelectedBilling(billing);
    setShowTaxInvoiceModal(true);
  };

  const openAddModal = (type: '회의실' | '1day' | '기타') => {
    setAddType(type);
    setAddForm(prev => ({
      ...prev,
      category: type === '회의실' ? '회의실사용료' : type === '1day' ? '1day사용료' : '기타수입',
      transaction_date: format(new Date(), 'yyyy-MM-dd')
    }));
    setShowAddModal(true);
  };

  const toggleCalcSelect = (key: string, amount: number) => {
    setCalcSelections(prev => {
      const next = { ...prev };
      if (key in next) delete next[key];
      else next[key] = amount;
      return next;
    });
  };

  const calcSelectedCount = Object.keys(calcSelections).length;
  const calcTotal = Object.values(calcSelections).reduce((sum, a) => sum + a, 0);

  const getAllCalcItems = () => {
    const allItems: Record<string, number> = {};
    const billingRoomIdSet = new Set(billings.map(b => b.room_id));
    billings.forEach(b => { allItems[`b-${b.id}`] = b.amount; });
    occupiedRooms.forEach(r => {
      if (!billingRoomIdSet.has(r.id)) {
        allItems[`r-${r.id}`] = r.monthly_rent_vat || 0;
      }
    });
    [...postboxIncome, ...penaltyIncome, ...depositConversionIncome, ...oneTimeIncome].forEach(t => {
      allItems[`t-${t.id}`] = t.amount;
    });
    return allItems;
  };

  const toggleCalcSelectAll = () => {
    const allItems = getAllCalcItems();
    const allKeys = Object.keys(allItems);
    const allSelected = allKeys.length > 0 && allKeys.every(key => key in calcSelections);
    if (allSelected) {
      setCalcSelections({});
    } else {
      setCalcSelections(allItems);
    }
  };

  const isAllCalcSelected = (() => {
    const allItems = getAllCalcItems();
    const allKeys = Object.keys(allItems);
    return allKeys.length > 0 && allKeys.every(key => key in calcSelections);
  })();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const meetingRooms = rooms.filter(r => r.room_type === '회의실');
  const hotDesks = rooms.filter(r => r.room_type === '자유석');

  return (
    <div className={`space-y-6 ${calcSelectedCount > 0 ? 'pb-20' : ''}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">💰 수입 관리</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateBillings}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              입금관리
            </button>
          </div>
        )}
      </div>

      {/* 월 선택 */}
      <div className="card p-4">
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 min-w-[150px] text-center">
            📅 {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700 font-medium">미입금</p>
              <p className="text-xl font-bold text-slate-900">{totalRoomCount - completedBillings.length}건</p>
              <p className="text-sm text-slate-600">{formatCurrency(unpaidTotal)}</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-coral-500" />
            </div>
            <div>
              <p className="text-sm text-slate-700 font-semibold">💰 이달 실수입</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalCompleted)}</p>
              <p className="text-sm text-slate-600">{completedBillings.length + postboxIncome.length + penaltyIncome.length + depositConversionIncome.length + oneTimeIncome.length}건 입금 완료</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700 font-medium">위약금/전환/기타</p>
              <p className="text-xl font-bold text-slate-900">{penaltyIncome.length + depositConversionIncome.length + oneTimeIncome.length}건</p>
              <p className="text-sm text-slate-600">{formatCurrency(penaltyTotal + depositConversionTotal + oneTimeTotal)}</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-xl">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700 font-medium">이달 총 예상</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpected)}</p>
              <p className="text-sm text-slate-600">입주 {totalRoomCount}호실 기준</p>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 호실별 임대료 */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 border-l-[3px] border-l-amber-400 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            📋 호실별 임대료 ({occupiedRooms.length}개 호실 입주중)
          </h3>
          <button
            onClick={toggleCalcSelectAll}
            className="text-sm text-slate-700 hover:text-slate-800 flex items-center gap-1"
          >
            {isAllCalcSelected ? (
              <>
                <CheckSquare className="w-4 h-4 text-teal-600" />
                전체 해제
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                전체 선택
              </>
            )}
          </button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {occupiedRooms.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              해당월에 입주중인 호실이 없습니다.
            </div>
          ) : (
            occupiedRooms
              .sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number))
              .map((room) => {
                const { billing } = getRoomBillingStatus(room.id);
                const isConfirmed = billing?.status === '완료';
                const expectedAmount = billing?.amount || room.monthly_rent_vat || 0;
                const confirmedAmount = isConfirmed ? billing!.amount : 0;
                const calcKey = billing ? `b-${billing.id}` : `r-${room.id}`;

                return (
                  <div key={room.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                    {/* 체크박스 */}
                    <button onClick={() => toggleCalcSelect(calcKey, expectedAmount)} className="p-1">
                      {(calcKey in calcSelections) ? (
                        <CheckSquare className="w-5 h-5 text-teal-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isConfirmed ? 'bg-coral-50' : 'bg-slate-100'
                      }`}>
                        <span className="text-sm font-bold text-slate-900">{room.room_number}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{room.company_name || '-'}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap">
                          <span>📅 매월 {room.payment_day || 10}일</span>
                          {isConfirmed && billing?.payment_date && (
                            <span className="text-slate-600">입금: {format(new Date(billing.payment_date), 'M/d')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">예정 {formatCurrency(expectedAmount)}</div>
                        <div className={`font-bold ${isConfirmed ? 'text-slate-900' : 'text-slate-300'}`}>
                          {isConfirmed ? formatCurrency(confirmedAmount) : '0원'}
                        </div>
                      </div>

                      {/* 상태 뱃지 */}
                      {isConfirmed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium min-w-[70px] justify-center bg-coral-50 text-coral-500">
                          {billing?.tax_invoice_issued ? '📄 세금계산서' : '✅ 입금확인'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium min-w-[70px] justify-center bg-slate-100 text-slate-600">
                          미입금
                        </span>
                      )}

                      {/* 액션 버튼 */}
                      {isAdmin && !isConfirmed && !billing && (
                        <button
                          onClick={() => handleCreateSingleBilling(room.id, room.room_number)}
                          className="btn-secondary flex items-center gap-1 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          입금관리
                        </button>
                      )}

                      {isAdmin && !isConfirmed && billing && (
                        <div className="flex gap-1">
                          {!billing.tax_invoice_issued && (
                            <button
                              onClick={() => openTaxInvoiceModal(billing)}
                              className="btn-secondary btn-sm"
                              title="세금계산서 발행"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openConfirmModal(billing)}
                            className="btn-primary flex items-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            입금 확인
                          </button>
                        </div>
                      )}

                      {isAdmin && isConfirmed && billing && (
                        <div className="flex gap-1">
                          {!billing.tax_invoice_issued && (
                            <button
                              onClick={() => openTaxInvoiceModal(billing)}
                              className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600"
                              title="세금계산서 발행"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openBillingEditModal(billing)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                            title="입금내역 수정"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleCancelPayment(billing)}
                            className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-500"
                            title="입금 취소"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
        
        {/* 📊 총계 비교 */}
        {(occupiedRooms.length > 0 || billings.length > 0) && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-t-2 border-amber-200">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">📋 이달 예상:</span>
                <span className="text-lg font-bold text-slate-800">{formatCurrency(occupiedRoomsTotal)}</span>
              </div>
              <div className="h-8 w-px bg-amber-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">✅ 입금 확인:</span>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(completedBillingTotal)}</span>
                <span className="text-sm text-slate-600">({completedBillings.length}개 호실)</span>
              </div>
              <div className="h-8 w-px bg-amber-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">⏳ 미입금:</span>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(unpaidTotal)}</span>
                <span className="text-sm text-slate-600">({totalRoomCount - completedBillings.length}개 호실)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📬 비상주 사용료 (POST BOX) */}
      {postboxIncome.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200 border-l-[3px] border-l-coral-400">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Mailbox className="w-5 h-5 text-coral-600" />
              📬 비상주 사용료 ({postboxIncome.length}건)
              <span className="text-sm font-normal text-slate-500 ml-2">* 계약 시작월 자동 생성</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {postboxIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleCalcSelect(`t-${transaction.id}`, transaction.amount)} className="p-1">
                    {(`t-${transaction.id}` in calcSelections) ? (
                      <CheckSquare className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center">
                    <Mailbox className="w-6 h-6 text-coral-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {transaction.room_number} | {transaction.company_name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {transaction.description || '비상주 사용료'} | 계약시작: {transaction.contract_start_date ? format(new Date(transaction.contract_start_date), 'yy.MM.dd') : format(new Date(transaction.transaction_date), 'yy.MM.dd')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{formatCurrency(transaction.amount)}</span>
                  {transaction.tax_invoice_issued ? (
                    <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      세금계산서
                    </span>
                  ) : isAdmin ? (
                    <button
                      onClick={() => openTransactionTaxModal(transaction)}
                      className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600"
                      title="세금계산서 발행"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  ) : null}
                  {isAdmin && (
                    <button
                      onClick={() => openTransactionEditModal(transaction)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                      title="수정"
                    >
                      ✏️
                    </button>
                  )}
                  <span className="inline-flex items-center px-2 py-1 bg-coral-50 text-coral-500 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    완료
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ 위약금 (중도종료) */}
      {penaltyIncome.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200 bg-orange-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              ⚠️ 위약금 ({penaltyIncome.length}건)
              <span className="text-sm font-normal text-slate-500 ml-2">* 중도종료 시 자동 생성</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {penaltyIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleCalcSelect(`t-${transaction.id}`, transaction.amount)} className="p-1">
                    {(`t-${transaction.id}` in calcSelections) ? (
                      <CheckSquare className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {transaction.room_number ? `${transaction.room_number}호` : ''} | {transaction.company_name || '알 수 없음'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {transaction.description || '중도 계약 해지 위약금'} | 종료일: {transaction.contract_end_date ? format(new Date(transaction.contract_end_date), 'yy.MM.dd') : format(new Date(transaction.transaction_date), 'yy.MM.dd')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{formatCurrency(transaction.amount)}</span>
                  {transaction.tax_invoice_issued ? (
                    <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      세금계산서
                    </span>
                  ) : isAdmin ? (
                    <button
                      onClick={() => openTransactionTaxModal(transaction)}
                      className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600"
                      title="세금계산서 발행"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  ) : null}
                  {isAdmin && (
                    <button
                      onClick={() => openTransactionEditModal(transaction)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                      title="수정"
                    >
                      ✏️
                    </button>
                  )}
                  <span className="inline-flex items-center px-2 py-1 bg-coral-50 text-coral-500 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    완료
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔄 사용료전환 (만기종료) */}
      {depositConversionIncome.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200 border-l-[3px] border-l-coral-300">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-coral-500" />
              🔄 사용료전환 ({depositConversionIncome.length}건)
              <span className="text-sm font-normal text-slate-500 ml-2">* 만기종료 시 보증금→사용료 전환</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {depositConversionIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleCalcSelect(`t-${transaction.id}`, transaction.amount)} className="p-1">
                    {(`t-${transaction.id}` in calcSelections) ? (
                      <CheckSquare className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-coral-50 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-coral-500" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {transaction.room_number ? `${transaction.room_number}호` : ''} | {transaction.company_name || '알 수 없음'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {transaction.description || '보증금 → 마지막달 사용료 전환'} | 종료일: {transaction.contract_end_date ? format(new Date(transaction.contract_end_date), 'yy.MM.dd') : format(new Date(transaction.transaction_date), 'yy.MM.dd')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{formatCurrency(transaction.amount)}</span>
                  {transaction.tax_invoice_issued ? (
                    <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      세금계산서
                    </span>
                  ) : isAdmin ? (
                    <button
                      onClick={() => openTransactionTaxModal(transaction)}
                      className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600"
                      title="세금계산서 발행"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  ) : null}
                  {isAdmin && (
                    <button
                      onClick={() => openTransactionEditModal(transaction)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                      title="수정"
                    >
                      ✏️
                    </button>
                  )}
                  <span className="inline-flex items-center px-2 py-1 bg-coral-50 text-coral-500 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    완료
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 1회성 사용 (회의실/1day) */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 bg-cyan-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-cyan-600" />
            🎯 1회성 사용 ({oneTimeIncome.length}건)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => openAddModal('회의실')}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              회의실
            </button>
            <button
              onClick={() => openAddModal('1day')}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              1day
            </button>
            <button
              onClick={() => openAddModal('기타')}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              기타
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {oneTimeIncome.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              이번 달 등록된 1회성 사용 건이 없습니다.
            </div>
          ) : (
            oneTimeIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleCalcSelect(`t-${transaction.id}`, transaction.amount)} className="p-1">
                    {(`t-${transaction.id}` in calcSelections) ? (
                      <CheckSquare className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Coffee className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {transaction.room_number || '-'} | {transaction.category === '회의실사용료' ? '회의실' : '1day'} 사용
                    </div>
                    <div className="text-sm text-slate-500">
                      {transaction.description || transaction.category} | {format(new Date(transaction.transaction_date), 'M/d')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{formatCurrency(transaction.amount)}</span>
                  <span className="inline-flex items-center px-2 py-1 bg-coral-50 text-coral-500 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    완료
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🏦 예수금(보증금) 관리 */}
      {(deposits.length > 0 || pendingConversions.length > 0) && (
        <div className="card">
          <div className="p-4 border-b border-slate-200 border-l-[3px] border-l-primary-400">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary-600" />
              🏦 예수금(보증금) 관리
              <span className="text-sm font-normal text-slate-500 ml-2">* 손익 미반영 (부채)</span>
            </h3>
          </div>
          
          {/* 입금 대기 보증금 */}
          {deposits.length > 0 && (
            <div className="p-4 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                입금 대기 ({deposits.length}건)
              </h4>
              <div className="space-y-2">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Landmark className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {deposit.room_number}호 | {deposit.company_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          계약시작: {deposit.contract_start_date ? format(new Date(deposit.contract_start_date), 'yy.MM.dd') : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{formatCurrency(deposit.amount)}</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        🟡 대기
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => openDepositConfirmModal(deposit)}
                          className="btn-primary btn-sm"
                        >
                          입금 확인
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사용료 전환 대기 (계약 종료월) */}
          {pendingConversions.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                사용료 전환 대기 ({pendingConversions.length}건)
                <span className="text-xs font-normal text-slate-500">- 계약 종료월</span>
              </h4>
              <div className="space-y-2">
                {pendingConversions.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-coral-50 rounded-lg flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5 text-coral-500" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {deposit.room_number}호 | {deposit.company_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          계약종료: {deposit.contract_end_date ? format(new Date(deposit.contract_end_date), 'yy.MM.dd') : '-'}
                          {deposit.payment_day && ` | 납부일: 매월 ${deposit.payment_day}일`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(deposit.amount)}</span>
                        {deposit.tax_invoice_issued && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                            <FileText className="w-3 h-3" />
                            세금계산서 발행됨
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => openConversionModal(deposit)}
                        className="btn-primary btn-sm"
                      >
                        사용료 전환
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 입금 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                입금 확인
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedBilling && (
                <>
                  {/* 청구 정보 */}
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-500">📋 청구 정보</div>
                    <div className="font-medium text-slate-900">
                      {selectedBilling.room_number}호 | {selectedBilling.company_name}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-bold text-slate-700">
                        {formatCurrency(selectedBilling.amount)}
                      </span>
                      <span className="text-sm text-slate-500">
                        (VAT {formatCurrency(selectedBilling.vat_amount || Math.round(selectedBilling.amount - selectedBilling.amount / 1.1))})
                      </span>
                    </div>
                  </div>

                  {/* 실제 납부 */}
                  <div className="p-4 bg-coral-50 rounded-xl space-y-3">
                    <div className="text-sm font-medium text-slate-700">💰 실제 납부</div>
                    
                    {/* 빠른 선택 버튼 */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('vat_included');
                          setConfirmForm(prev => ({ ...prev, payment_amount: selectedBilling.amount }));
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          paymentMode === 'vat_included'
                            ? 'bg-coral-400 text-white'
                            : 'bg-white border border-coral-300 text-coral-500 hover:bg-coral-50'
                        }`}
                      >
                        VAT 포함
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('vat_excluded');
                          const vatExcluded = selectedBilling.amount - (selectedBilling.vat_amount || Math.round(selectedBilling.amount - selectedBilling.amount / 1.1));
                          setConfirmForm(prev => ({ ...prev, payment_amount: vatExcluded }));
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          paymentMode === 'vat_excluded'
                            ? 'bg-coral-400 text-white'
                            : 'bg-white border border-coral-300 text-coral-500 hover:bg-coral-50'
                        }`}
                      >
                        VAT 제외
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('custom')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          paymentMode === 'custom'
                            ? 'bg-coral-400 text-white'
                            : 'bg-white border border-coral-300 text-coral-500 hover:bg-coral-50'
                        }`}
                      >
                        직접 입력
                      </button>
                    </div>

                    {/* 납부액 입력 */}
                    <div>
                      <label className="label text-slate-700">납부액</label>
                      <input
                        type="number"
                        value={confirmForm.payment_amount}
                        onChange={(e) => {
                          setPaymentMode('custom');
                          setConfirmForm(prev => ({ ...prev, payment_amount: parseInt(e.target.value) || 0 }));
                        }}
                        onFocus={() => setPaymentMode('custom')}
                        className="input text-lg font-bold"
                      />
                    </div>

                    {/* 차액 표시 */}
                    {confirmForm.payment_amount !== selectedBilling.amount && (
                      <div className={`p-2 rounded-lg text-sm ${
                        confirmForm.payment_amount < selectedBilling.amount
                          ? 'bg-amber-100 text-slate-700'
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        💡 차액: {confirmForm.payment_amount < selectedBilling.amount ? '-' : '+'}
                        {formatCurrency(Math.abs(confirmForm.payment_amount - selectedBilling.amount))}
                        {confirmForm.payment_amount < selectedBilling.amount 
                          ? ' (청구액보다 적음)' 
                          : ' (청구액보다 많음)'}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="label">입금일</label>
                <input
                  type="date"
                  value={confirmForm.payment_date}
                  onChange={(e) => setConfirmForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">결제 방법</label>
                <select
                  value={confirmForm.payment_method}
                  onChange={(e) => setConfirmForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="input"
                >
                  <option value="계좌이체">계좌이체</option>
                  <option value="카드">카드</option>
                  <option value="현금">현금</option>
                  <option value="자동이체">자동이체</option>
                </select>
              </div>

              <div>
                <label className="label">메모 (선택)</label>
                <input
                  type="text"
                  value={confirmForm.notes}
                  onChange={(e) => setConfirmForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  placeholder="메모를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="btn-primary flex-1"
              >
                {formatCurrency(confirmForm.payment_amount)} 입금 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세금계산서 발행 모달 */}
      {showTaxInvoiceModal && selectedBilling && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                세금계산서 발행
              </h3>
              <button onClick={() => setShowTaxInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl">
                <div className="text-sm text-slate-500">청구 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedBilling.room_number}호 | {selectedBilling.company_name}
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {formatCurrency(selectedBilling.amount)}
                </div>
              </div>

              <div>
                <label className="label">발행일</label>
                <input
                  type="date"
                  value={taxInvoiceForm.issue_date}
                  onChange={(e) => setTaxInvoiceForm(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">세금계산서 번호 (선택)</label>
                <input
                  type="text"
                  value={taxInvoiceForm.invoice_number}
                  onChange={(e) => setTaxInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="input"
                  placeholder="세금계산서 번호를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowTaxInvoiceModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleTaxInvoice}
                className="btn-primary flex-1"
              >
                발행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1회성 수입 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                🎯 {addType === '회의실' ? '회의실' : addType === '1day' ? '1day' : '기타'} 사용 등록
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {addType === '회의실' && meetingRooms.length > 0 && (
                <div>
                  <label className="label">회의실 선택</label>
                  <select
                    value={addForm.room_id}
                    onChange={(e) => setAddForm(prev => ({ ...prev, room_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">선택 안함</option>
                    {meetingRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addType === '1day' && hotDesks.length > 0 && (
                <div>
                  <label className="label">자유석 선택</label>
                  <select
                    value={addForm.room_id}
                    onChange={(e) => setAddForm(prev => ({ ...prev, room_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">선택 안함</option>
                    {hotDesks.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">사용자/업체명</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="사용자 또는 업체명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">금액 (VAT 포함) *</label>
                  <input
                    type="number"
                    value={addForm.amount}
                    onChange={(e) => {
                      const amount = parseInt(e.target.value) || 0;
                      const vat = Math.round(amount - amount / 1.1);
                      setAddForm(prev => ({ ...prev, amount: e.target.value, vat_amount: vat.toString() }));
                    }}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">VAT (자동계산)</label>
                  <input
                    type="number"
                    value={addForm.vat_amount}
                    readOnly
                    className="input bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">사용일 *</label>
                  <input
                    type="date"
                    value={addForm.transaction_date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">결제 방법</label>
                  <select
                    value={addForm.payment_method}
                    onChange={(e) => setAddForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="input"
                  >
                    <option value="계좌이체">계좌이체</option>
                    <option value="카드">카드</option>
                    <option value="현금">현금</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">메모 (선택)</label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  placeholder="메모를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleAddIncome}
                className="btn-primary flex-1"
                disabled={!addForm.amount || !addForm.transaction_date}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 트랜잭션 세금계산서 발행 모달 */}
      {showTransactionTaxModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                세금계산서 발행
              </h3>
              <button onClick={() => setShowTransactionTaxModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl">
                <div className="text-sm text-slate-500">거래 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedTransaction.room_number || '-'} | {selectedTransaction.company_name || '-'}
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {formatCurrency(selectedTransaction.amount)}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {selectedTransaction.category} | {format(new Date(selectedTransaction.transaction_date), 'yyyy.MM.dd')}
                </div>
              </div>

              <div>
                <label className="label">발행일</label>
                <input
                  type="date"
                  value={transactionTaxForm.issue_date}
                  onChange={(e) => setTransactionTaxForm(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">세금계산서 번호 (선택)</label>
                <input
                  type="text"
                  value={transactionTaxForm.invoice_number}
                  onChange={(e) => setTransactionTaxForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="input"
                  placeholder="세금계산서 번호를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowTransactionTaxModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleTransactionTaxInvoice}
                className="btn-primary flex-1"
              >
                발행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing 수정 모달 (호실별 임대료 입금내역 수정) */}
      {showBillingEditModal && selectedBilling && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                ✏️ 입금내역 수정
              </h3>
              <button onClick={() => setShowBillingEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm text-slate-500">청구 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedBilling.room_number}호 | {selectedBilling.company_name}
                </div>
                <div className="text-lg font-bold text-slate-700">
                  {formatCurrency(selectedBilling.amount)}
                </div>
              </div>

              <div>
                <label className="label">상태</label>
                <select
                  value={billingEditForm.status}
                  onChange={(e) => setBillingEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="input"
                >
                  <option value="완료">✅ 입금 완료</option>
                  <option value="대기">⏳ 대기</option>
                  <option value="연체">🚨 연체</option>
                </select>
              </div>

              {billingEditForm.status === '완료' && (
                <>
                  <div>
                    <label className="label">입금일</label>
                    <input
                      type="date"
                      value={billingEditForm.payment_date}
                      onChange={(e) => setBillingEditForm(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">결제 방법</label>
                    <select
                      value={billingEditForm.payment_method}
                      onChange={(e) => setBillingEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="input"
                    >
                      <option value="계좌이체">계좌이체</option>
                      <option value="카드">카드</option>
                      <option value="현금">현금</option>
                      <option value="자동이체">자동이체</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="label">메모</label>
                <input
                  type="text"
                  value={billingEditForm.notes}
                  onChange={(e) => setBillingEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  placeholder="메모를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowBillingEditModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleBillingEdit}
                className="btn-primary flex-1"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 트랜잭션 수정 모달 (입금확인내역 수정) */}
      {showTransactionEditModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                ✏️ 입금내역 수정
              </h3>
              <button onClick={() => setShowTransactionEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm text-slate-500">거래 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedTransaction.room_number || '-'} | {selectedTransaction.company_name || '-'}
                </div>
                <div className="text-sm text-slate-500">
                  {selectedTransaction.category}
                </div>
              </div>

              <div>
                <label className="label">입금일</label>
                <input
                  type="date"
                  value={transactionEditForm.transaction_date}
                  onChange={(e) => setTransactionEditForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">금액</label>
                <input
                  type="number"
                  value={transactionEditForm.amount}
                  onChange={(e) => setTransactionEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">결제 방법</label>
                <select
                  value={transactionEditForm.payment_method}
                  onChange={(e) => setTransactionEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="input"
                >
                  <option value="계좌이체">계좌이체</option>
                  <option value="카드">카드</option>
                  <option value="현금">현금</option>
                  <option value="자동이체">자동이체</option>
                </select>
              </div>

              <div>
                <label className="label">메모</label>
                <input
                  type="text"
                  value={transactionEditForm.notes}
                  onChange={(e) => setTransactionEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  placeholder="메모를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowTransactionEditModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleTransactionEdit}
                className="btn-primary flex-1"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 보증금 입금 확인 모달 */}
      {showDepositConfirmModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                보증금 입금 확인
              </h3>
              <button onClick={() => setShowDepositConfirmModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl">
                <div className="text-sm text-slate-500">보증금 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedDeposit.room_number}호 | {selectedDeposit.company_name}
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(selectedDeposit.amount)}
                </div>
              </div>

              <div>
                <label className="label">입금일</label>
                <input
                  type="date"
                  value={depositConfirmForm.payment_date}
                  onChange={(e) => setDepositConfirmForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">결제 방법</label>
                <select
                  value={depositConfirmForm.payment_method}
                  onChange={(e) => setDepositConfirmForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="input"
                >
                  <option value="계좌이체">계좌이체</option>
                  <option value="카드">카드</option>
                  <option value="현금">현금</option>
                </select>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositConfirmForm.issue_tax_invoice}
                    onChange={(e) => setDepositConfirmForm(prev => ({ ...prev, issue_tax_invoice: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-medium text-slate-700">📄 세금계산서 발행</span>
                </label>
                
                {depositConfirmForm.issue_tax_invoice && (
                  <div className="space-y-3 pt-2 border-t border-indigo-200">
                    <div>
                      <label className="label text-slate-700">발행일</label>
                      <input
                        type="date"
                        value={depositConfirmForm.tax_invoice_date}
                        onChange={(e) => setDepositConfirmForm(prev => ({ ...prev, tax_invoice_date: e.target.value }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label text-slate-700">세금계산서 번호 (선택)</label>
                      <input
                        type="text"
                        value={depositConfirmForm.tax_invoice_number}
                        onChange={(e) => setDepositConfirmForm(prev => ({ ...prev, tax_invoice_number: e.target.value }))}
                        className="input"
                        placeholder="세금계산서 번호"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowDepositConfirmModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleDepositConfirm}
                className="btn-primary flex-1"
              >
                입금 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 합계 계산 하단 바 */}
      {calcSelectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-teal-400 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-teal-600" />
              <span className="font-medium text-slate-700">
                {calcSelectedCount}건 선택
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(calcTotal)}
              </span>
              {calcSelectedCount > 0 && (
                <button
                  onClick={() => setCalcSelections({})}
                  className="btn-secondary text-sm"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 보증금 → 사용료 전환 모달 */}
      {showConversionModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-coral-500" />
                보증금 → 사용료 전환
              </h3>
              <button onClick={() => setShowConversionModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-coral-50 rounded-xl">
                <div className="text-sm text-slate-500">전환 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedDeposit.room_number}호 | {selectedDeposit.company_name}
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(selectedDeposit.amount)}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  계약기간: {selectedDeposit.contract_start_date ? format(new Date(selectedDeposit.contract_start_date), 'yy.MM.dd') : '-'} ~ {selectedDeposit.contract_end_date ? format(new Date(selectedDeposit.contract_end_date), 'yy.MM.dd') : '-'}
                </div>
              </div>

              {/* 세금계산서 정보 표시 (기존 발행 정보) */}
              {selectedDeposit.tax_invoice_issued && (
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <FileText className="w-4 h-4" />
                    세금계산서 발행됨
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    발행일: {selectedDeposit.tax_invoice_date ? format(new Date(selectedDeposit.tax_invoice_date), 'yyyy.MM.dd') : '-'}
                    {selectedDeposit.tax_invoice_number && ` | 번호: ${selectedDeposit.tax_invoice_number}`}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    * 보증금 입금 시 발행된 세금계산서 정보가 유지됩니다.
                  </div>
                </div>
              )}

              <div>
                <label className="label">전환일</label>
                <input
                  type="date"
                  value={conversionForm.conversion_date}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, conversion_date: e.target.value }))}
                  className="input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  보통 계약 종료일 또는 마지막 납부일을 선택합니다.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-slate-700">
                  ⚠️ 전환 시 보증금이 해당 월 <strong>사용료 수입</strong>으로 인식됩니다.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowConversionModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleConversion}
                className="btn-primary flex-1"
              >
                사용료 전환 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
