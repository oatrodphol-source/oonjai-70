const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================
// ข้อมูลสุ่มสำหรับแจ้งเหตุ
// ============================

const firstNames = [
  'สมชาย', 'สมศรี', 'วิชัย', 'สุนิสา', 'ประสิทธิ์', 'นภา', 'อนันต์', 'พรทิพย์',
  'ธนากร', 'กาญจนา', 'วีระ', 'ปราณี', 'สุรชัย', 'มาลี', 'เกียรติศักดิ์', 'สุภาพร',
  'ชัยวัฒน์', 'รัตนา', 'วิทยา', 'จันทร์เพ็ญ', 'อำนาจ', 'ศิริพร', 'สมบัติ', 'วรรณา',
  'บุญมา', 'นิตยา', 'ประยุทธ', 'สุพัตรา', 'สมหมาย', 'กัลยา', 'วินัย', 'อรุณี',
  'พิชิต', 'เบญจมาศ', 'สุเมธ', 'ลัดดา', 'ธีรยุทธ', 'จุฑามาศ', 'สุทธิ', 'พิมพ์ใจ',
  'ทวีศักดิ์', 'ดวงใจ', 'ณรงค์', 'ผ่องศรี', 'เสถียร', 'ชนิดา', 'มนตรี', 'วาสนา',
  'สุรศักดิ์', 'ภัทรา'
];

const lastNames = [
  'แสงทอง', 'บุญมี', 'จิตใจดี', 'วงษ์สวัสดิ์', 'สุขสันต์', 'พงษ์ประเสริฐ',
  'ศรีสุวรรณ', 'ทองดี', 'แก้วมณี', 'รุ่งเรือง', 'ปัญญาดี', 'สมบูรณ์',
  'ชาวไทย', 'ใจกว้าง', 'เลิศล้ำ', 'มั่นคง', 'ดีเลิศ', 'เจริญสุข',
  'ศักดิ์สิทธิ์', 'วิจิตร', 'ยิ้มแย้ม', 'แจ่มใส', 'เพชรรัตน์', 'สง่างาม',
  'ภูมิใจ', 'อารีย์', 'เกษมสุข', 'วัฒนา', 'กิตติพงษ์', 'ธรรมรักษ์'
];

const types = [
  'อพยพสัตว์', 'ฉุกเฉิน/ป่วยต้องการหมออาสา', 'ขอเรือ/ยานพาหนะ',
  'ขอถุงยังชีพ/อาหาร', 'น้ำท่วมบ้าน', 'ต้นไม้ล้ม/ถนนขาด',
  'ไฟฟ้าดับ/เสาไฟล้ม', 'SOS ด่วน', 'ขอความช่วยเหลือทั่วไป'
];

const waterLevels = [
  'ข้อเท้า/ตาตุ่ม', 'ระดับเข่า', 'ระดับเอว', 'ระดับอก/ท่วมในบ้าน', 'ท่วมมิดหลังคา'
];

const detailTemplates = [
  'น้ำท่วมขัง บริเวณหน้าบ้าน ต้องการความช่วยเหลือเร่งด่วน',
  'น้ำเข้าบ้านชั้นล่าง ข้าวของเสียหาย ต้องการกระสอบทราย',
  'ถนนในหมู่บ้านถูกน้ำท่วมตัด ไม่สามารถเดินทางได้',
  'ต้นไม้ใหญ่ล้มขวางถนน ทำให้รถผ่านไม่ได้',
  'ไฟฟ้าดับทั้งซอย สายไฟขาดจากลมแรง',
  'มีผู้สูงอายุติดอยู่ในบ้าน น้ำท่วมสูง ต้องการเรือช่วยเหลือ',
  'น้ำท่วมสะพานข้ามคลอง รถยนต์ไม่สามารถข้ามได้',
  'ผู้ป่วยติดเตียงต้องการเคลื่อนย้ายด่วน น้ำเริ่มเข้าบ้าน',
  'สัตว์เลี้ยงติดอยู่บนหลังคา ต้องการทีมช่วยเหลือ',
  'กำแพงกั้นน้ำแตก น้ำไหลเข้าหมู่บ้านอย่างรวดเร็ว',
  'ขอถุงยังชีพและน้ำดื่ม ถูกน้ำท่วมตัดขาดจากภายนอก 2 วันแล้ว',
  'น้ำป่าไหลหลากเข้าบ้าน ขอความช่วยเหลืออพยพ',
  'ท่อระบายน้ำอุดตัน ทำให้น้ำท่วมซ้ำ ขอทีมมาช่วยเปิดท่อ',
  'มีเด็กเล็ก 2 คนอยู่ในบ้าน น้ำท่วมสูงขึ้นเรื่อยๆ',
  'ต้องการอาหารและยารักษาโรค ถูกตัดขาดจากภายนอก',
  'หลังคาบ้านเสียหายจากพายุ น้ำฝนสาดเข้าในบ้าน',
  'น้ำท่วมถนนหลัก เข้า-ออกหมู่บ้านไม่ได้เลย',
  'มีผู้บาดเจ็บจากเศษกระจกในน้ำ ต้องการหมออาสา',
  'สะพานทรุดตัว เสี่ยงพังถล่ม ขอปิดทาง',
  'ร้านค้าถูกน้ำท่วม สินค้าเสียหายทั้งหมด ขอความช่วยเหลือ',
  'น้ำท่วมเข้ากัดเซาะถนน ผิวถนนยุบตัวเป็นหลุม',
  'ขอเรือท้องแบนสำหรับเคลื่อนย้ายผู้สูงอายุ 3 คน',
  'ไฟฟ้ารั่วจากเสาไฟจมน้ำ เสี่ยงอันตราย ขอทีมมาตัดไฟ',
  'น้ำเริ่มท่วมวัด ขอกำลังช่วยขนย้ายสิ่งของสำคัญ',
  'มีงูเข้าบ้านหลังน้ำท่วม ต้องการทีมจับสัตว์เลื้อยคลาน'
];

// พิกัด GPS ในพื้นที่จังหวัดต่างๆ ของประเทศไทย (กระจายทั่วภูมิภาค)
const locationAreas = [
  // กรุงเทพฯ - ปริมณฑล
  { name: 'บางกอกน้อย กรุงเทพฯ', latBase: 13.76, lngBase: 100.48 },
  { name: 'บางพลัด กรุงเทพฯ', latBase: 13.79, lngBase: 100.50 },
  { name: 'ดอนเมือง กรุงเทพฯ', latBase: 13.91, lngBase: 100.59 },
  { name: 'มีนบุรี กรุงเทพฯ', latBase: 13.81, lngBase: 100.73 },
  { name: 'นนทบุรี', latBase: 13.86, lngBase: 100.51 },
  { name: 'ปทุมธานี', latBase: 14.02, lngBase: 100.53 },
  { name: 'สมุทรปราการ', latBase: 13.60, lngBase: 100.60 },
  // ภาคกลาง
  { name: 'อยุธยา', latBase: 14.35, lngBase: 100.56 },
  { name: 'นครปฐม', latBase: 13.82, lngBase: 100.04 },
  { name: 'สุพรรณบุรี', latBase: 14.47, lngBase: 100.12 },
  { name: 'สิงห์บุรี', latBase: 14.88, lngBase: 100.39 },
  { name: 'อ่างทอง', latBase: 14.59, lngBase: 100.45 },
  // ภาคเหนือ
  { name: 'เชียงใหม่', latBase: 18.79, lngBase: 98.98 },
  { name: 'เชียงราย', latBase: 19.91, lngBase: 99.83 },
  { name: 'ลำปาง', latBase: 18.29, lngBase: 99.49 },
  // ภาคตะวันออกเฉียงเหนือ
  { name: 'นครราชสีมา', latBase: 14.97, lngBase: 102.10 },
  { name: 'ขอนแก่น', latBase: 16.43, lngBase: 102.83 },
  { name: 'อุบลราชธานี', latBase: 15.24, lngBase: 104.85 },
  // ภาคใต้
  { name: 'นครศรีธรรมราช', latBase: 8.43, lngBase: 99.96 },
  { name: 'สุราษฎร์ธานี', latBase: 9.14, lngBase: 99.33 },
  // ภาคตะวันออก
  { name: 'ชลบุรี', latBase: 13.36, lngBase: 100.98 },
  { name: 'ระยอง', latBase: 12.68, lngBase: 101.28 },
];

// ============================
// ฟังก์ชันสุ่มข้อมูล
// ============================

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
  const prefixes = ['06', '08', '09'];
  const prefix = randomItem(prefixes);
  let phone = prefix;
  for (let i = 0; i < 8; i++) {
    phone += Math.floor(Math.random() * 10);
  }
  return phone;
}

function randomDate() {
  // สุ่มวันที่ในช่วง 1 ก.ค. 2026 - 28 ส.ค. 2026 (ประมาณ 2 เดือนที่ผ่านมา)
  const start = new Date('2026-07-01T00:00:00Z');
  const end = new Date('2026-08-28T23:59:59Z');
  const diff = end.getTime() - start.getTime();
  const randomMs = Math.floor(Math.random() * diff);
  return new Date(start.getTime() + randomMs).toISOString();
}

function calculateSeverity(waterLevel, bedridden, elderly, peopleCount, type) {
  let baseLevel = 1;
  switch (waterLevel) {
    case 'ข้อเท้า/ตาตุ่ม': baseLevel = 1; break;
    case 'ระดับเข่า': baseLevel = 2; break;
    case 'ระดับเอว': baseLevel = 3; break;
    case 'ระดับอก/ท่วมในบ้าน': baseLevel = 4; break;
    case 'ท่วมมิดหลังคา': baseLevel = 5; break;
  }
  let finalLevel = baseLevel;
  if (bedridden) finalLevel += 2;
  if (elderly) finalLevel += 1;
  if (peopleCount > 5) finalLevel += 1;
  if (type === 'SOS ด่วน') finalLevel = 5;
  return Math.min(finalLevel, 5);
}

function generateCase(index) {
  const name = randomItem(firstNames) + ' ' + randomItem(lastNames);
  const phone = randomPhone();
  const type = randomItem(types);
  const waterLevel = randomItem(waterLevels);
  const peopleCount = randomInt(1, 8);
  const bedridden = Math.random() < 0.12 ? 1 : 0; // 12% มีผู้ป่วยติดเตียง
  const elderly = Math.random() < 0.25 ? 1 : 0;   // 25% มีเด็ก/ผู้สูงอายุ
  const severity = calculateSeverity(waterLevel, bedridden, elderly, peopleCount, type);
  const location = randomItem(locationAreas);
  const lat = location.latBase + (Math.random() - 0.5) * 0.05;
  const lng = location.lngBase + (Math.random() - 0.5) * 0.05;
  const detail = randomItem(detailTemplates) + ` (พื้นที่: ${location.name})`;
  const createdAt = randomDate();
  
  // สุ่มสถานะ: 45% pending, 30% in_progress, 25% resolved
  const rand = Math.random();
  let status = 'pending';
  if (rand > 0.55) status = 'in_progress';
  if (rand > 0.75) status = 'resolved';

  return {
    name,
    phone,
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
    details: detail,
    severity,
    status,
    people_count: peopleCount,
    elderly,
    bedridden,
    water_level: waterLevel,
    type,
    created_at: createdAt,
    reporter_name: name,
    reporter_phone: phone,
  };
}

// ============================
// Main: สุ่มและบันทึก 200 เคส
// ============================

async function main() {
  console.log('🚀 กำลังสุ่มข้อมูลแจ้งเหตุ 200 รายการ...\n');
  
  const cases = [];
  for (let i = 0; i < 200; i++) {
    cases.push(generateCase(i));
  }

  // แบ่ง batch ละ 50 เพื่อไม่ให้ Supabase timeout
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < cases.length; i += batchSize) {
    const batch = cases.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    const { data, error } = await supabase.from('cases').insert(batch).select('id');
    
    if (error) {
      console.error(`❌ Batch ${batchNum} FAILED:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`✅ Batch ${batchNum}: บันทึกสำเร็จ ${data.length} รายการ (IDs: ${data[0].id} - ${data[data.length - 1].id})`);
    }
  }

  console.log(`\n========================================`);
  console.log(`📊 สรุปผลการบันทึกข้อมูล`);
  console.log(`========================================`);
  console.log(`✅ บันทึกสำเร็จ: ${successCount} รายการ`);
  console.log(`❌ ล้มเหลว: ${errorCount} รายการ`);
  console.log(`📈 อัตราสำเร็จ: ${((successCount / 200) * 100).toFixed(1)}%`);

  // แสดงสถิติข้อมูลที่สุ่มได้
  const severityCounts = {};
  const statusCounts = {};
  const typeCounts = {};
  cases.forEach(c => {
    severityCounts[c.severity] = (severityCounts[c.severity] || 0) + 1;
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });

  console.log(`\n📊 สถิติข้อมูลที่สุ่มได้:`);
  console.log(`  ระดับความรุนแรง:`, severityCounts);
  console.log(`  สถานะเคส:`, statusCounts);
  console.log(`  ประเภทแจ้งเหตุ:`, typeCounts);

  // ตรวจสอบจำนวนทั้งหมดในฐานข้อมูล
  const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true });
  console.log(`\n📦 จำนวนเคสทั้งหมดในฐานข้อมูล Supabase: ${count} รายการ`);
}

main().catch(console.error);
