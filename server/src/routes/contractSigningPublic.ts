import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 토큰으로 계약 내용 조회 (공개)
router.get('/:token', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.rendered_content, s.status, s.tenant_email,
             s.tenant_signed_at, s.expires_at, s.contract_data
      FROM contract_signing_sessions s
      WHERE s.tenant_token = $1
    `, [req.params.token]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 링크입니다.' });
    }

    const session = result.rows[0];
    const data = session.contract_data || {};

    // 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ error: '서명 링크가 만료되었습니다.' });
    }

    // 이미 서명 완료
    const alreadySigned = session.tenant_signed_at !== null;

    res.json({
      id: session.id,
      rendered_content: session.rendered_content,
      status: session.status,
      already_signed: alreadySigned,
      company_name: data.company_name || '',
      representative_name: data.representative_name || '',
      room_number: data.room_number || '',
      room_type: data.room_type || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      monthly_rent: data.monthly_rent || 0,
      monthly_rent_vat: data.monthly_rent_vat || 0,
      deposit: data.deposit || 0,
      management_fee: data.management_fee || 0,
      phone: data.phone || '',
      address: data.address || '',
    });
  } catch (error) {
    console.error('계약 조회 실패:', error);
    res.status(500).json({ error: '계약 조회에 실패했습니다.' });
  }
});

// 입주자 서명 제출 (공개)
router.post('/:token/sign', async (req, res) => {
  try {
    const { signature_data, company_name, representative_name, business_number, phone, address } = req.body;
    if (!signature_data) {
      return res.status(400).json({ error: '서명 데이터가 필요합니다.' });
    }

    // 세션 확인
    const check = await query(`
      SELECT id, status, tenant_signed_at, expires_at, contract_data, rendered_content
      FROM contract_signing_sessions
      WHERE tenant_token = $1
    `, [req.params.token]);

    if (check.rows.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 링크입니다.' });
    }

    const session = check.rows[0];

    // 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ error: '서명 링크가 만료되었습니다.' });
    }

    // 이미 서명 완료
    if (session.tenant_signed_at) {
      return res.status(400).json({ error: '이미 서명이 완료되었습니다.' });
    }

    // 상태 확인
    if (session.status !== 'pending_tenant') {
      return res.status(400).json({ error: '서명할 수 없는 상태입니다.' });
    }

    // 입주자 입력 정보 처리
    let contractData = { ...(session.contract_data || {}) };
    let renderedContent = session.rendered_content || '';

    const tenantFields: Record<string, { placeholder: string; value?: string }> = {
      company_name: { placeholder: '[회사명 입주자 기입]', value: company_name },
      representative_name: { placeholder: '[대표자명 입주자 기입]', value: representative_name },
      business_number: { placeholder: '[사업자번호 입주자 기입]', value: business_number },
      phone: { placeholder: '[전화번호 입주자 기입]', value: phone },
      address: { placeholder: '[주소 입주자 기입]', value: address },
    };

    for (const [key, { placeholder, value }] of Object.entries(tenantFields)) {
      if (value) {
        contractData[key] = value;
        renderedContent = renderedContent.replaceAll(placeholder, value);
      }
    }

    // 서명 저장
    await query(`
      UPDATE contract_signing_sessions
      SET tenant_signature_data = $1,
          tenant_signed_at = CURRENT_TIMESTAMP,
          status = 'tenant_signed',
          contract_data = $2,
          rendered_content = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [signature_data, JSON.stringify(contractData), renderedContent, session.id]);

    res.json({ message: '서명이 완료되었습니다.' });
  } catch (error) {
    console.error('서명 제출 실패:', error);
    res.status(500).json({ error: '서명 제출에 실패했습니다.' });
  }
});

export default router;
