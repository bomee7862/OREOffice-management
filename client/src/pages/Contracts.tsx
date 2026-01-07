import { useEffect, useState } from 'react';
import { contractsApi } from '../api';
import { Contract } from '../types';
import { Search, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const response = await contractsApi.getAll();
      setContracts(response.data);
    } catch (error) {
      console.error('계약 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async (contract: Contract) => {
    if (!confirm(`${contract.company_name}의 계약을 종료하시겠습니까?`)) return;

    try {
      await contractsApi.terminate(contract.id);
      await loadContracts();
      alert('계약이 종료되었습니다.');
    } catch (error) {
      console.error('계약 종료 실패:', error);
      alert('계약 종료에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const getDaysRemaining = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  // 남은 기간을 월/일 단위로 포맷
  const formatRemainingTime = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const days = differenceInDays(end, today);
    
    if (days < 0) {
      const absDays = Math.abs(days);
      if (absDays >= 30) {
        const months = Math.floor(absDays / 30);
        return `${months}개월 초과`;
      }
      return `${absDays}일 초과`;
    }
    
    if (days === 0) return '오늘 만료';
    
    const months = differenceInMonths(end, today);
    
    if (months < 1) {
      return `${days}일`;
    }
    
    // 정확한 월 계산 (남은 일수도 표시)
    const remainingDays = days - (months * 30);
    if (remainingDays > 0) {
      return `${months}개월 ${remainingDays}일`;
    }
    return `${months}개월`;
  };

  const getContractStatus = (contract: Contract) => {
    if (!contract.is_active) return { label: '종료', color: 'bg-slate-100 text-slate-600' };
    
    const daysRemaining = getDaysRemaining(contract.end_date);
    if (daysRemaining < 0) return { label: '만료', color: 'bg-red-100 text-red-700' };
    if (daysRemaining <= 30) return { label: '만료임박', color: 'bg-amber-100 text-amber-700' };
    return { label: '진행중', color: 'bg-green-100 text-green-700' };
  };

  const filteredContracts = contracts.filter(contract => {
    // 필터 적용
    if (filter === 'active' && !contract.is_active) return false;
    if (filter === 'expired' && contract.is_active) return false;

    // 검색어 적용
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        contract.company_name?.toLowerCase().includes(search) ||
        contract.room_number?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // 통계
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.is_active).length,
    expiringSoon: contracts.filter(c => c.is_active && getDaysRemaining(c.end_date) <= 30 && getDaysRemaining(c.end_date) >= 0).length
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">계약 관리</h1>
        <p className="text-slate-500 mt-1">전체 계약 내역을 관리합니다</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">전체 계약</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}건</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">활성 계약</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}건</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">만료 임박 (30일 이내)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.expiringSoon}건</p>
        </div>
      </div>

      {/* 필터 & 검색 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(['all', 'active', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? '전체' : f === 'active' ? '진행중' : '종료'}
            </button>
          ))}
        </div>
        
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="입주사명, 호실로 검색..."
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
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">호실</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">입주사</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">계약기간</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">월 임대료</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">보증금</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-slate-500">상태</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-slate-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  계약 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => {
                const status = getContractStatus(contract);
                const daysRemaining = getDaysRemaining(contract.end_date);
                
                return (
                  <tr key={contract.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{contract.room_number}호</p>
                          <p className="text-sm text-slate-500">{contract.room_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-slate-900">{contract.company_name}</p>
                      <p className="text-sm text-slate-500">{contract.representative_name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-slate-600">
                        {format(new Date(contract.start_date), 'yy.MM.dd')} ~ {format(new Date(contract.end_date), 'yy.MM.dd')}
                      </p>
                      {contract.is_active && daysRemaining >= 0 && (
                        <p className={`text-sm ${daysRemaining <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {formatRemainingTime(contract.end_date)} 남음
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-900">
                      {formatCurrency(contract.monthly_rent)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-600">
                      {formatCurrency(contract.deposit)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label === '만료임박' && <AlertTriangle className="w-3 h-3" />}
                        {status.label === '진행중' && <CheckCircle className="w-3 h-3" />}
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {contract.is_active && (
                        <button
                          onClick={() => handleTerminate(contract)}
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600"
                          title="계약 종료"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
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
  );
}



