import { useEffect, useState } from 'react';
import { transactionsApi } from '../api';
import { Transaction } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus, ChevronLeft, ChevronRight, Trash2, Edit2, X,
  Zap, Droplets, Users, Sparkles, Wrench, Package, Megaphone, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EXPENSE_CATEGORIES = [
  { value: '임대료', label: '임대료', icon: '🏠', color: 'bg-slate-100 text-slate-600' },
  { value: '관리비', label: '관리비', icon: '🏢', color: 'bg-slate-100 text-slate-600' },
  { value: '공과금', label: '공과금', icon: '💡', color: 'bg-yellow-100 text-yellow-600' },
  { value: '청소미화', label: '청소/미화', icon: '🧹', color: 'bg-teal-100 text-teal-600' },
  { value: '유지보수', label: '유지보수', icon: '🔧', color: 'bg-orange-100 text-orange-600' },
  { value: '소모품', label: '소모품', icon: '📦', color: 'bg-purple-100 text-purple-600' },
  { value: '마케팅', label: '마케팅', icon: '📣', color: 'bg-pink-100 text-pink-600' },
  { value: '기타지출', label: '기타', icon: '📋', color: 'bg-gray-100 text-gray-600' },
];

export default function Expense() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    category: '공과금',
    amount: '',
    vat_amount: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    payment_method: '계좌이체',
    notes: ''
  });

  const yearMonth = format(currentDate, 'yyyy-MM');

  useEffect(() => {
    loadData();
  }, [yearMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 월의 마지막 날짜를 정확하게 계산
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      const result = await transactionsApi.getAll({
        type: '지출',
        start_date: startDate,
        end_date: endDate
      });
      setTransactions(result.data);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const data = {
        type: '지출',
        category: form.category,
        amount: parseInt(form.amount) || 0,
        vat_amount: parseInt(form.vat_amount) || 0,
        transaction_date: form.transaction_date,
        description: form.description,
        payment_method: form.payment_method,
        notes: form.notes,
        status: '완료'
      };

      if (editingId) {
        await transactionsApi.update(editingId, data);
      } else {
        await transactionsApi.create(data);
      }

      closeModal();
      loadData();
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 지출 내역을 삭제하시겠습니까?')) return;
    
    try {
      await transactionsApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      category: transaction.category,
      amount: transaction.amount.toString(),
      vat_amount: (transaction.vat_amount || 0).toString(),
      transaction_date: transaction.transaction_date.split('T')[0],
      description: transaction.description || '',
      payment_method: transaction.payment_method || '계좌이체',
      notes: transaction.notes || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setForm({
      category: '공과금',
      amount: '',
      vat_amount: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      payment_method: '계좌이체',
      notes: ''
    });
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

  // 카테고리별 합계 계산
  const categoryTotals = EXPENSE_CATEGORIES.map(cat => {
    const total = transactions
      .filter(t => t.category === cat.value)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, total };
  }).filter(cat => cat.total > 0);

  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);

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
        <h1 className="text-xl font-bold text-slate-900">💸 지출 관리</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            지출 등록
          </button>
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

      {/* 카테고리별 요약 */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">카테고리별 지출</h3>
        <div className="space-y-3">
          {categoryTotals.length === 0 ? (
            <div className="text-center text-slate-500 py-4">이번 달 지출 내역이 없습니다.</div>
          ) : (
            categoryTotals.map((cat) => (
              <div key={cat.value} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-slate-700">{cat.label}</span>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(cat.total)}</span>
              </div>
            ))
          )}
        </div>
        {categoryTotals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="font-semibold text-slate-900">총 지출</span>
            <span className="text-xl font-bold text-slate-900">{formatCurrency(totalExpense)}</span>
          </div>
        )}
      </div>

      {/* 지출 내역 테이블 */}
      <div className="card">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">지출 내역 ({transactions.length}건)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">날짜</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">내용</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-500">카테고리</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">금액</th>
                <th className="text-center py-4 px-6 text-sm font-medium text-slate-500">결제방법</th>
                {isAdmin && <th className="text-center py-4 px-6 text-sm font-medium text-slate-500">작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    이번 달 지출 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === t.category);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-6 text-sm text-slate-600">
                        {format(new Date(t.transaction_date), 'M/d (EEE)', { locale: ko })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-slate-900">{t.description || '-'}</div>
                        {t.notes && <div className="text-xs text-slate-500">{t.notes}</div>}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cat?.color || 'bg-gray-100'}`}>
                          {cat?.icon} {cat?.label || t.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-slate-900">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-4 px-6 text-center text-sm text-slate-500">
                        {t.payment_method || '-'}
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-2 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 지출 등록/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? '지출 수정' : '지출 등록'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">카테고리 *</label>
                <div className="grid grid-cols-4 gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, category: cat.value }))}
                      className={`p-3 rounded-xl text-center transition-all ${
                        form.category === cat.value
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <div className="text-xl mb-1">{cat.icon}</div>
                      <div className="text-xs">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">금액 *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">날짜 *</label>
                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={(e) => setForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">내용 *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="지출 내용을 입력하세요"
                />
              </div>

              <div>
                <label className="label">결제 방법</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
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
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="추가 메모를 입력하세요"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={closeModal}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary flex-1"
                disabled={!form.amount || !form.transaction_date || !form.description}
              >
                {editingId ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

