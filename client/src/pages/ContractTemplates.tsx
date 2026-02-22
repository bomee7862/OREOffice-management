import { useEffect, useState, useRef } from 'react';
import { contractTemplatesApi } from '../api';
import { ContractTemplate } from '../types';
import { Plus, Edit2, Trash2, X, Copy } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';
import TipTapEditor, { TipTapEditorRef } from '../components/TipTapEditor';

const AVAILABLE_VARIABLES = [
  { key: '회사명', label: '입주사명' },
  { key: '대표자명', label: '대표자' },
  { key: '사업자번호', label: '사업자등록번호' },
  { key: '이메일', label: '이메일' },
  { key: '전화번호', label: '전화번호' },
  { key: '주소', label: '주소' },
  { key: '호실', label: '호실 번호' },
  { key: '호실유형', label: '호실 유형' },
  { key: '계약시작일', label: '계약 시작일' },
  { key: '계약종료일', label: '계약 종료일' },
  { key: '월사용료', label: '월 사용료' },
  { key: '월사용료VAT', label: '월 사용료(VAT포함)' },
  { key: '보증금', label: '보증금' },
  { key: '관리비', label: '관리비' },
  { key: '납부일', label: '납부일' },
  { key: '오늘날짜', label: '오늘 날짜' },
];

export default function ContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [form, setForm] = useState({ template_name: '', template_content: '' });
  const editorRef = useRef<TipTapEditorRef>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await contractTemplatesApi.getAll();
      setTemplates(res.data);
    } catch (error) {
      console.error('템플릿 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ template_name: '', template_content: '' });
    setShowModal(true);
  };

  const openEdit = (t: ContractTemplate) => {
    setEditingTemplate(t);
    setForm({ template_name: t.template_name, template_content: t.template_content });
    setShowModal(true);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleSave = async () => {
    if (!form.template_name.trim() || !stripHtml(form.template_content).trim()) {
      showError('이름과 내용을 입력해주세요.');
      return;
    }
    try {
      if (editingTemplate) {
        await contractTemplatesApi.update(editingTemplate.id, form);
        showSuccess('템플릿이 수정되었습니다.');
      } else {
        await contractTemplatesApi.create(form);
        showSuccess('템플릿이 생성되었습니다.');
      }
      setShowModal(false);
      loadTemplates();
    } catch (error) {
      showError('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await contractTemplatesApi.delete(id);
      showSuccess('삭제되었습니다.');
      loadTemplates();
    } catch (error) {
      showError('삭제에 실패했습니다.');
    }
  };

  const insertVariable = (key: string) => {
    editorRef.current?.insertContent(`{{${key}}}`);
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
          <h1 className="text-xl font-bold text-slate-900">계약서 템플릿</h1>
          <p className="text-slate-500 mt-1">재사용 가능한 계약서 양식을 관리합니다</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          새 템플릿
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">등록된 템플릿이 없습니다.</p>
          <button onClick={openCreate} className="btn-primary mt-4">템플릿 만들기</button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="card flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{t.template_name}</h3>
                <p className="text-sm text-slate-500 mt-1 truncate">
                  {stripHtml(t.template_content).substring(0, 100)}...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(t.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => openEdit(t)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingTemplate ? '템플릿 수정' : '새 템플릿'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">템플릿 이름</label>
                <input
                  type="text"
                  value={form.template_name}
                  onChange={e => setForm(prev => ({ ...prev, template_name: e.target.value }))}
                  className="input"
                  placeholder="예: 표준 임대차 계약서"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">변수 삽입</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">계약서 내용</label>
                <TipTapEditor
                  ref={editorRef}
                  content={form.template_content}
                  onChange={(html) => setForm(prev => ({ ...prev, template_content: html }))}
                  placeholder="계약서 내용을 입력하세요..."
                  minHeight="400px"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                취소
              </button>
              <button onClick={handleSave} className="btn-primary">
                {editingTemplate ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
