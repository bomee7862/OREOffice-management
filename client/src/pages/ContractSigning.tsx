import { useEffect, useState } from 'react';
import { contractSigningApi, contractTemplatesApi } from '../api';
import { ContractSigningSession, ContractTemplate } from '../types';
import { Send, PenTool, Trash2, X, Mail, Eye } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';
import SignatureCanvas from '../components/SignatureCanvas';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending_tenant: { label: '서명 대기', color: 'bg-amber-50 text-amber-700' },
  tenant_signed: { label: '입주자 서명완료', color: 'bg-blue-50 text-blue-700' },
  pending_admin: { label: '관리자 서명대기', color: 'bg-purple-50 text-purple-700' },
  completed: { label: '서명 완료', color: 'bg-teal-50 text-teal-700' },
  sent: { label: 'PDF 발송완료', color: 'bg-slate-100 text-slate-600' },
};

const ROOM_TYPES = ['1인실', '2인실', '6인실', '회의실', '자유석', 'POST BOX'];

const defaultInitForm = {
  template_id: 0,
  admin_email: '',
  // 입주사 정보
  company_name: '',
  representative_name: '',
  business_number: '',
  email: '',
  phone: '',
  // 계약 정보
  room_number: '',
  room_type: '1인실',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  monthly_rent_vat: '',
  monthly_rent: '',
  deposit: '',
  management_fee: '',
  payment_day: '10',
};

export default function ContractSigning() {
  const [sessions, setSessions] = useState<ContractSigningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInitModal, setShowInitModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ContractSigningSession | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [initForm, setInitForm] = useState(defaultInitForm);
  const [sending, setSending] = useState(false);
  const [previewStep, setPreviewStep] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try {
      const res = await contractSigningApi.getSessions();
      setSessions(res.data);
    } catch (error) {
      console.error('세션 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInitModal = async () => {
    try {
      const templatesRes = await contractTemplatesApi.getAll();
      setTemplates(templatesRes.data);
      setInitForm(defaultInitForm);
      setPreviewStep(false);
      setPreviewContent('');
      setShowInitModal(true);
    } catch (error) {
      showError('데이터 로드에 실패했습니다.');
    }
  };

  // VAT 자동 계산
  const handleVatChange = (vatStr: string) => {
    const vat = parseInt(vatStr) || 0;
    const rent = Math.round(vat / 1.1);
    setInitForm(prev => ({ ...prev, monthly_rent_vat: vatStr, monthly_rent: String(rent) }));
  };

  const buildContractData = () => ({
    company_name: initForm.company_name,
    representative_name: initForm.representative_name,
    business_number: initForm.business_number,
    email: initForm.email,
    phone: initForm.phone,
    room_number: initForm.room_number,
    room_type: initForm.room_type,
    start_date: initForm.start_date,
    end_date: initForm.end_date,
    monthly_rent: parseInt(initForm.monthly_rent) || 0,
    monthly_rent_vat: parseInt(initForm.monthly_rent_vat) || 0,
    deposit: parseInt(initForm.deposit) || 0,
    management_fee: parseInt(initForm.management_fee) || 0,
    payment_day: parseInt(initForm.payment_day) || 10,
  });

  const validateForm = () => {
    if (!initForm.template_id || !initForm.email || !initForm.admin_email ||
        !initForm.company_name || !initForm.representative_name ||
        !initForm.start_date || !initForm.end_date) {
      showError('필수 항목을 입력해주세요.');
      return false;
    }
    return true;
  };

  const handlePreview = async () => {
    if (!validateForm()) return;
    setSending(true);
    try {
      const res = await contractSigningApi.preview({
        template_id: Number(initForm.template_id),
        contract_data: buildContractData(),
      });
      setPreviewContent(res.data.rendered_content);
      setPreviewStep(true);
    } catch (error) {
      showError('미리보기에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleInitiate = async () => {
    setSending(true);
    try {
      await contractSigningApi.initiate({
        template_id: Number(initForm.template_id),
        tenant_email: initForm.email,
        admin_email: initForm.admin_email,
        contract_data: buildContractData(),
        rendered_content: previewContent,
      });
      showSuccess('서명 요청이 발송되었습니다.');
      setShowInitModal(false);
      setPreviewStep(false);
      setPreviewContent('');
      loadSessions();
    } catch (error) {
      showError('서명 요청에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleAdminSign = async (signatureData: string) => {
    if (!selectedSession) return;
    try {
      await contractSigningApi.adminSign(selectedSession.id, { signature_data: signatureData });
      showSuccess('관리자 서명이 완료되었습니다.');
      setShowSignModal(false);
      loadSessions();
    } catch (error) {
      showError('서명에 실패했습니다.');
    }
  };

  const handleSendPDF = async (id: number) => {
    if (!confirm('양측에 최종 PDF를 발송하시겠습니까?')) return;
    try {
      await contractSigningApi.sendPDF(id);
      showSuccess('PDF가 발송되었습니다.');
      loadSessions();
    } catch (error) {
      showError('PDF 발송에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 서명 세션을 삭제하시겠습니까?')) return;
    try {
      await contractSigningApi.deleteSession(id);
      showSuccess('삭제되었습니다.');
      loadSessions();
    } catch (error) {
      showError('삭제에 실패했습니다.');
    }
  };

  const openDetail = async (session: ContractSigningSession) => {
    try {
      const res = await contractSigningApi.getSession(session.id);
      setSelectedSession(res.data);
      setShowDetailModal(true);
    } catch (error) {
      showError('상세 조회에 실패했습니다.');
    }
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('ko-KR');
  };

  const updateForm = (field: string, value: string) => {
    setInitForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">전자 서명</h1>
          <p className="text-slate-500 mt-1">계약서 서명 요청 및 관리</p>
        </div>
        <button onClick={openInitModal} className="btn-primary flex items-center gap-2">
          <Send className="w-4 h-4" />
          서명 요청
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">서명 세션이 없습니다.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">입주사</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">호실</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">이메일</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">발송일</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">액션</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const badge = STATUS_BADGES[s.status] || { label: s.status, color: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{s.company_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{s.room_number}호</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{s.tenant_email}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">{formatDate(s.created_at)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openDetail(s)} className="p-1.5 hover:bg-slate-100 rounded" title="상세 보기">
                          <Eye className="w-4 h-4 text-slate-500" />
                        </button>
                        {s.status === 'tenant_signed' && (
                          <button
                            onClick={() => { setSelectedSession(s); setShowSignModal(true); }}
                            className="p-1.5 hover:bg-blue-50 rounded" title="관리자 서명"
                          >
                            <PenTool className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {s.status === 'completed' && (
                          <button onClick={() => handleSendPDF(s.id)} className="p-1.5 hover:bg-teal-50 rounded" title="PDF 발송">
                            <Mail className="w-4 h-4 text-teal-600" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded" title="삭제">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 서명 요청 모달 */}
      {showInitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">서명 요청</h2>
                {previewStep && (
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">미리보기</span>
                )}
              </div>
              <button onClick={() => { setShowInitModal(false); setPreviewStep(false); setPreviewContent(''); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!previewStep ? (
              <>
                {/* Step 1: 정보 입력 */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* 템플릿 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">계약서 템플릿 *</label>
                    <select
                      value={initForm.template_id}
                      onChange={e => updateForm('template_id', e.target.value)}
                      className="input"
                    >
                      <option value={0}>선택하세요</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.template_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 입주사 정보 */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-100">입주사 정보</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">회사명 *</label>
                        <input type="text" value={initForm.company_name} onChange={e => updateForm('company_name', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">대표자명 *</label>
                        <input type="text" value={initForm.representative_name} onChange={e => updateForm('representative_name', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">사업자번호</label>
                        <input type="text" value={initForm.business_number} onChange={e => updateForm('business_number', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">이메일 (서명 요청 수신) *</label>
                        <input type="email" value={initForm.email} onChange={e => updateForm('email', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">전화번호</label>
                        <input type="text" value={initForm.phone} onChange={e => updateForm('phone', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">관리자 이메일 (PDF 수신) *</label>
                        <input type="email" value={initForm.admin_email} onChange={e => updateForm('admin_email', e.target.value)} className="input" />
                      </div>
                    </div>
                  </div>

                  {/* 계약 정보 */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-100">계약 정보</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">호실 번호</label>
                        <input type="text" value={initForm.room_number} onChange={e => updateForm('room_number', e.target.value)} className="input" placeholder="예: 101" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">호실 유형</label>
                        <select value={initForm.room_type} onChange={e => updateForm('room_type', e.target.value)} className="input">
                          {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">계약 시작일 *</label>
                        <input type="date" value={initForm.start_date} onChange={e => updateForm('start_date', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">계약 종료일 *</label>
                        <input type="date" value={initForm.end_date} onChange={e => updateForm('end_date', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">월사용료 (VAT 포함)</label>
                        <input type="number" value={initForm.monthly_rent_vat} onChange={e => handleVatChange(e.target.value)} className="input" />
                        {initForm.monthly_rent && <p className="text-xs text-slate-400 mt-0.5">VAT 제외: {Number(initForm.monthly_rent).toLocaleString()}원</p>}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">보증금</label>
                        <input type="number" value={initForm.deposit} onChange={e => updateForm('deposit', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">관리비</label>
                        <input type="number" value={initForm.management_fee} onChange={e => updateForm('management_fee', e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">납부일</label>
                        <input type="number" value={initForm.payment_day} onChange={e => updateForm('payment_day', e.target.value)} className="input" min={1} max={31} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                  <button onClick={() => setShowInitModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    취소
                  </button>
                  <button onClick={handlePreview} disabled={sending} className="btn-primary flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    {sending ? '로딩 중...' : '미리보기'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: 미리보기 + 수정 */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <p className="text-sm text-slate-500">계약서 내용을 확인하고 필요 시 직접 수정하세요.</p>
                  <textarea
                    value={previewContent}
                    onChange={e => setPreviewContent(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    style={{ minHeight: '400px' }}
                  />
                </div>
                <div className="p-6 border-t border-slate-200 flex justify-between">
                  <button onClick={() => setPreviewStep(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    돌아가기
                  </button>
                  <button onClick={handleInitiate} disabled={sending} className="btn-primary flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {sending ? '발송 중...' : '서명 요청 발송'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 관리자 서명 모달 */}
      {showSignModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">관리자 서명</h2>
              <button onClick={() => setShowSignModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p><span className="text-slate-500">입주사:</span> <span className="font-medium">{selectedSession.company_name}</span></p>
                <p><span className="text-slate-500">호실:</span> <span className="font-medium">{selectedSession.room_number}호</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">서명</label>
                <SignatureCanvas onSave={handleAdminSign} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetailModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">서명 상세</h2>
              <button onClick={() => setShowDetailModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">입주사:</span> <span className="font-medium">{selectedSession.company_name}</span></div>
                <div><span className="text-slate-500">호실:</span> <span className="font-medium">{selectedSession.room_number}호</span></div>
                <div><span className="text-slate-500">이메일:</span> <span className="font-medium">{selectedSession.tenant_email}</span></div>
                <div><span className="text-slate-500">상태:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[selectedSession.status]?.color}`}>{STATUS_BADGES[selectedSession.status]?.label}</span></div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">계약 내용</h3>
                <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedSession.rendered_content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">입주자 서명</h3>
                  {selectedSession.tenant_signature_data ? (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <img src={selectedSession.tenant_signature_data} alt="입주자 서명" className="max-h-20 mx-auto" />
                      <p className="text-xs text-slate-500 text-center mt-2">{formatDate(selectedSession.tenant_signed_at)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">미서명</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">관리자 서명</h3>
                  {selectedSession.admin_signature_data ? (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <img src={selectedSession.admin_signature_data} alt="관리자 서명" className="max-h-20 mx-auto" />
                      <p className="text-xs text-slate-500 text-center mt-2">{formatDate(selectedSession.admin_signed_at)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">미서명</p>
                  )}
                </div>
              </div>

              {selectedSession.final_pdf_sent_at && (
                <p className="text-sm text-teal-600">PDF 발송: {formatDate(selectedSession.final_pdf_sent_at)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
