export const EXPENSE_CATEGORY_OPTIONS = [
  { value: '임대료', label: '임대료', icon: '🏠', color: 'bg-slate-100 text-slate-600' },
  { value: '관리비', label: '관리비', icon: '🏢', color: 'bg-slate-100 text-slate-600' },
  { value: '공과금', label: '공과금', icon: '💡', color: 'bg-yellow-100 text-yellow-600' },
  { value: '청소미화', label: '청소/미화', icon: '🧹', color: 'bg-teal-100 text-teal-600' },
  { value: '유지보수', label: '유지보수', icon: '🔧', color: 'bg-orange-100 text-orange-600' },
  { value: '소모품', label: '소모품', icon: '📦', color: 'bg-purple-100 text-purple-600' },
  { value: '마케팅', label: '마케팅', icon: '📣', color: 'bg-pink-100 text-pink-600' },
  { value: '기타지출', label: '기타', icon: '📋', color: 'bg-gray-100 text-gray-600' },
] as const;

export const EXPENSE_CATEGORY_VALUES = ['임대료', '관리비', '공과금', '청소미화', '유지보수', '소모품', '마케팅', '기타지출'] as const;

export const INCOME_CATEGORY_VALUES = ['월사용료', '관리비', '보증금입금', '위약금', '사용료전환', '비상주사용료', '회의실사용료', '1day사용료', '기타수입'] as const;
