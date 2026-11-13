import * as THREE from 'three'
import type { Actor } from './actors'
import { resolveObstacles, type World } from './world'

/**
 * Mô phỏng vật lý nhẹ, tự viết, chạy với bước thời gian cố định (1/60s).
 *  - Trọng lực + nảy khi chạm đất
 *  - Tia hút: lực nâng chống trọng lực, xoắn ốc quanh trục tia, kéo dần vào tâm, mô-men xoay
 *  - Học sinh: đi lang thang → hoảng loạn bỏ chạy khi UFO tới gần → ngã khi rơi → đứng dậy
 */

export interface Beam {
  on: boolean
  x: number
  z: number
  /** Độ cao đáy UFO (đỉnh tia) */
  top: number
  rTop: number
  rBottom: number
  /** Vận tốc UFO — vật trong tia bị kéo theo */
  vx: number
  vz: number
}

export const GRAVITY = 18
const LIFT = 9 // gia tốc nâng ròng khi ở trong tia
const MAX_RISE = 4.6
const SWIRL = 6.5
const PULL = 2.6
const PANIC_RADIUS_BEAM = 8
const PANIC_RADIUS_HOVER = 4.2
const WALK_SPEED = 1.15
const RUN_SPEED = 4.4

export function beamRadiusAt(beam: Beam, y: number): number {
  const t = THREE.MathUtils.clamp(y / beam.top, 0, 1)
  return beam.rBottom + (beam.rTop - beam.rBottom) * t
}

function groundY(actor: Actor): number {
  return actor.state === 'knocked' ? actor.radius : actor.halfHeight
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

function wrapAngle(r: number): number {
  return Math.atan2(Math.sin(r), Math.cos(r))
}

const QUARTER = Math.PI / 2
const snapQuarter = (r: number) => Math.round(r / QUARTER) * QUARTER

export function stepActors(actors: Actor[], beam: Beam, world: World, dt: number, time: number): Actor[] {
  const absorbed: Actor[] = []

  for (const a of actors) {
    if (a.removed) continue
    const { pos, vel, spin, body } = a

    // ── Đang bị hút vào bụng UFO ───────────────────────────
    if (a.state === 'absorbed') {
      a.stateTimer += dt
      const k = Math.min(1, a.stateTimer / 0.35)
      pos.x += (beam.x - pos.x) * Math.min(1, dt * 12)
      pos.z += (beam.z - pos.z) * Math.min(1, dt * 12)
      pos.y += (beam.top - pos.y) * Math.min(1, dt * 12)
      a.mesh.scale.setScalar(Math.max(0.001, 1 - k))
      body.rotation.y += dt * 14
      if (k >= 1) {
        a.removed = true
        absorbed.push(a)
      }
      continue
    }

    const dx = pos.x - beam.x
    const dz = pos.z - beam.z
    const dist = Math.hypot(dx, dz)
    // Vật đã bị hút được "dính" thêm một chút để không văng khỏi phần nón hẹp gần đỉnh
    const grip = a.state === 'lifted' ? 0.7 : 0
    const inBeam = beam.on && pos.y < beam.top && dist < beamRadiusAt(beam, pos.y) + grip

    if (inBeam) {
      // ── Trong tia hút: chống trọng lực + xoắn ốc ─────────
      if (a.state !== 'lifted') {
        a.state = 'lifted'
        spin.set(rand(-3, 3), rand(-4, 4), rand(-3, 3))
      }
      const nx = dist > 0.001 ? dx / dist : 1
      const nz = dist > 0.001 ? dz / dist : 0
      // tiếp tuyến (xoáy ngược chiều kim đồng hồ) và lực hướng tâm — càng lên cao càng siết vào tâm
      const heightRatio = THREE.MathUtils.clamp(pos.y / beam.top, 0, 1)
      const pull = PULL * (1 + heightRatio * 2.5)
      const swirl = SWIRL * (1 - heightRatio * 0.4)
      vel.x += (-nz * swirl - nx * pull * dist) * dt
      vel.z += (nx * swirl - nz * pull * dist) * dt
      // bị kéo theo chuyển động của UFO
      vel.x += (beam.vx - vel.x) * 1.2 * dt
      vel.z += (beam.vz - vel.z) * 1.2 * dt
      // giảm chấn ngang để quỹ đạo là xoắn ốc êm
      const damp = Math.max(0, 1 - 1.8 * dt)
      vel.x *= damp
      vel.z *= damp
      vel.y = Math.min(MAX_RISE, vel.y + LIFT * dt)
      // mô-men xoắn nhẹ, ngẫu nhiên
      spin.x += rand(-4, 4) * dt
      spin.z += rand(-4, 4) * dt
      spin.y += 2.5 * dt
      spin.clampLength(0, 7)

      pos.addScaledVector(vel, dt)
      body.rotation.x += spin.x * dt
      body.rotation.y += spin.y * dt
      body.rotation.z += spin.z * dt

      if (pos.y >= beam.top - 1.1 && dist < 1.9) {
        a.state = 'absorbed'
        a.stateTimer = 0
      }
      continue
    }

    if (a.state === 'lifted') a.state = 'falling'

    const floor = groundY(a)
    const airborne = pos.y > floor + 0.001 || vel.y > 0

    if (airborne) {
      // ── Rơi tự do ───────────────────────────────────────
      vel.y -= GRAVITY * dt
      vel.x *= Math.max(0, 1 - 0.3 * dt)
      vel.z *= Math.max(0, 1 - 0.3 * dt)
      pos.addScaledVector(vel, dt)
      body.rotation.x += spin.x * dt
      body.rotation.y += spin.y * dt
      body.rotation.z += spin.z * dt

      if (pos.y <= floor) {
        pos.y = floor
        if (vel.y < -3) {
          // nảy nhẹ
          vel.y *= -0.32
          vel.x *= 0.6
          vel.z *= 0.6
          spin.multiplyScalar(0.55)
        } else {
          vel.y = 0
          spin.set(0, 0, 0)
          // đưa góc về [-π, π] để hoạt ảnh đứng dậy không quay nhiều vòng
          body.rotation.x = wrapAngle(body.rotation.x)
          body.rotation.z = wrapAngle(body.rotation.z)
          if (a.kind === 'prop') {
            a.state = 'rest'
          } else {
            a.state = 'knocked'
            a.stateTimer = rand(0.9, 1.6)
            pos.y = a.radius
          }
        }
      }
      resolveObstacles(pos, a.radius, world)
      continue
    }

    pos.y = floor
    vel.y = 0

    // ── Đồ vật nằm yên: trượt chậm dần, xoay về tư thế phẳng ─
    if (a.kind === 'prop') {
      vel.x *= Math.max(0, 1 - 5 * dt)
      vel.z *= Math.max(0, 1 - 5 * dt)
      pos.x += vel.x * dt
      pos.z += vel.z * dt
      body.rotation.x += (snapQuarter(body.rotation.x) - body.rotation.x) * Math.min(1, 8 * dt)
      body.rotation.z += (snapQuarter(body.rotation.z) - body.rotation.z) * Math.min(1, 8 * dt)
      resolveObstacles(pos, a.radius, world)
      continue
    }

    // ── Học sinh bị ngã: nằm một lúc rồi đứng dậy ─────────
    if (a.state === 'knocked') {
      a.stateTimer -= dt
      body.rotation.x += (QUARTER - body.rotation.x) * Math.min(1, 10 * dt)
      body.rotation.z += (0 - body.rotation.z) * Math.min(1, 10 * dt)
      vel.x *= Math.max(0, 1 - 6 * dt)
      vel.z *= Math.max(0, 1 - 6 * dt)
      pos.x += vel.x * dt
      pos.z += vel.z * dt
      if (a.stateTimer <= 0) {
        a.state = 'panic'
        a.stateTimer = 2.5
        pos.y = a.halfHeight
      }
      resolveObstacles(pos, a.radius, world)
      continue
    }

    // ── Đi lang thang / hoảng loạn ─────────────────────────
    const threat = beam.on ? PANIC_RADIUS_BEAM : PANIC_RADIUS_HOVER
    if (dist < threat) {
      a.state = 'panic'
      a.stateTimer = 1.6
    }

    let speed: number
    if (a.state === 'panic') {
      const away = Math.atan2(dx, dz)
      const jitter = Math.sin(time * 5 + a.phase) * 0.5
      a.heading = lerpAngle(a.heading, away + jitter, Math.min(1, 8 * dt))
      speed = RUN_SPEED * a.speedMul
      a.stateTimer -= dt
      if (a.stateTimer <= 0 && dist >= threat) a.state = 'wander'
    } else {
      a.turnTimer -= dt
      if (a.turnTimer <= 0) {
        a.heading += rand(-1.3, 1.3)
        a.turnTimer = rand(1.5, 4)
      }
      speed = WALK_SPEED * a.speedMul
    }

    const tx = Math.sin(a.heading) * speed
    const tz = Math.cos(a.heading) * speed
    const steer = Math.min(1, 6 * dt)
    vel.x += (tx - vel.x) * steer
    vel.z += (tz - vel.z) * steer
    pos.x += vel.x * dt
    pos.z += vel.z * dt

    if (resolveObstacles(pos, a.radius, world) && a.state === 'wander') {
      a.heading += Math.PI * rand(0.5, 1)
    }

    // đứng thẳng lại, quay mặt theo hướng chạy
    body.rotation.x += (0 - body.rotation.x) * Math.min(1, 8 * dt)
    body.rotation.z += (0 - body.rotation.z) * Math.min(1, 8 * dt)
    body.rotation.y = lerpAngle(body.rotation.y, a.heading, Math.min(1, 10 * dt))
  }

  separate(actors)
  return absorbed
}

/** Tách các học sinh đang đứng để không chồng lên nhau (O(n²), n nhỏ). */
function separate(actors: Actor[]): void {
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i]
    if (!a || a.removed || a.state === 'lifted' || a.state === 'absorbed') continue
    for (let j = i + 1; j < actors.length; j++) {
      const b = actors[j]
      if (!b || b.removed || b.state === 'lifted' || b.state === 'absorbed') continue
      const dx = b.pos.x - a.pos.x
      const dz = b.pos.z - a.pos.z
      const min = a.radius + b.radius
      const d2 = dx * dx + dz * dz
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2)
        const push = (min - d) / 2
        const nx = dx / d
        const nz = dz / d
        a.pos.x -= nx * push
        a.pos.z -= nz * push
        b.pos.x += nx * push
        b.pos.z += nz * push
      }
    }
  }
}
