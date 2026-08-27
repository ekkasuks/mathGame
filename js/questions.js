// สร้างโจทย์เลขแบบสุ่ม (pure logic — ห้าม import DOM/network)

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SYMBOL = { add: "+", sub: "−", mul: "×", div: "÷" };

export function generateQuestion(spec) {
  const op = spec.ops[randInt(0, spec.ops.length - 1)];
  let a, b, answer;

  if (op === "add") {
    a = randInt(spec.min, spec.max);
    b = randInt(spec.min, spec.max);
    answer = a + b;
  } else if (op === "sub") {
    a = randInt(spec.min, spec.max);
    b = randInt(spec.min, spec.max);
    if (!spec.allowNegative && b > a) [a, b] = [b, a]; // สลับให้ไม่ติดลบ
    answer = a - b;
  } else if (op === "mul") {
    a = randInt(spec.min, spec.max);
    b = randInt(spec.min, spec.max);
    answer = a * b;
  } else if (op === "div") {
    // สร้างจากผลคูณก่อน เพื่อรับประกันหารลงตัว
    b = randInt(Math.max(1, spec.min), spec.max); // ตัวหารไม่เป็น 0
    answer = randInt(spec.min, spec.max);
    a = b * answer;
  } else {
    throw new Error("unknown op: " + op);
  }

  return { text: `${a} ${SYMBOL[op]} ${b}`, operands: [a, b], op, answer };
}

export function generateStage(spec, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(generateQuestion(spec));
  return out;
}

export const ZONE_SPECS = {
  1: { ops: ["add", "sub"], min: 0, max: 20, allowNegative: false, wholeDivision: true },
  2: { ops: ["add", "sub", "mul"], min: 2, max: 12, allowNegative: false, wholeDivision: true },
  3: { ops: ["mul", "div"], min: 2, max: 12, allowNegative: false, wholeDivision: true },
  4: { ops: ["add", "sub", "mul", "div"], min: 2, max: 20, allowNegative: false, wholeDivision: true },
};
