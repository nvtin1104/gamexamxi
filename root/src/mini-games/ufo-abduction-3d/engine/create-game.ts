import * as THREE from 'three'
import { createActorFactory, type Actor } from './actors'
import { disposeObject } from './dispose'
import { createInput } from './input'
import { PALETTE } from './palette'
import { stepActors, type Beam } from './physics'
import { BEAM_R_BOTTOM, BEAM_R_TOP, BEAM_TOP, createUfo } from './ufo'
import { buildWorld } from './world'

export const ROUND_SECONDS = 60
const STEP = 1 / 60
const COMBO_WINDOW = 2.5
const UFO_ACCEL = 34
const UFO_MAX_SPEED = 11
const UFO_FRICTION = 3.2
const STUDENT_TARGET = 14
const PROP_TARGET = 10

export interface HudState {
  timeLeft: number
  score: number
  combo: number
  multiplier: number
  abducted: number
  beamOn: boolean
}

export interface Pop {
  id: number
  text: string
  x: number
  y: number
  big: boolean
}

export interface GameCallbacks {
  onHud: (hud: HudState) => void
  onPop: (pop: Pop) => void
  onGameOver: (result: { score: number; abducted: number; bestCombo: number; students: number }) => void
  onError: (message: string) => void
}

export interface GameHandle {
  setPaused: (paused: boolean) => void
  setTouchBeam: (on: boolean) => void
  dispose: () => void
}

function createRenderer(): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
}

export function createGame(container: HTMLElement, callbacks: GameCallbacks): GameHandle {
  const renderer = createRenderer()
  if (!renderer) {
    callbacks.onError('Trình duyệt của bạn chưa hỗ trợ WebGL nên không chạy được game 3D.')
    return { setPaused() {}, setTouchBeam() {}, dispose() {} }
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'ufo__canvas'
  container.appendChild(renderer.domElement)

  // ── Scene ────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(PALETTE.skyBg)
  scene.fog = new THREE.Fog(PALETTE.skyBg, 45, 85)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 200)
  camera.position.set(0, 21, 20)

  scene.add(new THREE.HemisphereLight(0xf4f1ff, PALETTE.sand, 1.6))
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2)
  sun.position.set(14, 30, 12)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -34
  sun.shadow.camera.right = 34
  sun.shadow.camera.top = 34
  sun.shadow.camera.bottom = -34
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 80
  sun.shadow.bias = -0.0008
  scene.add(sun, sun.target)

  const world = buildWorld(scene)
  const ufo = createUfo(scene)
  const factory = createActorFactory()

  // ── Trạng thái ván chơi ──────────────────────────────────
  const ufoPos = new THREE.Vector3(0, 0, 6)
  const ufoVel = new THREE.Vector3()
  const beam: Beam = {
    on: false,
    x: ufoPos.x,
    z: ufoPos.z,
    top: BEAM_TOP,
    rTop: BEAM_R_TOP,
    rBottom: BEAM_R_BOTTOM,
    vx: 0,
    vz: 0,
  }
  let actors: Actor[] = []
  let elapsed = 0
  let timeLeft = ROUND_SECONDS
  let score = 0
  let combo = 0
  let bestCombo = 0
  let abducted = 0
  let students = 0
  let lastAbsorbAt = -Infinity
  let over = false
  let paused = true
  let hidden = document.hidden
  let touchBeam = false
  const pendingSpawns: { kind: 'student' | 'prop'; at: number }[] = []
  let popId = 1

  const randomSpot = (minDistFromUfo: number) => {
    const b = world.bound - 1
    for (let i = 0; i < 30; i++) {
      const x = THREE.MathUtils.randFloat(-b, b)
      const z = THREE.MathUtils.randFloat(-b + 4, b)
      if (Math.hypot(x - ufoPos.x, z - ufoPos.z) < minDistFromUfo) continue
      if (world.obstacles.some((o) => (o.kind === 'circle' ? Math.hypot(x - o.x, z - o.z) < o.r + 1 : x > o.minX - 1 && x < o.maxX + 1 && z > o.minZ - 1 && z < o.maxZ + 1)))
        continue
      return { x, z }
    }
    return { x: b, z: b }
  }

  const spawn = (kind: 'student' | 'prop', minDist = 6) => {
    const actor =
      kind === 'prop' ? factory.createProp() : Math.random() < 0.15 ? factory.createMascot() : factory.createStudent()
    const { x, z } = randomSpot(minDist)
    actor.pos.set(x, actor.halfHeight, z)
    actor.mesh.position.copy(actor.pos)
    actor.body.rotation.y = actor.heading
    scene.add(actor.mesh)
    actors.push(actor)
  }

  for (let i = 0; i < STUDENT_TARGET; i++) spawn('student')
  for (let i = 0; i < PROP_TARGET; i++) spawn('prop', 4)

  // ── Input ────────────────────────────────────────────────
  const input = createInput(renderer.domElement, camera, () => !paused && !over)

  // ── HUD (chỉ gửi khi có thay đổi để React không render 60 lần/giây) ──
  let lastHudKey = ''
  const emitHud = () => {
    const multiplier = combo > 1 ? Math.min(3, 1 + (combo - 1) * 0.25) : 1
    const hud: HudState = {
      timeLeft: Math.ceil(timeLeft),
      score,
      combo,
      multiplier,
      abducted,
      beamOn: beam.on,
    }
    const key = `${hud.timeLeft}|${score}|${combo}|${abducted}|${beam.on}`
    if (key !== lastHudKey) {
      lastHudKey = key
      callbacks.onHud(hud)
    }
  }

  const projected = new THREE.Vector3()
  const onAbsorb = (actor: Actor) => {
    if (elapsed - lastAbsorbAt <= COMBO_WINDOW) combo += 1
    else combo = 1
    lastAbsorbAt = elapsed
    bestCombo = Math.max(bestCombo, combo)
    const multiplier = Math.min(3, 1 + (combo - 1) * 0.25)
    const gained = Math.round(actor.points * multiplier)
    score += gained
    abducted += 1
    if (actor.kind !== 'prop') students += 1

    projected.set(ufoPos.x, BEAM_TOP + 1.5, ufoPos.z).project(camera)
    callbacks.onPop({
      id: popId++,
      text: combo > 1 ? `+${gained} · combo ×${multiplier.toFixed(2).replace(/\.?0+$/, '')}` : `+${gained}`,
      x: (projected.x + 1) / 2,
      y: (1 - projected.y) / 2,
      big: actor.kind === 'mascot' || combo >= 4,
    })

    scene.remove(actor.mesh)
    pendingSpawns.push({ kind: actor.kind === 'prop' ? 'prop' : 'student', at: elapsed + THREE.MathUtils.randFloat(0.8, 2) })
  }

  // ── Mô phỏng một bước cố định ───────────────────────────
  const update = (dt: number) => {
    elapsed += dt
    timeLeft = Math.max(0, ROUND_SECONDS - elapsed)

    // Lái UFO: bàn phím + kéo chuột/chạm
    const s = input.state
    let ax = s.axisX
    let az = s.axisZ
    if (s.target) {
      const tx = s.target.x - ufoPos.x
      const tz = s.target.z - ufoPos.z
      const len = Math.hypot(tx, tz)
      if (len > 0.4) {
        const strength = Math.min(1, len / 3)
        ax += (tx / len) * strength
        az += (tz / len) * strength
      }
    }
    beam.on = s.beamKey || s.beamPointer || touchBeam
    const maxSpeed = beam.on ? UFO_MAX_SPEED * 0.6 : UFO_MAX_SPEED
    ufoVel.x += ax * UFO_ACCEL * dt
    ufoVel.z += az * UFO_ACCEL * dt
    ufoVel.multiplyScalar(Math.max(0, 1 - UFO_FRICTION * dt))
    if (ufoVel.length() > maxSpeed) ufoVel.setLength(maxSpeed)
    ufoPos.addScaledVector(ufoVel, dt)
    const b = world.bound
    if (Math.abs(ufoPos.x) > b) {
      ufoPos.x = Math.sign(ufoPos.x) * b
      ufoVel.x = 0
    }
    if (Math.abs(ufoPos.z) > b) {
      ufoPos.z = Math.sign(ufoPos.z) * b
      ufoVel.z = 0
    }

    beam.x = ufoPos.x
    beam.z = ufoPos.z
    beam.vx = ufoVel.x
    beam.vz = ufoVel.z

    const absorbed = stepActors(actors, beam, world, dt, elapsed)
    if (absorbed.length) {
      absorbed.forEach(onAbsorb)
      actors = actors.filter((a) => !a.removed)
    }

    if (elapsed - lastAbsorbAt > COMBO_WINDOW && combo !== 0) combo = 0

    for (let i = pendingSpawns.length - 1; i >= 0; i--) {
      const pending = pendingSpawns[i]
      if (pending && pending.at <= elapsed) {
        pendingSpawns.splice(i, 1)
        spawn(pending.kind, 10)
      }
    }

    if (timeLeft <= 0 && !over) {
      over = true
      beam.on = false
      emitHud()
      callbacks.onGameOver({ score, abducted, bestCombo, students })
    }
  }

  // ── Hiển thị (mỗi khung hình) ───────────────────────────
  const camTarget = new THREE.Vector3()
  const camDesired = new THREE.Vector3()
  let renderTime = 0
  let camInit = false

  const renderFrame = (dt: number) => {
    renderTime += dt
    ufo.group.position.x = ufoPos.x
    ufo.group.position.z = ufoPos.z
    ufo.update(dt, renderTime, beam.on, ufoVel.x, ufoVel.z)

    for (const a of actors) {
      a.mesh.position.copy(a.pos)
      if (a.state === 'panic') a.mesh.position.y += Math.abs(Math.sin(renderTime * 16 + a.phase)) * 0.28
      else if (a.state === 'wander' && a.kind !== 'prop') a.mesh.position.y += Math.abs(Math.sin(renderTime * 7 + a.phase)) * 0.06
    }

    camDesired.set(ufoPos.x * 0.9, 18, ufoPos.z * 0.9 + 17)
    camTarget.set(ufoPos.x * 0.9, 0, ufoPos.z * 0.9 - 1)
    if (!camInit) {
      camera.position.copy(camDesired)
      camInit = true
    } else {
      camera.position.lerp(camDesired, 1 - Math.exp(-4 * dt))
    }
    camera.lookAt(camTarget)

    // Bóng đổ đi theo UFO để giữ độ nét
    sun.position.set(ufoPos.x * 0.5 + 14, 30, ufoPos.z * 0.5 + 12)
    sun.target.position.set(ufoPos.x * 0.5, 0, ufoPos.z * 0.5)

    renderer.render(scene, camera)
  }

  // ── Vòng lặp ────────────────────────────────────────────
  let raf = 0
  let last = 0
  let acc = 0

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    if (!paused && !over) {
      acc += dt
      while (acc >= STEP) {
        update(STEP)
        acc -= STEP
      }
      emitHud()
    }
    renderFrame(dt)
    if (over) stop()
  }

  const start = () => {
    if (raf || hidden) return
    last = performance.now()
    acc = 0
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  // Khi tạm dừng vẫn vẽ cảnh (đĩa bay lơ lửng phía sau modal) nhưng không chạy mô phỏng
  const sync = () => {
    if (hidden) stop()
    else start()
  }

  // ── Resize ───────────────────────────────────────────────
  const resize = () => {
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)
    renderer.setSize(width, height)
    camera.aspect = width / height
    // Màn hình dọc (điện thoại): mở rộng góc nhìn để thấy đủ sân
    camera.fov = camera.aspect < 0.8 ? 62 : 48
    camera.updateProjectionMatrix()
    if (!raf) renderFrame(0)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  const onVisibility = () => {
    hidden = document.hidden
    sync()
  }
  document.addEventListener('visibilitychange', onVisibility)

  emitHud()
  sync()

  let disposed = false
  return {
    setPaused(next) {
      paused = next
      if (paused) input.state.target = null
      sync()
    },
    setTouchBeam(on) {
      touchBeam = on
    },
    dispose() {
      if (disposed) return
      disposed = true
      stop()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      input.dispose()
      // actor đã bị hút không còn trong scene — gỡ nốt rồi giải phóng tài nguyên dùng chung
      disposeObject(scene)
      factory.dispose()
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
