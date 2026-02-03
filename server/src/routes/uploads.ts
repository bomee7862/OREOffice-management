import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db/connection';

const router = Router();

// 업로드 폴더 생성
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 허용할 파일 타입
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다. (PDF, 이미지, Word 파일만 가능)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  }
});

// 파일 업로드 (단일)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const { tenant_id, contract_id, document_type } = req.body;

    const result = await query(`
      INSERT INTO documents (tenant_id, contract_id, document_type, file_name, original_name, file_path, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      tenant_id || null,
      contract_id || null,
      document_type || '기타',
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
  }
});

// 다중 파일 업로드
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const { tenant_id, contract_id, document_types } = req.body;
    const types = document_types ? JSON.parse(document_types) : [];

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docType = types[i] || '기타';

      const result = await query(`
        INSERT INTO documents (tenant_id, contract_id, document_type, file_name, original_name, file_path, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        tenant_id || null,
        contract_id || null,
        docType,
        file.filename,
        file.originalname,
        file.path,
        file.size,
        file.mimetype
      ]);

      results.push(result.rows[0]);
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
  }
});

// 입주사별 문서 조회
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const result = await query(`
      SELECT * FROM documents
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [tenantId]);

    res.json(result.rows);
  } catch (error) {
    console.error('문서 조회 오류:', error);
    res.status(500).json({ error: '문서 조회에 실패했습니다.' });
  }
});

// 계약별 문서 조회
router.get('/contract/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const result = await query(`
      SELECT * FROM documents
      WHERE contract_id = $1
      ORDER BY created_at DESC
    `, [contractId]);

    res.json(result.rows);
  } catch (error) {
    console.error('문서 조회 오류:', error);
    res.status(500).json({ error: '문서 조회에 실패했습니다.' });
  }
});

// 파일 다운로드
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT * FROM documents WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    const doc = result.rows[0];
    res.download(doc.file_path, doc.original_name);
  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({ error: '파일 다운로드에 실패했습니다.' });
  }
});

// 파일 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 파일 정보 조회
    const docResult = await query(`
      SELECT * FROM documents WHERE id = $1
    `, [id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    const doc = docResult.rows[0];

    // 파일 시스템에서 삭제
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }

    // DB에서 삭제
    await query(`DELETE FROM documents WHERE id = $1`, [id]);

    res.json({ message: '문서가 삭제되었습니다.' });
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    res.status(500).json({ error: '문서 삭제에 실패했습니다.' });
  }
});

export default router;










