import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 모든 입주사 조회
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.*, 
        COUNT(c.id) as active_contracts,
        STRING_AGG(r.room_number, ', ') as rooms
      FROM tenants t
      LEFT JOIN contracts c ON t.id = c.tenant_id AND c.is_active = true
      LEFT JOIN rooms r ON c.room_id = r.id
      GROUP BY t.id
      ORDER BY t.company_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('입주사 조회 오류:', error);
    res.status(500).json({ error: '입주사 조회에 실패했습니다.' });
  }
});

// 특정 입주사 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT t.*, 
        json_agg(
          json_build_object(
            'contract_id', c.id,
            'room_id', r.id,
            'room_number', r.room_number,
            'room_type', r.room_type,
            'start_date', c.start_date,
            'end_date', c.end_date,
            'monthly_rent', c.monthly_rent,
            'deposit', c.deposit,
            'is_active', c.is_active
          )
        ) FILTER (WHERE c.id IS NOT NULL) as contracts
      FROM tenants t
      LEFT JOIN contracts c ON t.id = c.tenant_id
      LEFT JOIN rooms r ON c.room_id = r.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '입주사를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('입주사 조회 오류:', error);
    res.status(500).json({ error: '입주사 조회에 실패했습니다.' });
  }
});

// 입주사 등록
router.post('/', async (req, res) => {
  try {
    const { company_name, representative_name, business_number, email, phone, address, tenant_type, notes } = req.body;
    
    const result = await query(`
      INSERT INTO tenants (company_name, representative_name, business_number, email, phone, address, tenant_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [company_name, representative_name, business_number, email, phone, address, tenant_type || '상주', notes]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('입주사 등록 오류:', error);
    res.status(500).json({ error: '입주사 등록에 실패했습니다.' });
  }
});

// 입주사 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, representative_name, business_number, email, phone, address, tenant_type, notes } = req.body;
    
    const result = await query(`
      UPDATE tenants 
      SET company_name = COALESCE($1, company_name),
          representative_name = COALESCE($2, representative_name),
          business_number = COALESCE($3, business_number),
          email = COALESCE($4, email),
          phone = COALESCE($5, phone),
          address = COALESCE($6, address),
          tenant_type = COALESCE($7, tenant_type),
          notes = COALESCE($8, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [company_name, representative_name, business_number, email, phone, address, tenant_type, notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '입주사를 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('입주사 수정 오류:', error);
    res.status(500).json({ error: '입주사 수정에 실패했습니다.' });
  }
});

// 입주사 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      DELETE FROM tenants WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '입주사를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '입주사가 삭제되었습니다.', deleted: result.rows[0] });
  } catch (error) {
    console.error('입주사 삭제 오류:', error);
    res.status(500).json({ error: '입주사 삭제에 실패했습니다.' });
  }
});

export default router;

