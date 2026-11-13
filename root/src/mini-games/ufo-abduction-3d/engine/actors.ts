import * as THREE from 'three'
import { PALETTE, STUDENT_COLORS } from './palette'

export type ActorKind = 'student' | 'mascot' | 'prop'
export type ActorState = 'wander' | 'panic' | 'lifted' | 'falling' | 'knocked' | 'rest' | 'absorbed'

export interface Actor {
  id: number
  kind: ActorKind
  mesh: THREE.Group
  /** Thân chính (để xoay/lật mà không ảnh hưởng vị trí group) */
  body: THREE.Object3D
  pos: THREE.Vector3
  vel: THREE.Vector3
  /** Vận tốc góc (rad/s) khi bay trong tia hút / rơi */
  spin: THREE.Vector3
  state: ActorState
  heading: number
  turnTimer: number
  stateTimer: number
  /** Khoảng cách từ tâm tới mặt đất khi đứng */
  halfHeight: number
  radius: number
  points: number
  /** Pha ngẫu nhiên cho hoạt ảnh nhún nhảy */
  phase: number
  speedMul: number
  removed: boolean
}

/**
 * Nhà máy tạo actor. Geometry & material dùng chung (cache theo màu)
 * để hàng chục actor chỉ tốn vài buffer GPU; `dispose()` giải phóng toàn bộ.
 */
export function createActorFactory() {
  const geometries: THREE.BufferGeometry[] = []
  const materials = new Map<number, THREE.MeshStandardMaterial>()
  const track = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g)
    return g
  }
  const material = (color: number) => {
    let m = materials.get(color)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true })
      materials.set(color, m)
    }
    return m
  }

  const bodyGeo = track(new THREE.CapsuleGeometry(0.32, 0.55, 3, 8))
  const mascotGeo = track(new THREE.CapsuleGeometry(0.42, 0.5, 3, 10))
  const eyeGeo = track(new THREE.SphereGeometry(0.06, 6, 4))
  const bagGeo = track(new THREE.BoxGeometry(0.42, 0.45, 0.2))
  const earGeo = track(new THREE.ConeGeometry(0.14, 0.32, 5))
  const crateGeo = track(new THREE.BoxGeometry(0.62, 0.62, 0.62))
  const ballGeo = track(new THREE.IcosahedronGeometry(0.3, 1))
  const bookGeo = track(new THREE.BoxGeometry(0.62, 0.22, 0.46))
  const coneGeo = track(new THREE.ConeGeometry(0.28, 0.62, 7))
  const crateEdges = track(new THREE.EdgesGeometry(crateGeo))
  const edgeMat = new THREE.LineBasicMaterial({ color: PALETTE.ink })

  let nextId = 1
  const rand = (a: number, b: number) => a + Math.random() * (b - a)
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T

  function base(kind: ActorKind, body: THREE.Object3D, halfHeight: number, radius: number, points: number): Actor {
    const mesh = new THREE.Group()
    mesh.add(body)
    return {
      id: nextId++,
      kind,
      mesh,
      body,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      state: kind === 'prop' ? 'rest' : 'wander',
      heading: rand(0, Math.PI * 2),
      turnTimer: rand(0.5, 3),
      stateTimer: 0,
      halfHeight,
      radius,
      points,
      phase: rand(0, Math.PI * 2),
      speedMul: rand(0.8, 1.25),
      removed: false,
    }
  }

  function addFace(group: THREE.Object3D, y: number, z: number, spread: number) {
    const eyeMat = material(PALETTE.ink)
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(side * spread, y, z)
      group.add(eye)
    }
  }

  function createStudent(): Actor {
    const body = new THREE.Group()
    const torso = new THREE.Mesh(bodyGeo, material(pick(STUDENT_COLORS)))
    torso.castShadow = true
    body.add(torso)
    addFace(body, 0.22, 0.29, 0.11)
    if (Math.random() < 0.7) {
      const bag = new THREE.Mesh(bagGeo, material(pick(STUDENT_COLORS)))
      bag.position.set(0, 0.02, -0.33)
      bag.castShadow = true
      body.add(bag)
    }
    return base('student', body, 0.6, 0.34, 100)
  }

  function createMascot(): Actor {
    const body = new THREE.Group()
    const torso = new THREE.Mesh(mascotGeo, material(PALETTE.lavender))
    torso.castShadow = true
    body.add(torso)
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, material(PALETTE.coral))
      ear.position.set(side * 0.22, 0.72, 0)
      ear.rotation.z = -side * 0.3
      body.add(ear)
    }
    addFace(body, 0.2, 0.38, 0.14)
    const actor = base('mascot', body, 0.67, 0.44, 250)
    actor.speedMul = 1.35 // linh vật chạy nhanh hơn
    return actor
  }

  function createProp(): Actor {
    const type = Math.floor(Math.random() * 4)
    let body: THREE.Object3D
    let half: number
    switch (type) {
      case 0: {
        const crate = new THREE.Mesh(crateGeo, material(PALETTE.butter))
        crate.add(new THREE.LineSegments(crateEdges, edgeMat))
        body = crate
        half = 0.31
        break
      }
      case 1:
        body = new THREE.Mesh(ballGeo, material(PALETTE.coral))
        half = 0.3
        break
      case 2:
        body = new THREE.Mesh(bookGeo, material(pick([PALETTE.sky, PALETTE.lavender, PALETTE.sage])))
        half = 0.11
        break
      default:
        body = new THREE.Mesh(coneGeo, material(PALETTE.coral))
        half = 0.31
    }
    body.castShadow = true
    return base('prop', body, half, 0.32, 50)
  }

  function dispose() {
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
    edgeMat.dispose()
    materials.clear()
  }

  return { createStudent, createMascot, createProp, dispose }
}

export type ActorFactory = ReturnType<typeof createActorFactory>
