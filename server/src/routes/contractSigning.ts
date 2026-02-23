import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/connection';
import { renderTemplate, getVariablesFromData } from '../services/templateEngine';
import { sendSigningEmail, sendFinalPDF } from '../services/emailService';
import { generateContractPDF } from '../services/pdfService';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// 세션 목록
router.get('/sessions', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT s.*,
             COALESCE((s.contract_data->>'company_name'), t.company_name) as company_name,
             COALESCE((s.contract_data->>'representative_name'), t.representative_name) as representative_name,
             COALESCE((s.contract_data->>'room_number'), r.room_number) as room_number,
             COALESCE((s.contract_data->>'start_date'), c.start_date::text) as start_date,
             COALESCE((s.contract_data->>'end_date'), c.end_date::text) as end_date,
             COALESCE((s.contract_data->>'monthly_rent')::int, c.monthly_rent) as monthly_rent,
             COALESCE((s.contract_data->>'deposit')::int, c.deposit) as deposit
      FROM contract_signing_sessions s
      LEFT JOIN contracts c ON s.contract_id = c.id
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
    `;
    const params: any[] = [];

    if (status) {
      sql += ' WHERE s.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY s.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('세션 목록 조회 실패:', error);
    res.status(500).json({ error: '세션 목록 조회에 실패했습니다.' });
  }
});

// 세션 상세
router.get('/session/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*,
             COALESCE((s.contract_data->>'company_name'), t.company_name) as company_name,
             COALESCE((s.contract_data->>'representative_name'), t.representative_name) as representative_name,
             COALESCE((s.contract_data->>'room_number'), r.room_number) as room_number,
             COALESCE((s.contract_data->>'room_type'), r.room_type::text) as room_type,
             COALESCE((s.contract_data->>'start_date'), c.start_date::text) as start_date,
             COALESCE((s.contract_data->>'end_date'), c.end_date::text) as end_date,
             COALESCE((s.contract_data->>'monthly_rent')::int, c.monthly_rent) as monthly_rent,
             COALESCE((s.contract_data->>'monthly_rent_vat')::int, c.monthly_rent_vat) as monthly_rent_vat,
             COALESCE((s.contract_data->>'deposit')::int, c.deposit) as deposit,
             COALESCE((s.contract_data->>'management_fee')::int, c.management_fee) as management_fee
      FROM contract_signing_sessions s
      LEFT JOIN contracts c ON s.contract_id = c.id
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE s.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('세션 조회 실패:', error);
    res.status(500).json({ error: '세션 조회에 실패했습니다.' });
  }
});

// 미리보기 (렌더링만, 저장/발송 없음)
router.post('/preview', async (req, res) => {
  try {
    const { template_id, contract_data } = req.body;
    if (!template_id || !contract_data) {
      return res.status(400).json({ error: '템플릿과 계약 정보는 필수입니다.' });
    }

    const templateResult = await query(
      'SELECT template_content FROM contract_templates WHERE id = $1',
      [template_id]
    );
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }

    const variables = getVariablesFromData(contract_data);
    const rendered_content = renderTemplate(templateResult.rows[0].template_content, variables);
    res.json({ rendered_content });
  } catch (error) {
    console.error('미리보기 실패:', error);
    res.status(500).json({ error: '미리보기에 실패했습니다.' });
  }
});

// 서명 요청 생성 + 메일 발송
router.post('/initiate', async (req: AuthRequest, res) => {
  try {
    const { template_id, tenant_email, admin_email, contract_data, rendered_content: customContent } = req.body;

    if (!tenant_email || !template_id || !contract_data) {
      return res.status(400).json({ error: '템플릿, 이메일, 계약 정보는 필수입니다.' });
    }

    let renderedContent = customContent;

    if (!renderedContent) {
      // 미리보기를 거치지 않은 경우 서버에서 렌더링
      const variables = getVariablesFromData(contract_data);
      const templateResult = await query(
        'SELECT template_content FROM contract_templates WHERE id = $1',
        [template_id]
      );
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
      }
      renderedContent = renderTemplate(templateResult.rows[0].template_content, variables);
    }

    const variables = getVariablesFromData(contract_data);

    // 토큰 생성
    const tenantToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 세션 생성
    const result = await query(`
      INSERT INTO contract_signing_sessions
        (template_id, tenant_token, tenant_email, admin_email, contract_data, rendered_content, status, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending_tenant', $7)
      RETURNING *
    `, [template_id, tenantToken, tenant_email, admin_email || null, JSON.stringify(contract_data), renderedContent, expiresAt]);

    const session = result.rows[0];

    // 메일 발송
    const signingLink = `${FRONTEND_URL}/sign/${tenantToken}`;
    const fmtCurrency = (n: number) => new Intl.NumberFormat('ko-KR').format(n || 0);

    await sendSigningEmail(tenant_email, signingLink, {
      companyName: contract_data.company_name,
      roomNumber: contract_data.room_number,
      startDate: String(variables.계약시작일),
      endDate: String(variables.계약종료일),
      monthlyRent: fmtCurrency(contract_data.monthly_rent_vat || contract_data.monthly_rent),
      deposit: fmtCurrency(contract_data.deposit),
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('서명 요청 생성 실패:', error);
    res.status(500).json({ error: '서명 요청 생성에 실패했습니다.' });
  }
});

// 관리자 서명
router.post('/admin-sign/:id', async (req: AuthRequest, res) => {
  try {
    const { signature_data } = req.body;
    if (!signature_data) {
      return res.status(400).json({ error: '서명 데이터가 필요합니다.' });
    }

    const check = await query(
      'SELECT status FROM contract_signing_sessions WHERE id = $1',
      [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    if (check.rows[0].status !== 'tenant_signed') {
      return res.status(400).json({ error: '입주자 서명이 완료된 후에만 관리자 서명이 가능합니다.' });
    }

    const result = await query(`
      UPDATE contract_signing_sessions
      SET admin_signature_data = $1,
          admin_signed_at = CURRENT_TIMESTAMP,
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING *
    `, [signature_data, req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('관리자 서명 실패:', error);
    res.status(500).json({ error: '관리자 서명에 실패했습니다.' });
  }
});

// 최종 PDF 발송
router.post('/send-pdf/:id', async (req: AuthRequest, res) => {
  try {
    const sessionResult = await query(
      'SELECT * FROM contract_signing_sessions WHERE id = $1',
      [req.params.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }

    const session = sessionResult.rows[0];
    if (session.status !== 'completed') {
      return res.status(400).json({ error: '양측 서명이 완료된 후에만 PDF 발송이 가능합니다.' });
    }

    const data = session.contract_data || {};
    const formatDate = (d: string) => {
      if (!d) return '';
      const date = new Date(d);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };
    const fmtCurrency = (n: number) => new Intl.NumberFormat('ko-KR').format(n || 0);

    const pdfBuffer = await generateContractPDF({
      content: session.rendered_content,
      tenantSignature: session.tenant_signature_data,
      adminSignature: session.admin_signature_data,
      tenantName: data.representative_name || '',
      tenantSignedAt: session.tenant_signed_at ? formatDate(session.tenant_signed_at) : undefined,
      adminSignedAt: session.admin_signed_at ? formatDate(session.admin_signed_at) : undefined,
      contractDetails: {
        companyName: data.company_name || '',
        roomNumber: data.room_number || '',
        startDate: formatDate(data.start_date),
        endDate: formatDate(data.end_date),
        monthlyRent: fmtCurrency(data.monthly_rent_vat || data.monthly_rent),
        deposit: fmtCurrency(data.deposit),
      },
    });

    const adminEmail = session.admin_email;

    await sendFinalPDF(
      session.tenant_email,
      adminEmail || session.tenant_email,
      pdfBuffer,
      {
        companyName: data.company_name || '',
        roomNumber: data.room_number || '',
        startDate: formatDate(data.start_date),
        endDate: formatDate(data.end_date),
        monthlyRent: fmtCurrency(data.monthly_rent_vat || data.monthly_rent),
        deposit: fmtCurrency(data.deposit),
      }
    );

    await query(`
      UPDATE contract_signing_sessions
      SET status = 'sent', final_pdf_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    res.json({ message: 'PDF가 양측에 발송되었습니다.' });
  } catch (error) {
    console.error('PDF 발송 실패:', error);
    res.status(500).json({ error: 'PDF 발송에 실패했습니다.' });
  }
});

// 서명 완료 + 계약 미연결 세션 목록 (호실현황 불러오기용)
router.get('/signable-sessions', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, contract_data, tenant_email, status, created_at
      FROM contract_signing_sessions
      WHERE contract_id IS NULL AND status IN ('completed', 'sent')
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('signable-sessions 조회 실패:', error);
    res.status(500).json({ error: '조회에 실패했습니다.' });
  }
});

// 세션에 계약 ID 연결
router.patch('/session/:id/link-contract', async (req, res) => {
  try {
    const { contract_id } = req.body;
    if (!contract_id) {
      return res.status(400).json({ error: 'contract_id가 필요합니다.' });
    }
    const result = await query(`
      UPDATE contract_signing_sessions
      SET contract_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING id
    `, [contract_id, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    res.json({ message: '연결되었습니다.' });
  } catch (error) {
    console.error('세션-계약 연결 실패:', error);
    res.status(500).json({ error: '연결에 실패했습니다.' });
  }
});

// 세션 삭제
router.delete('/session/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM contract_signing_sessions WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
    }
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('세션 삭제 실패:', error);
    res.status(500).json({ error: '세션 삭제에 실패했습니다.' });
  }
});

export default router;
