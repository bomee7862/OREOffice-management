import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// server 디렉토리의 .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'office_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;

