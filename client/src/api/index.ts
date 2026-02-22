import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT 인증 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 응답 시 로그인 페이지로 리다이렉트
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 호실 API
export const roomsApi = {
  getAll: () => api.get('/rooms'),
  getById: (id: number) => api.get(`/rooms/${id}`),
  updateStatus: (id: number, status: string, last_company_name?: string, contract_ended_at?: string) => 
    api.patch(`/rooms/${id}/status`, { status, last_company_name, contract_ended_at }),
  update: (id: number, data: any) => api.put(`/rooms/${id}`, data),
  updateCard: (id: number, data: { card_x?: number; card_y?: number; card_width?: number; card_height?: number }) => 
    api.patch(`/rooms/${id}/card`, data),
};

// 입주사 API
export const tenantsApi = {
  getAll: () => api.get('/tenants'),
  getById: (id: number) => api.get(`/tenants/${id}`),
  create: (data: any) => api.post('/tenants', data),
  update: (id: number, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: number) => api.delete(`/tenants/${id}`),
};

// 계약 API
export const contractsApi = {
  getAll: (active?: boolean) => api.get('/contracts', { params: { active } }),
  getById: (id: number) => api.get(`/contracts/${id}`),
  create: (data: any) => api.post('/contracts', data),
  update: (id: number, data: any) => api.put(`/contracts/${id}`, data),
  terminate: (id: number, data?: { termination_type?: string; termination_reason?: string }) =>
    api.post(`/contracts/${id}/terminate`, data || {}),
  delete: (id: number, mode: 'soft' | 'hard' = 'soft') =>
    api.delete(`/contracts/${id}`, { params: { mode } }),
  getExpiring: (days?: number) => api.get('/contracts/expiring/soon', { params: { days } }),
  updateCard: (id: number, data: { card_x?: number; card_y?: number; card_width?: number; card_height?: number }) =>
    api.patch(`/contracts/${id}/card`, data),
  syncDeposits: () => api.post('/contracts/sync-deposits'),
};

// 거래 API
export const transactionsApi = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  getStats: (params?: any) => api.get('/transactions/stats', { params }),
  getCategories: () => api.get('/transactions/categories'),
  create: (data: any) => api.post('/transactions', data),
  update: (id: number, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  getMonthlySummary: (year: number, month: number) => 
    api.get('/transactions/summary/monthly', { params: { year, month } }),
  // 세금계산서 발행
  updateTaxInvoice: (id: number, data: { issued: boolean; issue_date?: string; invoice_number?: string }) =>
    api.patch(`/transactions/${id}/tax-invoice`, data),
  // 상세 수정 (입금확인내역 수정)
  updateDetails: (id: number, data: any) => api.patch(`/transactions/${id}/details`, data),
  // 보증금 관련 API
  getDeposits: (params?: { year_month?: string; status?: string }) => 
    api.get('/transactions/deposits/list', { params }),
  getPendingConversions: (year_month: string) => 
    api.get('/transactions/deposits/pending-conversion', { params: { year_month } }),
  confirmDeposit: (id: number, data: {
    payment_date: string;
    payment_method?: string;
    issue_tax_invoice?: boolean;
    tax_invoice_date?: string;
    tax_invoice_number?: string;
  }) => api.post(`/transactions/${id}/confirm-deposit`, data),
  convertToRent: (id: number, data: { conversion_date?: string }) => 
    api.post(`/transactions/${id}/convert-to-rent`, data),
};

// 청구 API
export const billingsApi = {
  getAll: (params?: any) => api.get('/billings', { params }),
  generate: (year_month: string, due_day?: number) => 
    api.post('/billings/generate', { year_month, due_day }),
  createSingle: (room_id: number, year_month: string) => 
    api.post('/billings/create-single', { room_id, year_month }),
  confirm: (id: number, data: { payment_date?: string; payment_method?: string; payment_amount?: number; notes?: string }) => 
    api.post(`/billings/${id}/confirm`, data),
  confirmBulk: (data: { billing_ids: number[]; payment_date?: string; payment_method?: string }) => 
    api.post('/billings/confirm-bulk', data),
  cancelPayment: (id: number) => api.post(`/billings/${id}/cancel-payment`),
  updateStatus: (id: number, data: { status?: string; payment_date?: string; notes?: string }) => 
    api.patch(`/billings/${id}/status`, data),
  updateTaxInvoice: (id: number, data: { issued: boolean; issue_date?: string; invoice_number?: string }) => 
    api.patch(`/billings/${id}/tax-invoice`, data),
  taxInvoiceBulk: (data: { billing_ids: number[]; issue_date?: string }) => 
    api.post('/billings/tax-invoice-bulk', data),
  delete: (id: number) => api.delete(`/billings/${id}`),
  getSummary: (year_month: string) => api.get(`/billings/summary/${year_month}`),
};

// 정산 API
export const settlementsApi = {
  getAll: (params?: any) => api.get('/settlements', { params }),
  getDetail: (year_month: string) => api.get(`/settlements/${year_month}`),
  create: (year_month: string, notes?: string) => 
    api.post(`/settlements/${year_month}`, { notes }),
  confirm: (year_month: string) => api.post(`/settlements/${year_month}/confirm`),
  delete: (year_month: string) => api.delete(`/settlements/${year_month}`),
};

// 대시보드 API
export const dashboardApi = {
  getSummary: () => api.get('/dashboard'),
  getRecentTransactions: (limit?: number) => 
    api.get('/dashboard/recent-transactions', { params: { limit } }),
  getExpiringContracts: (days?: number) => 
    api.get('/dashboard/expiring-contracts', { params: { days } }),
};

// 파일 업로드 API
export const uploadsApi = {
  upload: (formData: FormData) => api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadMultiple: (formData: FormData) => api.post('/uploads/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getByTenant: (tenantId: number) => api.get(`/uploads/tenant/${tenantId}`),
  getByContract: (contractId: number) => api.get(`/uploads/contract/${contractId}`),
  download: (id: number) => api.get(`/uploads/download/${id}`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/uploads/${id}`),
};

// 인증 API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data: { username: string; password: string; display_name: string; role: string }) =>
    api.post('/auth/users', data),
  updateUser: (id: number, data: any) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}`),
};

// 계약서 템플릿 API
export const contractTemplatesApi = {
  getAll: () => api.get('/contract-templates'),
  getById: (id: number) => api.get(`/contract-templates/${id}`),
  getVariables: () => api.get('/contract-templates/variables'),
  create: (data: { template_name: string; template_content: string }) =>
    api.post('/contract-templates', data),
  update: (id: number, data: any) => api.put(`/contract-templates/${id}`, data),
  delete: (id: number) => api.delete(`/contract-templates/${id}`),
};

// 전자 서명 API (관리자)
export const contractSigningApi = {
  getSessions: (params?: { status?: string }) =>
    api.get('/contract-signing/sessions', { params }),
  getSession: (id: number) => api.get(`/contract-signing/session/${id}`),
  preview: (data: { template_id: number; contract_data: any }) =>
    api.post('/contract-signing/preview', data),
  initiate: (data: { template_id: number; tenant_email: string; admin_email: string; contract_data: any; rendered_content?: string }) =>
    api.post('/contract-signing/initiate', data),
  getSignableSessions: () => api.get('/contract-signing/signable-sessions'),
  linkContract: (sessionId: number, contractId: number) =>
    api.patch(`/contract-signing/session/${sessionId}/link-contract`, { contract_id: contractId }),
  adminSign: (id: number, data: { signature_data: string }) =>
    api.post(`/contract-signing/admin-sign/${id}`, data),
  sendPDF: (id: number) => api.post(`/contract-signing/send-pdf/${id}`),
  deleteSession: (id: number) => api.delete(`/contract-signing/session/${id}`),
};

// 공개 서명 API (입주자, 인증 불필요)
export const publicSigningApi = {
  getContract: (token: string) => api.get(`/public/signing/${token}`),
  submitSignature: (token: string, data: {
    signature_data: string;
    company_name?: string;
    representative_name?: string;
    business_number?: string;
    phone?: string;
    address?: string;
  }) => api.post(`/public/signing/${token}/sign`, data),
};

export default api;

