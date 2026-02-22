import { Router } from 'express';
import { query } from '../db/connection';
import { AVAILABLE_VARIABLES } from '../services/templateEngine';

const router = Router();

// 사용 가능한 변수 목록
router.get('/variables', async (req, res) => {
  res.json(AVAILABLE_VARIABLES);
});

// 템플릿 목록
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM contract_templates ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('템플릿 목록 조회 실패:', error);
    res.status(500).json({ error: '템플릿 목록 조회에 실패했습니다.' });
  }
});

// 템플릿 단건 조회
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM contract_templates WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('템플릿 조회 실패:', error);
    res.status(500).json({ error: '템플릿 조회에 실패했습니다.' });
  }
});

// 템플릿 생성
router.post('/', async (req, res) => {
  try {
    const { template_name, template_content } = req.body;
    if (!template_name || !template_content) {
      return res.status(400).json({ error: '템플릿 이름과 내용은 필수입니다.' });
    }
    const result = await query(
      `INSERT INTO contract_templates (template_name, template_content)
       VALUES ($1, $2) RETURNING *`,
      [template_name, template_content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('템플릿 생성 실패:', error);
    res.status(500).json({ error: '템플릿 생성에 실패했습니다.' });
  }
});

// 템플릿 수정
router.put('/:id', async (req, res) => {
  try {
    const { template_name, template_content, is_active } = req.body;
    const result = await query(
      `UPDATE contract_templates
       SET template_name = COALESCE($1, template_name),
           template_content = COALESCE($2, template_content),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [template_name, template_content, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('템플릿 수정 실패:', error);
    res.status(500).json({ error: '템플릿 수정에 실패했습니다.' });
  }
});

// 템플릿 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM contract_templates WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
    }
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('템플릿 삭제 실패:', error);
    res.status(500).json({ error: '템플릿 삭제에 실패했습니다.' });
  }
});

export default router;
