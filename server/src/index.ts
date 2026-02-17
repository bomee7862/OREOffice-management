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
import { authenticate, AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// 정적 파일 서빙 (업로드된 파일)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 헬스체크 (공개)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 인증 라우트 (로그인은 공개)
app.use('/api/auth', authRoutes);

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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 서버가 http://127.0.0.1:${PORT} 에서 실행중입니다.`);
});
