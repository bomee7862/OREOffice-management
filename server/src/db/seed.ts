import pool from './connection';
import bcrypt from 'bcryptjs';

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 기존 데이터 삭제 (개발용)
    await client.query('DELETE FROM documents');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM contracts');
    await client.query('DELETE FROM tenants');
    await client.query('DELETE FROM rooms');
    await client.query('DELETE FROM monthly_settlements');
    await client.query('DELETE FROM users');

    // 호실 데이터 삽입 - 1호~35호 (6인실 1개, 2인실 3개, 나머지 1인실)
    const rooms = [
      // 1행 - 상단 (8개)
      { room_number: '1', room_type: '1인실', position_x: 20, position_y: 20, width: 80, height: 80 },
      { room_number: '2', room_type: '1인실', position_x: 110, position_y: 20, width: 80, height: 80 },
      { room_number: '3', room_type: '1인실', position_x: 200, position_y: 20, width: 80, height: 80 },
      { room_number: '4', room_type: '1인실', position_x: 290, position_y: 20, width: 80, height: 80 },
      { room_number: '5', room_type: '1인실', position_x: 380, position_y: 20, width: 80, height: 80 },
      { room_number: '6', room_type: '1인실', position_x: 470, position_y: 20, width: 80, height: 80 },
      { room_number: '7', room_type: '1인실', position_x: 560, position_y: 20, width: 80, height: 80 },
      { room_number: '8', room_type: '2인실', position_x: 650, position_y: 20, width: 100, height: 80 },
      
      // 2행 (7개)
      { room_number: '9', room_type: '1인실', position_x: 20, position_y: 120, width: 80, height: 80 },
      { room_number: '10', room_type: '1인실', position_x: 110, position_y: 120, width: 80, height: 80 },
      { room_number: '11', room_type: '2인실', position_x: 200, position_y: 120, width: 100, height: 80 },
      { room_number: '12', room_type: '2인실', position_x: 310, position_y: 120, width: 100, height: 80 },
      { room_number: '13', room_type: '1인실', position_x: 420, position_y: 120, width: 80, height: 80 },
      { room_number: '14', room_type: '1인실', position_x: 510, position_y: 120, width: 80, height: 80 },
      { room_number: '15', room_type: '1인실', position_x: 600, position_y: 120, width: 80, height: 80 },
      
      // 3행 (7개)
      { room_number: '16', room_type: '1인실', position_x: 20, position_y: 220, width: 80, height: 80 },
      { room_number: '17', room_type: '1인실', position_x: 110, position_y: 220, width: 80, height: 80 },
      { room_number: '18', room_type: '1인실', position_x: 200, position_y: 220, width: 80, height: 80 },
      { room_number: '19', room_type: '1인실', position_x: 290, position_y: 220, width: 80, height: 80 },
      { room_number: '20', room_type: '1인실', position_x: 380, position_y: 220, width: 80, height: 80 },
      { room_number: '21', room_type: '1인실', position_x: 470, position_y: 220, width: 80, height: 80 },
      { room_number: '22', room_type: '1인실', position_x: 560, position_y: 220, width: 80, height: 80 },
      
      // 4행 (7개)
      { room_number: '23', room_type: '1인실', position_x: 20, position_y: 320, width: 80, height: 80 },
      { room_number: '24', room_type: '1인실', position_x: 110, position_y: 320, width: 80, height: 80 },
      { room_number: '25', room_type: '1인실', position_x: 200, position_y: 320, width: 80, height: 80 },
      { room_number: '26', room_type: '1인실', position_x: 290, position_y: 320, width: 80, height: 80 },
      { room_number: '27', room_type: '1인실', position_x: 380, position_y: 320, width: 80, height: 80 },
      { room_number: '28', room_type: '1인실', position_x: 470, position_y: 320, width: 80, height: 80 },
      { room_number: '29', room_type: '1인실', position_x: 560, position_y: 320, width: 80, height: 80 },
      
      // 5행 (6개 + 6인실 1개)
      { room_number: '30', room_type: '1인실', position_x: 20, position_y: 420, width: 80, height: 80 },
      { room_number: '31', room_type: '1인실', position_x: 110, position_y: 420, width: 80, height: 80 },
      { room_number: '32', room_type: '1인실', position_x: 200, position_y: 420, width: 80, height: 80 },
      { room_number: '33', room_type: '1인실', position_x: 290, position_y: 420, width: 80, height: 80 },
      { room_number: '34', room_type: '1인실', position_x: 380, position_y: 420, width: 80, height: 80 },
      { room_number: '35', room_type: '6인실', position_x: 470, position_y: 420, width: 160, height: 120 },
      
      // 회의실
      { room_number: 'M1', room_type: '회의실', position_x: 760, position_y: 20, width: 150, height: 180 },
      
      // 자유석 구역 (6자리)
      { room_number: 'F1', room_type: '자유석', position_x: 760, position_y: 220, width: 150, height: 180 },
    ];

    // POST BOX 70개 생성 (10x7 그리드)
    const postBoxes = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 10; col++) {
        const boxNumber = row * 10 + col + 1;
        postBoxes.push({
          room_number: `PB${boxNumber.toString().padStart(3, '0')}`,
          room_type: 'POST BOX',
          position_x: col * 42 + 10,
          position_y: row * 38 + 10,
          width: 38,
          height: 34
        });
      }
    }

    for (const room of rooms) {
      await client.query(`
        INSERT INTO rooms (room_number, room_type, floor, base_price, status, position_x, position_y, width, height)
        VALUES ($1, $2, 3, $3, '공실', $4, $5, $6, $7)
      `, [
        room.room_number,
        room.room_type,
        room.room_type === '1인실' ? 550000 : 
        room.room_type === '2인실' ? 900000 : 
        room.room_type === '6인실' ? 2500000 : 
        room.room_type === '회의실' ? 50000 : 200000, // 회의실은 시간당, 자유석은 월 이용료
        room.position_x,
        room.position_y,
        room.width,
        room.height
      ]);
    }

    // POST BOX 삽입 (비상주 입주사용)
    for (const box of postBoxes) {
      await client.query(`
        INSERT INTO rooms (room_number, room_type, floor, base_price, status, position_x, position_y, width, height)
        VALUES ($1, $2, 3, $3, '공실', $4, $5, $6, $7)
      `, [
        box.room_number,
        box.room_type,
        50000, // POST BOX 월 이용료
        box.position_x,
        box.position_y,
        box.width,
        box.height
      ]);
    }

    // 테스트용 입주사 데이터
    await client.query(`
      INSERT INTO tenants (company_name, representative_name, business_number, email, phone, tenant_type)
      VALUES 
        ('테스트 기업 A', '김철수', '123-45-67890', 'test-a@example.com', '010-1234-5678', '상주'),
        ('스타트업 B', '이영희', '234-56-78901', 'startup-b@example.com', '010-2345-6789', '상주'),
        ('프리랜서 C', '박지민', '345-67-89012', 'freelancer-c@example.com', '010-3456-7890', '상주')
    `);

    // 기본 관리자 계정 생성
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES ('admin', $1, '관리자', 'admin')
      ON CONFLICT (username) DO NOTHING
    `, [adminPasswordHash]);

    await client.query('COMMIT');
    console.log('✅ 시드 데이터 삽입 완료!');
    console.log(`   - 호실 ${rooms.length}개 생성 (1호~35호 + 회의실 + 자유석)`);
    console.log(`   - POST BOX ${postBoxes.length}개 생성`);
    console.log('   - 테스트 입주사 3개 생성');
    console.log('   - 기본 관리자 계정 생성 (admin / admin123)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 시드 데이터 삽입 실패:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedData();
