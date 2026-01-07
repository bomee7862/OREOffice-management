# 공유오피스 관리 시스템

공유오피스 운영을 위한 통합 관리 시스템입니다.

## 주요 기능

- 🏢 **호실 현황**: 도면 기반 UI로 호실 상태를 한눈에 확인
- 👥 **입주사 관리**: 고객 정보 등록/수정/삭제
- 📄 **계약 관리**: 입주 계약 등록 및 만료 관리
- 💰 **입출금 관리**: 수입/지출 내역 관리
- 📊 **월별 정산**: 월별 수입/지출 정산 및 리포트

## 기술 스택

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios

## 시작하기

### 1. 데이터베이스 설정

PostgreSQL을 설치하고 데이터베이스를 생성합니다:

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE office_management;
```

### 2. 환경 변수 설정

`server/env.example.txt`를 참고하여 `server/.env` 파일을 생성합니다:

```bash
cp server/env.example.txt server/.env
```

`.env` 파일을 열어 데이터베이스 접속 정보를 수정합니다:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/office_management
DB_HOST=localhost
DB_PORT=5432
DB_NAME=office_management
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 데이터베이스 마이그레이션

```bash
npm run db:migrate
```

### 5. 시드 데이터 삽입 (선택사항)

테스트용 초기 데이터를 삽입합니다:

```bash
npm run db:seed
```

### 6. 개발 서버 실행

```bash
npm run dev
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:3001

## 프로젝트 구조

```
office-management/
├── client/                 # 프론트엔드 (React)
│   ├── src/
│   │   ├── api/           # API 클라이언트
│   │   ├── components/    # 공통 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   └── types/         # TypeScript 타입 정의
│   └── ...
├── server/                 # 백엔드 (Express)
│   ├── src/
│   │   ├── db/            # 데이터베이스 설정 및 마이그레이션
│   │   ├── routes/        # API 라우트
│   │   └── index.ts       # 서버 엔트리포인트
│   └── ...
└── package.json           # 워크스페이스 설정
```

## API 엔드포인트

### 호실 (Rooms)
- `GET /api/rooms` - 전체 호실 조회
- `GET /api/rooms/:id` - 특정 호실 조회
- `PATCH /api/rooms/:id/status` - 호실 상태 변경

### 입주사 (Tenants)
- `GET /api/tenants` - 전체 입주사 조회
- `POST /api/tenants` - 입주사 등록
- `PUT /api/tenants/:id` - 입주사 수정
- `DELETE /api/tenants/:id` - 입주사 삭제

### 계약 (Contracts)
- `GET /api/contracts` - 전체 계약 조회
- `POST /api/contracts` - 계약 등록
- `POST /api/contracts/:id/terminate` - 계약 종료

### 거래 (Transactions)
- `GET /api/transactions` - 거래 내역 조회 (필터 지원)
- `POST /api/transactions` - 거래 등록
- `DELETE /api/transactions/:id` - 거래 삭제

### 정산 (Settlements)
- `GET /api/settlements/:year/:month` - 월별 정산 조회
- `POST /api/settlements/:year/:month` - 정산 생성/갱신

## 호실 정보

- **총 호실**: 35개
- **층수**: 3층
- **호실 타입**:
  - 1인실: 31개
  - 2인실: 3개
  - 6인실: 1개
  - 회의실: 1개
  - 자유석: 6자리

## POST BOX (비상주 입주사)

- **총 POST BOX**: 100개
- **용도**: 비상주 입주사용 우편물 수령
- **월 이용료**: 50,000원
- **서비스**:
  - 사업자등록증 주소지 사용 가능
  - 우편물 도착 시 알림 서비스

## 라이선스

MIT

