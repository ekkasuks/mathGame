// ตั้งค่าทั้งหมดที่เดียว — แก้ GAS_URL หลัง deploy GAS แล้ว (Task 6)
export const CONFIG = {
  GAS_URL: "",              // ใส่ URL ของ GAS Web App ที่นี่หลัง deploy
  LEADERBOARD_TOP: 20,      // จำนวนอันดับที่แสดง
  PIN_SALT: "math-explorer-v1", // salt สำหรับ hash PIN (ค่าคงที่ทั้งระบบ)
  STAGES_PER_ZONE: 4,       // จำนวนด่านต่อโซน
  QUESTIONS_PER_STAGE: 8,   // จำนวนโจทย์ต่อด่าน
};
