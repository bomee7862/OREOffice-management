import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 수입 카테고리
const INCOME_CATEGORIES = ['월사용료', '관리비', '보증금', '회의실', '기타수입', '위약금', '비상주사용료', '회의실사용료', '1day사용료', '보증금입금', '사용료전환'];
// 지출 카테고리
const EXPENSE_CATEGORIES = ['임대료', '공과금', '인건비', '청소미화', '유지보수', '소모품', '마케팅', '기타지출'];

// 모든 거래 조회 (필터 지원)
router.get('/', async (req, res) => {
  try {
    const { type, category, start_date, end_date, tenant_id, room_id, status } = req.query;
    
    let sql = `
      SELECT tr.*, 
        t.company_name,
        r.room_number,
        c.start_date as contract_start_date,
        c.end_date as contract_end_date
      FROM transactions tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN rooms r ON tr.room_id = r.id
      LEFT JOIN contracts c ON tr.contract_id = c.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      sql += ` AND tr.type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (category) {
      const categories = (category as string).split(',');
      sql += ` AND tr.category = ANY($${paramIndex++})`;
      params.push(categories);
    }
    
    if (start_date) {
      sql += ` AND tr.transaction_date >= $${paramIndex++}`;
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ` AND tr.transaction_date <= $${paramIndex++}`;
      params.push(end_date);
    }
    
    if (tenant_id) {
      sql += ` AND tr.tenant_id = $${paramIndex++}`;
      params.push(tenant_id);
    }
    
    if (room_id) {
      sql += ` AND tr.room_id = $${paramIndex++}`;
      params.push(room_id);
    }
    
    if (status) {
      const statuses = (status as string).split(',');
      sql += ` AND tr.status = ANY($${paramIndex++})`;
      params.push(statuses);
    }
    
    sql += ' ORDER BY tr.transaction_date DESC, tr.created_at DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('거래 조회 오류:', error);
    res.status(500).json({ error: '거래 조회에 실패했습니다.' });
  }
});

// 거래 통계 조회
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params: any[] = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE transaction_date >= $1 AND transaction_date <= $2';
      params.push(start_date, end_date);
    }
    
    const result = await query(`
      SELECT 
        type,
        category,
        status,
        SUM(amount) as total_amount,
        SUM(vat_amount) as total_vat,
        COUNT(*) as count
      FROM transactions
      ${dateFilter}
      GROUP BY type, category, status
      ORDER BY type, category
    `, params);
    
    // 총계 계산
    const incomeTotal = result.rows
      .filter(r => r.type === '입금' && r.status === '완료')
      .reduce((sum, r) => sum + parseInt(r.total_amount), 0);
    
    const expenseTotal = result.rows
      .filter(r => r.type === '지출' && r.status === '완료')
      .reduce((sum, r) => sum + parseInt(r.total_amount), 0);
    
    const pendingTotal = result.rows
      .filter(r => r.status === '대기')
      .reduce((sum, r) => sum + parseInt(r.total_amount), 0);
    
    res.json({
      details: result.rows,
      summary: {
        income: incomeTotal,
        expense: expenseTotal,
        netProfit: incomeTotal - expenseTotal,
        pending: pendingTotal
      }
    });
  } catch (error) {
    console.error('거래 통계 조회 오류:', error);
    res.status(500).json({ error: '거래 통계 조회에 실패했습니다.' });
  }
});

// 거래 등록
router.post('/', async (req, res) => {
  try {
    const { 
      contract_id, tenant_id, room_id, billing_id,
      type, category, amount, vat_amount,
      transaction_date, due_date, status,
      description, payment_method, receipt_file, notes
    } = req.body;
    
    const result = await query(`
      INSERT INTO transactions 
        (contract_id, tenant_id, room_id, billing_id, type, category, amount, vat_amount,
         transaction_date, due_date, status, description, payment_method, receipt_file, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [contract_id, tenant_id, room_id, billing_id, type, category, amount, vat_amount || 0,
        transaction_date, due_date, status || '완료', description, payment_method, receipt_file, notes]);
    
    // billing_id가 있으면 청구 상태 업데이트
    if (billing_id) {
      await query(`
        UPDATE monthly_billings 
        SET status = '완료', payment_date = $1, transaction_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [transaction_date, result.rows[0].id, billing_id]);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('거래 등록 오류:', error);
    res.status(500).json({ error: '거래 등록에 실패했습니다.' });
  }
});

// 거래 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, category, amount, vat_amount, transaction_date, due_date, status,
      description, payment_method, receipt_file, notes
    } = req.body;
    
    const result = await query(`
      UPDATE transactions 
      SET type = COALESCE($1, type),
          category = COALESCE($2, category),
          amount = COALESCE($3, amount),
          vat_amount = COALESCE($4, vat_amount),
          transaction_date = COALESCE($5, transaction_date),
          due_date = COALESCE($6, due_date),
          status = COALESCE($7, status),
          description = COALESCE($8, description),
          payment_method = COALESCE($9, payment_method),
          receipt_file = COALESCE($10, receipt_file),
          notes = COALESCE($11, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [type, category, amount, vat_amount, transaction_date, due_date, status,
        description, payment_method, receipt_file, notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('거래 수정 오류:', error);
    res.status(500).json({ error: '거래 수정에 실패했습니다.' });
  }
});

// 거래 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 연결된 청구가 있으면 상태 되돌리기
    const transaction = await query('SELECT billing_id FROM transactions WHERE id = $1', [id]);
    if (transaction.rows[0]?.billing_id) {
      await query(`
        UPDATE monthly_billings SET status = '대기', payment_date = NULL, transaction_id = NULL
        WHERE id = $1
      `, [transaction.rows[0].billing_id]);
    }
    
    const result = await query(`
      DELETE FROM transactions WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '거래가 삭제되었습니다.', deleted: result.rows[0] });
  } catch (error) {
    console.error('거래 삭제 오류:', error);
    res.status(500).json({ error: '거래 삭제에 실패했습니다.' });
  }
});

// 월별 요약
router.get('/summary/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const yearMonth = `${year || new Date().getFullYear()}-${String(month || new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const result = await query(`
      SELECT 
        type,
        category,
        status,
        SUM(amount) as total_amount,
        SUM(vat_amount) as total_vat,
        COUNT(*) as count
      FROM transactions
      WHERE TO_CHAR(transaction_date, 'YYYY-MM') = $1
      GROUP BY type, category, status
      ORDER BY type, category
    `, [yearMonth]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('월별 요약 조회 오류:', error);
    res.status(500).json({ error: '월별 요약 조회에 실패했습니다.' });
  }
});

// 카테고리 목록
router.get('/categories', async (_req, res) => {
  res.json({
    income: INCOME_CATEGORIES,
    expense: EXPENSE_CATEGORIES
  });
});

// 세금계산서 발행 처리
router.patch('/:id/tax-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { issued, issue_date, invoice_number } = req.body;
    
    const result = await query(`
      UPDATE transactions 
      SET tax_invoice_issued = $1,
          tax_invoice_date = $2,
          tax_invoice_number = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [issued, issue_date || null, invoice_number || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('세금계산서 발행 처리 오류:', error);
    res.status(500).json({ error: '세금계산서 발행 처리에 실패했습니다.' });
  }
});

// 거래 상세 수정 (입금확인내역 수정용)
router.patch('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_date, payment_method, amount, notes, status } = req.body;
    
    const result = await query(`
      UPDATE transactions 
      SET transaction_date = COALESCE($1, transaction_date),
          payment_method = COALESCE($2, payment_method),
          amount = COALESCE($3, amount),
          notes = COALESCE($4, notes),
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [transaction_date, payment_method, amount, notes, status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('거래 상세 수정 오류:', error);
    res.status(500).json({ error: '거래 상세 수정에 실패했습니다.' });
  }
});

export default router;
