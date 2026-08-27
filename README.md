# นักผจญภัยคณิต (Math Explorer)

เกมเพศษฝึกการคิดเลขบวก ลบ คูณ หาร สำหรับเด็กชั้น ป.3-6 แนวผจญภัยสำรวจแผนที่ แต่ละด่านมี 8 ข้อ คิดแล้วเก็บคะแนนและเหรียญได้

## วิธีเล่น

1. **สมัครสมาชิก**: เข้าเว็บ ใส่ชื่อ เลือกชั้น และตั้ง PIN (เลขรหัส 4 หลัก)
2. **เข้าสู่ระบบ**: ใส่ชื่อและ PIN เข้าเล่น
3. **เล่นด่าน**: คลิกเลือกโซน → เลือกด่าน → เล่น 8 ข้อ ตอบให้ถูกและเร็ว
   - ตอบถูก 1 ข้อได้คะแนนฐาน × ตัวคูณโซน
   - ตอบถูกติดกัน 5 ข้อได้โบนัส streak
4. **ดูอันดับ**: ตรวจสอบอันดับเหรียญของทุกคน

## โครงสร้างโปรเจกต์

```
mathGame/
├── index.html           # หน้าหลัก
├── config.js            # ตั้งค่า (GAS_URL, PIN_SALT, ฯลฯ)
├── css/
│   └── styles.css       # CSS (ทั้งระบบ)
│
├── js/                  # ES modules ของเกม
│   ├── app.js           # ตัวจัดการหน้าจอหลัก
│   ├── auth.js          # สมัคร/เข้าสู่ระบบ
│   ├── api.js           # เรียกเซิร์ฟเวอร์ GAS
│   ├── game.js          # ห้องเล่น (render + logic)
│   ├── world.js         # แผนที่โซน/ด่าน
│   ├── questions.js     # สร้างโจทย์
│   ├── scoring.js       # คิดคะแนนและเหรียญ
│   ├── storage.js       # จัดเซสชัน/ข้อมูลโลคัล
│   └── leaderboard.js   # อันดับเหรียญ
│
├── gas/                 # Google Apps Script + Sheet
│   ├── Code.gs          # เซิร์ฟเวอร์ GAS (ใส่ใน Apps Script editor)
│   └── SETUP.md         # วิธีตั้งค่า Google Sheet + Apps Script
│
├── tests/               # Unit tests
│   ├── questions.test.js
│   ├── scoring.test.js
│   ├── storage.test.js
│   └── world.test.js
│
├── docs/
│   └── DEPLOY.md        # วิธี Deploy ขึ้น GitHub Pages
│
└── .git/                # Git repository
```

## วิธีรันทดสอบ (Unit Tests)

ต้อง Node.js 18.17.0+ และตั้งค่า GAS ให้เรียบร้อย

```bash
node --test
```

ควรได้ผลลัพธ์: **19/19 ผ่าน** (questions · scoring · storage · world)

## วิธีรันเกมแบบ Local

ต้อง Python 3 (หรือเซิร์ฟเวอร์ HTTP อื่น)

```bash
python3 -m http.server
```

จากนั้นเปิด http://localhost:8000 บนบราวเซอร์

⚠️ **ข้อควรรู้**: ก่อนจะให้บันทึกข้อมูลได้จริง ต้องทำตามขั้นตอน 2 ข้อนี้:
1. ตั้งค่า Google Apps Script ตาม [`gas/SETUP.md`](gas/SETUP.md)
2. ใส่ `GAS_URL` ใน [`config.js`](config.js)

ถ้าไม่มี GAS_URL เกมจะทำงาน แต่ข้อมูลบันทึกไม่ได้

## ลิงก์เพิ่มเติม

- [วิธีตั้งค่า Google Apps Script](gas/SETUP.md)
- [วิธี Deploy ขึ้น GitHub Pages](docs/DEPLOY.md)

---

**เกมนี้ทำด้วย** Vanilla JavaScript, ES modules, ไม่มี build step — รันได้เลยจากไฟล์
