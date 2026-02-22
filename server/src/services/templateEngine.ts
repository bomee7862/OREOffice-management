import { query } from '../db/connection';

export interface TemplateVariables {
  [key: string]: string | number | null;
}

// 템플릿 내용에서 {{변수}} 치환
export function renderTemplate(content: string, variables: TemplateVariables): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

// 템플릿에서 사용 가능한 변수 목록 추출
export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

// 계약 ID로부터 템플릿 변수 맵 생성
export async function getContractVariables(contractId: number): Promise<TemplateVariables> {
  const result = await query(`
    SELECT
      c.*,
      r.room_number, r.room_type,
      t.company_name, t.representative_name, t.business_number,
      t.email, t.phone, t.address
    FROM contracts c
    JOIN rooms r ON c.room_id = r.id
    JOIN tenants t ON c.tenant_id = t.id
    WHERE c.id = $1
  `, [contractId]);

  if (result.rows.length === 0) {
    throw new Error('계약을 찾을 수 없습니다.');
  }

  const c = result.rows[0];
  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };
  const formatCurrency = (n: number) => {
    if (!n) return '0';
    return new Intl.NumberFormat('ko-KR').format(n);
  };
  const today = new Date();

  return {
    회사명: c.company_name,
    대표자명: c.representative_name,
    사업자번호: c.business_number || '',
    이메일: c.email || '',
    전화번호: c.phone || '',
    주소: c.address || '',
    호실: c.room_number,
    호실유형: c.room_type,
    계약시작일: formatDate(c.start_date),
    계약종료일: formatDate(c.end_date),
    월사용료: formatCurrency(c.monthly_rent),
    월사용료VAT: formatCurrency(c.monthly_rent_vat),
    보증금: formatCurrency(c.deposit),
    관리비: formatCurrency(c.management_fee),
    납부일: c.payment_day || 10,
    오늘날짜: formatDate(today.toISOString()),
    오늘연도: today.getFullYear(),
    오늘월: today.getMonth() + 1,
    오늘일: today.getDate(),
  };
}

// contract_data JSONB에서 변수 맵 생성 (계약 없이 직접 입력된 데이터)
export function getVariablesFromData(data: any): TemplateVariables {
  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };
  const formatCurrency = (n: number) => {
    if (!n && n !== 0) return '0';
    return new Intl.NumberFormat('ko-KR').format(n);
  };
  const today = new Date();

  return {
    회사명: data.company_name || '[회사명 입주자 기입]',
    대표자명: data.representative_name || '[대표자명 입주자 기입]',
    사업자번호: data.business_number || '[사업자번호 입주자 기입]',
    이메일: data.email || '',
    전화번호: data.phone || '[전화번호 입주자 기입]',
    주소: data.address || '[주소 입주자 기입]',
    호실: data.room_number || '',
    호실유형: data.room_type || '',
    계약시작일: formatDate(data.start_date),
    계약종료일: formatDate(data.end_date),
    월사용료: formatCurrency(data.monthly_rent),
    월사용료VAT: formatCurrency(data.monthly_rent_vat),
    보증금: formatCurrency(data.deposit),
    관리비: formatCurrency(data.management_fee),
    납부일: data.payment_day || 10,
    오늘날짜: formatDate(today.toISOString()),
    오늘연도: today.getFullYear(),
    오늘월: today.getMonth() + 1,
    오늘일: today.getDate(),
  };
}

// 사용 가능한 변수 목록 (UI에서 표시용)
export const AVAILABLE_VARIABLES = [
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
