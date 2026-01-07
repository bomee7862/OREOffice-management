import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 월별 정산 목록 조회
router.get('/', async (req, res) => {
  try {
    const { year, status } = req.query;
    
    let sql = 'SELECT * FROM monthly_settlements WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (year) {
      sql += ` AND year_month LIKE $${paramIndex++}`;
      params.push(`${year}%`);
    }
    
    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    sql += ' ORDER BY year_month DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('정산 목록 조회 오류:', error);
    res.status(500).json({ error: '정산 목록 조회에 실패했습니다.' });
  }
});

// 월별 정산 상세 조회
router.get('/:year_month', async (req, res) => {
  try {
    const { year_month } = req.params;
    
    // 기존 정산 데이터 조회
    const existing = await query(
      'SELECT * FROM monthly_settlements WHERE year_month = $1',
      [year_month]
    );
    
    // 수입 내역
    const incomeResult = await query(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE type = '입금' 
        AND status = '완료'
        AND TO_CHAR(transaction_date, 'YYYY-MM') = $1
      GROUP BY category
      ORDER BY total DESC
    `, [year_month]);
    
    // 지출 내역
    const expenseResult = await query(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      WHERE type = '지출' 
        AND status = '완료'
        AND TO_CHAR(transaction_date, 'YYYY-MM') = $1
      GROUP BY category
      ORDER BY total DESC
    `, [year_month]);
    
    // 미수금 (대기중인 청구)
    const outstandingResult = await query(`
      SELECT mb.*, t.company_name, r.room_number
      FROM monthly_billings mb
      LEFT JOIN tenants t ON mb.tenant_id = t.id
      LEFT JOIN rooms r ON mb.room_id = r.id
      WHERE mb.year_month = $1 AND mb.status = '대기'
      ORDER BY mb.due_date
    `, [year_month]);
    
    // 입주율 계산
    const occupancyResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = '입주') as occupied,
        COUNT(*) FILTER (WHERE room_type NOT IN ('회의실', 'POST BOX')) as total
      FROM rooms
      WHERE room_type NOT IN ('회의실', 'POST BOX')
    `);
    
    // 신규 입주
    const newTenantsResult = await query(`
      SELECT c.*, t.company_name, r.room_number
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.id
      JOIN rooms r ON c.room_id = r.id
      WHERE TO_CHAR(c.start_date, 'YYYY-MM') = $1
      ORDER BY c.start_date
    `, [year_month]);
    
    // 퇴실 예정
    const expiringResult = await query(`
      SELECT c.*, t.company_name, r.room_number
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.id
      JOIN rooms r ON c.room_id = r.id
      WHERE c.is_active = true
        AND TO_CHAR(c.end_date, 'YYYY-MM') = $1
      ORDER BY c.end_date
    `, [year_month]);
    
    // 렌트프리 현황
    const rentFreeResult = await query(`
      SELECT c.*, t.company_name, r.room_number
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.id
      JOIN rooms r ON c.room_id = r.id
      WHERE c.is_active = true
        AND c.rent_free_start IS NOT NULL
        AND c.rent_free_end IS NOT NULL
        AND c.rent_free_start <= $1
        AND c.rent_free_end >= $2
      ORDER BY c.rent_free_start
    `, [`${year_month}-28`, `${year_month}-01`]);
    
    const totalIncome = incomeResult.rows.reduce((sum, r) => sum + parseInt(r.total || 0), 0);
    const totalExpense = expenseResult.rows.reduce((sum, r) => sum + parseInt(r.total || 0), 0);
    const outstandingAmount = outstandingResult.rows.reduce((sum, r) => sum + parseInt(r.amount || 0), 0);
    
    const occupancy = occupancyResult.rows[0];
    const occupancyRate = occupancy.total > 0 
      ? Math.round((occupancy.occupied / occupancy.total) * 100) 
      : 0;
    
    res.json({
      year_month,
      settlement: existing.rows[0] || null,
      income: {
        total: totalIncome,
        details: incomeResult.rows
      },
      expense: {
        total: totalExpense,
        details: expenseResult.rows
      },
      netProfit: totalIncome - totalExpense,
      outstanding: {
        total: outstandingAmount,
        count: outstandingResult.rows.length,
        items: outstandingResult.rows
      },
      occupancy: {
        occupied: parseInt(occupancy.occupied),
        total: parseInt(occupancy.total),
        rate: occupancyRate
      },
      changes: {
        newTenants: newTenantsResult.rows,
        expiring: expiringResult.rows,
        rentFree: rentFreeResult.rows
      }
    });
  } catch (error) {
    console.error('정산 상세 조회 오류:', error);
    res.status(500).json({ error: '정산 상세 조회에 실패했습니다.' });
  }
});

// 정산 생성/업데이트
router.post('/:year_month', async (req, res) => {
  try {
    const { year_month } = req.params;
    const { notes } = req.body;
    
    // 데이터 계산
    const incomeResult = await query(`
      SELECT SUM(amount) as total
      FROM transactions
      WHERE type = '입금' AND status = '완료'
        AND TO_CHAR(transaction_date, 'YYYY-MM') = $1
    `, [year_month]);
    
    const expenseResult = await query(`
      SELECT SUM(amount) as total
      FROM transactions
      WHERE type = '지출' AND status = '완료'
        AND TO_CHAR(transaction_date, 'YYYY-MM') = $1
    `, [year_month]);
    
    const outstandingResult = await query(`
      SELECT SUM(amount) as total
      FROM monthly_billings
      WHERE year_month = $1 AND status = '대기'
    `, [year_month]);
    
    const occupancyResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = '입주') as occupied,
        COUNT(*) FILTER (WHERE room_type NOT IN ('회의실', 'POST BOX')) as total
      FROM rooms
      WHERE room_type NOT IN ('회의실', 'POST BOX')
    `);
    
    const totalIncome = parseInt(incomeResult.rows[0]?.total || 0);
    const totalExpense = parseInt(expenseResult.rows[0]?.total || 0);
    const outstandingAmount = parseInt(outstandingResult.rows[0]?.total || 0);
    const occupancy = occupancyResult.rows[0];
    const occupancyRate = occupancy.total > 0 
      ? Math.round((occupancy.occupied / occupancy.total) * 100) 
      : 0;
    
    // UPSERT
    const result = await query(`
      INSERT INTO monthly_settlements 
        (year_month, total_income, total_expense, net_profit, occupancy_rate, outstanding_amount, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, '작성중')
      ON CONFLICT (year_month) 
      DO UPDATE SET 
        total_income = $2,
        total_expense = $3,
        net_profit = $4,
        occupancy_rate = $5,
        outstanding_amount = $6,
        notes = COALESCE($7, monthly_settlements.notes),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [year_month, totalIncome, totalExpense, totalIncome - totalExpense, occupancyRate, outstandingAmount, notes]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('정산 생성 오류:', error);
    res.status(500).json({ error: '정산 생성에 실패했습니다.' });
  }
});

// 정산 확정
router.post('/:year_month/confirm', async (req, res) => {
  try {
    const { year_month } = req.params;
    
    // 상세 데이터를 JSON으로 저장
    const detailResponse = await fetch(`http://localhost:${process.env.PORT || 3001}/api/settlements/${year_month}`);
    const detailData = await detailResponse.json();
    
    const result = await query(`
      UPDATE monthly_settlements 
      SET status = '확정', 
          confirmed_at = CURRENT_TIMESTAMP,
          report_data = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE year_month = $2
      RETURNING *
    `, [JSON.stringify(detailData), year_month]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '정산을 찾을 수 없습니다. 먼저 정산을 생성해주세요.' });
    }
    
    res.json({
      message: '정산이 확정되었습니다.',
      settlement: result.rows[0]
    });
  } catch (error) {
    console.error('정산 확정 오류:', error);
    res.status(500).json({ error: '정산 확정에 실패했습니다.' });
  }
});

// 정산 삭제
router.delete('/:year_month', async (req, res) => {
  try {
    const { year_month } = req.params;
    
    const result = await query(`
      DELETE FROM monthly_settlements WHERE year_month = $1 RETURNING *
    `, [year_month]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '정산을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '정산이 삭제되었습니다.' });
  } catch (error) {
    console.error('정산 삭제 오류:', error);
    res.status(500).json({ error: '정산 삭제에 실패했습니다.' });
  }
});

export default router;
