import { useEffect, useState } from 'react';
import { billingsApi, transactionsApi, tenantsApi, roomsApi } from '../api';
import { Billing, Tenant, Room, Transaction } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Check, ChevronLeft, ChevronRight, Plus, RefreshCw, 
  Building2, CreditCard, AlertCircle, CheckCircle2, FileText, 
  CheckSquare, Square, X, AlertTriangle, Coffee, Mailbox, Wallet
} from 'lucide-react';

export default function Income() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
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
    notes: ''
  });

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

  const yearMonth = format(currentDate, 'yyyy-MM');
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, [yearMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [billingsRes, transactionsRes, specialTransactionsRes, tenantsRes, roomsRes] = await Promise.all([
        billingsApi.getAll({ year_month: yearMonth }),
        // 일반 수입 (1회성 사용 등) - transaction_date 기준
        transactionsApi.getAll({ type: '입금', start_date: monthStart, end_date: monthEnd }),
        // 비상주사용료, 위약금 - 계약 날짜 기준 필터링을 위해 전체 조회
        transactionsApi.getAll({ type: '입금', category: '비상주사용료,위약금' }),
        tenantsApi.getAll(),
        roomsApi.getAll()
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
      setSelectedIds([]);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 데이터 분류
  const pendingBillings = billings.filter(b => b.status === '대기');
  const completedBillings = billings.filter(b => b.status === '완료');
  
  // 해당월에 입금 대상인 호실 (입금일까지 계약이 유효한 호실)
  const occupiedRooms = rooms.filter(room => {
    // POST BOX, 회의실, 자유석 제외 (일반 호실만)
    if (room.room_type === 'POST BOX' || room.room_type === '회의실' || room.room_type === '자유석') {
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
  const pendingTotal = pendingBillings.reduce((sum, b) => sum + b.amount, 0);
  const completedBillingTotal = completedBillings.reduce((sum, b) => sum + b.amount, 0);
  const occupiedRoomsTotal = occupiedRooms.reduce((sum, r) => sum + (r.monthly_rent_vat || 0), 0);
  const postboxTotal = postboxIncome.reduce((sum, t) => sum + t.amount, 0);
  const penaltyTotal = penaltyIncome.reduce((sum, t) => sum + t.amount, 0);
  const depositConversionTotal = depositConversionIncome.reduce((sum, t) => sum + t.amount, 0);
  const oneTimeTotal = oneTimeIncome.reduce((sum, t) => sum + t.amount, 0);
  const otherTotal = otherIncome.reduce((sum, t) => sum + t.amount, 0);
  const totalExpected = occupiedRoomsTotal + postboxTotal + penaltyTotal + depositConversionTotal + oneTimeTotal + otherTotal;
  const totalCompleted = completedBillingTotal + postboxTotal + penaltyTotal + depositConversionTotal + oneTimeTotal + otherTotal;

  const handleGenerateBillings = async () => {
    if (!confirm(`${format(currentDate, 'yyyy년 M월', { locale: ko })} 청구를 생성하시겠습니까?`)) return;
    
    try {
      const result = await billingsApi.generate(yearMonth);
      alert(`${result.data.count}건의 청구가 생성되었습니다.`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || '청구 생성에 실패했습니다.');
    }
  };

  // 개별 호실 청구 생성
  const handleCreateSingleBilling = async (roomId: number, roomNumber: string) => {
    try {
      await billingsApi.createSingle(roomId, yearMonth);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || `${roomNumber}호 청구 생성에 실패했습니다.`);
    }
  };

  // 단건 입금 확인
  const handleConfirm = async () => {
    if (!selectedBilling) return;
    
    try {
      await billingsApi.confirm(selectedBilling.id, confirmForm);
      setShowConfirmModal(false);
      setSelectedBilling(null);
      resetConfirmForm();
      loadData();
    } catch (error) {
      console.error('입금 확인 오류:', error);
      alert('입금 확인에 실패했습니다.');
    }
  };

  // 일괄 입금 확인
  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) {
      alert('선택된 청구가 없습니다.');
      return;
    }
    
    try {
      const result = await billingsApi.confirmBulk({
        billing_ids: selectedIds,
        payment_date: confirmForm.payment_date,
        payment_method: confirmForm.payment_method
      });
      alert(result.data.message);
      setShowConfirmModal(false);
      resetConfirmForm();
      setSelectedIds([]);
      setBulkMode(false);
      loadData();
    } catch (error) {
      console.error('일괄 입금 확인 오류:', error);
      alert('일괄 입금 확인에 실패했습니다.');
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
      alert('세금계산서 발행 처리에 실패했습니다.');
    }
  };

  // 일괄 세금계산서 발행
  const handleBulkTaxInvoice = async () => {
    if (selectedIds.length === 0) {
      alert('선택된 청구가 없습니다.');
      return;
    }
    
    try {
      const result = await billingsApi.taxInvoiceBulk({
        billing_ids: selectedIds,
        issue_date: taxInvoiceForm.issue_date
      });
      alert(result.data.message);
      setShowTaxInvoiceModal(false);
      resetTaxInvoiceForm();
      setSelectedIds([]);
      setBulkMode(false);
      loadData();
    } catch (error) {
      console.error('일괄 세금계산서 발행 오류:', error);
      alert('일괄 세금계산서 발행에 실패했습니다.');
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
      alert('수입 등록에 실패했습니다.');
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
      alert('세금계산서 발행에 실패했습니다.');
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
      alert('거래 수정에 실패했습니다.');
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
        payment_date: billingEditForm.status === '완료' ? billingEditForm.payment_date : null,
        notes: billingEditForm.notes
      });
      setShowBillingEditModal(false);
      setSelectedBilling(null);
      loadData();
    } catch (error) {
      console.error('청구 수정 오류:', error);
      alert('청구 수정에 실패했습니다.');
    }
  };

  const resetConfirmForm = () => {
    setConfirmForm({
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '계좌이체',
      notes: ''
    });
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

  const openConfirmModal = (billing?: Billing) => {
    if (billing) {
      setSelectedBilling(billing);
      setBulkMode(false);
    } else {
      setBulkMode(true);
    }
    setShowConfirmModal(true);
  };

  const openTaxInvoiceModal = (billing?: Billing) => {
    if (billing) {
      setSelectedBilling(billing);
      setBulkMode(false);
    } else {
      setBulkMode(true);
    }
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

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (billings: Billing[]) => {
    const ids = billings.map(b => b.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedPendingCount = pendingBillings.filter(b => selectedIds.includes(b.id)).length;
  const meetingRooms = rooms.filter(r => r.room_type === '회의실');
  const hotDesks = rooms.filter(r => r.room_type === '자유석');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">💰 수입 관리</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBillings}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            청구 생성
          </button>
        </div>
      </div>

      {/* 월 선택 */}
      <div className="card p-4">
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 min-w-[150px] text-center">
            📅 {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-600 font-medium">입금 대기</p>
              <p className="text-2xl font-bold text-amber-700">{pendingBillings.length}건</p>
              <p className="text-sm text-amber-600">{formatCurrency(pendingTotal)}</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-100 border-green-300 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-semibold">💰 이달 실수입</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(totalCompleted)}</p>
              <p className="text-sm text-green-600">{completedBillings.length + postboxIncome.length + penaltyIncome.length + depositConversionIncome.length + oneTimeIncome.length}건 입금 완료</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">위약금/전환/기타</p>
              <p className="text-2xl font-bold text-orange-700">{penaltyIncome.length + depositConversionIncome.length + oneTimeIncome.length}건</p>
              <p className="text-sm text-orange-600">{formatCurrency(penaltyTotal + depositConversionTotal + oneTimeTotal)}</p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">이달 총 예상</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalExpected)}</p>
              <p className="text-sm text-blue-500">입주 {occupiedRooms.length}호실 기준</p>
            </div>
          </div>
        </div>
      </div>

      {/* 일괄 처리 버튼 */}
      {selectedPendingCount > 0 && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {selectedPendingCount}건 선택됨 ({formatCurrency(pendingBillings.filter(b => selectedIds.includes(b.id)).reduce((sum, b) => sum + b.amount, 0))})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openTaxInvoiceModal()}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                일괄 세금계산서
              </button>
              <button
                onClick={() => openConfirmModal()}
                className="btn btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                일괄 입금 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 호실별 임대료 */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 bg-amber-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            📋 호실별 임대료 ({occupiedRooms.length}개 호실 입주중)
          </h3>
          {pendingBillings.length > 0 && (
            <button
              onClick={() => toggleSelectAll(pendingBillings)}
              className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              {pendingBillings.every(b => selectedIds.includes(b.id)) ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  대기 전체 해제
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  대기 전체 선택
                </>
              )}
            </button>
          )}
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
                const { status: billingStatus, billing } = getRoomBillingStatus(room.id);
                const isPending = billingStatus === '대기';
                const isCompleted = billingStatus === '완료';
                const isNotGenerated = billingStatus === '미생성';
                
                // 연체 여부 확인 (납부기한 초과 && 미완료)
                const isOverdue = billing && isPending && new Date(billing.due_date) < new Date();
                
                // 상태 결정
                const getStatusInfo = () => {
                  if (isNotGenerated) return { label: '미청구', color: 'bg-slate-100 text-slate-600', icon: '⚪' };
                  if (isCompleted && billing?.tax_invoice_issued) return { label: '세금계산서', color: 'bg-purple-100 text-purple-700', icon: '📄' };
                  if (isCompleted) return { label: '완료', color: 'bg-green-100 text-green-700', icon: '✅' };
                  if (isOverdue) return { label: '연체', color: 'bg-red-100 text-red-700', icon: '🔴' };
                  if (isPending) return { label: '대기', color: 'bg-amber-100 text-amber-700', icon: '🟡' };
                  return { label: '-', color: 'bg-slate-100 text-slate-600', icon: '' };
                };
                
                const statusInfo = getStatusInfo();
                
                return (
                  <div key={room.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                    {/* 체크박스 - 대기 상태인 경우만 선택 가능 */}
                    {billing && isPending ? (
                      <button onClick={() => toggleSelect(billing.id)} className="p-1">
                        {selectedIds.includes(billing.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <div className="w-7" />
                    )}

                    <div className="flex-1 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isCompleted ? 'bg-green-100' : isOverdue ? 'bg-red-100' : isPending ? 'bg-amber-100' : 'bg-slate-100'
                      }`}>
                        <span className={`text-sm font-bold ${
                          isCompleted ? 'text-green-700' : isOverdue ? 'text-red-700' : isPending ? 'text-amber-700' : 'text-slate-500'
                        }`}>{room.room_number}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{room.company_name || '-'}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap">
                          <span>📅 매월 {room.payment_day || 10}일</span>
                          {isCompleted && billing?.payment_date && (
                            <span className="text-green-600">입금: {format(new Date(billing.payment_date), 'M/d')}</span>
                          )}
                          {(isPending || isOverdue) && billing?.due_date && (
                            <span className={isOverdue ? 'text-red-600' : 'text-amber-600'}>
                              납부기한: {format(new Date(billing.due_date), 'M/d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(room.monthly_rent_vat || 0)}</div>
                      </div>
                      
                      {/* 상태 뱃지 */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium min-w-[70px] justify-center ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                      
                      {/* 액션 버튼 */}
                      {isNotGenerated && (
                        <button
                          onClick={() => handleCreateSingleBilling(room.id, room.room_number)}
                          className="btn btn-secondary flex items-center gap-1 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          청구 생성
                        </button>
                      )}
                      
                      {(isPending || isOverdue) && billing && (
                        <div className="flex gap-1">
                          {!billing.tax_invoice_issued && (
                            <button
                              onClick={() => openTaxInvoiceModal(billing)}
                              className="btn btn-secondary text-xs px-2 py-1"
                              title="세금계산서 발행"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openConfirmModal(billing)}
                            className={`btn flex items-center gap-1 ${isOverdue ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-primary'}`}
                          >
                            <Check className="w-4 h-4" />
                            입금 확인
                          </button>
                        </div>
                      )}
                      
                      {isCompleted && billing && (
                        <div className="flex gap-1">
                          {!billing.tax_invoice_issued && (
                            <button
                              onClick={() => openTaxInvoiceModal(billing)}
                              className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600"
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
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* 📬 비상주 사용료 (POST BOX) */}
      {postboxIncome.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200 bg-violet-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Mailbox className="w-5 h-5 text-violet-600" />
              📬 비상주 사용료 ({postboxIncome.length}건)
              <span className="text-sm font-normal text-violet-600 ml-2">* 계약 시작월 자동 생성</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {postboxIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Mailbox className="w-6 h-6 text-violet-600" />
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
                  <span className="font-bold text-violet-600">{formatCurrency(transaction.amount)}</span>
                  {transaction.tax_invoice_issued ? (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      세금계산서
                    </span>
                  ) : (
                    <button
                      onClick={() => openTransactionTaxModal(transaction)}
                      className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600"
                      title="세금계산서 발행"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openTransactionEditModal(transaction)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
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
              <span className="text-sm font-normal text-orange-600 ml-2">* 중도종료 시 자동 생성</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {penaltyIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
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
                  <span className="font-bold text-orange-600">{formatCurrency(transaction.amount)}</span>
                  {transaction.tax_invoice_issued ? (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      세금계산서
                    </span>
                  ) : (
                    <button
                      onClick={() => openTransactionTaxModal(transaction)}
                      className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600"
                      title="세금계산서 발행"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openTransactionEditModal(transaction)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
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
          <div className="p-4 border-b border-slate-200 bg-teal-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-teal-600" />
              🔄 사용료전환 ({depositConversionIncome.length}건)
              <span className="text-sm font-normal text-teal-600 ml-2">* 만기종료 시 보증금→사용료 전환</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {depositConversionIncome.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-teal-600" />
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
                  <span className="font-bold text-teal-600">{formatCurrency(transaction.amount)}</span>
                  {transaction.tax_invoice_issued ? (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      <FileText className="w-3 h-3 mr-1" />
                      세금계산서
                    </span>
                  ) : (
                    <button
                      onClick={() => openTransactionTaxModal(transaction)}
                      className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600"
                      title="세금계산서 발행"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openTransactionEditModal(transaction)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
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
              className="btn btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              회의실
            </button>
            <button
              onClick={() => openAddModal('1day')}
              className="btn btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              1day
            </button>
            <button
              onClick={() => openAddModal('기타')}
              className="btn btn-secondary text-sm flex items-center gap-1"
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
                  <span className="font-bold text-cyan-600">{formatCurrency(transaction.amount)}</span>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    완료
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 📈 월별 수입 요약 */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            📈 {format(currentDate, 'M월', { locale: ko })} 수입 요약
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {/* 호실별 임대료 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className="text-slate-700">호실별 임대료 (완료)</span>
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(completedBillingTotal)}</span>
            </div>
            
            {/* 비상주 사용료 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-violet-400"></div>
                <span className="text-slate-700">비상주 사용료</span>
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(postboxTotal)}</span>
            </div>
            
            {/* 위약금 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className="text-slate-700">위약금 (중도종료)</span>
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(penaltyTotal)}</span>
            </div>
            
            {/* 사용료전환 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-400"></div>
                <span className="text-slate-700">사용료전환 (만기종료)</span>
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(depositConversionTotal)}</span>
            </div>
            
            {/* 1회성 사용 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                <span className="text-slate-700">1회성 사용 (회의실/1day)</span>
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(oneTimeTotal)}</span>
            </div>
            
            {/* 기타 */}
            {otherTotal > 0 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-slate-700">기타 수입</span>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(otherTotal)}</span>
              </div>
            )}
            
            {/* 구분선 */}
            <div className="border-t border-slate-200 my-2"></div>
            
            {/* 총 실제 수입 */}
            <div className="flex items-center justify-between py-3 bg-green-50 -mx-6 px-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">💰 총 실제 수입</span>
              </div>
              <span className="text-xl font-bold text-green-700">{formatCurrency(totalCompleted)}</span>
            </div>
            
            {/* 입금 대기 */}
            <div className="flex items-center justify-between py-3 bg-amber-50 -mx-6 px-6 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">⏳ 입금 대기</span>
              </div>
              <span className="text-lg font-bold text-amber-700">{formatCurrency(pendingTotal)}</span>
            </div>
            
            {/* 총 예상 */}
            <div className="flex items-center justify-between py-3 bg-blue-50 -mx-6 px-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">📊 이달 총 예상</span>
              </div>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(totalExpected)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 입금 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {bulkMode ? `일괄 입금 확인 (${selectedPendingCount}건)` : '입금 확인'}
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!bulkMode && selectedBilling && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">청구 정보</div>
                  <div className="font-medium text-slate-900">
                    {selectedBilling.room_number}호 | {selectedBilling.company_name}
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#8fb300' }}>
                    {formatCurrency(selectedBilling.amount)}
                  </div>
                </div>
              )}

              {bulkMode && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm text-blue-600">선택된 청구</div>
                  <div className="font-bold text-blue-700">{selectedPendingCount}건</div>
                  <div className="text-lg font-bold text-blue-800">
                    {formatCurrency(pendingBillings.filter(b => selectedIds.includes(b.id)).reduce((sum, b) => sum + b.amount, 0))}
                  </div>
                </div>
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

              {!bulkMode && (
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
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={bulkMode ? handleBulkConfirm : handleConfirm}
                className="btn btn-primary flex-1"
              >
                {bulkMode ? `${selectedPendingCount}건 입금 확인` : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세금계산서 발행 모달 */}
      {showTaxInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                {bulkMode ? `일괄 세금계산서 발행 (${selectedPendingCount}건)` : '세금계산서 발행'}
              </h3>
              <button onClick={() => setShowTaxInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!bulkMode && selectedBilling && (
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-sm text-purple-600">청구 정보</div>
                  <div className="font-medium text-slate-900">
                    {selectedBilling.room_number}호 | {selectedBilling.company_name}
                  </div>
                  <div className="text-lg font-bold text-purple-700">
                    {formatCurrency(selectedBilling.amount)}
                  </div>
                </div>
              )}

              {bulkMode && (
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-sm text-purple-600">선택된 청구</div>
                  <div className="font-bold text-purple-700">{selectedPendingCount}건</div>
                </div>
              )}

              <div>
                <label className="label">발행일</label>
                <input
                  type="date"
                  value={taxInvoiceForm.issue_date}
                  onChange={(e) => setTaxInvoiceForm(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="input"
                />
              </div>

              {!bulkMode && (
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
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowTaxInvoiceModal(false)}
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={bulkMode ? handleBulkTaxInvoice : handleTaxInvoice}
                className="btn btn-primary flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {bulkMode ? `${selectedPendingCount}건 발행` : '발행'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1회성 수입 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleAddIncome}
                className="btn btn-primary flex-1"
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
                <FileText className="w-5 h-5 text-purple-600" />
                세금계산서 발행
              </h3>
              <button onClick={() => setShowTransactionTaxModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="text-sm text-purple-600">거래 정보</div>
                <div className="font-medium text-slate-900">
                  {selectedTransaction.room_number || '-'} | {selectedTransaction.company_name || '-'}
                </div>
                <div className="text-lg font-bold text-purple-700">
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
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleTransactionTaxInvoice}
                className="btn btn-primary flex-1 bg-purple-600 hover:bg-purple-700"
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
                <div className="text-lg font-bold" style={{ color: '#8fb300' }}>
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
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleBillingEdit}
                className="btn btn-primary flex-1"
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
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleTransactionEdit}
                className="btn btn-primary flex-1"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
