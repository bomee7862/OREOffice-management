import { useEffect, useState, useRef } from 'react';
import { tenantsApi, roomsApi, contractsApi, uploadsApi } from '../api';
import { Tenant, Room, Document as DocType, TenantType, DocumentType } from '../types';
import { Plus, Pencil, Trash2, X, Search, Building2, Upload, FileText, Download, Eye, User, Mailbox } from 'lucide-react';
import { format } from 'date-fns';

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'' | TenantType>('');
  const [filterRoom, setFilterRoom] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // 파일 업로드 관련
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [fileTypes, setFileTypes] = useState<DocumentType[]>([]);

  const [formData, setFormData] = useState({
    company_name: '',
    representative_name: '',
    business_number: '',
    email: '',
    phone: '',
    address: '',
    tenant_type: '상주' as TenantType,
    notes: '',
    // 계약 정보
    room_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    monthly_rent: '',
    deposit: '',
    management_fee: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tenantsRes, roomsRes] = await Promise.all([
        tenantsApi.getAll(),
        roomsApi.getAll()
      ]);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantDocuments = async (tenantId: number) => {
    try {
      const res = await uploadsApi.getByTenant(tenantId);
      setDocuments(res.data);
    } catch (error) {
      console.error('문서 로드 실패:', error);
    }
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    setFormData({
      company_name: '',
      representative_name: '',
      business_number: '',
      email: '',
      phone: '',
      address: '',
      tenant_type: '상주',
      notes: '',
      room_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      monthly_rent: '',
      deposit: '',
      management_fee: ''
    });
    setUploadingFiles([]);
    setFileTypes([]);
    setShowModal(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      company_name: tenant.company_name,
      representative_name: tenant.representative_name,
      business_number: tenant.business_number || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      tenant_type: tenant.tenant_type || '상주',
      notes: tenant.notes || '',
      room_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      monthly_rent: '',
      deposit: '',
      management_fee: ''
    });
    setUploadingFiles([]);
    setFileTypes([]);
    setShowModal(true);
  };

  const openDetailModal = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    await loadTenantDocuments(tenant.id);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTenant(null);
    setUploadingFiles([]);
    setFileTypes([]);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTenant(null);
    setDocuments([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(prev => [...prev, ...files]);
    setFileTypes(prev => [...prev, ...files.map(() => '기타' as DocumentType)]);
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
    setFileTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      let tenantId: number;

      if (editingTenant) {
        // 수정
        await tenantsApi.update(editingTenant.id, {
          company_name: formData.company_name,
          representative_name: formData.representative_name,
          business_number: formData.business_number,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          tenant_type: formData.tenant_type,
          notes: formData.notes
        });
        tenantId = editingTenant.id;
        alert('입주사 정보가 수정되었습니다.');
      } else {
        // 신규 등록
        const tenantRes = await tenantsApi.create({
          company_name: formData.company_name,
          representative_name: formData.representative_name,
          business_number: formData.business_number,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          tenant_type: formData.tenant_type,
          notes: formData.notes
        });
        tenantId = tenantRes.data.id;

        // 호실 지정된 경우 계약 생성
        if (formData.room_id && formData.end_date) {
          await contractsApi.create({
            room_id: parseInt(formData.room_id),
            tenant_id: tenantId,
            start_date: formData.start_date,
            end_date: formData.end_date,
            monthly_rent: parseInt(formData.monthly_rent) || 0,
            deposit: parseInt(formData.deposit) || 0,
            management_fee: parseInt(formData.management_fee) || 0
          });
        }

        alert('입주사가 등록되었습니다.');
      }

      // 파일 업로드
      if (uploadingFiles.length > 0) {
        const uploadFormData = new FormData();
        uploadingFiles.forEach(file => {
          uploadFormData.append('files', file);
        });
        uploadFormData.append('tenant_id', tenantId.toString());
        uploadFormData.append('document_types', JSON.stringify(fileTypes));
        
        await uploadsApi.uploadMultiple(uploadFormData);
      }

      await loadData();
      closeModal();
    } catch (error) {
      console.error('입주사 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`${tenant.company_name}를 삭제하시겠습니까?`)) return;

    try {
      await tenantsApi.delete(tenant.id);
      await loadData();
      alert('입주사가 삭제되었습니다.');
    } catch (error) {
      console.error('입주사 삭제 실패:', error);
      alert('삭제에 실패했습니다. 활성 계약이 있을 수 있습니다.');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;

    try {
      await uploadsApi.delete(docId);
      if (selectedTenant) {
        await loadTenantDocuments(selectedTenant.id);
      }
      alert('문서가 삭제되었습니다.');
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      alert('문서 삭제에 실패했습니다.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 공실인 호실만 필터링 (상주: 일반 호실, 비상주: POST BOX)
  const availableRooms = rooms.filter(r => {
    if (r.status !== '공실') return false;
    if (formData.tenant_type === '비상주') {
      return r.room_type === 'POST BOX';
    } else {
      return r.room_type !== 'POST BOX' && r.room_type !== '회의실';
    }
  });

  const filteredTenants = tenants.filter(tenant => {
    // 타입 필터
    if (filterType && tenant.tenant_type !== filterType) return false;
    
    // 호실 필터
    if (filterRoom) {
      const roomSearch = filterRoom.toLowerCase();
      if (!tenant.rooms?.toLowerCase().includes(roomSearch)) return false;
    }
    
    // 검색어 필터 (회사명, 대표자명, 연락처, 호실)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        tenant.company_name.toLowerCase().includes(search) ||
        tenant.representative_name.toLowerCase().includes(search) ||
        tenant.phone?.includes(search) ||
        tenant.rooms?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // 통계
  const stats = {
    total: tenants.length,
    resident: tenants.filter(t => t.tenant_type === '상주').length,
    nonResident: tenants.filter(t => t.tenant_type === '비상주').length
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
          <h1 className="text-2xl font-bold text-slate-900">입주사 관리</h1>
          <p className="text-slate-500 mt-1">
            총 {stats.total}개 입주사 (상주 {stats.resident} / 비상주 {stats.nonResident})
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          입주사 등록
        </button>
      </div>

      {/* 필터 & 검색 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(['', '상주', '비상주'] as const).map((type) => (
            <button
              key={type || 'all'}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === type
                  ? type === '비상주' ? 'bg-violet-600 text-white' : 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type || '전체'}
            </button>
          ))}
        </div>

        {/* 호실 선택 */}
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className="input w-auto min-w-[140px]"
        >
          <option value="">전체 호실</option>
          {rooms
            .filter(r => r.room_type !== 'POST BOX' && r.status === '입주')
            .sort((a, b) => {
              const numA = parseInt(a.room_number) || 0;
              const numB = parseInt(b.room_number) || 0;
              return numA - numB;
            })
            .map(room => (
              <option key={room.id} value={room.room_number}>
                {room.room_number}호
              </option>
            ))
          }
        </select>
        
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="회사명, 대표자명, 연락처, 호실로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12"
          />
        </div>
      </div>

      {/* 목록 */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">구분</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">회사명</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">대표자</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">사업자번호</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">연락처</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">호실</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-slate-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  등록된 입주사가 없습니다.
                </td>
              </tr>
            ) : (
              filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.tenant_type === '비상주' 
                        ? 'bg-violet-100 text-violet-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {tenant.tenant_type === '비상주' ? <Mailbox className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {tenant.tenant_type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button 
                      onClick={() => openDetailModal(tenant)}
                      className="flex items-center gap-3 hover:text-primary-600"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tenant.tenant_type === '비상주' ? 'bg-violet-100' : 'bg-primary-100'
                      }`}>
                        {tenant.tenant_type === '비상주' 
                          ? <Mailbox className="w-5 h-5 text-violet-600" />
                          : <Building2 className="w-5 h-5 text-primary-600" />
                        }
                      </div>
                      <span className="font-medium text-slate-900">{tenant.company_name}</span>
                    </button>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{tenant.representative_name}</td>
                  <td className="py-4 px-6 text-slate-600">{tenant.business_number || '-'}</td>
                  <td className="py-4 px-6 text-slate-600">{tenant.phone || '-'}</td>
                  <td className="py-4 px-6">
                    {tenant.rooms ? (
                      <span className={`inline-flex px-2 py-1 rounded-full text-sm ${
                        tenant.tenant_type === '비상주' 
                          ? 'bg-violet-100 text-violet-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {tenant.rooms}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openDetailModal(tenant)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary-600"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(tenant)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tenant)}
                        className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 입주사 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTenant ? '입주사 수정' : '입주사 등록'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 상주/비상주 선택 */}
              <div>
                <label className="label">입주 유형 *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tenant_type: '상주', room_id: '' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all ${
                      formData.tenant_type === '상주'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    상주
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tenant_type: '비상주', room_id: '' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all ${
                      formData.tenant_type === '비상주'
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Mailbox className="w-5 h-5" />
                    비상주 (POST BOX)
                  </button>
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">회사명 *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    className="input"
                    placeholder="회사명"
                  />
                </div>
                <div>
                  <label className="label">대표자명 *</label>
                  <input
                    type="text"
                    value={formData.representative_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, representative_name: e.target.value }))}
                    className="input"
                    placeholder="대표자명"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">사업자번호</label>
                <input
                  type="text"
                  value={formData.business_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_number: e.target.value }))}
                  className="input"
                  placeholder="000-00-00000"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">연락처</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="input"
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <label className="label">이메일</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="input"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="input"
                  placeholder="사업장 주소"
                />
              </div>

              {/* 호실 및 계약 정보 (신규 등록 시에만) */}
              {!editingTenant && (
                <div className={`p-4 rounded-xl ${formData.tenant_type === '비상주' ? 'bg-violet-50' : 'bg-slate-50'}`}>
                  <h3 className="font-semibold text-slate-900 mb-4">
                    {formData.tenant_type === '비상주' ? 'POST BOX 지정' : '호실 지정'} (선택사항)
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        {formData.tenant_type === '비상주' ? 'POST BOX 선택' : '호실 선택'}
                      </label>
                      <select
                        value={formData.room_id}
                        onChange={(e) => {
                          const room = rooms.find(r => r.id === parseInt(e.target.value));
                          setFormData(prev => ({ 
                            ...prev, 
                            room_id: e.target.value,
                            monthly_rent: room?.base_price.toString() || ''
                          }));
                        }}
                        className="input"
                      >
                        <option value="">선택 안함</option>
                        {availableRooms.map(room => (
                          <option key={room.id} value={room.id}>
                            {room.room_number} ({room.room_type}) - {new Intl.NumberFormat('ko-KR').format(room.base_price)}원/월
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">월 임대료</label>
                      <input
                        type="number"
                        value={formData.monthly_rent}
                        onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent: e.target.value }))}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {formData.room_id && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="label">계약 시작일</label>
                        <input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">계약 종료일 *</label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">보증금</label>
                        <input
                          type="number"
                          value={formData.deposit}
                          onChange={(e) => setFormData(prev => ({ ...prev, deposit: e.target.value }))}
                          className="input"
                          placeholder="0"
                        />
                      </div>
                      {formData.tenant_type === '상주' && (
                        <div>
                          <label className="label">관리비</label>
                          <input
                            type="number"
                            value={formData.management_fee}
                            onChange={(e) => setFormData(prev => ({ ...prev, management_fee: e.target.value }))}
                            className="input"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 파일 업로드 */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  서류 업로드
                </h3>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  클릭하여 파일 선택 (계약서, 사업자등록증, 신분증 등)
                </button>

                {uploadingFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadingFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        <select
                          value={fileTypes[index]}
                          onChange={(e) => {
                            const newTypes = [...fileTypes];
                            newTypes[index] = e.target.value as DocumentType;
                            setFileTypes(newTypes);
                          }}
                          className="text-sm border border-slate-200 rounded px-2 py-1"
                        >
                          <option value="계약서">계약서</option>
                          <option value="사업자등록증">사업자등록증</option>
                          <option value="신분증">신분증</option>
                          <option value="기타">기타</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="label">메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input min-h-[80px]"
                  placeholder="메모..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  {editingTenant ? '수정' : '등록'}
                </button>
                <button onClick={closeModal} className="btn-secondary flex-1">
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 입주사 상세 모달 */}
      {showDetailModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedTenant.tenant_type === '비상주' ? 'bg-violet-100' : 'bg-primary-100'
                }`}>
                  {selectedTenant.tenant_type === '비상주' 
                    ? <Mailbox className="w-6 h-6 text-violet-600" />
                    : <Building2 className="w-6 h-6 text-primary-600" />
                  }
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedTenant.company_name}</h2>
                  <p className="text-sm text-slate-500">{selectedTenant.tenant_type} 입주사</p>
                </div>
              </div>
              <button onClick={closeDetailModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">대표자</p>
                  <p className="font-medium">{selectedTenant.representative_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">사업자번호</p>
                  <p className="font-medium">{selectedTenant.business_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">연락처</p>
                  <p className="font-medium">{selectedTenant.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">이메일</p>
                  <p className="font-medium">{selectedTenant.email || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">호실</p>
                  <p className="font-medium">{selectedTenant.rooms || '-'}</p>
                </div>
              </div>

              {/* 문서 목록 */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  업로드된 서류 ({documents.length})
                </h3>
                
                {documents.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl">
                    업로드된 서류가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{doc.original_name}</p>
                          <p className="text-xs text-slate-500">
                            {doc.document_type} · {formatFileSize(doc.file_size)} · {format(new Date(doc.created_at), 'yyyy.MM.dd')}
                          </p>
                        </div>
                        <a
                          href={`/api/uploads/download/${doc.id}`}
                          className="p-2 hover:bg-slate-200 rounded text-slate-500"
                          title="다운로드"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 hover:bg-red-100 rounded text-red-500"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => { closeDetailModal(); openEditModal(selectedTenant); }} className="btn-primary flex-1">
                  수정
                </button>
                <button onClick={closeDetailModal} className="btn-secondary flex-1">
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
