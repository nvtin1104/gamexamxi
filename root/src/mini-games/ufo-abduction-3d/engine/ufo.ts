import * as THREE from 'three'
import { PALETTE } from './palette'

export const UFO_ALTITUDE = 9
export const BEAM_TOP = UFO_ALTITUDE - 0.4
export const BEAM_R_TOP = 0.9
export const BEAM_R_BOTTOM = 3.3

export interface UfoRig {
  group: THREE.Group
  reticle: THREE.Mesh
  update: (dt: number, time: number, beamOn: boolean, velX: number, velZ: number) => void
}

/** Dựng đĩa bay low-poly + chùm tia hút + vòng ngắm dưới mặt đất. */
export function createUfo(scene: THREE.Scene): UfoRig {
  const group = new THREE.Group()
  const tilt = new THREE.Group() // nghiêng theo hướng bay
  const spinner = new THREE.Group() // phần đĩa xoay liên tục
  group.add(tilt)
  tilt.add(spinner)

  // Thân đĩa: lathe từ một profile cắt ngang
  const profile = [
    new THREE.Vector2(0, -0.4),
    new THREE.Vector2(1.1, -0.36),
    new THREE.Vector2(2.3, -0.08),
    new THREE.Vector2(2.45, 0.05),
    new THREE.Vector2(1.95, 0.32),
    new THREE.Vector2(0, 0.4),
  ]
  const discGeo = new THREE.LatheGeometry(profile, 14)
  const disc = new THREE.Mesh(
    discGeo,
    new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.5, metalness: 0.1, flatShading: true }),
  )
  disc.castShadow = true
  disc.add(new THREE.LineSegments(new THREE.EdgesGeometry(discGeo, 30), new THREE.LineBasicMaterial({ color: PALETTE.ink })))
  spinner.add(disc)

  // Vòm kính
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lavender,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    }),
  )
  dome.position.y = 0.3
  dome.castShadow = true
  tilt.add(dome)

  // Phi công nhỏ trong vòm
  const pilot = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.sage, flatShading: true }),
  )
  pilot.position.y = 0.7
  tilt.add(pilot)

  // Đèn viền nhấp nháy
  const lightGeo = new THREE.SphereGeometry(0.14, 6, 4)
  const lightMats = [PALETTE.butter, PALETTE.coral].map(
    (color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, flatShading: true }),
  )
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const bulb = new THREE.Mesh(lightGeo, lightMats[i % 2])
    bulb.position.set(Math.cos(a) * 2.1, 0.12, Math.sin(a) * 2.1)
    spinner.add(bulb)
  }

  // Đáy phát sáng
  const belly = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: PALETTE.butter, emissive: PALETTE.butter, emissiveIntensity: 0.3 }),
  )
  belly.position.y = -0.42
  tilt.add(belly)

  // Chùm tia hút: hình nón cụt mở hai đầu, đỉnh tại đáy UFO
  const beamHeight = BEAM_TOP
  const beamGeo = new THREE.CylinderGeometry(BEAM_R_TOP, BEAM_R_BOTTOM, beamHeight, 32, 1, true)
  beamGeo.translate(0, -beamHeight / 2, 0)
  const beamMat = new THREE.MeshBasicMaterial({
    color: PALETTE.butter,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const beam = new THREE.Mesh(beamGeo, beamMat)
  beam.position.y = -0.4
  beam.renderOrder = 2
  group.add(beam)

  // Các vòng sáng chạy dọc tia
  const ringGeo = new THREE.TorusGeometry(1, 0.04, 4, 32)
  ringGeo.rotateX(Math.PI / 2)
  const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.cream, transparent: true, opacity: 0, depthWrite: false })
  const rings = Array.from({ length: 4 }, () => {
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.renderOrder = 3
    group.add(ring)
    return ring
  })

  // Vòng ngắm trên mặt đất (luôn hiện để biết UFO đang ở đâu)
  const reticleMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.22, depthWrite: false })
  const reticle = new THREE.Mesh(new THREE.RingGeometry(BEAM_R_BOTTOM - 0.25, BEAM_R_BOTTOM, 40), reticleMat)
  reticle.rotation.x = -Math.PI / 2
  reticle.position.y = 0.04
  reticle.renderOrder = 1
  scene.add(reticle)

  group.position.y = UFO_ALTITUDE
  scene.add(group)

  let beamLevel = 0

  function update(dt: number, time: number, beamOn: boolean, velX: number, velZ: number) {
    spinner.rotation.y += dt * (beamOn ? 3.2 : 1.2)
    tilt.rotation.z = THREE.MathUtils.lerp(tilt.rotation.z, -velX * 0.035, Math.min(1, dt * 6))
    tilt.rotation.x = THREE.MathUtils.lerp(tilt.rotation.x, velZ * 0.035, Math.min(1, dt * 6))
    group.position.y = UFO_ALTITUDE + Math.sin(time * 2.2) * 0.15

    beamLevel = THREE.MathUtils.lerp(beamLevel, beamOn ? 1 : 0, Math.min(1, dt * 10))
    const flicker = 0.85 + Math.sin(time * 24) * 0.08 + Math.sin(time * 7.3) * 0.07
    beamMat.opacity = 0.32 * beamLevel * flicker
    beam.visible = beamLevel > 0.01
    belly.material.emissiveIntensity = 0.3 + beamLevel * 0.9

    rings.forEach((ring, i) => {
      const t = (time * 0.55 + i / rings.length) % 1 // 0 = đỉnh, 1 = mặt đất
      const y = -0.4 - t * beamHeight
      ring.position.y = y
      ring.scale.setScalar(BEAM_R_TOP + (BEAM_R_BOTTOM - BEAM_R_TOP) * t)
      ring.visible = beam.visible
    })
    ringMat.opacity = 0.7 * beamLevel

    lightMats.forEach((m, i) => {
      m.emissiveIntensity = 0.35 + Math.max(0, Math.sin(time * 6 + i * Math.PI)) * (0.6 + beamLevel)
    })

    reticle.position.x = group.position.x
    reticle.position.z = group.position.z
    reticleMat.opacity = 0.22 + beamLevel * 0.5
    reticleMat.color.setHex(beamOn ? PALETTE.coral : PALETTE.ink)
  }

  return { group, reticle, update }
}
