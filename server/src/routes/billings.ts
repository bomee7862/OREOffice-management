import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 월별 청구 목록 조회
router.get('/', async (req, res) => {
  try {
    const { year_month, status, tenant_id } = req.query;
    
    let sql = `
      SELECT mb.*, 
        t.company_name, t.representative_name,
        r.room_number, r.room_type
      FROM monthly_billings mb
      LEFT JOIN tenants t ON mb.tenant_id = t.id
      LEFT JOIN rooms r ON mb.room_id = r.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (year_month) {
      sql += ` AND mb.year_month = $${paramIndex++}`;
      params.push(year_month);
    }
    
    if (status) {
      const statuses = (status as string).split(',');
      sql += ` AND mb.status = ANY($${paramIndex++})`;
      params.push(statuses);
    }
    
    if (tenant_id) {
      sql += ` AND mb.tenant_id = $${paramIndex++}`;
      params.push(tenant_id);
    }
    
    sql += ' ORDER BY mb.due_date ASC, r.room_number ASC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('청구 조회 오류:', error);
    res.status(500).json({ error: '청구 조회에 실패했습니다.' });
  }
});

// 월별 청구 자동 생성
router.post('/generate', async (req, res) => {
  try {
    const { year_month, due_day = 5 } = req.body;
    
    if (!year_month) {
      return res.status(400).json({ error: '년월(year_month)을 지정해주세요.' });
    }
    
    const [year, month] = year_month.split('-').map(Number);
    const dueDate = new Date(year, month - 1, due_day);
    
    // 해당 월에 이미 생성된 청구가 있는지 확인
    const existing = await query(
      'SELECT COUNT(*) as count FROM monthly_billings WHERE year_month = $1',
      [year_month]
    );
    
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: '이미 해당 월의 청구가 생성되어 있습니다.',
        count: existing.rows[0].count 
      });
    }
    
    // 활성 계약 조회 (렌트프리 기간 제외)
    const contracts = await query(`
      SELECT c.*, r.room_number, t.company_name
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.is_active = true
        AND c.start_date <= $1
        AND c.end_date >= $2
        AND (
          c.rent_free_start IS NULL 
          OR c.rent_free_end IS NULL
          OR NOT ($3 >= c.rent_free_start AND $3 <= c.rent_free_end)
        )
    `, [
      `${year_month}-28`, // 월말까지
      `${year_month}-01`, // 월초부터
      `${year_month}-15`  // 월 중순 기준으로 렌트프리 체크
    ]);
    
    const billings = [];
    
    for (const contract of contracts.rows) {
      // 월세 청구
      if (contract.monthly_rent_vat > 0) {
        const billing = await query(`
          INSERT INTO monthly_billings 
            (year_month, contract_id, room_id, tenant_id, billing_type, amount, vat_amount, due_date, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          year_month,
          contract.id,
          contract.room_id,
          contract.tenant_id,
          '월사용료',
          contract.monthly_rent_vat,
          contract.monthly_rent_vat - contract.monthly_rent,
          dueDate.toISOString().split('T')[0],
          '대기'
        ]);
        billings.push(billing.rows[0]);
      }
      
      // 관리비 청구 (있는 경우)
      if (contract.management_fee > 0) {
        const billing = await query(`
          INSERT INTO monthly_billings 
            (year_month, contract_id, room_id, tenant_id, billing_type, amount, vat_amount, due_date, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          year_month,
          contract.id,
          contract.room_id,
          contract.tenant_id,
          '관리비',
          contract.management_fee,
          0,
          dueDate.toISOString().split('T')[0],
          '대기'
        ]);
        billings.push(billing.rows[0]);
      }
    }
    
    res.status(201).json({
      message: `${year_month} 청구가 생성되었습니다.`,
      count: billings.length,
      billings
    });
  } catch (error) {
    console.error('청구 생성 오류:', error);
    res.status(500).json({ error: '청구 생성에 실패했습니다.' });
  }
});

// 개별 호실 청구 생성
router.post('/create-single', async (req, res) => {
  try {
    const { room_id, year_month } = req.body;
    
    if (!room_id || !year_month) {
      return res.status(400).json({ error: '호실 ID와 년월을 지정해주세요.' });
    }
    
    // 해당 호실의 활성 계약 조회
    const contractResult = await query(`
      SELECT c.*, r.room_number, t.company_name
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.room_id = $1 AND c.is_active = true
    `, [room_id]);
    
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: '해당 호실의 활성 계약을 찾을 수 없습니다.' });
    }
    
    const contract = contractResult.rows[0];
    
    // 이미 해당 월의 청구가 있는지 확인
    const existing = await query(
      'SELECT id FROM monthly_billings WHERE room_id = $1 AND year_month = $2',
      [room_id, year_month]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: '이미 해당 월의 청구가 존재합니다.' });
    }
    
    // 납부일 계산
    const [year, month] = year_month.split('-').map(Number);
    const paymentDay = contract.payment_day || 10;
    const dueDate = new Date(year, month - 1, paymentDay);
    
    const billings = [];
    
    // 월세 청구
    if (contract.monthly_rent_vat > 0) {
      const billing = await query(`
        INSERT INTO monthly_billings 
          (year_month, contract_id, room_id, tenant_id, billing_type, amount, vat_amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        year_month,
        contract.id,
        contract.room_id,
        contract.tenant_id,
        '월사용료',
        contract.monthly_rent_vat,
        contract.monthly_rent_vat - contract.monthly_rent,
        dueDate.toISOString().split('T')[0],
        '대기'
      ]);
      billings.push(billing.rows[0]);
    }
    
    // 관리비 청구 (있는 경우)
    if (contract.management_fee > 0) {
      const billing = await query(`
        INSERT INTO monthly_billings 
          (year_month, contract_id, room_id, tenant_id, billing_type, amount, vat_amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        year_month,
        contract.id,
        contract.room_id,
        contract.tenant_id,
        '관리비',
        contract.management_fee,
        0,
        dueDate.toISOString().split('T')[0],
        '대기'
      ]);
      billings.push(billing.rows[0]);
    }
    
    res.status(201).json({
      message: `${contract.room_number}호 청구가 생성되었습니다.`,
      billings
    });
  } catch (error) {
    console.error('개별 청구 생성 오류:', error);
    res.status(500).json({ error: '청구 생성에 실패했습니다.' });
  }
});

// 청구 입금 확인 (거래 생성)
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, payment_method, payment_amount, notes } = req.body;
    
    // 청구 정보 조회
    const billing = await query(`
      SELECT mb.*, t.company_name, r.room_number
      FROM monthly_billings mb
      LEFT JOIN tenants t ON mb.tenant_id = t.id
      LEFT JOIN rooms r ON mb.room_id = r.id
      WHERE mb.id = $1
    `, [id]);
    
    if (billing.rows.length === 0) {
      return res.status(404).json({ error: '청구를 찾을 수 없습니다.' });
    }
    
    const bill = billing.rows[0];
    
    if (bill.status === '완료') {
      return res.status(400).json({ error: '이미 입금 확인된 청구입니다.' });
    }
    
    // 실제 납부액 (지정되지 않으면 청구액 사용)
    const actualAmount = payment_amount !== undefined ? payment_amount : bill.amount;
    
    // VAT 계산 (납부액 기준)
    const actualVat = Math.round(actualAmount - actualAmount / 1.1);
    
    // 차액 계산
    const difference = actualAmount - bill.amount;
    let description = `${bill.room_number}호 ${bill.company_name} ${bill.year_month} ${bill.billing_type}`;
    if (difference !== 0) {
      description += ` (청구액 대비 ${difference > 0 ? '+' : ''}${difference.toLocaleString()}원)`;
    }
    
    // 거래 생성
    const transaction = await query(`
      INSERT INTO transactions 
        (contract_id, tenant_id, room_id, billing_id, type, category, amount, vat_amount,
         transaction_date, status, description, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      bill.contract_id,
      bill.tenant_id,
      bill.room_id,
      bill.id,
      '입금',
      bill.billing_type,
      actualAmount,
      actualVat,
      payment_date || new Date().toISOString().split('T')[0],
      '완료',
      description,
      payment_method || '계좌이체',
      notes
    ]);
    
    // 청구 상태 업데이트 (실제 납부액, notes도 저장)
    await query(`
      UPDATE monthly_billings
      SET status = '완료',
          payment_date = $1,
          transaction_id = $2,
          amount = $3,
          vat_amount = $4,
          notes = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [payment_date || new Date().toISOString().split('T')[0], transaction.rows[0].id, actualAmount, actualVat, notes || null, id]);
    
    res.json({
      message: '입금이 확인되었습니다.',
      transaction: transaction.rows[0],
      difference: difference
    });
  } catch (error) {
    console.error('입금 확인 오류:', error);
    res.status(500).json({ error: '입금 확인에 실패했습니다.' });
  }
});

// 일괄 입금 확인
router.post('/confirm-bulk', async (req, res) => {
  try {
    const { billing_ids, payment_date, payment_method } = req.body;
    
    if (!billing_ids || billing_ids.length === 0) {
      return res.status(400).json({ error: '선택된 청구가 없습니다.' });
    }
    
    const results = [];
    
    for (const id of billing_ids) {
      // 청구 정보 조회
      const billing = await query(`
        SELECT mb.*, t.company_name, r.room_number
        FROM monthly_billings mb
        LEFT JOIN tenants t ON mb.tenant_id = t.id
        LEFT JOIN rooms r ON mb.room_id = r.id
        WHERE mb.id = $1 AND mb.status = '대기'
      `, [id]);
      
      if (billing.rows.length === 0) continue;
      
      const bill = billing.rows[0];
      
      // 거래 생성
      const transaction = await query(`
        INSERT INTO transactions 
          (contract_id, tenant_id, room_id, billing_id, type, category, amount, vat_amount,
           transaction_date, status, description, payment_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        bill.contract_id,
        bill.tenant_id,
        bill.room_id,
        bill.id,
        '입금',
        bill.billing_type,
        bill.amount,
        bill.vat_amount,
        payment_date || new Date().toISOString().split('T')[0],
        '완료',
        `${bill.room_number}호 ${bill.company_name} ${bill.year_month} ${bill.billing_type}`,
        payment_method || '계좌이체'
      ]);
      
      // 청구 상태 업데이트
      await query(`
        UPDATE monthly_billings 
        SET status = '완료', payment_date = $1, transaction_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [payment_date || new Date().toISOString().split('T')[0], transaction.rows[0].id, id]);
      
      results.push({ billing_id: id, transaction_id: transaction.rows[0].id });
    }
    
    res.json({
      message: `${results.length}건의 입금이 확인되었습니다.`,
      results
    });
  } catch (error) {
    console.error('일괄 입금 확인 오류:', error);
    res.status(500).json({ error: '일괄 입금 확인에 실패했습니다.' });
  }
});

// 세금계산서 발행 처리
router.patch('/:id/tax-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { issued, issue_date, invoice_number } = req.body;
    
    const result = await query(`
      UPDATE monthly_billings 
      SET tax_invoice_issued = $1, 
          tax_invoice_date = $2, 
          tax_invoice_number = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [issued, issue_date || null, invoice_number || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '청구를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('세금계산서 발행 처리 오류:', error);
    res.status(500).json({ error: '세금계산서 발행 처리에 실패했습니다.' });
  }
});

// 일괄 세금계산서 발행
router.post('/tax-invoice-bulk', async (req, res) => {
  try {
    const { billing_ids, issue_date } = req.body;
    
    if (!billing_ids || billing_ids.length === 0) {
      return res.status(400).json({ error: '선택된 청구가 없습니다.' });
    }
    
    const result = await query(`
      UPDATE monthly_billings 
      SET tax_invoice_issued = true, 
          tax_invoice_date = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
      RETURNING *
    `, [issue_date || new Date().toISOString().split('T')[0], billing_ids]);
    
    res.json({
      message: `${result.rows.length}건의 세금계산서가 발행 처리되었습니다.`,
      billings: result.rows
    });
  } catch (error) {
    console.error('일괄 세금계산서 발행 오류:', error);
    res.status(500).json({ error: '일괄 세금계산서 발행에 실패했습니다.' });
  }
});

// 청구 상태 변경
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_date, notes } = req.body;
    
    const result = await query(`
      UPDATE monthly_billings 
      SET status = COALESCE($1, status),
          payment_date = COALESCE($2, payment_date),
          notes = COALESCE($3, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, payment_date, notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '청구를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('청구 상태 변경 오류:', error);
    res.status(500).json({ error: '청구 상태 변경에 실패했습니다.' });
  }
});

// 입금 취소 (완료 → 대기로 되돌림)
router.post('/:id/cancel-payment', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 청구 정보 조회
    const billing = await query(`
      SELECT mb.*, t.company_name, r.room_number
      FROM monthly_billings mb
      LEFT JOIN tenants t ON mb.tenant_id = t.id
      LEFT JOIN rooms r ON mb.room_id = r.id
      WHERE mb.id = $1
    `, [id]);
    
    if (billing.rows.length === 0) {
      return res.status(404).json({ error: '청구를 찾을 수 없습니다.' });
    }
    
    const bill = billing.rows[0];
    
    if (bill.status !== '완료') {
      return res.status(400).json({ error: '입금 완료 상태가 아닙니다.' });
    }
    
    // 연결된 거래 삭제
    if (bill.transaction_id) {
      await query('DELETE FROM transactions WHERE id = $1', [bill.transaction_id]);
    }
    
    // 청구 상태를 대기로 되돌림
    const result = await query(`
      UPDATE monthly_billings 
      SET status = '대기', 
          payment_date = NULL, 
          transaction_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    res.json({
      message: `${bill.room_number}호 ${bill.company_name} 입금이 취소되었습니다.`,
      billing: result.rows[0]
    });
  } catch (error) {
    console.error('입금 취소 오류:', error);
    res.status(500).json({ error: '입금 취소에 실패했습니다.' });
  }
});

// 청구 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      DELETE FROM monthly_billings WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '청구를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '청구가 삭제되었습니다.' });
  } catch (error) {
    console.error('청구 삭제 오류:', error);
    res.status(500).json({ error: '청구 삭제에 실패했습니다.' });
  }
});

// 월별 청구 요약
router.get('/summary/:year_month', async (req, res) => {
  try {
    const { year_month } = req.params;
    
    const result = await query(`
      SELECT 
        billing_type,
        status,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM monthly_billings
      WHERE year_month = $1
      GROUP BY billing_type, status
      ORDER BY billing_type, status
    `, [year_month]);
    
    const totalBilled = result.rows.reduce((sum, r) => sum + parseInt(r.total_amount), 0);
    const totalPaid = result.rows
      .filter(r => r.status === '완료')
      .reduce((sum, r) => sum + parseInt(r.total_amount), 0);
    const totalPending = result.rows
      .filter(r => r.status === '대기')
      .reduce((sum, r) => sum + parseInt(r.total_amount), 0);
    
    res.json({
      year_month,
      details: result.rows,
      summary: {
        totalBilled,
        totalPaid,
        totalPending,
        paidRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0
      }
    });
  } catch (error) {
    console.error('청구 요약 조회 오류:', error);
    res.status(500).json({ error: '청구 요약 조회에 실패했습니다.' });
  }
});

export default router;

