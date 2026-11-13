import * as THREE from 'three'

export interface InputState {
  /** Trục di chuyển từ bàn phím, -1..1 */
  axisX: number
  axisZ: number
  beamKey: boolean
  beamPointer: boolean
  beamTouch: boolean
  /** Điểm trên mặt đất mà UFO đang được kéo tới (chuột giữ / chạm kéo) */
  target: THREE.Vector3 | null
}

const KEY_MAP: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

/**
 * Bàn phím (WASD / mũi tên / Space), chuột (giữ trái = tia hút + kéo lái),
 * cảm ứng (chạm kéo = lái; nút "Tia hút" do HUD React điều khiển).
 */
export function createInput(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  isActive: () => boolean,
): { state: InputState; dispose: () => void } {
  const state: InputState = {
    axisX: 0,
    axisZ: 0,
    beamKey: false,
    beamPointer: false,
    beamTouch: false,
    target: null,
  }
  const pressed = new Set<string>()
  const raycaster = new THREE.Raycaster()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const ndc = new THREE.Vector2()
  const hit = new THREE.Vector3()
  let activePointer: number | null = null

  const recompute = () => {
    let x = 0
    let z = 0
    for (const code of pressed) {
      const dir = KEY_MAP[code]
      if (dir) {
        x += dir[0]
        z += dir[1]
      }
    }
    const len = Math.hypot(x, z) || 1
    state.axisX = x / len
    state.axisZ = z / len
    state.beamKey = pressed.has('Space')
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isActive()) return
    if (!(event.code in KEY_MAP) && event.code !== 'Space') return
    // Không cuộn trang và không kích hoạt nút đang focus
    event.preventDefault()
    pressed.add(event.code)
    recompute()
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (pressed.delete(event.code)) recompute()
  }

  const clearAll = () => {
    pressed.clear()
    recompute()
    state.beamPointer = false
    state.beamTouch = false
    state.target = null
    activePointer = null
  }

  const updateTarget = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    if (raycaster.ray.intersectPlane(ground, hit)) {
      state.target = (state.target ?? new THREE.Vector3()).copy(hit)
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!isActive() || activePointer !== null) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    activePointer = event.pointerId
    canvas.setPointerCapture(event.pointerId)
    if (event.pointerType === 'mouse') state.beamPointer = true
    updateTarget(event)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId === activePointer) updateTarget(event)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== activePointer) return
    activePointer = null
    state.beamPointer = false
    state.target = null
  }

  const onContextMenu = (event: Event) => event.preventDefault()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', clearAll)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('contextmenu', onContextMenu)

  return {
    state,
    dispose() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearAll)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('contextmenu', onContextMenu)
      clearAll()
    },
  }
}
