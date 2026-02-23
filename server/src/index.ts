import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import roomRoutes from './routes/rooms';
import tenantRoutes from './routes/tenants';
import contractRoutes from './routes/contracts';
import transactionRoutes from './routes/transactions';
import billingRoutes from './routes/billings';
import settlementRoutes from './routes/settlements';
import dashboardRoutes from './routes/dashboard';
import uploadRoutes from './routes/uploads';
import authRoutes from './routes/auth';
import contractTemplateRoutes from './routes/contractTemplates';
import contractSigningRoutes from './routes/contractSigning';
import contractSigningPublicRoutes from './routes/contractSigningPublic';
import { authenticate, AuthRequest } from './middleware/auth';
import { query } from './db/connection';

dotenv.config();

// 필수 환경변수 검증
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// 미들웨어
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(','), credentials: true }
  : undefined;
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// 정적 파일 서빙 (업로드된 파일)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 헬스체크 (공개)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 인증 라우트 (로그인은 공개)
app.use('/api/auth', authRoutes);

// 공개 라우트 (입주자 서명 - 인증 불필요)
app.use('/api/public/signing', contractSigningPublicRoutes);

// viewer 쓰기 차단 미들웨어
const viewerWriteBlock = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.user?.role === 'viewer') {
    return res.status(403).json({ error: '읽기 전용 계정입니다.' });
  }
  next();
};

// 보호된 라우트 (인증 + viewer 쓰기 차단)
app.use('/api/rooms', authenticate, viewerWriteBlock, roomRoutes);
app.use('/api/tenants', authenticate, viewerWriteBlock, tenantRoutes);
app.use('/api/contracts', authenticate, viewerWriteBlock, contractRoutes);
app.use('/api/transactions', authenticate, viewerWriteBlock, transactionRoutes);
app.use('/api/billings', authenticate, viewerWriteBlock, billingRoutes);
app.use('/api/settlements', authenticate, viewerWriteBlock, settlementRoutes);
app.use('/api/dashboard', authenticate, viewerWriteBlock, dashboardRoutes);
app.use('/api/uploads', authenticate, viewerWriteBlock, uploadRoutes);
app.use('/api/contract-templates', authenticate, viewerWriteBlock, contractTemplateRoutes);
app.use('/api/contract-signing', authenticate, viewerWriteBlock, contractSigningRoutes);

// 프로덕션: 클라이언트 정적 파일 서빙
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback — API 이외의 모든 GET 요청을 index.html로
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// DB 스키마 자동 마이그레이션 후 서버 시작
const runMigrations = async () => {
  try {
    await query(`DO $$ BEGIN ALTER TABLE transactions ADD COLUMN tax_invoice_issued BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN null; END $$;`);
    await query(`DO $$ BEGIN ALTER TABLE transactions ADD COLUMN tax_invoice_date DATE; EXCEPTION WHEN duplicate_column THEN null; END $$;`);
    await query(`DO $$ BEGIN ALTER TABLE transactions ADD COLUMN tax_invoice_number VARCHAR(50); EXCEPTION WHEN duplicate_column THEN null; END $$;`);
    console.log('DB 마이그레이션 확인 완료');
  } catch (error) {
    console.error('DB 마이그레이션 오류:', error);
  }
};

runMigrations().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`서버가 http://${HOST}:${PORT} 에서 실행중입니다.`);
  });
});
