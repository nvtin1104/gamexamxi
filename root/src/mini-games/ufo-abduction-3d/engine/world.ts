import * as THREE from 'three'
import { PALETTE } from './palette'

export type Obstacle =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }

export interface World {
  /** Nửa cạnh vùng chơi (actor và UFO bị giới hạn trong [-bound, bound]) */
  bound: number
  obstacles: Obstacle[]
}

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...extra })

const EDGE_MATERIAL = () => new THREE.LineBasicMaterial({ color: PALETTE.ink })

/** Thêm viền mực (phong cách neo-brutalism) cho một mesh khối. */
function withEdges(mesh: THREE.Mesh, edgeMaterial: THREE.LineBasicMaterial): THREE.Mesh {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), edgeMaterial)
  mesh.add(edges)
  return mesh
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Dựng sân trường low-poly. Mọi geometry/material đều gắn vào scene để dispose một lượt. */
export function buildWorld(scene: THREE.Scene): World {
  const obstacles: Obstacle[] = []
  const edge = EDGE_MATERIAL()
  const bound = 26

  // ── Mặt đất, lối đi, bãi cỏ ─────────────────────────────
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(PALETTE.ground, { flatShading: false }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const pathMat = mat(PALETTE.path, { flatShading: false })
  const pathA = new THREE.Mesh(new THREE.PlaneGeometry(6, 58), pathMat)
  pathA.rotation.x = -Math.PI / 2
  pathA.position.y = 0.01
  pathA.receiveShadow = true
  const pathB = new THREE.Mesh(new THREE.PlaneGeometry(58, 6), pathMat)
  pathB.rotation.x = -Math.PI / 2
  pathB.position.y = 0.012
  pathB.receiveShadow = true
  scene.add(pathA, pathB)

  const grassMat = mat(PALETTE.grass)
  const grassGeo = new THREE.CircleGeometry(6.5, 9)
  for (const [x, z] of [
    [-13, 12],
    [13, 12],
    [-13, -6],
    [13, -6],
  ] as const) {
    const grass = new THREE.Mesh(grassGeo, grassMat)
    grass.rotation.x = -Math.PI / 2
    grass.position.set(x, 0.02, z)
    grass.receiveShadow = true
    scene.add(grass)
  }

  // Hàng rào thấp quanh sân
  const hedgeMat = mat(PALETTE.sageDeep)
  const hedgeLen = bound * 2 + 4
  for (const [w, d, x, z] of [
    [hedgeLen, 1, 0, bound + 2],
    [1, hedgeLen, -bound - 2, 0],
    [1, hedgeLen, bound + 2, 0],
  ] as const) {
    scene.add(withEdges(box(w, 1, d, hedgeMat, x, 0.5, z), edge))
  }

  // ── Tòa nhà chính (phía bắc) ────────────────────────────
  const skyMat = mat(PALETTE.sky)
  const lavMat = mat(PALETTE.lavender)
  const creamMat = mat(PALETTE.cream)
  const butterMat = mat(PALETTE.butter)
  const coralMat = mat(PALETTE.coral)

  const main = withEdges(box(30, 8, 7, skyMat, 0, 4, -bound - 1), edge)
  const roof = withEdges(box(31.5, 0.8, 8.2, lavMat, 0, 8.4, -bound - 1), edge)
  const door = withEdges(box(4, 4.2, 0.4, butterMat, 0, 2.1, -bound + 2.6), edge)
  scene.add(main, roof, door)
  obstacles.push({ kind: 'box', minX: -15.5, maxX: 15.5, minZ: -bound - 5, maxZ: -bound + 3 })

  // Cửa sổ: InstancedMesh để giảm draw call
  const windowGeo = new THREE.BoxGeometry(2.2, 1.6, 0.3)
  const windows = new THREE.InstancedMesh(windowGeo, creamMat, 16)
  const m = new THREE.Matrix4()
  let wi = 0
  for (const row of [2.6, 5.6]) {
    for (const col of [-12, -8.5, -5, 5, 8.5, 12, -2.8, 2.8]) {
      if (row === 2.6 && Math.abs(col) < 3) continue // chỗ cửa chính
      m.makeTranslation(col, row, -bound + 2.55)
      windows.setMatrixAt(wi++, m)
    }
  }
  windows.count = wi
  windows.castShadow = false
  scene.add(windows)

  // Biển tên trường
  scene.add(withEdges(box(9, 1.3, 0.3, coralMat, 0, 7.1, -bound + 2.6), edge))

  // ── Nhà phụ (phía tây) ──────────────────────────────────
  scene.add(withEdges(box(7, 6, 15, lavMat, -bound - 0.5, 3, 4), edge))
  scene.add(withEdges(box(7.8, 0.7, 15.8, butterMat, -bound - 0.5, 6.35, 4), edge))
  obstacles.push({ kind: 'box', minX: -bound - 4, maxX: -bound + 3, minZ: -3.5, maxZ: 11.5 })

  // ── Cột cờ ──────────────────────────────────────────────
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 8, 6), creamMat)
  pole.position.set(0, 4, -13)
  pole.castShadow = true
  const flag = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.05), coralMat)
  flag.position.set(1.25, 7.1, -13)
  flag.castShadow = true
  const base = withEdges(box(2, 0.5, 2, butterMat, 0, 0.25, -13), edge)
  scene.add(pole, flag, base)
  obstacles.push({ kind: 'circle', x: 0, z: -13, r: 1.4 })

  // ── Cây xanh: trunk + tán dạng InstancedMesh ────────────
  const treeSpots: [number, number, number][] = [
    [-20, -17, 1.1],
    [-9, -18, 0.9],
    [9, -18, 1],
    [20, -17, 1.15],
    [22, -4, 0.95],
    [22, 8, 1.1],
    [21, 20, 1],
    [8, 22, 0.9],
    [-8, 22, 1.05],
    [-19, 21, 1],
    [-17, -9, 0.85],
    [16, 15, 0.8],
  ]
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.4, 6)
  trunkGeo.translate(0, 0.7, 0)
  const crownGeo = new THREE.ConeGeometry(1.5, 3.2, 7)
  crownGeo.translate(0, 2.9, 0)
  const trunks = new THREE.InstancedMesh(trunkGeo, mat(PALETTE.trunk), treeSpots.length)
  const crowns = new THREE.InstancedMesh(crownGeo, mat(PALETTE.sageDeep), treeSpots.length)
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  treeSpots.forEach(([x, z, scale], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.3)
    s.setScalar(scale)
    p.set(x, 0, z)
    m.compose(p, q, s)
    trunks.setMatrixAt(i, m)
    crowns.setMatrixAt(i, m)
    obstacles.push({ kind: 'circle', x, z, r: 0.9 * scale })
  })
  trunks.castShadow = true
  crowns.castShadow = true
  scene.add(trunks, crowns)

  // ── Ghế đá & bồn hoa ────────────────────────────────────
  for (const [x, z, rot] of [
    [-6, 8, 0],
    [6, 8, 0],
    [-6, -4, 0],
    [6, -4, 0],
  ] as const) {
    const bench = new THREE.Group()
    bench.add(withEdges(box(3, 0.25, 0.9, butterMat, 0, 0.6, 0), edge))
    bench.add(box(0.25, 0.6, 0.8, creamMat, -1.2, 0.3, 0))
    bench.add(box(0.25, 0.6, 0.8, creamMat, 1.2, 0.3, 0))
    bench.position.set(x, 0, z)
    bench.rotation.y = rot
    scene.add(bench)
    obstacles.push({ kind: 'box', minX: x - 1.6, maxX: x + 1.6, minZ: z - 0.55, maxZ: z + 0.55 })
  }

  const bedGeo = new THREE.CylinderGeometry(1.7, 1.8, 0.5, 8)
  const flowerGeo = new THREE.IcosahedronGeometry(0.28, 0)
  for (const [x, z] of [
    [-13, 12],
    [13, 12],
    [-13, -6],
    [13, -6],
  ] as const) {
    const bed = withEdges(new THREE.Mesh(bedGeo, coralMat), edge)
    bed.position.set(x, 0.25, z)
    bed.castShadow = true
    bed.receiveShadow = true
    scene.add(bed)
    for (let i = 0; i < 6; i++) {
      const flower = new THREE.Mesh(flowerGeo, i % 2 ? butterMat : lavMat)
      const a = (i / 6) * Math.PI * 2
      flower.position.set(x + Math.cos(a) * 0.9, 0.65, z + Math.sin(a) * 0.9)
      scene.add(flower)
    }
    obstacles.push({ kind: 'circle', x, z, r: 1.9 })
  }

  return { bound, obstacles }
}

/** Đẩy một điểm tròn bán kính r ra khỏi chướng ngại vật. Trả về true nếu có va chạm. */
export function resolveObstacles(pos: THREE.Vector3, r: number, world: World): boolean {
  let hit = false
  for (const o of world.obstacles) {
    if (o.kind === 'circle') {
      const dx = pos.x - o.x
      const dz = pos.z - o.z
      const min = o.r + r
      const d2 = dx * dx + dz * dz
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.0001
        pos.x = o.x + (dx / d) * min
        pos.z = o.z + (dz / d) * min
        hit = true
      }
    } else if (pos.x > o.minX - r && pos.x < o.maxX + r && pos.z > o.minZ - r && pos.z < o.maxZ + r) {
      const pushLeft = pos.x - (o.minX - r)
      const pushRight = o.maxX + r - pos.x
      const pushUp = pos.z - (o.minZ - r)
      const pushDown = o.maxZ + r - pos.z
      const minPush = Math.min(pushLeft, pushRight, pushUp, pushDown)
      if (minPush === pushLeft) pos.x = o.minX - r
      else if (minPush === pushRight) pos.x = o.maxX + r
      else if (minPush === pushUp) pos.z = o.minZ - r
      else pos.z = o.maxZ + r
      hit = true
    }
  }
  const b = world.bound
  if (pos.x < -b || pos.x > b || pos.z < -b || pos.z > b) {
    pos.x = THREE.MathUtils.clamp(pos.x, -b, b)
    pos.z = THREE.MathUtils.clamp(pos.z, -b, b)
    hit = true
  }
  return hit
}
