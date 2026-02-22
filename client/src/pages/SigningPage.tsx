import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicSigningApi } from '../api';
import SignatureCanvas from '../components/SignatureCanvas';
import { CheckCircle, AlertCircle, Clock, Building } from 'lucide-react';

type PageState = 'loading' | 'ready' | 'signed' | 'already_signed' | 'expired' | 'error';

interface ContractData {
  rendered_content: string;
  company_name: string;
  room_number: string;
  start_date: string;
  end_date: string;
  status: string;
  tenant_signed_at: string | null;
  phone?: string;
  address?: string;
}

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [contract, setContract] = useState<ContractData | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [tenantInfo, setTenantInfo] = useState({
    company_name: '',
    representative_name: '',
    business_number: '',
    phone: '',
    address: '',
  });

  const updateTenantInfo = (field: string, value: string) =>
    setTenantInfo(prev => ({ ...prev, [field]: value }));

  const rc = contract?.rendered_content || '';
  const needsCompanyName = rc.includes('[회사명 입주자 기입]');
  const needsRepresentative = rc.includes('[대표자명 입주자 기입]');
  const needsBusinessNumber = rc.includes('[사업자번호 입주자 기입]');
  const needsPhone = rc.includes('[전화번호 입주자 기입]');
  const needsAddress = rc.includes('[주소 입주자 기입]');
  const needsTenantInfo = needsCompanyName || needsRepresentative || needsBusinessNumber || needsPhone || needsAddress;

  useEffect(() => {
    if (!token) return;
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      const res = await publicSigningApi.getContract(token!);
      const data = res.data;

      if (data.status !== 'pending_tenant') {
        setState('already_signed');
        setContract(data);
        return;
      }

      setContract(data);
      setState('ready');
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.error;

      if (status === 410 || message?.includes('만료')) {
        setState('expired');
      } else if (status === 404) {
        setError('유효하지 않은 링크입니다.');
        setState('error');
      } else {
        setError(message || '계약서를 불러오는데 실패했습니다.');
        setState('error');
      }
    }
  };

  const handleSign = async (signatureData: string) => {
    if (!token || !agreed) return;

    if (needsCompanyName && !tenantInfo.company_name.trim()) {
      setError('회사명(성명)을 입력해 주세요.');
      return;
    }
    if (needsRepresentative && !tenantInfo.representative_name.trim()) {
      setError('대표자명을 입력해 주세요.');
      return;
    }
    if (needsPhone && !tenantInfo.phone.trim()) {
      setError('전화번호를 입력해 주세요.');
      return;
    }
    if (needsAddress && !tenantInfo.address.trim()) {
      setError('주소를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = { signature_data: signatureData };
      if (tenantInfo.company_name) payload.company_name = tenantInfo.company_name;
      if (tenantInfo.representative_name) payload.representative_name = tenantInfo.representative_name;
      if (tenantInfo.business_number) payload.business_number = tenantInfo.business_number;
      if (tenantInfo.phone) payload.phone = tenantInfo.phone;
      if (tenantInfo.address) payload.address = tenantInfo.address;

      await publicSigningApi.submitSignature(token, payload);
      setState('signed');
    } catch (err: any) {
      setError(err.response?.data?.error || '서명 제출에 실패했습니다.');
      setState('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">공유오피스 계약서</h1>
            <p className="text-xs text-slate-500">전자 서명</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 서명 완료 */}
        {state === 'signed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">서명이 완료되었습니다</h2>
            <p className="text-slate-600 mb-6">
              관리자 확인 후 최종 계약서 PDF가 이메일로 발송됩니다.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <p>계약서 관련 문의사항이 있으시면 관리실로 연락해 주세요.</p>
            </div>
          </div>
        )}

        {/* 이미 서명됨 */}
        {state === 'already_signed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">이미 서명이 완료된 계약서입니다</h2>
            <p className="text-slate-600">
              {contract?.tenant_signed_at && (
                <>서명일: {new Date(contract.tenant_signed_at).toLocaleDateString('ko-KR')}</>
              )}
            </p>
          </div>
        )}

        {/* 만료됨 */}
        {state === 'expired' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">서명 기한이 만료되었습니다</h2>
            <p className="text-slate-600">관리실에 문의하여 새로운 서명 링크를 요청해 주세요.</p>
          </div>
        )}

        {/* 에러 */}
        {state === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">오류가 발생했습니다</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        )}

        {/* 계약서 내용 + 서명 */}
        {state === 'ready' && contract && (
          <div className="space-y-6">
            {/* 계약 정보 요약 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">입주사:</span>{' '}
                  <span className="text-slate-900">{contract.company_name}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">호실:</span>{' '}
                  <span className="text-slate-900">{contract.room_number}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">계약 시작:</span>{' '}
                  <span className="text-slate-900">{contract.start_date}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">계약 종료:</span>{' '}
                  <span className="text-slate-900">{contract.end_date}</span>
                </div>
              </div>
            </div>

            {/* 계약서 내용 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="font-bold text-slate-900">계약서 내용</h2>
              </div>
              <div className="p-6">
                <div
                  className="contract-content text-slate-700 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: contract.rendered_content }}
                />
              </div>
            </div>

            {/* 입주자 정보 입력 */}
            {needsTenantInfo && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">입주자 정보 입력</h2>
                <p className="text-sm text-slate-500">아래 정보를 입력해 주세요. 계약서에 반영됩니다.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {needsCompanyName && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        회사명 (또는 성명) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tenantInfo.company_name}
                        onChange={e => updateTenantInfo('company_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="회사명 또는 성명"
                      />
                    </div>
                  )}
                  {needsRepresentative && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        대표자명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tenantInfo.representative_name}
                        onChange={e => updateTenantInfo('representative_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="대표자명"
                      />
                    </div>
                  )}
                  {needsBusinessNumber && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        사업자등록번호
                      </label>
                      <input
                        type="text"
                        value={tenantInfo.business_number}
                        onChange={e => updateTenantInfo('business_number', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="000-00-00000 (선택)"
                      />
                    </div>
                  )}
                  {needsPhone && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        전화번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={tenantInfo.phone}
                        onChange={e => updateTenantInfo('phone', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="010-0000-0000"
                      />
                    </div>
                  )}
                  {needsAddress && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        주소 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={tenantInfo.address}
                        onChange={e => updateTenantInfo('address', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="주소를 입력해 주세요"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 동의 + 서명 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="font-bold text-slate-900">서명</h2>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  위 계약 내용을 모두 확인하였으며, 이에 동의합니다.
                </span>
              </label>

              {agreed && (
                <div>
                  <p className="text-sm text-slate-500 mb-3">
                    아래에 서명해 주세요. 직접 서명하거나 서명/도장 이미지를 업로드할 수 있습니다.
                  </p>
                  <SignatureCanvas onSave={handleSign} />
                  {submitting && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      서명을 제출하고 있습니다...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
