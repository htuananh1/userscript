export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function vectorLength(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

export function normalizeXZ(vector) {
  const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
  if (length <= 0.0001) {
    return { x: 0, y: 0, z: 1 };
  }
  return { x: vector.x / length, y: 0, z: vector.z / length };
}

export function formatTimeVN(date = new Date()) {
  const offsetMs = 7 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + offsetMs);
  return `${local.toISOString().replace("T", " ").slice(0, 19)} UTC+7`;
}
