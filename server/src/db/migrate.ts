import pool from './connection';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 호실 타입 ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE room_type AS ENUM ('1인실', '2인실', '6인실', '회의실', '자유석', 'POST BOX');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // 호실 상태 ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE room_status AS ENUM ('입주', '계약종료', '공실', '예약', '정비중');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 기존 ENUM에 '계약종료' 추가 (이미 ENUM이 존재하는 경우)
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE room_status ADD VALUE IF NOT EXISTS '계약종료' AFTER '입주';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // 거래 타입 ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('입금', '지출');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // 거래 카테고리 ENUM (확장)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_category AS ENUM (
          '월사용료', '관리비', '보증금', '회의실', '기타수입',
          '임대료', '공과금', '인건비', '청소미화', '유지보수', '소모품', '마케팅', '기타지출'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 결제 상태 ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('대기', '완료', '연체', '취소');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 결제 방법 ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('계좌이체', '카드', '현금', '자동이체', '기타');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 입주사 타입 ENUM (상주/비상주)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE tenant_type AS ENUM ('상주', '비상주');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 문서 타입 ENUM
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE document_type AS ENUM ('계약서', '사업자등록증', '신분증', '기타');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 호실 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_number VARCHAR(20) NOT NULL UNIQUE,
        room_type room_type NOT NULL,
        floor INTEGER NOT NULL DEFAULT 3,
        area_sqm DECIMAL(10, 2),
        base_price INTEGER NOT NULL DEFAULT 0,
        status room_status NOT NULL DEFAULT '공실',
        position_x INTEGER,
        position_y INTEGER,
        width INTEGER,
        height INTEGER,
        card_x INTEGER,
        card_y INTEGER,
        card_width INTEGER DEFAULT 180,
        card_height INTEGER DEFAULT 100,
        last_company_name VARCHAR(100),
        contract_ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 기존 테이블에 새 컬럼 추가 (이미 테이블이 존재하는 경우)
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_company_name VARCHAR(100);
        ALTER TABLE rooms ADD COLUMN IF NOT EXISTS contract_ended_at TIMESTAMP;
      END $$;
    `);

    // 입주사(고객) 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(100) NOT NULL,
        representative_name VARCHAR(50) NOT NULL,
        business_number VARCHAR(20),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        tenant_type tenant_type NOT NULL DEFAULT '상주',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 문서 테이블 (파일 업로드)
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        document_type document_type NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 계약 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        monthly_rent INTEGER NOT NULL,
        monthly_rent_vat INTEGER NOT NULL DEFAULT 0,
        deposit INTEGER NOT NULL DEFAULT 0,
        management_fee INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        card_x INTEGER,
        card_y INTEGER,
        card_width INTEGER DEFAULT 200,
        card_height INTEGER DEFAULT 120,
        termination_type VARCHAR(20),
        penalty_amount INTEGER DEFAULT 0,
        deposit_status VARCHAR(20) DEFAULT '보유',
        termination_reason TEXT,
        terminated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 기존 contracts 테이블에 새 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_type VARCHAR(20);
        ALTER TABLE contracts ADD COLUMN IF NOT EXISTS penalty_amount INTEGER DEFAULT 0;
        ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20) DEFAULT '보유';
        ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_reason TEXT;
        ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP;
      END $$;
    `);

    // transaction_category ENUM 확장
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '월사용료';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '위약금';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '비상주사용료';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '회의실사용료';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '1day사용료';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '보증금입금';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS '사용료전환';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 거래(입금/지출) 테이블 - 확장
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
        billing_id INTEGER,
        type transaction_type NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount INTEGER NOT NULL,
        vat_amount INTEGER DEFAULT 0,
        transaction_date DATE NOT NULL,
        due_date DATE,
        status VARCHAR(20) DEFAULT '완료',
        description TEXT,
        payment_method VARCHAR(50),
        receipt_file VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 월별 청구 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_billings (
        id SERIAL PRIMARY KEY,
        year_month VARCHAR(7) NOT NULL,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        billing_type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        vat_amount INTEGER DEFAULT 0,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT '대기',
        payment_date DATE,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 월별 정산 테이블 - 확장
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_settlements (
        id SERIAL PRIMARY KEY,
        year_month VARCHAR(7) NOT NULL UNIQUE,
        total_income INTEGER NOT NULL DEFAULT 0,
        total_expense INTEGER NOT NULL DEFAULT 0,
        net_profit INTEGER NOT NULL DEFAULT 0,
        occupancy_rate DECIMAL(5, 2),
        outstanding_amount INTEGER DEFAULT 0,
        report_data JSONB,
        status VARCHAR(20) DEFAULT '작성중',
        confirmed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 기존 tenants 테이블에 tenant_type 컬럼 추가 (없는 경우)
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE tenants ADD COLUMN tenant_type tenant_type NOT NULL DEFAULT '상주';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 기존 contracts 테이블에 새 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN monthly_rent_vat INTEGER NOT NULL DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN card_x INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN card_y INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN card_width INTEGER DEFAULT 200;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN card_height INTEGER DEFAULT 120;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 렌트프리 기간 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN rent_free_start DATE;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN rent_free_end DATE;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 납부일 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE contracts ADD COLUMN payment_day INTEGER DEFAULT 10;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 기존 rooms 테이블에 카드 위치 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE rooms ADD COLUMN card_x INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE rooms ADD COLUMN card_y INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE rooms ADD COLUMN card_width INTEGER DEFAULT 180;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE rooms ADD COLUMN card_height INTEGER DEFAULT 100;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // transactions 테이블에 새 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN billing_id INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN vat_amount INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN due_date DATE;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT '완료';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN receipt_file VARCHAR(500);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transactions ADD COLUMN notes TEXT;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // monthly_billings 테이블에 세금계산서 발행 관련 컬럼 추가
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE monthly_billings ADD COLUMN tax_invoice_issued BOOLEAN DEFAULT false;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE monthly_billings ADD COLUMN tax_invoice_date DATE;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE monthly_billings ADD COLUMN tax_invoice_number VARCHAR(50);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // 인덱스 생성
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_room_id ON contracts(room_id);
      CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_room ON transactions(room_id);
      CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id);
      CREATE INDEX IF NOT EXISTS idx_billings_year_month ON monthly_billings(year_month);
      CREATE INDEX IF NOT EXISTS idx_billings_tenant ON monthly_billings(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_billings_status ON monthly_billings(status);
    `);

    await client.query('COMMIT');
    console.log('✅ 데이터베이스 마이그레이션 완료!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();

