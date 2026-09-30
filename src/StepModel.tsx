import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { OcctImporter } from 'occt-import-js'
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url'

type CadViewerProps = {
  file: File | null
  uploadedVisible: boolean
  comparisonVisible: boolean
  comparisonVariant: number | null
  zoom: number
  resetToken: number
  onError: (message: string) => void
}

let importerPromise: Promise<OcctImporter> | undefined
function getImporter() {
  if (!importerPromise) {
    importerPromise = import('occt-import-js')
      .then(({ default: initialize }) => initialize({ locateFile: () => occtWasmUrl }))
      .catch((error: unknown) => {
        importerPromise = undefined
        throw error
      })
  }
  return importerPromise
}

function disposeGroup(group: THREE.Group | null) {
  group?.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        material.dispose()
      }
    }
  })
  group?.removeFromParent()
}

function fitGroup(THREE: typeof import('three'), group: THREE.Group) {
  const bounds = new THREE.Box3().setFromObject(group)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const longest = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(longest) || longest <= 0) throw new Error('The file contains geometry that cannot be displayed.')
  const scale = 2.4 / longest
  group.scale.setScalar(scale)
  group.position.copy(center).multiplyScalar(-scale)
}

function makeComparison(THREE: typeof import('three'), variant: number) {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: '#dc5962', metalness: 0.25, roughness: 0.45, side: THREE.DoubleSide,
    transparent: true, opacity: 0.72, depthWrite: false, depthTest: false,
  })
  const makePlate = (width: number, height: number, depth: number, holes: Array<[number, number, number]>) => {
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, -height / 2)
    shape.lineTo(width / 2, -height / 2)
    shape.lineTo(width / 2, height / 2)
    shape.lineTo(-width / 2, height / 2)
    shape.closePath()
    for (const [x, y, radius] of holes) {
      const hole = new THREE.Path()
      hole.absarc(x, y, radius, 0, Math.PI * 2, true)
      shape.holes.push(hole)
    }
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.025, bevelThickness: 0.025,
    })
    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)
    return mesh
  }

  if (variant === 3) {
    const ring = new THREE.Shape()
    ring.absarc(0, 0, 0.95, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, 0.42, 0, Math.PI * 2, true)
    ring.holes.push(hole)
    group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(ring, {
      depth: 0.48, steps: 1, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 40,
    }), material))
  } else if (variant === 2) {
    makePlate(2.7, 1.7, 0.3, [[-0.9, -0.5, 0.13], [0.9, -0.5, 0.13], [-0.9, 0.5, 0.13], [0.9, 0.5, 0.13], [0, 0, 0.38]])
  } else {
    const width = variant === 1 ? 2.15 : 2.35
    const base = makePlate(width, 1.55, 0.22, [[-0.78, 0.3, 0.14], [0.78, 0.3, 0.14]])
    base.position.z = -0.55
    const upright = makePlate(width, 1.22, 0.22, [[-0.78, 0.18, 0.14], [0.78, 0.18, 0.14]])
    upright.rotation.x = Math.PI / 2
    upright.position.set(0, -0.7, 0.04)
  }
  fitGroup(THREE, group)
  return group
}

export default function StepModel({
  file, uploadedVisible, comparisonVisible, comparisonVariant, zoom, resetToken, onError,
}: CadViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const moduleRef = useRef<typeof import('three') | null>(null)
  const uploadedRef = useRef<THREE.Group | null>(null)
  const comparisonRef = useRef<THREE.Group | null>(null)
  const visibilityRef = useRef({ uploadedVisible, comparisonVisible })
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    visibilityRef.current = { uploadedVisible, comparisonVisible }
    if (uploadedRef.current) uploadedRef.current.visible = uploadedVisible
    if (comparisonRef.current) comparisonRef.current.visible = comparisonVisible
  }, [uploadedVisible, comparisonVisible])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let frame = 0
    let resize: ResizeObserver | undefined
    let renderer: THREE.WebGLRenderer | undefined
    let controls: OrbitControls | undefined
    let grid: THREE.GridHelper | undefined
    const initialize = async () => {
      try {
        const [THREE, { OrbitControls: Controls }] = await Promise.all([
          import('three'), import('three/addons/controls/OrbitControls.js'),
        ])
        if (cancelled) return
        const scene = new THREE.Scene()
        scene.background = new THREE.Color('#f9fafc')
        const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000)
        camera.up.set(0, 0, 1)
        camera.position.set(3.1, -4.3, 3.1)
        renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        host.appendChild(renderer.domElement)
        scene.add(new THREE.HemisphereLight('#ffffff', '#7f8998', 2.1))
        const key = new THREE.DirectionalLight('#ffffff', 2.6)
        key.position.set(4, -5, 8)
        scene.add(key)
        const fill = new THREE.DirectionalLight('#d9e2f1', 1.15)
        fill.position.set(-5, 2, 3)
        scene.add(fill)
        grid = new THREE.GridHelper(5, 20, '#d5dbe3', '#e9edf2')
        grid.rotation.x = Math.PI / 2
        grid.position.z = -1.28
        scene.add(grid)
        controls = new Controls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.saveState()
        const resizeView = () => {
          const width = host.clientWidth
          const height = host.clientHeight
          if (!width || !height) return
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer?.setSize(width, height)
        }
        resizeView()
        resize = new ResizeObserver(resizeView)
        resize.observe(host)
        moduleRef.current = THREE
        sceneRef.current = scene
        cameraRef.current = camera
        controlsRef.current = controls
        setReady(true)
        const draw = () => {
          if (cancelled) return
          controls?.update()
          renderer?.render(scene, camera)
          frame = requestAnimationFrame(draw)
        }
        draw()
      } catch (error) {
        if (!cancelled) onError(error instanceof Error ? error.message : 'Could not start the 3D viewer.')
      }
    }
    void initialize()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      resize?.disconnect()
      controls?.dispose()
      disposeGroup(uploadedRef.current)
      disposeGroup(comparisonRef.current)
      uploadedRef.current = null
      comparisonRef.current = null
      grid?.geometry.dispose()
      if (renderer) {
        renderer.domElement.remove()
        renderer.dispose()
      }
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      moduleRef.current = null
      setReady(false)
    }
  }, [onError])

  useEffect(() => {
    if (!ready || !sceneRef.current || !moduleRef.current) return
    let cancelled = false
    const scene = sceneRef.current
    const THREE = moduleRef.current
    disposeGroup(uploadedRef.current)
    uploadedRef.current = null
    setErrorMessage('')
    if (!file) {
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const [importer, buffer] = await Promise.all([getImporter(), file.arrayBuffer()])
        if (cancelled) return
        const bytes = new Uint8Array(buffer)
        const result = /\.(igs|iges)$/i.test(file.name)
          ? importer.ReadIgesFile(bytes, null)
          : importer.ReadStepFile(bytes, null)
        if (!result.success || !result.meshes?.length) throw new Error('No solid geometry was found in this file.')
        const group = new THREE.Group()
        try {
          for (const mesh of result.meshes) {
            const positions = mesh.attributes?.position?.array
            const indices = mesh.index?.array
            if (!positions?.length || !indices?.length) continue
            if (positions.length % 3 !== 0 || positions.some((value) => !Number.isFinite(value))) {
              throw new Error('The file contains invalid vertex coordinates.')
            }
            const geometry = new THREE.BufferGeometry()
            const material = new THREE.MeshStandardMaterial({
              color: '#9ca9b9', metalness: 0.3, roughness: 0.42, side: THREE.DoubleSide,
            })
            group.add(new THREE.Mesh(geometry, material))
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
            geometry.setIndex(indices)
            if (mesh.attributes.normal?.array?.length === positions.length) {
              geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3))
            } else {
              geometry.computeVertexNormals()
            }
          }
          fitGroup(THREE, group)
        } catch (error) {
          disposeGroup(group)
          throw error
        }
        if (cancelled) {
          disposeGroup(group)
          return
        }
        group.visible = visibilityRef.current.uploadedVisible
        scene.add(group)
        uploadedRef.current = group
        setLoading(false)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Could not read this CAD file.'
        setLoading(false)
        setErrorMessage(message)
        onError(message)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [file, ready, onError])

  useEffect(() => {
    if (!ready || !sceneRef.current || !moduleRef.current) return
    disposeGroup(comparisonRef.current)
    comparisonRef.current = null
    if (comparisonVariant === null) return
    try {
      const group = makeComparison(moduleRef.current, comparisonVariant)
      group.visible = visibilityRef.current.comparisonVisible
      sceneRef.current.add(group)
      comparisonRef.current = group
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not display the comparison model.')
    }
  }, [comparisonVariant, ready, onError])

  useEffect(() => {
    if (!cameraRef.current) return
    cameraRef.current.zoom = zoom
    cameraRef.current.updateProjectionMatrix()
  }, [zoom, ready])

  useEffect(() => { controlsRef.current?.reset() }, [resetToken, ready])

  return <div className="step-model-host" aria-label="Interactive CAD comparison" role="img">
    <div className="cad-canvas" ref={hostRef} />
    {loading && <span className="step-loading" role="status">Reading CAD geometry…</span>}
    {errorMessage && <span className="step-loading" role="alert">Unable to display this CAD file.</span>}
    {!file && !comparisonVisible && <span className="cad-empty">Upload a STEP file or load a database model</span>}
  </div>
}
