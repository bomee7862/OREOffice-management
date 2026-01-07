import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 모든 호실 조회
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, 
        c.id as contract_id,
        c.tenant_id,
        t.company_name,
        t.representative_name,
        t.business_number,
        t.email,
        t.phone,
        c.start_date,
        c.end_date,
        c.monthly_rent,
        c.monthly_rent_vat,
        c.deposit,
        c.management_fee,
        c.payment_day
      FROM rooms r
      LEFT JOIN contracts c ON r.id = c.room_id AND c.is_active = true
      LEFT JOIN tenants t ON c.tenant_id = t.id
      ORDER BY 
        CASE 
          WHEN r.room_type = 'POST BOX' THEN 2
          ELSE 1
        END,
        CASE 
          WHEN r.room_number ~ '^[0-9]+$' THEN CAST(r.room_number AS INTEGER)
          ELSE 9999
        END,
        r.room_number
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('호실 조회 오류:', error);
    res.status(500).json({ error: '호실 조회에 실패했습니다.' });
  }
});

// 특정 호실 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT r.*, 
        c.id as contract_id,
        c.tenant_id,
        t.company_name,
        t.representative_name,
        t.business_number,
        t.email,
        t.phone,
        c.start_date,
        c.end_date,
        c.monthly_rent,
        c.deposit,
        c.management_fee
      FROM rooms r
      LEFT JOIN contracts c ON r.id = c.room_id AND c.is_active = true
      LEFT JOIN tenants t ON c.tenant_id = t.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '호실을 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('호실 조회 오류:', error);
    res.status(500).json({ error: '호실 조회에 실패했습니다.' });
  }
});

// 호실 상태 업데이트
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, last_company_name, contract_ended_at } = req.body;
    
    let updateQuery = '';
    let params: any[] = [];
    
    if (status === '계약종료' && last_company_name) {
      // 계약 종료 시 이전 입주사 정보 저장 (contract_ended_at이 전달되면 해당 날짜 사용, 아니면 현재 시간)
      updateQuery = `
        UPDATE rooms 
        SET status = $1, 
            last_company_name = $2, 
            contract_ended_at = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      params = [status, last_company_name, contract_ended_at || new Date(), id];
    } else if (status === '공실') {
      // 공실로 변경 시 이전 입주사 정보는 유지
      updateQuery = `
        UPDATE rooms 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    } else if (status === '입주') {
      // 입주 시 이전 입주사 정보 초기화
      updateQuery = `
        UPDATE rooms 
        SET status = $1, 
            last_company_name = NULL, 
            contract_ended_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    } else {
      // 기타 상태 변경
      updateQuery = `
        UPDATE rooms 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    }
    
    const result = await query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '호실을 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('호실 상태 업데이트 오류:', error);
    res.status(500).json({ error: '호실 상태 업데이트에 실패했습니다.' });
  }
});

// 호실 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { base_price, area_sqm, notes } = req.body;
    
    const result = await query(`
      UPDATE rooms 
      SET base_price = COALESCE($1, base_price),
          area_sqm = COALESCE($2, area_sqm),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [base_price, area_sqm, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '호실을 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('호실 수정 오류:', error);
    res.status(500).json({ error: '호실 수정에 실패했습니다.' });
  }
});

// 호실 카드 위치/크기 업데이트
router.patch('/:id/card', async (req, res) => {
  try {
    const { id } = req.params;
    const { card_x, card_y, card_width, card_height } = req.body;
    
    const result = await query(`
      UPDATE rooms 
      SET card_x = COALESCE($1, card_x),
          card_y = COALESCE($2, card_y),
          card_width = COALESCE($3, card_width),
          card_height = COALESCE($4, card_height),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [card_x, card_y, card_width, card_height, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '호실을 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('호실 카드 위치 업데이트 오류:', error);
    res.status(500).json({ error: '호실 카드 위치 업데이트에 실패했습니다.' });
  }
});

export default router;

