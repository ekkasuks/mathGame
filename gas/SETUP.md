# วิธีตั้งค่า Google Sheet + Apps Script

## 1. สร้าง Google Sheet
1. ไปที่ https://sheets.google.com สร้างสเปรดชีตใหม่ ตั้งชื่อ "MathExplorer-Data"
2. สร้างแท็บชื่อ `Players` แถวแรก (หัวคอลัมน์ A1:J1) ใส่:
   ```
   studentId | displayName | grade | pinHash | totalScore | coins | progressJSON | baseJSON | createdAt | updatedAt
   ```
3. สร้างแท็บชื่อ `Log` แถวแรก (A1:D1) ใส่: 
   ```
   timestamp | studentId | action | detail
   ```

## 2. ใส่โค้ด Apps Script
1. ในสเปรดชีต เมนู Extensions > Apps Script
2. ลบโค้ดเดิม วางเนื้อหาไฟล์ `gas/Code.gs` ทั้งหมด แล้วบันทึก
3. ⚠️ ตรวจว่า salt ในฟังก์ชัน `hashPin` (`"math-explorer-v1"`) ตรงกับ `PIN_SALT` ใน `config.js`

## 3. Deploy เป็น Web App
1. กด Deploy > New deployment > เลือกชนิด "Web app"
2. Execute as: **Me** ; Who has access: **Anyone**
3. กด Deploy อนุญาตสิทธิ์ แล้วคัดลอก **Web app URL**
4. นำ URL ไปใส่ `GAS_URL` ในไฟล์ `config.js`

## 4. ทดสอบ
รันจากเทอร์มินัล (แทน URL ด้วยของจริง):

```bash
curl -L -X POST "<GAS_URL>" -H "Content-Type: text/plain" \
  -d '{"action":"register","name":"ทดสอบ","grade":3,"pin":"1234"}'
```

ควรได้ JSON `{"ok":true,...}`
