import type { Point } from "../types";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  color: string;
  radius: number;
};

export function spawnBurst(point: Point, color: string, count: number, cellSize: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.06 + Math.random() * 0.18;
    particles.push({
      x: point.x * cellSize + cellSize / 2,
      y: point.y * cellSize + cellSize / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 420 + Math.random() * 360,
      age: 0,
      color,
      radius: 2 + Math.random() * 4,
    });
  }
  return particles;
}

export function stepParticles(particles: Particle[], delta: number): Particle[] {
  return particles
    .map((p) => ({ ...p, x: p.x + p.vx * delta, y: p.y + p.vy * delta, age: p.age + delta }))
    .filter((p) => p.age < p.life);
}
