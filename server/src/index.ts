import express from 'express';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// 정적 파일 서빙 (업로드된 파일)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 라우트
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/billings', billingRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행중입니다.`);
});

