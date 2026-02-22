export type RoomType = '1인실' | '2인실' | '6인실' | '회의실' | '자유석' | 'POST BOX';
export type RoomStatus = '입주' | '계약종료' | '공실' | '예약' | '정비중';
export type TransactionType = '입금' | '지출';
export type IncomeCategory = '월사용료' | '관리비' | '보증금' | '회의실' | '기타수입' | '위약금' | '비상주사용료' | '회의실사용료' | '1day사용료' | '보증금입금' | '사용료전환';
export type ExpenseCategory = '임대료' | '공과금' | '인건비' | '청소미화' | '유지보수' | '소모품' | '마케팅' | '기타지출';
export type TransactionCategory = IncomeCategory | ExpenseCategory;
export type PaymentStatus = '대기' | '완료' | '연체' | '취소' | '전환완료';
export type PaymentMethod = '계좌이체' | '카드' | '현금' | '자동이체' | '기타';
export type TenantType = '상주' | '비상주';
export type DocumentType = '계약서' | '사업자등록증' | '신분증' | '기타';
export type TerminationType = '만기종료' | '중도종료';
export type DepositStatus = '보유' | '사용료전환' | '위약금전환';

export interface Room {
  id: number;
  room_number: string;
  room_type: RoomType;
  floor: number;
  area_sqm: number | null;
  base_price: number;
  status: RoomStatus;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  card_x: number | null;
  card_y: number | null;
  card_width: number | null;
  card_height: number | null;
  last_company_name: string | null;
  contract_ended_at: string | null;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  contract_id?: number;
  tenant_id?: number;
  company_name?: string;
  representative_name?: string;
  business_number?: string;
  email?: string;
  phone?: string;
  start_date?: string;
  end_date?: string;
  monthly_rent?: number;
  monthly_rent_vat?: number;
  deposit?: number;
  management_fee?: number;
  payment_day?: number;
}

export interface Tenant {
  id: number;
  company_name: string;
  representative_name: string;
  business_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tenant_type: TenantType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  active_contracts?: number;
  rooms?: string;
}

export interface Document {
  id: number;
  tenant_id: number | null;
  contract_id: number | null;
  document_type: DocumentType;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: number;
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  monthly_rent_vat: number;
  deposit: number;
  management_fee: number;
  payment_day: number;
  is_active: boolean;
  notes: string | null;
  card_x: number | null;
  card_y: number | null;
  card_width: number | null;
  card_height: number | null;
  rent_free_start: string | null;
  rent_free_end: string | null;
  termination_type: TerminationType | null;
  penalty_amount: number;
  deposit_status: DepositStatus;
  termination_reason: string | null;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  room_number?: string;
  room_type?: RoomType;
  company_name?: string;
  representative_name?: string;
  phone?: string;
  tenant_type?: TenantType;
}

export interface Transaction {
  id: number;
  contract_id: number | null;
  tenant_id: number | null;
  room_id: number | null;
  billing_id: number | null;
  type: TransactionType;
  category: string;
  amount: number;
  vat_amount: number;
  transaction_date: string;
  due_date: string | null;
  status: PaymentStatus;
  description: string | null;
  payment_method: string | null;
  receipt_file: string | null;
  notes: string | null;
  tax_invoice_issued: boolean;
  tax_invoice_date: string | null;
  tax_invoice_number: string | null;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  company_name?: string;
  room_number?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  monthly_rent_vat?: number;
  payment_day?: number;
}

export interface Billing {
  id: number;
  year_month: string;
  contract_id: number;
  room_id: number;
  tenant_id: number;
  billing_type: string;
  amount: number;
  vat_amount: number;
  due_date: string;
  status: PaymentStatus;
  payment_date: string | null;
  transaction_id: number | null;
  tax_invoice_issued: boolean;
  tax_invoice_date: string | null;
  tax_invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  company_name?: string;
  representative_name?: string;
  room_number?: string;
  room_type?: RoomType;
}

export interface Settlement {
  id: number;
  year_month: string;
  total_income: number;
  total_expense: number;
  net_profit: number;
  occupancy_rate: number;
  outstanding_amount: number;
  report_data: any;
  status: '작성중' | '확정';
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementDetail {
  year_month: string;
  settlement: Settlement | null;
  income: {
    total: number;
    details: { category: string; total: number; count: number }[];
  };
  expense: {
    total: number;
    details: { category: string; total: number; count: number }[];
  };
  netProfit: number;
  outstanding: {
    total: number;
    count: number;
    items: Billing[];
  };
  occupancy: {
    occupied: number;
    total: number;
    rate: number;
  };
  changes: {
    newTenants: Contract[];
    expiring: Contract[];
    rentFree: Contract[];
  };
}

export type UserRole = 'admin' | 'viewer';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SigningStatus = 'pending_tenant' | 'tenant_signed' | 'pending_admin' | 'completed' | 'sent';

export interface ContractTemplate {
  id: number;
  template_name: string;
  template_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractSigningSession {
  id: number;
  contract_id: number;
  template_id: number | null;
  tenant_token: string;
  tenant_email: string;
  rendered_content: string;
  tenant_signature_data: string | null;
  tenant_signed_at: string | null;
  admin_signature_data: string | null;
  admin_signed_at: string | null;
  status: SigningStatus;
  final_pdf_sent_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  company_name?: string;
  representative_name?: string;
  room_number?: string;
  start_date?: string;
  end_date?: string;
  monthly_rent?: number;
  deposit?: number;
}

export interface DashboardSummary {
  room_stats: { status: RoomStatus; count: string }[];
  postbox_stats: { status: RoomStatus; count: string }[];
  monthly_finance: { type: TransactionType; total: string }[];
  expiring_contracts: number;
  tenant_count: number;
  occupancy_rate: string;
  total_rooms: number;
  occupied_rooms: number;
  total_postbox: number;
  occupied_postbox: number;
  total_deposit: number;
  deposit_count: number;
  room_monthly_revenue: number;
  postbox_monthly_revenue: number;
}

