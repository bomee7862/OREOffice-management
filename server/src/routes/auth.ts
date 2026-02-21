import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    const result = await query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
      },
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '로그인에 실패했습니다.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, username, display_name, role, is_active, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ error: '사용자 정보 조회에 실패했습니다.' });
  }
});

// GET /api/auth/users - 사용자 목록 (admin)
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, username, display_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ error: '사용자 목록 조회에 실패했습니다.' });
  }
});

// POST /api/auth/users - 사용자 생성 (admin)
router.post('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, password, display_name, role } = req.body;

    if (!username || !password || !display_name) {
      return res.status(400).json({ error: '아이디, 비밀번호, 표시이름은 필수입니다.' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (username, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name, role, is_active, created_at`,
      [username, password_hash, display_name, role || 'viewer']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    res.status(500).json({ error: '사용자 생성에 실패했습니다.' });
  }
});

// PUT /api/auth/users/:id - 사용자 수정 (admin)
router.put('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { display_name, role, is_active, password } = req.body;

    let updateQuery: string;
    let params: any[];

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updateQuery = `
        UPDATE users
        SET display_name = COALESCE($1, display_name),
            role = COALESCE($2, role),
            is_active = COALESCE($3, is_active),
            password_hash = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, username, display_name, role, is_active, created_at, updated_at
      `;
      params = [display_name, role, is_active, password_hash, id];
    } else {
      updateQuery = `
        UPDATE users
        SET display_name = COALESCE($1, display_name),
            role = COALESCE($2, role),
            is_active = COALESCE($3, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, username, display_name, role, is_active, created_at, updated_at
      `;
      params = [display_name, role, is_active, id];
    }

    const result = await query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('사용자 수정 오류:', error);
    res.status(500).json({ error: '사용자 수정에 실패했습니다.' });
  }
});

// DELETE /api/auth/users/:id - 사용자 삭제 (admin, 자기 삭제 방지)
router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user!.id) {
      return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다.' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ message: '사용자가 삭제되었습니다.', deleted: result.rows[0] });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ error: '사용자 삭제에 실패했습니다.' });
  }
});

export default router;
