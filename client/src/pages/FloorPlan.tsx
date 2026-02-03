import { useEffect, useState, useRef, MouseEvent } from 'react';
import { roomsApi, tenantsApi, contractsApi, billingsApi } from '../api';
import { Room, Tenant, Contract, Billing } from '../types';
import { X, Building2, User, Phone, Calendar, CreditCard, Mailbox, Move, Copy, Trash2, Plus, CheckCircle2, Clock, Gift, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type ViewTab = 'rooms' | 'postbox';

interface DragState {
  roomId: number;
  startX: number;
  startY: number;
  cardX: number;
  cardY: number;
  isDragging: boolean;
}

interface ResizeState {
  roomId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  isResizing: boolean;
}

export default function FloorPlan() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('rooms');
  const [terminationForm, setTerminationForm] = useState({
    type: '만기종료' as '만기종료' | '중도종료',
    reason: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [contractForm, setContractForm] = useState({
    tenant_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    rent_free_start: '',
    rent_free_end: '',
    monthly_rent_vat: '',
    monthly_rent: '',
    deposit: '',
    management_fee: '',
    payment_day: '10',
    new_tenant: false,
    company_name: '',
    representative_name: '',
    business_number: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // 마우스 이벤트 핸들러
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (dragState?.isDragging && canvasRef.current) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        
        const newX = Math.max(0, Math.min(dragState.cardX + dx, 1620));
        const newY = Math.max(0, Math.min(dragState.cardY + dy, 1000));
        
        setRooms(prev => prev.map(r => 
          r.id === dragState.roomId 
            ? { ...r, card_x: newX, card_y: newY }
            : r
        ));
      }
      
      if (resizeState?.isResizing) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        
        const newWidth = Math.max(140, resizeState.startWidth + dx);
        const newHeight = Math.max(80, resizeState.startHeight + dy);
        
        setRooms(prev => prev.map(r => 
          r.id === resizeState.roomId 
            ? { ...r, card_width: newWidth, card_height: newHeight }
            : r
        ));
      }
    };

    const handleMouseUp = async () => {
      if (dragState?.isDragging) {
        const room = rooms.find(r => r.id === dragState.roomId);
        if (room) {
          await roomsApi.updateCard(dragState.roomId, {
            card_x: room.card_x ?? 0,
            card_y: room.card_y ?? 0,
            card_width: room.card_width ?? 180,
            card_height: room.card_height ?? 100
          });
        }
        setDragState(null);
      }
      
      if (resizeState?.isResizing) {
        const room = rooms.find(r => r.id === resizeState.roomId);
        if (room) {
          await roomsApi.updateCard(resizeState.roomId, {
            card_x: room.card_x ?? 0,
            card_y: room.card_y ?? 0,
            card_width: room.card_width ?? 180,
            card_height: room.card_height ?? 100
          });
        }
        setResizeState(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, rooms]);

  const loadData = async () => {
    try {
      const currentYearMonth = format(new Date(), 'yyyy-MM');
      const [roomsRes, contractsRes, tenantsRes, billingsRes] = await Promise.all([
        roomsApi.getAll(),
        contractsApi.getAll(true),
        tenantsApi.getAll(),
        billingsApi.getAll({ year_month: currentYearMonth })
      ]);
      setRooms(roomsRes.data);
      setContracts(contractsRes.data);
      setTenants(tenantsRes.data);
      setBillings(billingsRes.data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 호실의 이번 달 입금 상태 확인
  const getRoomBillingStatus = (roomId: number) => {
    const roomBillings = billings.filter(b => b.room_id === roomId);
    if (roomBillings.length === 0) return null;
    
    const allPaid = roomBillings.every(b => b.status === '완료');
    const anyPending = roomBillings.some(b => b.status === '대기');
    
    if (allPaid) return 'paid';
    if (anyPending) return 'pending';
    return null;
  };

  // 호실이 렌트프리 기간인지 확인
  const isRentFreePeriod = (room: Room) => {
    const contract = contracts.find(c => c.room_id === room.id && c.is_active);
    if (!contract?.rent_free_start || !contract?.rent_free_end) return false;
    
    const today = new Date();
    const rentFreeStart = new Date(contract.rent_free_start);
    const rentFreeEnd = new Date(contract.rent_free_end);
    
    return today >= rentFreeStart && today <= rentFreeEnd;
  };

  const handleVatIncludedChange = (value: string) => {
    const vatIncluded = parseInt(value) || 0;
    const vatExcluded = Math.round(vatIncluded / 1.1);
    setContractForm(prev => ({
      ...prev,
      monthly_rent_vat: value,
      monthly_rent: vatExcluded.toString()
    }));
  };

  const handleRoomClick = (room: Room) => {
    // 드래그/리사이즈 중이면 클릭 무시
    if (dragState?.isDragging || resizeState?.isResizing) return;
    
    setSelectedRoom(room);
    setShowModal(true);
    setContractForm(prev => ({
      ...prev,
      monthly_rent_vat: '',
      monthly_rent: '',
      tenant_id: '',
      new_tenant: false
    }));
  };

  const handleDragStart = (e: MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      roomId: room.id,
      startX: e.clientX,
      startY: e.clientY,
      cardX: room.card_x ?? room.position_x ?? 0,
      cardY: room.card_y ?? room.position_y ?? 0,
      isDragging: true
    });
  };

  const handleResizeStart = (e: MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizeState({
      roomId: room.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: room.card_width ?? 180,
      startHeight: room.card_height ?? 100,
      isResizing: true
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRoom(null);
  };

  const openContractModal = () => {
    setIsEditMode(false);
    setShowContractModal(true);
  };

  const openEditModal = () => {
    if (!selectedRoom || selectedRoom.status !== '입주') return;
    
    // 기존 데이터를 폼에 로드
    setContractForm({
      tenant_id: selectedRoom.tenant_id?.toString() || '',
      start_date: selectedRoom.start_date ? format(new Date(selectedRoom.start_date), 'yyyy-MM-dd') : '',
      end_date: selectedRoom.end_date ? format(new Date(selectedRoom.end_date), 'yyyy-MM-dd') : '',
      rent_free_start: '',
      rent_free_end: '',
      monthly_rent_vat: selectedRoom.monthly_rent_vat?.toString() || '',
      monthly_rent: selectedRoom.monthly_rent?.toString() || '',
      deposit: selectedRoom.deposit?.toString() || '',
      management_fee: selectedRoom.management_fee?.toString() || '',
      payment_day: selectedRoom.payment_day?.toString() || '10',
      new_tenant: false,
      company_name: selectedRoom.company_name || '',
      representative_name: selectedRoom.representative_name || '',
      business_number: selectedRoom.business_number || '',
      email: selectedRoom.email || '',
      phone: selectedRoom.phone || ''
    });
    setIsEditMode(true);
    setShowContractModal(true);
  };

  const closeContractModal = () => {
    setShowContractModal(false);
    setIsEditMode(false);
    setContractForm({
      tenant_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      rent_free_start: '',
      rent_free_end: '',
      monthly_rent_vat: '',
      monthly_rent: '',
      deposit: '',
      management_fee: '',
      payment_day: '10',
      new_tenant: false,
      company_name: '',
      representative_name: '',
      business_number: '',
      email: '',
      phone: ''
    });
  };

  // 카드 복사 (동일한 입주사 정보로 새 카드 생성)
  const handleCopyCard = async (e: MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!room.company_name) {
      alert('공실은 복사할 수 없습니다.');
      return;
    }

    // 빈 호실 찾기
    const emptyRoom = rooms.find(r => r.status === '공실' && r.room_type !== '회의실' && r.room_type !== '자유석');
    
    if (!emptyRoom) {
      alert('복사할 수 있는 빈 호실이 없습니다.');
      return;
    }

    if (!confirm(`"${room.company_name}" 입주사를 ${emptyRoom.room_number}호에 복사하시겠습니까?`)) {
      return;
    }

    try {
      // 원본 계약 정보 가져오기
      const originalContract = contracts.find(c => c.room_id === room.id && c.is_active);
      
      if (!originalContract) {
        alert('원본 계약 정보를 찾을 수 없습니다.');
        return;
      }

      // 새 계약 생성 (새 위치에)
      const newX = (emptyRoom.card_x ?? emptyRoom.position_x ?? 0) + 20;
      const newY = (emptyRoom.card_y ?? emptyRoom.position_y ?? 0) + 20;

      await contractsApi.create({
        room_id: emptyRoom.id,
        tenant_id: originalContract.tenant_id,
        start_date: originalContract.start_date,
        end_date: originalContract.end_date,
        rent_free_start: originalContract.rent_free_start,
        rent_free_end: originalContract.rent_free_end,
        monthly_rent: originalContract.monthly_rent,
        monthly_rent_vat: originalContract.monthly_rent_vat,
        deposit: originalContract.deposit,
        management_fee: originalContract.management_fee,
        card_x: newX,
        card_y: newY
      });

      alert(`${emptyRoom.room_number}호에 복사되었습니다.`);
      await loadData();
    } catch (error) {
      console.error('카드 복사 오류:', error);
      alert('카드 복사에 실패했습니다.');
    }
  };

  // 카드 삭제 모달 열기
  const handleDeleteCard = (e: MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();

    if (!room.company_name) {
      alert('공실은 삭제할 수 없습니다.');
      return;
    }

    setSelectedRoom(room);
    setDeleteMode('soft');
    setShowDeleteModal(true);
  };

  // 삭제 모달 닫기
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteMode('soft');
  };

  // 계약 삭제 실행
  const handleDeleteContract = async () => {
    if (!selectedRoom) return;

    const activeContract = contracts.find(c => c.room_id === selectedRoom.id && c.is_active);
    if (!activeContract) {
      alert('활성 계약을 찾을 수 없습니다.');
      return;
    }

    try {
      await contractsApi.delete(activeContract.id, deleteMode);
      await loadData();
      closeDeleteModal();
      closeModal();

      if (deleteMode === 'hard') {
        alert('계약이 완전히 삭제되었습니다.\n관련 거래내역도 함께 삭제되었습니다.');
      } else {
        alert('계약이 취소되고 공실로 전환되었습니다.\n기록은 보존됩니다.');
      }
    } catch (error) {
      console.error('계약 삭제 오류:', error);
      alert('계약 삭제에 실패했습니다.');
    }
  };

  const handleCreateContract = async () => {
    if (!selectedRoom) return;

    try {
      let tenantId = contractForm.tenant_id;

      if (contractForm.new_tenant) {
        const tenantRes = await tenantsApi.create({
          company_name: contractForm.company_name,
          representative_name: contractForm.representative_name,
          business_number: contractForm.business_number,
          email: contractForm.email,
          phone: contractForm.phone,
          tenant_type: selectedRoom.room_type === 'POST BOX' ? '비상주' : '상주'
        });
        tenantId = tenantRes.data.id;
      }

      await contractsApi.create({
        room_id: selectedRoom.id,
        tenant_id: parseInt(tenantId),
        start_date: contractForm.start_date,
        end_date: contractForm.end_date,
        rent_free_start: contractForm.rent_free_start || null,
        rent_free_end: contractForm.rent_free_end || null,
        monthly_rent: parseInt(contractForm.monthly_rent) || 0,
        monthly_rent_vat: parseInt(contractForm.monthly_rent_vat) || 0,
        deposit: parseInt(contractForm.deposit) || 0,
        management_fee: parseInt(contractForm.management_fee) || 0,
        payment_day: parseInt(contractForm.payment_day) || 10
      });

      await loadData();
      closeContractModal();
      closeModal();
      alert('계약이 등록되었습니다.');
    } catch (error) {
      console.error('계약 등록 실패:', error);
      alert('계약 등록에 실패했습니다.');
    }
  };

  const handleUpdateContract = async () => {
    if (!selectedRoom || !selectedRoom.contract_id || !selectedRoom.tenant_id) return;

    try {
      // 입주사 정보 업데이트
      await tenantsApi.update(selectedRoom.tenant_id, {
        company_name: contractForm.company_name,
        representative_name: contractForm.representative_name,
        business_number: contractForm.business_number,
        email: contractForm.email,
        phone: contractForm.phone
      });

      // 계약 정보 업데이트
      await contractsApi.update(selectedRoom.contract_id, {
        start_date: contractForm.start_date,
        end_date: contractForm.end_date,
        monthly_rent: parseInt(contractForm.monthly_rent) || 0,
        monthly_rent_vat: parseInt(contractForm.monthly_rent_vat) || 0,
        deposit: parseInt(contractForm.deposit) || 0,
        management_fee: parseInt(contractForm.management_fee) || 0,
        payment_day: parseInt(contractForm.payment_day) || 10
      });

      await loadData();
      closeContractModal();
      closeModal();
      alert('정보가 수정되었습니다.');
    } catch (error) {
      console.error('정보 수정 실패:', error);
      alert('정보 수정에 실패했습니다.');
    }
  };

  const openTerminateModal = () => {
    setTerminationForm({ type: '만기종료', reason: '' });
    setShowTerminateModal(true);
  };

  const closeTerminateModal = () => {
    setShowTerminateModal(false);
    setTerminationForm({ type: '만기종료', reason: '' });
  };

  const handleTerminateContract = async () => {
    if (!selectedRoom?.contract_id) return;

    try {
      // 계약 종료 (종료 유형 포함)
      const result = await contractsApi.terminate(selectedRoom.contract_id, {
        termination_type: terminationForm.type,
        termination_reason: terminationForm.reason || undefined
      });
      
      // 호실 상태를 '계약종료'로 변경하고 이전 입주사 정보 저장
      await roomsApi.updateStatus(selectedRoom.id, '계약종료', selectedRoom.company_name, selectedRoom.end_date);
      await loadData();
      closeTerminateModal();
      closeModal();
      
      if (terminationForm.type === '중도종료') {
        const penaltyAmount = selectedRoom.deposit || 0;
        if (penaltyAmount > 0) {
          alert(`계약이 종료되었습니다.\n\n종료유형: 중도종료\n위약금: ${formatCurrency(penaltyAmount)} (수입 등록됨)`);
        } else {
          alert(`계약이 종료되었습니다.\n\n종료유형: 중도종료\n위약금: 없음 (보증금 0원)`);
        }
      } else {
        alert(`계약이 종료되었습니다.\n\n종료유형: 만기종료\n보증금: 종료월 사용료로 차감`);
      }
    } catch (error) {
      console.error('계약 종료 실패:', error);
      alert('계약 종료에 실패했습니다.');
    }
  };

  const handleConvertToVacant = async () => {
    if (!selectedRoom) return;

    if (!confirm('공실로 전환하시겠습니까?')) return;

    try {
      await roomsApi.updateStatus(selectedRoom.id, '공실');
      await loadData();
      closeModal();
      alert('공실로 전환되었습니다.');
    } catch (error) {
      console.error('공실 전환 실패:', error);
      alert('공실 전환에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  // 호실 필터링
  const officeRooms = rooms.filter(r => r.room_type !== 'POST BOX');
  const postBoxes = rooms.filter(r => r.room_type === 'POST BOX').slice(0, 70);

  const activePostBoxContracts = contracts.filter(c => {
    const room = rooms.find(r => r.id === c.room_id);
    return room && room.room_type === 'POST BOX';
  });

  const roomStats = {
    total: officeRooms.filter(r => r.room_type !== '회의실' && r.room_type !== '자유석').length,
    occupied: officeRooms.filter(r => r.status === '입주' && r.room_type !== '회의실' && r.room_type !== '자유석').length,
    vacant: officeRooms.filter(r => r.status === '공실' && r.room_type !== '회의실' && r.room_type !== '자유석').length,
  };

  const postBoxStats = {
    total: postBoxes.length,
    occupied: postBoxes.filter(r => r.status === '입주').length,
    vacant: postBoxes.filter(r => r.status === '공실').length
  };

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
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === 'rooms' ? '3층 호실 현황' : 'POST BOX 현황'}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeTab === 'rooms' 
              ? '호실 카드를 드래그하여 배치하세요' 
              : '비상주 입주사용 우편함 (70개)'}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'rooms'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Building2 className="w-5 h-5" />
          호실 현황
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'rooms' ? 'bg-white/20' : 'bg-slate-100'
          }`}>
            {roomStats.occupied}/{roomStats.total}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('postbox')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'postbox'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Mailbox className="w-5 h-5" />
          POST BOX
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'postbox' ? 'bg-white/20' : 'bg-slate-100'
          }`}>
            {postBoxStats.occupied}/{postBoxStats.total}
          </span>
        </button>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span className="text-sm text-slate-600">
            입주 ({activeTab === 'rooms' ? roomStats.occupied : postBoxStats.occupied})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-300 rounded"></div>
          <span className="text-sm text-slate-600">
            공실 ({activeTab === 'rooms' ? roomStats.vacant : postBoxStats.vacant})
          </span>
        </div>
        {activeTab === 'rooms' && (
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <Move className="w-4 h-4 text-amber-600" />
            헤더를 드래그하여 이동, 우하단 모서리로 크기 조절
          </div>
        )}
      </div>

      {/* 호실 현황 캔버스 */}
      {activeTab === 'rooms' && (
        <div className="card p-4 overflow-auto">
          <div 
            ref={canvasRef}
            className="relative rounded-xl border-2 border-dashed border-slate-300" 
            style={{ 
              minWidth: '100%', 
              width: '1800px', 
              height: '1104px',
              backgroundColor: '#f8fafc',
              backgroundImage: `
                radial-gradient(circle, #cbd5e1 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          >
            {/* 모든 호실을 카드로 표시 */}
            {officeRooms.map((room) => {
              const cardX = room.card_x ?? room.position_x ?? 0;
              const cardY = room.card_y ?? room.position_y ?? 0;
              const cardWidth = room.card_width ?? 180;
              const cardHeight = room.card_height ?? 100;
              const isDragging = dragState?.roomId === room.id && dragState.isDragging;
              const isResizing = resizeState?.roomId === room.id && resizeState.isResizing;
              const isOccupied = room.status === '입주';
              const isContractEnded = room.status === '계약종료';
              const isVacant = room.status === '공실';

              // 상태별 색상 정의
              const getStatusColors = () => {
                if (isOccupied) {
                  return {
                    border: '#bfff00',
                    header: '#bfff00',
                    headerText: 'text-slate-900',
                    resize: '#a6e600',
                    priceColor: '#8fb300'
                  };
                }
                if (isContractEnded) {
                  return {
                    border: '#ff9500',
                    header: '#ff9500',
                    headerText: 'text-white',
                    resize: '#cc7600',
                    priceColor: '#cc7600'
                  };
                }
                return {
                  border: '#cbd5e1',
                  header: '#94a3b8',
                  headerText: 'text-white',
                  resize: '#94a3b8',
                  priceColor: '#64748b'
                };
              };

              const colors = getStatusColors();

              return (
                <div
                  key={room.id}
                  className={`absolute rounded-xl shadow-lg overflow-hidden flex flex-col transition-shadow ${
                    isDragging || isResizing ? 'shadow-2xl z-50' : 'z-10'
                  } bg-white border-2`}
                  style={{
                    borderColor: colors.border,
                    left: cardX,
                    top: cardY,
                    width: cardWidth,
                    height: cardHeight,
                    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s'
                  }}
                >
                  {/* 드래그 핸들 (헤더) */}
                  <div 
                    className={`px-2 py-1.5 flex items-center justify-between cursor-grab active:cursor-grabbing select-none ${colors.headerText}`}
                    style={{ backgroundColor: colors.header }}
                    onMouseDown={(e) => handleDragStart(e, room)}
                  >
                    <span className="font-bold text-sm">{room.room_number}호</span>
                    <div className="flex items-center gap-0.5">
                      {isOccupied && (
                        <>
                          <button
                            className="p-1 rounded hover:bg-black/10 transition-colors"
                            onClick={(e) => handleCopyCard(e, room)}
                            title="다른 호실로 복사"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                            onClick={(e) => handleDeleteCard(e, room)}
                            title="계약 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {isContractEnded && (
                        <button
                          className="p-1 rounded hover:bg-white/30 transition-colors"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('공실로 전환하시겠습니까?')) {
                              await roomsApi.updateStatus(room.id, '공실');
                              loadData();
                            }
                          }}
                          title="공실 전환"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isVacant && (
                        <button
                          className="p-1 rounded hover:bg-white/30 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRoomClick(room);
                          }}
                          title="입주 등록"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Move className="w-3.5 h-3.5 opacity-70 ml-1" />
                    </div>
                  </div>
                  
                  {/* 카드 내용 */}
                  <div 
                    className="p-2 flex-1 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden"
                    onClick={() => handleRoomClick(room)}
                  >
                    {isOccupied && room.company_name ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {room.company_name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {room.representative_name}
                        </div>
                        {room.monthly_rent_vat && (
                          <div className="text-sm font-bold" style={{ color: colors.priceColor }}>
                            {formatCurrency(room.monthly_rent_vat)}
                          </div>
                        )}
                        {room.start_date && room.end_date && (
                          <div className="text-xs text-slate-400">
                            {format(new Date(room.start_date), 'yy.MM.dd')} ~ {format(new Date(room.end_date), 'yy.MM.dd')}
                          </div>
                        )}
                        {/* 이번 달 입금 상태 */}
                        {(() => {
                          const billingStatus = getRoomBillingStatus(room.id);
                          const isRentFree = isRentFreePeriod(room);
                          
                          if (isRentFree) {
                            return (
                              <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full w-fit">
                                <Gift className="w-3 h-3" />
                                렌트프리
                              </div>
                            );
                          }
                          
                          if (billingStatus === 'paid') {
                            return (
                              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                {format(new Date(), 'M')}월 입금완료
                              </div>
                            );
                          }
                          
                          if (billingStatus === 'pending') {
                            return (
                              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full w-fit">
                                <Clock className="w-3 h-3" />
                                {format(new Date(), 'M')}월 미입금
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    ) : isContractEnded ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-orange-600">계약종료</div>
                        {room.last_company_name && (
                          <div className="text-xs text-slate-500 truncate">
                            전: {room.last_company_name}
                          </div>
                        )}
                        {room.contract_ended_at && (
                          <div className="text-xs text-slate-400">
                            {format(new Date(room.contract_ended_at), 'yy.MM.dd')} 종료
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm text-slate-400 text-center">공실</div>
                        {room.last_company_name && (
                          <div className="text-xs text-slate-400 truncate text-center">
                            전: {room.last_company_name}
                          </div>
                        )}
                        {room.contract_ended_at && (
                          <div className="text-xs text-slate-300 text-center">
                            {format(new Date(room.contract_ended_at), 'yy.MM.dd')} 종료
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 리사이즈 핸들 */}
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize rounded-tl-md hover:opacity-80"
                    style={{ backgroundColor: colors.resize }}
                    onMouseDown={(e) => handleResizeStart(e, room)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* POST BOX 도면 */}
      {activeTab === 'postbox' && (
        <div className="card p-8">
          <div className="bg-gradient-to-br from-violet-50 to-slate-50 rounded-xl p-6">
            <div className="grid grid-cols-10 gap-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
              {postBoxes.map((box) => {
                const boxContract = activePostBoxContracts.find(c => c.room_id === box.id);
                const formatContractPeriod = () => {
                  if (!boxContract) return null;
                  const start = format(new Date(boxContract.start_date), 'yy.MM');
                  const end = format(new Date(boxContract.end_date), 'yy.MM');
                  return `${start}~${end}`;
                };
                
                const isOccupied = box.status === '입주';
                const isContractEnded = box.status === '계약종료';

                return (
                  <div
                    key={box.id}
                    onClick={() => handleRoomClick(box)}
                    className={`rounded-lg cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-xs font-medium border-2 hover:scale-105 p-2 min-h-[80px] ${
                      isOccupied 
                        ? 'bg-violet-100 border-violet-400 text-violet-800' 
                        : isContractEnded
                        ? 'bg-orange-50 border-orange-400 text-orange-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
                    }`}
                    title={boxContract?.company_name || box.last_company_name || box.room_number}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Mailbox className={`w-3 h-3 ${
                        isOccupied ? 'text-violet-600' : 
                        isContractEnded ? 'text-orange-500' : 
                        'text-slate-400'
                      }`} />
                      <span className="text-[10px] font-bold">{box.room_number.replace('PB', '')}</span>
                    </div>
                    {isOccupied && boxContract && (
                      <>
                        <span className="text-[10px] font-semibold text-violet-700 truncate max-w-full">
                          {boxContract.company_name && boxContract.company_name.length > 6 
                            ? boxContract.company_name.slice(0, 6) + '..' 
                            : boxContract.company_name}
                        </span>
                        {(boxContract.monthly_rent_vat || boxContract.monthly_rent) && (
                          <span className="text-[9px] font-bold text-violet-600 mt-0.5">
                            {new Intl.NumberFormat('ko-KR').format(boxContract.monthly_rent_vat || boxContract.monthly_rent)}원
                          </span>
                        )}
                        <span className="text-[8px] text-violet-400 mt-0.5">
                          {formatContractPeriod()}
                        </span>
                      </>
                    )}
                    {isContractEnded && (
                      <>
                        <span className="text-[9px] text-orange-600 font-medium">계약종료</span>
                        {box.last_company_name && (
                          <span className="text-[9px] text-orange-400 truncate max-w-full">
                            전: {box.last_company_name.length > 4 ? box.last_company_name.slice(0, 4) + '..' : box.last_company_name}
                          </span>
                        )}
                      </>
                    )}
                    {box.status === '공실' && (
                      <>
                        <span className="text-[9px] text-slate-400">공실</span>
                        {box.last_company_name && (
                          <span className="text-[9px] text-slate-300 truncate max-w-full">
                            전: {box.last_company_name.length > 4 ? box.last_company_name.slice(0, 4) + '..' : box.last_company_name}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">📬 POST BOX 안내</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• 비상주 입주사를 위한 우편물 수령 서비스 (총 70개)</li>
                <li>• 계약기간별 사용료 (일시불)</li>
                <li>• 사업자등록증 주소지 사용 가능</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedRoom.room_type === 'POST BOX'
                    ? selectedRoom.status === '입주' ? 'bg-violet-100' : 'bg-slate-100'
                    : selectedRoom.status === '입주' ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  {selectedRoom.room_type === 'POST BOX' ? (
                    <Mailbox className={`w-6 h-6 ${
                      selectedRoom.status === '입주' ? 'text-violet-600' : 'text-slate-600'
                    }`} />
                  ) : (
                    <Building2 className={`w-6 h-6 ${
                      selectedRoom.status === '입주' ? 'text-green-600' : 'text-slate-600'
                    }`} />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRoom.room_type === 'POST BOX' 
                      ? `POST BOX ${selectedRoom.room_number.replace('PB', '')}` 
                      : `${selectedRoom.room_number}호`}
                  </h2>
                  <p className={`text-sm ${
                    selectedRoom.status === '입주' ? 'text-green-600' : 
                    selectedRoom.status === '계약종료' ? 'text-orange-500' : 
                    'text-slate-500'
                  }`}>
                    {selectedRoom.room_type} · {selectedRoom.status}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedRoom.status === '입주' && selectedRoom.company_name && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">
                    {selectedRoom.room_type === 'POST BOX' ? '비상주 입주사 정보' : '입주사 정보'}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{selectedRoom.company_name}</p>
                        <p className="text-sm text-slate-500">{selectedRoom.representative_name}</p>
                      </div>
                    </div>
                    
                    {selectedRoom.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <p className="text-slate-600">{selectedRoom.phone}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <p className="text-slate-600">
                        {selectedRoom.start_date && format(new Date(selectedRoom.start_date), 'yyyy.MM.dd', { locale: ko })}
                        {' ~ '}
                        {selectedRoom.end_date && format(new Date(selectedRoom.end_date), 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-slate-900 font-medium">
                          {formatCurrency(selectedRoom.monthly_rent_vat || selectedRoom.monthly_rent || 0)}
                          <span className="text-xs text-slate-400 ml-1">(VAT 포함)</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          VAT 제외: {formatCurrency(selectedRoom.monthly_rent || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 계약종료 상태 - 이전 입주사 정보 */}
              {selectedRoom.status === '계약종료' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-orange-600">계약종료 상태</h3>
                  <div className="p-4 bg-orange-50 rounded-xl space-y-2">
                    {selectedRoom.last_company_name && (
                      <p className="text-slate-700">
                        <span className="text-slate-500">이전 입주사:</span> {selectedRoom.last_company_name}
                      </p>
                    )}
                    {selectedRoom.contract_ended_at && (
                      <p className="text-slate-700">
                        <span className="text-slate-500">종료일:</span> {format(new Date(selectedRoom.contract_ended_at), 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    )}
                    <p className="text-sm text-orange-600 mt-2">
                      새 입주자를 등록하거나 공실로 전환하세요.
                    </p>
                  </div>
                </div>
              )}

              {/* 공실 상태 - 이전 입주사 정보 (있는 경우) */}
              {selectedRoom.status === '공실' && selectedRoom.last_company_name && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">이전 계약 정보</h3>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                    <p className="text-slate-600">
                      <span className="text-slate-400">이전 입주사:</span> {selectedRoom.last_company_name}
                    </p>
                    {selectedRoom.contract_ended_at && (
                      <p className="text-slate-600">
                        <span className="text-slate-400">종료일:</span> {format(new Date(selectedRoom.contract_ended_at), 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {selectedRoom.status === '공실' && (
                  <button onClick={openContractModal} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-white ${
                    selectedRoom.room_type === 'POST BOX' 
                      ? 'bg-violet-600 hover:bg-violet-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}>
                    {selectedRoom.room_type === 'POST BOX' ? '비상주 계약 등록' : '입주 계약 등록'}
                  </button>
                )}
                {selectedRoom.status === '입주' && (
                  <>
                    <button onClick={openEditModal} className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white bg-primary-600 hover:bg-primary-700">
                      정보 수정
                    </button>
                    <button onClick={openTerminateModal} className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white bg-orange-500 hover:bg-orange-600">
                      계약 종료
                    </button>
                    <button
                      onClick={() => {
                        setDeleteMode('soft');
                        setShowDeleteModal(true);
                      }}
                      className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white bg-red-500 hover:bg-red-600"
                    >
                      계약 삭제
                    </button>
                  </>
                )}
                {selectedRoom.status === '계약종료' && (
                  <>
                    <button onClick={openContractModal} className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white bg-primary-600 hover:bg-primary-700">
                      새 입주 등록
                    </button>
                    <button onClick={handleConvertToVacant} className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white bg-slate-500 hover:bg-slate-600">
                      공실 전환
                    </button>
                  </>
                )}
                <button onClick={closeModal} className="btn-secondary flex-1">
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계약 등록/수정 모달 */}
      {showContractModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode 
                  ? `${selectedRoom.room_number}호 정보 수정`
                  : selectedRoom.room_type === 'POST BOX' 
                    ? `POST BOX ${selectedRoom.room_number.replace('PB', '')} 비상주 계약 등록`
                    : `${selectedRoom.room_number}호 입주 계약 등록`}
              </h2>
              <button onClick={closeContractModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 수정 모드가 아닐 때만 입주사 선택 표시 */}
              {!isEditMode && (
              <div>
                <label className="label">
                  {selectedRoom.room_type === 'POST BOX' ? '비상주 입주사 선택' : '입주사 선택'}
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!contractForm.new_tenant}
                      onChange={() => setContractForm(prev => ({ ...prev, new_tenant: false }))}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-slate-700">기존 입주사</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={contractForm.new_tenant}
                      onChange={() => setContractForm(prev => ({ ...prev, new_tenant: true }))}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-slate-700">신규 입주사</span>
                  </label>
                </div>

                {!contractForm.new_tenant ? (
                  <select
                    value={contractForm.tenant_id}
                    onChange={(e) => setContractForm(prev => ({ ...prev, tenant_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">입주사를 선택하세요</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.company_name} ({tenant.representative_name})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <label className="label">회사명 *</label>
                      <input
                        type="text"
                        value={contractForm.company_name}
                        onChange={(e) => setContractForm(prev => ({ ...prev, company_name: e.target.value }))}
                        className="input"
                        placeholder="회사명"
                      />
                    </div>
                    <div>
                      <label className="label">대표자명 *</label>
                      <input
                        type="text"
                        value={contractForm.representative_name}
                        onChange={(e) => setContractForm(prev => ({ ...prev, representative_name: e.target.value }))}
                        className="input"
                        placeholder="대표자명"
                      />
                    </div>
                    <div>
                      <label className="label">사업자번호</label>
                      <input
                        type="text"
                        value={contractForm.business_number}
                        onChange={(e) => setContractForm(prev => ({ ...prev, business_number: e.target.value }))}
                        className="input"
                        placeholder="000-00-00000"
                      />
                    </div>
                    <div>
                      <label className="label">연락처</label>
                      <input
                        type="tel"
                        value={contractForm.phone}
                        onChange={(e) => setContractForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="input"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">이메일</label>
                      <input
                        type="email"
                        value={contractForm.email}
                        onChange={(e) => setContractForm(prev => ({ ...prev, email: e.target.value }))}
                        className="input"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 수정 모드일 때 입주사 정보 수정 */}
              {isEditMode && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h4 className="font-medium text-slate-900 mb-3">📋 입주사 정보</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">회사명 *</label>
                      <input
                        type="text"
                        value={contractForm.company_name}
                        onChange={(e) => setContractForm(prev => ({ ...prev, company_name: e.target.value }))}
                        className="input"
                        placeholder="회사명"
                      />
                    </div>
                    <div>
                      <label className="label">대표자명 *</label>
                      <input
                        type="text"
                        value={contractForm.representative_name}
                        onChange={(e) => setContractForm(prev => ({ ...prev, representative_name: e.target.value }))}
                        className="input"
                        placeholder="대표자명"
                      />
                    </div>
                    <div>
                      <label className="label">사업자번호</label>
                      <input
                        type="text"
                        value={contractForm.business_number}
                        onChange={(e) => setContractForm(prev => ({ ...prev, business_number: e.target.value }))}
                        className="input"
                        placeholder="000-00-00000"
                      />
                    </div>
                    <div>
                      <label className="label">연락처</label>
                      <input
                        type="tel"
                        value={contractForm.phone}
                        onChange={(e) => setContractForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="input"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">이메일</label>
                      <input
                        type="email"
                        value={contractForm.email}
                        onChange={(e) => setContractForm(prev => ({ ...prev, email: e.target.value }))}
                        className="input"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 유료 계약 기간 */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-slate-900 mb-3">💰 유료 계약 기간</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">시작일 *</label>
                    <input
                      type="date"
                      value={contractForm.start_date}
                      onChange={(e) => setContractForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">종료일 *</label>
                    <input
                      type="date"
                      value={contractForm.end_date}
                      onChange={(e) => setContractForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* 렌트프리 기간 - 신규 등록시에만 표시 */}
              {!isEditMode && (
              <div className="p-4 bg-amber-50 rounded-xl">
                <h4 className="font-medium text-slate-900 mb-3">🎁 렌트프리 기간 (선택)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">시작일</label>
                    <input
                      type="date"
                      value={contractForm.rent_free_start}
                      onChange={(e) => setContractForm(prev => ({ ...prev, rent_free_start: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">종료일</label>
                    <input
                      type="date"
                      value={contractForm.rent_free_end}
                      onChange={(e) => setContractForm(prev => ({ ...prev, rent_free_end: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              </div>
              )}

              <div className={`p-4 rounded-xl ${selectedRoom.room_type === 'POST BOX' ? 'bg-violet-50' : 'bg-green-50'}`}>
                <h4 className="font-medium text-slate-900 mb-3">
                  {selectedRoom.room_type === 'POST BOX' ? '💰 총 임대료 (일시불)' : '월 임대료'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">VAT 포함가 *</label>
                    <input
                      type="number"
                      value={contractForm.monthly_rent_vat}
                      onChange={(e) => handleVatIncludedChange(e.target.value)}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">VAT 제외가 (자동계산)</label>
                    <input
                      type="text"
                      value={contractForm.monthly_rent ? formatCurrency(parseInt(contractForm.monthly_rent)) : ''}
                      className="input bg-slate-100"
                      readOnly
                      placeholder="VAT 포함가 입력 시 자동 계산"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">보증금</label>
                  <input
                    type="number"
                    value={contractForm.deposit}
                    onChange={(e) => setContractForm(prev => ({ ...prev, deposit: e.target.value }))}
                    className="input"
                    placeholder="0"
                  />
                </div>
                {selectedRoom.room_type !== 'POST BOX' && (
                  <div>
                    <label className="label">관리비</label>
                    <input
                      type="number"
                      value={contractForm.management_fee}
                      onChange={(e) => setContractForm(prev => ({ ...prev, management_fee: e.target.value }))}
                      className="input"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {selectedRoom.room_type !== 'POST BOX' && (
                <div>
                  <label className="label">📅 납부일 (매월)</label>
                  <select
                    value={contractForm.payment_day}
                    onChange={(e) => setContractForm(prev => ({ ...prev, payment_day: e.target.value }))}
                    className="input"
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        매월 {i + 1}일
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {isEditMode ? (
                  <button onClick={handleUpdateContract} className="flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-white bg-primary-600 hover:bg-primary-700">
                    저장
                  </button>
                ) : (
                  <button onClick={handleCreateContract} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-white ${
                    selectedRoom.room_type === 'POST BOX' 
                      ? 'bg-violet-600 hover:bg-violet-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}>
                    계약 등록
                  </button>
                )}
                <button onClick={closeContractModal} className="btn-secondary flex-1">
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계약 종료 모달 */}
      {showTerminateModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {selectedRoom.room_number}호 계약 종료
              </h2>
              <button onClick={closeTerminateModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 현재 계약 정보 */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">입주사:</span> {selectedRoom.company_name}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">보증금:</span> {formatCurrency(selectedRoom.deposit || 0)}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">계약기간:</span> {selectedRoom.start_date && format(new Date(selectedRoom.start_date), 'yy.MM.dd')} ~ {selectedRoom.end_date && format(new Date(selectedRoom.end_date), 'yy.MM.dd')}
                </p>
              </div>

              {/* 종료 유형 선택 */}
              <div>
                <label className="label">종료 유형 *</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setTerminationForm(prev => ({ ...prev, type: '만기종료' }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      terminationForm.type === '만기종료'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">만기종료</p>
                    <p className="text-xs text-slate-500 mt-1">보증금 → 종료월 사용료</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminationForm(prev => ({ ...prev, type: '중도종료' }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      terminationForm.type === '중도종료'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">중도종료</p>
                    <p className="text-xs text-slate-500 mt-1">보증금 → 위약금 전환</p>
                  </button>
                </div>
              </div>

              {/* 중도종료 시 위약금 안내 */}
              {terminationForm.type === '중도종료' && (
                <div className={`p-4 rounded-xl border ${
                  selectedRoom.deposit
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  {selectedRoom.deposit ? (
                    <>
                      <p className="font-medium text-orange-800">💰 위약금 안내</p>
                      <p className="text-sm text-orange-700 mt-1">
                        보증금 {formatCurrency(selectedRoom.deposit)}이 위약금으로 전환되며,
                        이번 달 수입에 자동 반영됩니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-slate-700">ℹ️ 위약금 없음</p>
                      <p className="text-sm text-slate-600 mt-1">
                        보증금이 0원이므로 위약금이 발생하지 않습니다.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* 종료 사유 */}
              <div>
                <label className="label">종료 사유 (선택)</label>
                <textarea
                  value={terminationForm.reason}
                  onChange={(e) => setTerminationForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="종료 사유를 입력하세요"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleTerminateContract}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white ${
                    terminationForm.type === '중도종료'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {terminationForm.type === '중도종료' ? '중도종료 (위약금 발생)' : '만기종료'}
                </button>
                <button onClick={closeTerminateModal} className="btn-secondary flex-1">
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계약 삭제 모달 */}
      {showDeleteModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  계약 삭제
                </h2>
              </div>
              <button onClick={closeDeleteModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 현재 계약 정보 */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">호실:</span> {selectedRoom.room_type === 'POST BOX'
                    ? `POST BOX ${selectedRoom.room_number.replace('PB', '')}`
                    : `${selectedRoom.room_number}호`}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">입주사:</span> {selectedRoom.company_name}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">계약기간:</span> {selectedRoom.start_date && format(new Date(selectedRoom.start_date), 'yy.MM.dd')} ~ {selectedRoom.end_date && format(new Date(selectedRoom.end_date), 'yy.MM.dd')}
                </p>
              </div>

              {/* 삭제 옵션 선택 */}
              <div>
                <label className="label">삭제 옵션 선택</label>
                <div className="space-y-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteMode('soft')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      deleteMode === 'soft'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        deleteMode === 'soft' ? 'border-blue-500' : 'border-slate-300'
                      }`}>
                        {deleteMode === 'soft' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">공실 전환 (기록 보존)</p>
                        <p className="text-xs text-slate-500 mt-1">
                          계약을 비활성화하고 호실을 공실로 전환합니다.<br />
                          이전 입주사 정보와 거래내역이 보존됩니다.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteMode('hard')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      deleteMode === 'hard'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        deleteMode === 'hard' ? 'border-red-500' : 'border-slate-300'
                      }`}>
                        {deleteMode === 'hard' && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">완전 삭제 (기록 삭제)</p>
                        <p className="text-xs text-slate-500 mt-1">
                          계약과 관련 거래내역을 완전히 삭제합니다.<br />
                          <span className="text-red-500 font-medium">⚠️ 이 작업은 복구할 수 없습니다.</span>
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 완전 삭제 경고 */}
              {deleteMode === 'hard' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">주의: 완전 삭제</p>
                      <p className="text-sm text-red-700 mt-1">
                        이 계약과 관련된 모든 거래내역(보증금, 청구 등)이 함께 삭제됩니다.
                        삭제된 데이터는 복구할 수 없습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleDeleteContract}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-white ${
                    deleteMode === 'hard'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {deleteMode === 'hard' ? '완전 삭제' : '공실 전환'}
                </button>
                <button onClick={closeDeleteModal} className="btn-secondary flex-1">
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
