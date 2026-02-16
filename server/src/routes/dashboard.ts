import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 대시보드 전체 요약
router.get('/', async (req, res) => {
  try {
    // 호실 현황 (POST BOX 제외)
    const roomStats = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM rooms
      WHERE room_type != '회의실' AND room_type != '자유석' AND room_type != 'POST BOX'
      GROUP BY status
    `);
    
    // POST BOX 현황
    const postBoxStats = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM rooms
      WHERE room_type = 'POST BOX'
      GROUP BY status
    `);
    
    // 이번 달 수입/지출
    const currentMonth = new Date();
    const monthlyFinance = await query(`
      SELECT 
        type,
        SUM(amount) as total
      FROM transactions
      WHERE EXTRACT(YEAR FROM transaction_date) = $1
        AND EXTRACT(MONTH FROM transaction_date) = $2
      GROUP BY type
    `, [currentMonth.getFullYear(), currentMonth.getMonth() + 1]);
    
    // 만료 예정 계약 (30일 이내)
    const expiringContracts = await query(`
      SELECT COUNT(*) as count
      FROM contracts
      WHERE is_active = true 
        AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    `);
    
    // 총 입주사 수
    const tenantCount = await query(`
      SELECT COUNT(DISTINCT tenant_id) as count
      FROM contracts
      WHERE is_active = true
    `);
    
    // 입주율 계산 (호실만, POST BOX 제외)
    const totalRooms = await query(`
      SELECT COUNT(*) as count
      FROM rooms
      WHERE room_type != '회의실' AND room_type != '자유석' AND room_type != 'POST BOX'
    `);

    const occupiedRooms = await query(`
      SELECT COUNT(*) as count
      FROM rooms
      WHERE status = '입주' AND room_type != '회의실' AND room_type != '자유석' AND room_type != 'POST BOX'
    `);
    
    // POST BOX 통계
    const totalPostBox = await query(`
      SELECT COUNT(*) as count FROM rooms WHERE room_type = 'POST BOX'
    `);
    
    const occupiedPostBox = await query(`
      SELECT COUNT(*) as count FROM rooms WHERE room_type = 'POST BOX' AND status = '입주'
    `);

    // 호실(상주) 예상 월 매출: 활성 계약의 monthly_rent 합계 (POST BOX 제외)
    const roomMonthlyRevenue = await query(`
      SELECT COALESCE(SUM(c.monthly_rent), 0) as total
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      WHERE c.is_active = true
        AND r.room_type != 'POST BOX'
        AND r.room_type != '회의실'
        AND r.room_type != '자유석'
    `);

    // POST BOX(비상주) 예상 월 매출: 활성 계약의 monthly_rent 합계
    const postboxMonthlyRevenue = await query(`
      SELECT COALESCE(SUM(c.monthly_rent), 0) as total
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      WHERE c.is_active = true
        AND r.room_type = 'POST BOX'
    `);

    // 보유 보증금 총액 (활성 계약 중 보증금 상태가 '보유'인 것만 합산)
    // 위약금전환, 사용료차감 등으로 전환된 보증금은 제외
    const totalDeposit = await query(`
      SELECT COALESCE(SUM(deposit), 0) as total, COUNT(*) as count
      FROM contracts
      WHERE is_active = true
        AND (deposit_status = '보유' OR deposit_status IS NULL)
        AND deposit > 0
    `);
    
    const occupancyRate = parseInt(totalRooms.rows[0].count) > 0 
      ? (parseInt(occupiedRooms.rows[0].count) / parseInt(totalRooms.rows[0].count) * 100).toFixed(1)
      : 0;
    
    res.json({
      room_stats: roomStats.rows,
      postbox_stats: postBoxStats.rows,
      monthly_finance: monthlyFinance.rows,
      expiring_contracts: parseInt(expiringContracts.rows[0].count),
      tenant_count: parseInt(tenantCount.rows[0].count),
      occupancy_rate: occupancyRate,
      total_rooms: parseInt(totalRooms.rows[0].count),
      occupied_rooms: parseInt(occupiedRooms.rows[0].count),
      total_postbox: parseInt(totalPostBox.rows[0].count),
      occupied_postbox: parseInt(occupiedPostBox.rows[0].count),
      total_deposit: parseInt(totalDeposit.rows[0].total) || 0,
      deposit_count: parseInt(totalDeposit.rows[0].count) || 0,
      room_monthly_revenue: parseInt(roomMonthlyRevenue.rows[0].total) || 0,
      postbox_monthly_revenue: parseInt(postboxMonthlyRevenue.rows[0].total) || 0
    });
  } catch (error) {
    console.error('대시보드 조회 오류:', error);
    res.status(500).json({ error: '대시보드 조회에 실패했습니다.' });
  }
});

// 최근 거래 내역
router.get('/recent-transactions', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(`
      SELECT tr.*, t.company_name, r.room_number
      FROM transactions tr
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      LEFT JOIN contracts c ON tr.contract_id = c.id
      LEFT JOIN rooms r ON c.room_id = r.id
      ORDER BY tr.transaction_date DESC, tr.created_at DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('최근 거래 조회 오류:', error);
    res.status(500).json({ error: '최근 거래 조회에 실패했습니다.' });
  }
});

// 만료 예정 계약 상세
router.get('/expiring-contracts', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await query(`
      SELECT c.*, r.room_number, r.room_type, t.company_name, t.phone
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.is_active = true 
        AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY c.end_date ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('만료 예정 계약 조회 오류:', error);
    res.status(500).json({ error: '만료 예정 계약 조회에 실패했습니다.' });
  }
});

export default router;

