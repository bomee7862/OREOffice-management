import { useEffect, useState } from 'react';
import { transactionsApi, tenantsApi, contractsApi } from '../api';
import { Transaction, Tenant, Contract, TransactionType, TransactionCategory } from '../types';
import { Plus, Search, X, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const INCOME_CATEGORIES: TransactionCategory[] = ['임대료', '관리비', '보증금', '기타수입'];
const EXPENSE_CATEGORIES: TransactionCategory[] = ['유지보수', '공과금', '인건비', '기타지출'];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // 필터
  const [filters, setFilters] = useState({
    type: '' as '' | TransactionType,
    category: '' as '' | TransactionCategory,
    start_date: '',
    end_date: ''
  });
  
  // 폼
  const [formData, setFormData] = useState({
    type: '입금' as TransactionType,
    category: '임대료' as TransactionCategory,
    amount: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    tenant_id: '',
    contract_id: '',
    description: '',
    payment_method: '',
    receipt_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadData = async () => {
    try {
      const [tenantsRes, contractsRes] = await Promise.all([
        tenantsApi.getAll(),
        contractsApi.getAll(true)
      ]);
      setTenants(tenantsRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const params: any = {};
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      
      const response = await transactionsApi.getAll(params);
      setTransactions(response.data);
    } catch (error) {
      console.error('거래 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setFormData({
      type: '입금',
      category: '임대료',
      amount: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      tenant_id: '',
      contract_id: '',
      description: '',
      payment_method: '',
      receipt_number: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async () => {
    try {
      await transactionsApi.create({
        ...formData,
        amount: parseInt(formData.amount),
        tenant_id: formData.tenant_id ? parseInt(formData.tenant_id) : null,
        contract_id: formData.contract_id ? parseInt(formData.contract_id) : null
      });
      await loadTransactions();
      closeModal();
      alert('거래가 등록되었습니다.');
    } catch (error) {
      console.error('거래 등록 실패:', error);
      alert('거래 등록에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 거래를 삭제하시겠습니까?')) return;

    try {
      await transactionsApi.delete(id);
      await loadTransactions();
      alert('거래가 삭제되었습니다.');
    } catch (error) {
      console.error('거래 삭제 실패:', error);
      alert('거래 삭제에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  // 통계
  const stats = {
    totalIncome: transactions.filter(t => t.type === '입금').reduce((sum, t) => sum + t.amount, 0),
    totalExpense: transactions.filter(t => t.type === '지출').reduce((sum, t) => sum + t.amount, 0),
    count: transactions.length
  };

  const currentCategories = formData.type === '입금' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
          <h1 className="text-xl font-bold text-slate-900">입출금 관리</h1>
          <p className="text-slate-500 mt-1">수입과 지출을 관리합니다</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          거래 등록
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">총 수입</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalIncome)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">총 지출</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.totalExpense)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Filter className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">순이익</p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(stats.totalIncome - stats.totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="label">유형</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="input"
            >
              <option value="">전체</option>
              <option value="입금">입금</option>
              <option value="지출">지출</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="label">카테고리</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
              className="input"
            >
              <option value="">전체</option>
              {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="label">시작일</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="input"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="label">종료일</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">날짜</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">유형</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">카테고리</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">입주사</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">설명</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">금액</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-slate-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  거래 내역이 없습니다.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-6 text-slate-600">
                    {format(new Date(tx.transaction_date), 'yyyy.MM.dd', { locale: ko })}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      tx.type === '입금' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {tx.type === '입금' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{tx.category}</td>
                  <td className="py-4 px-6 text-slate-900">{tx.company_name || '-'}</td>
                  <td className="py-4 px-6 text-slate-600">{tx.description || '-'}</td>
                  <td className="py-4 px-6 text-right font-medium text-slate-900">
                    {tx.type === '입금' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-slate-400 hover:text-rose-600 text-sm"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 거래 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">거래 등록</h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 유형 선택 */}
              <div>
                <label className="label">거래 유형 *</label>
                <div className="flex gap-2">
                  {(['입금', '지출'] as TransactionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        type,
                        category: type === '입금' ? '임대료' : '유지보수'
                      }))}
                      className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                        formData.type === type
                          ? type === '입금' 
                            ? 'bg-teal-600 text-white' 
                            : 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">카테고리 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TransactionCategory }))}
                    className="input"
                  >
                    {currentCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">거래일 *</label>
                  <input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">금액 *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  placeholder="0"
                />
              </div>

              {formData.type === '입금' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">입주사</label>
                    <select
                      value={formData.tenant_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">선택 안함</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>{tenant.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">계약</label>
                    <select
                      value={formData.contract_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">선택 안함</option>
                      {contracts.map(contract => (
                        <option key={contract.id} value={contract.id}>
                          {contract.room_number}호 - {contract.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="label">설명</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="거래 설명..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">결제 방법</label>
                  <input
                    type="text"
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="input"
                    placeholder="계좌이체, 카드 등"
                  />
                </div>
                <div>
                  <label className="label">영수증 번호</label>
                  <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                    className="input"
                    placeholder="선택사항"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  등록
                </button>
                <button onClick={closeModal} className="btn-secondary flex-1">
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










