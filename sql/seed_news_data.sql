-- Insert sample news data for testing
INSERT IGNORE INTO news (title, content, image_url, author_id, published, created_at) VALUES
(
  'ประกาศเตือนภัยน้ำท่วมฉับพลัน',
  'ขอให้ประชาชนในพื้นที่เสี่ยงริมแม่น้ำเจ้าพระยาเตรียมพร้อมรับมือระดับน้ำที่อาจเพิ่มสูงขึ้นใน 24 ชั่วโมงข้างหน้า ขอให้เคลื่อนย้ายสัตว์เลี้ยงและทรัพย์สินมูลค่าอื่นๆ ไปยังพื้นที่ที่สูงขึ้นเพื่อความปลอดภัย',
  'https://via.placeholder.com/400x300?text=Flood+Warning',
  1,
  1,
  DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
  'จุดอพยพและศูนย์พักพิงชั่วคราว',
  'เทศบาลได้จัดเตรียมศูนย์พักพิงชั่วคราว 3 จุด ได้แก่: 1) โรงเรียนเทศบาล 1 2) วัดสว่าง 3) ศาลาประชาคม ผู้ที่ต้องการอพยพสามารถติดต่อเจ้าหน้าที่ท้องถิ่นเพื่อขอความช่วยเหลือได้ทันที',
  'https://via.placeholder.com/400x300?text=Evacuation+Centers',
  1,
  1,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
  'หมายเรียกอาสาสมัครจากทั่วจังหวัด',
  'ขอเรียนให้ทราบว่าศูนย์บัญชาการช่วยเหลือฉุกเฉิน OonJai กำลังรับสมัครอาสาสมัครจากทั่วจังหวัด โดยผู้สนใจสามารถสมัครได้ผ่านแอปพลิเคชัน OonJai หรือไปที่สำนักงานเขตที่ใกล้ที่สุด',
  'https://via.placeholder.com/400x300?text=Volunteer+Recruitment',
  1,
  1,
  NOW()
);

-- Check if data was inserted
SELECT * FROM news ORDER BY created_at DESC;
