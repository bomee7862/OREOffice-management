import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

// 모든 계약 조회
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    
    let sql = `
      SELECT c.*, 
        r.room_number,
        r.room_type,
        t.company_name,
        t.representative_name,
        t.phone
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
    `;
    
    if (active === 'true') {
      sql += ' WHERE c.is_active = true';
    }
    
    sql += ' ORDER BY c.created_at DESC';
    
    const result = await query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('계약 조회 오류:', error);
    res.status(500).json({ error: '계약 조회에 실패했습니다.' });
  }
});

// 특정 계약 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT c.*, 
        r.room_number,
        r.room_type,
        r.base_price,
        t.company_name,
        t.representative_name,
        t.business_number,
        t.email,
        t.phone
      FROM contracts c
      JOIN rooms r ON c.room_id = r.id
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('계약 조회 오류:', error);
    res.status(500).json({ error: '계약 조회에 실패했습니다.' });
  }
});

// 계약 등록
router.post('/', async (req, res) => {
  try {
    const { room_id, tenant_id, start_date, end_date, monthly_rent, monthly_rent_vat, deposit, management_fee, payment_day, notes, card_x, card_y, rent_free_start, rent_free_end } = req.body;
    
    // 호실 정보 확인 (room_type 포함)
    const roomCheck = await query('SELECT id, room_number, room_type, status FROM rooms WHERE id = $1', [room_id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: '호실을 찾을 수 없습니다.' });
    }
    const room = roomCheck.rows[0];
    
    // 입주사 정보 조회
    const tenantCheck = await query('SELECT company_name FROM tenants WHERE id = $1', [tenant_id]);
    const companyName = tenantCheck.rows[0]?.company_name || '';
    
    // 기존 활성 계약 비활성화
    await query(`
      UPDATE contracts SET is_active = false WHERE room_id = $1 AND is_active = true
    `, [room_id]);
    
    // 새 계약 등록
    const result = await query(`
      INSERT INTO contracts (room_id, tenant_id, start_date, end_date, monthly_rent, monthly_rent_vat, deposit, management_fee, payment_day, notes, card_x, card_y, rent_free_start, rent_free_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [room_id, tenant_id, start_date, end_date, monthly_rent, monthly_rent_vat || 0, deposit || 0, management_fee || 0, payment_day || 10, notes, card_x || null, card_y || null, rent_free_start || null, rent_free_end || null]);
    
    // 호실 상태를 '입주'로 변경
    await query(`
      UPDATE rooms SET status = '입주', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [room_id]);
    
    // POST BOX인 경우 '비상주사용료' 수입 거래 자동 생성
    if (room.room_type === 'POST BOX' && (monthly_rent_vat || monthly_rent)) {
      const amount = monthly_rent_vat || monthly_rent || 0;
      await query(`
        INSERT INTO transactions (type, category, amount, description, transaction_date, room_id, tenant_id, contract_id, status)
        VALUES ('입금', '비상주사용료', $1, $2, $3, $4, $5, $6, '완료')
      `, [
        amount,
        `POST BOX ${room.room_number.replace('PB', '')} ${companyName} 비상주 사용료`,
        start_date,
        room_id,
        tenant_id,
        result.rows[0].id
      ]);
    }
    
    // 보증금이 있으면 '보증금입금' 거래 자동 생성 (상태: 대기)
    if (deposit && deposit > 0) {
      await query(`
        INSERT INTO transactions (type, category, amount, description, transaction_date, room_id, tenant_id, contract_id, status)
        VALUES ('입금', '보증금입금', $1, $2, $3, $4, $5, $6, '대기')
      `, [
        deposit,
        `${companyName} 보증금`,
        start_date,
        room_id,
        tenant_id,
        result.rows[0].id
      ]);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('계약 등록 오류:', error);
    res.status(500).json({ error: '계약 등록에 실패했습니다.' });
  }
});

// 계약 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, monthly_rent, monthly_rent_vat, deposit, management_fee, payment_day, notes } = req.body;
    
    // 기존 계약 정보 조회 (보증금 변경 여부 확인용)
    const oldContract = await query('SELECT deposit, tenant_id, room_id FROM contracts WHERE id = $1', [id]);
    const oldDeposit = oldContract.rows[0]?.deposit || 0;
    
    const result = await query(`
      UPDATE contracts 
      SET start_date = COALESCE($1, start_date),
          end_date = COALESCE($2, end_date),
          monthly_rent = COALESCE($3, monthly_rent),
          monthly_rent_vat = COALESCE($4, monthly_rent_vat),
          deposit = COALESCE($5, deposit),
          management_fee = COALESCE($6, management_fee),
          payment_day = COALESCE($7, payment_day),
          notes = COALESCE($8, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [start_date, end_date, monthly_rent, monthly_rent_vat, deposit, management_fee, payment_day, notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
    }
    
    const newDeposit = deposit !== undefined ? deposit : oldDeposit;
    
    // 보증금이 변경된 경우 transaction 업데이트
    if (deposit !== undefined && deposit !== oldDeposit) {
      // 기존 보증금입금 transaction 확인
      const existingTrans = await query(
        'SELECT id FROM transactions WHERE contract_id = $1 AND category = $2',
        [id, '보증금입금']
      );
      
      if (newDeposit > 0) {
        // 입주사명 조회
        const tenant = await query('SELECT company_name FROM tenants WHERE id = $1', [oldContract.rows[0].tenant_id]);
        const companyName = tenant.rows[0]?.company_name || '';
        
        if (existingTrans.rows.length > 0) {
          // 기존 transaction 업데이트
          await query(`
            UPDATE transactions 
            SET amount = $1, description = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [newDeposit, `${companyName} 보증금 입금`, existingTrans.rows[0].id]);
        } else {
          // 새 transaction 생성
          await query(`
            INSERT INTO transactions (type, category, amount, description, transaction_date, room_id, tenant_id, contract_id, status)
            VALUES ('입금', '보증금입금', $1, $2, $3, $4, $5, $6, '완료')
          `, [
            newDeposit,
            `${companyName} 보증금 입금`,
            result.rows[0].start_date,
            oldContract.rows[0].room_id,
            oldContract.rows[0].tenant_id,
            id
          ]);
        }
      } else {
        // 보증금이 0원으로 변경된 경우 기존 transaction 삭제
        if (existingTrans.rows.length > 0) {
          await query('DELETE FROM transactions WHERE id = $1', [existingTrans.rows[0].id]);
        }
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('계약 수정 오류:', error);
    res.status(500).json({ error: '계약 수정에 실패했습니다.' });
  }
});

// 카드 위치/크기 업데이트
router.patch('/:id/card', async (req, res) => {
  try {
    const { id } = req.params;
    const { card_x, card_y, card_width, card_height } = req.body;
    
    const result = await query(`
      UPDATE contracts 
      SET card_x = COALESCE($1, card_x),
          card_y = COALESCE($2, card_y),
          card_width = COALESCE($3, card_width),
          card_height = COALESCE($4, card_height),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [card_x, card_y, card_width, card_height, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('카드 위치 업데이트 오류:', error);
    res.status(500).json({ error: '카드 위치 업데이트에 실패했습니다.' });
  }
});

// 계약 종료
router.post('/:id/terminate', async (req, res) => {
  try {
    const { id } = req.params;
    const { termination_type, termination_reason } = req.body;
    // termination_type: '만기종료' | '중도종료'
    
    // 계약 정보 조회
    const contractInfo = await query(`
      SELECT c.*, t.company_name, r.room_number 
      FROM contracts c 
      JOIN tenants t ON c.tenant_id = t.id
      JOIN rooms r ON c.room_id = r.id
      WHERE c.id = $1
    `, [id]);
    
    if (contractInfo.rows.length === 0) {
      return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
    }
    
    const contract = contractInfo.rows[0];
    const deposit = contract.deposit || 0;
    
    // 종료 유형에 따른 처리
    let depositStatus = '보유';
    let penaltyAmount = 0;
    
    if (termination_type === '중도종료') {
      // 중도종료: 보증금 → 위약금 전환
      depositStatus = '위약금전환';
      penaltyAmount = deposit;
      
      // 위약금 수입 거래 생성 (contract_id 포함하여 contract_end_date 조회 가능하게)
      if (penaltyAmount > 0) {
        await query(`
          INSERT INTO transactions (type, category, amount, description, transaction_date, room_id, tenant_id, contract_id, status)
          VALUES ('입금', '위약금', $1, $2, $3, $4, $5, $6, '완료')
        `, [
          penaltyAmount,
          `${contract.room_number}호 ${contract.company_name} 중도해지 위약금`,
          contract.end_date,  // 계약 종료일을 transaction_date로 사용
          contract.room_id,
          contract.tenant_id,
          id  // contract_id 추가
        ]);
      }
    } else {
      // 만기종료: 보증금 → 종료월 사용료로 전환
      depositStatus = '사용료전환';
      
      // 사용료전환 수입 거래 생성 (보증금이 마지막달 사용료로 대체됨)
      if (deposit > 0) {
        await query(`
          INSERT INTO transactions (type, category, amount, description, transaction_date, room_id, tenant_id, contract_id, status)
          VALUES ('입금', '사용료전환', $1, $2, $3, $4, $5, $6, '완료')
        `, [
          deposit,
          `${contract.room_number}호 ${contract.company_name} 만기종료 - 보증금→사용료 전환`,
          contract.end_date,  // 계약 종료일을 transaction_date로 사용
          contract.room_id,
          contract.tenant_id,
          id  // contract_id 추가
        ]);
      }
    }
    
    // 계약 비활성화 및 종료 정보 저장
    const contractResult = await query(`
      UPDATE contracts 
      SET is_active = false, 
          termination_type = $1,
          penalty_amount = $2,
          deposit_status = $3,
          termination_reason = $4,
          terminated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING room_id
    `, [termination_type || '만기종료', penaltyAmount, depositStatus, termination_reason, id]);
    
    // 호실 상태는 FloorPlan에서 별도로 처리 (계약종료 상태로)
    
    res.json({ 
      message: '계약이 종료되었습니다.',
      termination_type: termination_type || '만기종료',
      penalty_amount: penaltyAmount,
      deposit_status: depositStatus
    });
  } catch (error) {
    console.error('계약 종료 오류:', error);
    res.status(500).json({ error: '계약 종료에 실패했습니다.' });
  }
});

// 계약 취소/삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.query; // 'soft' (공실 전환) or 'hard' (완전 삭제)

    // 계약 정보 조회
    const contractInfo = await query(`
      SELECT c.*, t.company_name, r.room_number
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.id
      JOIN rooms r ON c.room_id = r.id
      WHERE c.id = $1
    `, [id]);

    if (contractInfo.rows.length === 0) {
      return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
    }

    const contract = contractInfo.rows[0];

    if (mode === 'hard') {
      // 완전 삭제 모드: 계약 + 관련 거래내역 삭제

      // 1. 관련 거래내역 삭제
      await query('DELETE FROM transactions WHERE contract_id = $1', [id]);

      // 2. 계약 삭제
      await query('DELETE FROM contracts WHERE id = $1', [id]);

      // 3. 호실 상태를 '공실'로 변경
      await query(`
        UPDATE rooms
        SET status = '공실',
            last_company_name = NULL,
            contract_ended_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [contract.room_id]);

      res.json({
        message: '계약이 완전히 삭제되었습니다.',
        mode: 'hard',
        deleted_contract_id: id,
        room_number: contract.room_number
      });
    } else {
      // 소프트 삭제 모드 (기본값): 계약 비활성화, 기록 보존

      // 1. 계약 비활성화
      await query(`
        UPDATE contracts
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      // 2. 호실 상태를 '공실'로 변경 (이전 입주사 정보 유지)
      await query(`
        UPDATE rooms
        SET status = '공실',
            last_company_name = $1,
            contract_ended_at = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [contract.company_name, contract.room_id]);

      res.json({
        message: '계약이 취소되고 공실로 전환되었습니다.',
        mode: 'soft',
        contract_id: id,
        room_number: contract.room_number
      });
    }
  } catch (error) {
    console.error('계약 삭제 오류:', error);
    res.status(500).json({ error: '계약 삭제에 실패했습니다.' });
  }
});

// 만료 예정 계약 조회
router.get('/expiring/soon', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await query(`
      SELECT c.*, 
        r.room_number,
        r.room_type,
        t.company_name,
        t.representative_name,
        t.phone
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

// 기존 계약 보증금 동기화 (보증금이 있는데 거래내역이 없는 계약들 처리)
router.post('/sync-deposits', async (req, res) => {
  try {
    // 보증금이 있지만 보증금입금 거래내역이 없는 활성 계약 조회
    const contractsWithoutDeposit = await query(`
      SELECT c.id, c.room_id, c.tenant_id, c.deposit, c.start_date, t.company_name
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.id
      WHERE c.is_active = true
        AND c.deposit > 0
        AND NOT EXISTS (
          SELECT 1 FROM transactions tr
          WHERE tr.contract_id = c.id
            AND tr.category = '보증금입금'
        )
    `);

    if (contractsWithoutDeposit.rows.length === 0) {
      return res.json({
        message: '동기화할 보증금이 없습니다.',
        synced: 0
      });
    }

    // 각 계약에 대해 보증금입금 거래내역 생성
    let syncedCount = 0;
    for (const contract of contractsWithoutDeposit.rows) {
      await query(`
        INSERT INTO transactions (type, category, amount, description, transaction_date, room_id, tenant_id, contract_id, status)
        VALUES ('입금', '보증금입금', $1, $2, $3, $4, $5, $6, '대기')
      `, [
        contract.deposit,
        `${contract.company_name} 보증금`,
        contract.start_date,
        contract.room_id,
        contract.tenant_id,
        contract.id
      ]);
      syncedCount++;
    }

    res.json({
      message: `${syncedCount}건의 보증금이 동기화되었습니다.`,
      synced: syncedCount,
      contracts: contractsWithoutDeposit.rows.map(c => ({
        id: c.id,
        company_name: c.company_name,
        deposit: c.deposit
      }))
    });
  } catch (error) {
    console.error('보증금 동기화 오류:', error);
    res.status(500).json({ error: '보증금 동기화에 실패했습니다.' });
  }
});

export default router;

