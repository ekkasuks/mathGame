# วิธี Deploy ขึ้น GitHub Pages

เอกสารนี้บอกขั้นตอนการเผยแพร่เกม "นักผจญภัยคณิต" บน GitHub Pages เพื่อให้ใช้งานออนไลน์

## ก่อน Deploy

ก่อนทำขั้นตอนด้านล่าง ให้แน่ใจว่า:

1. **ตั้งค่า Google Apps Script เสร็จ** ตาม [`gas/SETUP.md`](../gas/SETUP.md)
   - สร้าง Google Sheet ชื่อ `MathExplorer-Data` พร้อมแท็บ `Players` และ `Log`
   - ใส่โค้ด `gas/Code.gs` ใน Apps Script editor
   - Deploy เป็น Web App โดยเลือก "Anyone" for access

2. **ใส่ `GAS_URL` ใน `config.js`**
   - หลัง Deploy GAS จะได้ Web App URL มาวางใน `config.js` บรรทัด 3
   ```javascript
   export const CONFIG = {
     GAS_URL: "https://script.google.com/...",  // ใส่ URL ที่นี่
     // ...
   };
   ```

3. **Commit ทุกอย่าง**
   ```bash
   git add README.md docs/DEPLOY.md config.js
   git commit -m "docs: add README and deploy guide"
   ```

## เปิด GitHub Pages

### ขั้นตอน 1: Push ไปยัง GitHub Repository

```bash
git push origin main
```

(แทน `main` ด้วยชื่อ branch ของคุณถ้าต่างจากนี้)

### ขั้นตอน 2: เปิด GitHub Pages ใน Settings

1. ไปที่ repository บน GitHub
2. คลิก **Settings** (แท็บด้านบน)
3. คลิก **Pages** (เมนูซ้าย)
4. ภายใต้ "Build and deployment" → **Source**
5. เลือก **Deploy from a branch**
6. เลือก branch = `main` (หรือ branch ที่คุณใช้) และ folder = **/ (root)**
7. คลิก **Save**

### ขั้นตอน 3: รอให้ GitHub ประมวลผลแล้วแสดง URL

ในหน้า Pages จะเห็นข้อความสีน้ำเงิน:
> Your site is live at `https://<yourname>.github.io/<reponame>/`

จดลิงก์นี้ไว้ คุณใช้มันทดสอบเกมต่อไป

## ตรวจหลัง Deploy (Post-Deploy Checks)

เปิด URL ของ GitHub Pages ที่ได้จากขั้นตอน 2 แล้วทดสอบ:

### บนคอมพิวเตอร์
- [ ] เปิดเว็บไซต์ไม่ได้ error
- [ ] **สมัคร**: ใส่ชื่อ เลือกชั้น ตั้ง PIN บันทึกได้
- [ ] **เข้าสู่ระบบ**: ใส่ชื่อและ PIN เข้าได้
- [ ] **เล่นด่าน**: คลิกเล่นด่าน 1 ตอบข้อ 1-8 เก็บคะแนนและเหรียญได้
- [ ] **ดูอันดับ**: คลิกเมนูอันดับ เห็นชื่อและเหรียญของผู้เล่นทั้งหมด

### บนมือถือ (Responsive Check)
- [ ] แตะปุ่มต่างๆ ด้วยนิ้วบนมือถือได้สะดวก
- [ ] เล่นด่านแนบตามหน้าจอได้ (ไม่เกินขอบ)
- [ ] กดปุ่มตอบได้ง่าย

## หมายเหตุการแก้ปัญหา

### ถ้าอัปโหลดข้อมูลไม่ได้ (GAS ไม่ตอบ)

สาเหตุปกติ:

1. **`GAS_URL` ไม่ถูก** — ตรวจ `config.js` บรรทัด 3
   - ต้องเป็น URL เต็มจาก Deploy ของ GAS (ลงท้ายด้วย `/…/usercontent…`)
   - ถ้าว่างหรือผิด ระบบบันทึกจะล้มเหลว

2. **GAS Deploy ไม่เป็น "Anyone"** — ไปกลับ Apps Script
   - ที่หน้า Deployments คลิก Deploy ที่ใช้งานอยู่
   - ตรวจว่า "Execute as: **Me**" และ "Who has access: **Anyone**"
   - ถ้าผิด ให้สร้าง Deploy ใหม่

3. **ลืมใส่ค่า PIN_SALT** — ตรวจว่า
   - `config.js` → `PIN_SALT: "math-explorer-v1"`
   - `gas/Code.gs` ในฟังก์ชัน `hashPin()` → salt ต้องเหมือนกัน

### ถ้า GitHub Pages ไม่แสดง

- ตรวจ Settings > Pages ว่า Source = "Deploy from a branch" สำเร็จ
- กลับไป Deployments แท็บ แล้ว Refresh (บางครั้งต้องรอสักนิด)

---

**คำแนะนำ**: บันทึกลิงก์ GitHub Pages เพื่อใช้งานต่อไป หลังจากนี้ทุกครั้งที่ push ไป `main` จะอัปเดตเว็บโดยอัตโนมัติ (แต่ใช้เวลา 1-2 นาที)
