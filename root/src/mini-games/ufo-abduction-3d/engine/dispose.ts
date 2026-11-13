import * as THREE from 'three'

/**
 * Giải phóng toàn bộ tài nguyên GPU của một cây Object3D:
 * geometry, material, texture (kể cả dùng chung — mỗi thứ chỉ dispose một lần),
 * InstancedMesh buffers và shadow map của đèn.
 */
export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  root.traverse((object) => {
    if (object instanceof THREE.Light) {
      object.dispose()
      return
    }
    const renderable = object as THREE.Mesh | THREE.LineSegments
    if (renderable.geometry) geometries.add(renderable.geometry)
    const material = renderable.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) material.forEach((m) => materials.add(m))
    else if (material) materials.add(material)
    if (object instanceof THREE.InstancedMesh) object.dispose()
  })

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) value.dispose()
    }
    material.dispose()
  }
  for (const geometry of geometries) geometry.dispose()
}
