// components/three/ParticleBackground.tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null)
  const mousePosition = useRef({ x: 0, y: 0 })
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  useEffect(() => {
    if (!mountRef.current) return

    // Cena
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x000011, 15, 30)
    
    // Câmera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 20)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000011, 1)
    mountRef.current.appendChild(renderer.domElement)

    // Criar grid de pontos como uma placa de circuito
    const gridSize = 20
    const spacing = 1.5
    const nodes: THREE.Vector3[] = []
    const connections: { start: number; end: number; progress: number; speed: number }[] = []
    
    // Criar nós na grid
    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        // Criar padrão de grid com alguns nós faltando (como uma PCB real)
        if (Math.random() > 0.3) {
          const z = (Math.sin(x * 0.3) + Math.cos(y * 0.3)) * 0.5
          nodes.push(new THREE.Vector3(x * spacing, y * spacing, z))
        }
      }
    }

    // Criar conexões entre nós próximos
    nodes.forEach((node, index) => {
      // Encontrar nós vizinhos
      nodes.forEach((otherNode, otherIndex) => {
        if (index !== otherIndex && node.distanceTo(otherNode) < spacing * 2.5) {
          // Aleatoriedade para não conectar todos os nós
          if (Math.random() > 0.7) {
            connections.push({
              start: index,
              end: otherIndex,
              progress: Math.random(),
              speed: 0.002 + Math.random() * 0.003
            })
          }
        }
      })
    })

    // Geometria para os nós (pontos de conexão)
    const nodeGeometry = new THREE.BufferGeometry()
    const nodePositions = new Float32Array(nodes.length * 3)
    const nodeColors = new Float32Array(nodes.length * 3)
    const nodeSizes = new Float32Array(nodes.length)

    nodes.forEach((node, i) => {
      const i3 = i * 3
      nodePositions[i3] = node.x
      nodePositions[i3 + 1] = node.y
      nodePositions[i3 + 2] = node.z
      
      // Cores dos nós - azul/roxo tecnológico
      nodeColors[i3] = 0.1
      nodeColors[i3 + 1] = 0.3
      nodeColors[i3 + 2] = 0.8
      
      nodeSizes[i] = 0.1
    })

    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3))
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3))
    nodeGeometry.setAttribute('size', new THREE.BufferAttribute(nodeSizes, 1))

    const nodeMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })

    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial)
    scene.add(nodePoints)

    // Geometria para as conexões (linhas de energia)
    const connectionGeometry = new THREE.BufferGeometry()
    const connectionPositions = new Float32Array(connections.length * 6) // 2 pontos por linha
    const connectionColors = new Float32Array(connections.length * 6)

    const connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    })

    const connectionLines = new THREE.LineSegments(connectionGeometry, connectionMaterial)
    scene.add(connectionLines)

    // Partículas de energia que percorrem as conexões
    const energyParticlesCount = 100
    const energyGeometry = new THREE.BufferGeometry()
    const energyPositions = new Float32Array(energyParticlesCount * 3)
    const energyColors = new Float32Array(energyParticlesCount * 3)
    const energySizes = new Float32Array(energyParticlesCount)

    // Distribuir partículas de energia aleatoriamente nas conexões
    const energyParticles: {
      connectionIndex: number;
      progress: number;
      speed: number;
      size: number;
    }[] = []

    for (let i = 0; i < energyParticlesCount; i++) {
      const connectionIndex = Math.floor(Math.random() * connections.length)
      const progress = Math.random()
      const speed = 0.01 + Math.random() * 0.02
      const size = 0.3 + Math.random() * 0.4
      
      energyParticles.push({ connectionIndex, progress, speed, size })
      
      const i3 = i * 3
      energyColors[i3] = 0.0     // R
      energyColors[i3 + 1] = 0.8 // G - Verde para energia
      energyColors[i3 + 2] = 1.0 // B
      energySizes[i] = size
    }

    energyGeometry.setAttribute('position', new THREE.BufferAttribute(energyPositions, 3))
    energyGeometry.setAttribute('color', new THREE.BufferAttribute(energyColors, 3))
    energyGeometry.setAttribute('size', new THREE.BufferAttribute(energySizes, 1))

    const energyMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })

    const energyPoints = new THREE.Points(energyGeometry, energyMaterial)
    scene.add(energyPoints)

    // Efeitos de luz
    const ambientLight = new THREE.AmbientLight(0x001133, 0.3)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x0044ff, 1, 50)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    const pointLight2 = new THREE.PointLight(0x8800ff, 0.8, 50)
    pointLight2.position.set(-10, -10, 5)
    scene.add(pointLight2)

    // Interação com mouse
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1
      
      mousePosition.current = {
        x: event.clientX,
        y: event.clientY
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Animação principal
    const clock = new THREE.Clock()
    
    const animate = () => {
      requestAnimationFrame(animate)
      
      const time = clock.getElapsedTime()
      const delta = clock.getDelta()
      
      // Atualizar conexões - pulsar com energia
      connections.forEach((conn, index) => {
        conn.progress += conn.speed
        if (conn.progress > 1) conn.progress = 0
        
        const startNode = nodes[conn.start]
        const endNode = nodes[conn.end]
        
        const i6 = index * 6
        connectionPositions[i6] = startNode.x
        connectionPositions[i6 + 1] = startNode.y
        connectionPositions[i6 + 2] = startNode.z
        
        connectionPositions[i6 + 3] = endNode.x
        connectionPositions[i6 + 4] = endNode.y
        connectionPositions[i6 + 5] = endNode.z
        
        // Pulsar cor baseado no progresso da energia
        const pulse = Math.sin(time * 2 + index) * 0.3 + 0.7
        for (let j = 0; j < 6; j += 3) {
          connectionColors[i6 + j] = 0.1 * pulse          // R
          connectionColors[i6 + j + 1] = 0.3 * pulse      // G
          connectionColors[i6 + j + 2] = 0.6 * pulse      // B
        }
      })
      
      connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3))
      connectionGeometry.setAttribute('color', new THREE.BufferAttribute(connectionColors, 3))

      // Atualizar partículas de energia
      energyParticles.forEach((particle, index) => {
        particle.progress += particle.speed
        if (particle.progress > 1) {
          particle.progress = 0
          // Ocasionalmente mudar para uma nova conexão
          if (Math.random() > 0.95) {
            particle.connectionIndex = Math.floor(Math.random() * connections.length)
          }
        }
        
        const conn = connections[particle.connectionIndex]
        const startNode = nodes[conn.start]
        const endNode = nodes[conn.end]
        
        // Posição interpolada ao longo da conexão
        const i3 = index * 3
        energyPositions[i3] = startNode.x + (endNode.x - startNode.x) * particle.progress
        energyPositions[i3 + 1] = startNode.y + (endNode.y - startNode.y) * particle.progress
        energyPositions[i3 + 2] = startNode.z + (endNode.z - startNode.z) * particle.progress
        
        // Pulsar brilho e tamanho
        const pulse = Math.sin(time * 8 + index) * 0.5 + 0.5
        energySizes[index] = particle.size * (0.8 + pulse * 0.4)
        
        // Mudar cor baseado na posição (gradiente)
        energyColors[i3] = particle.progress * 0.5                    // R aumenta
        energyColors[i3 + 1] = 0.8 - particle.progress * 0.4         // G diminui
        energyColors[i3 + 2] = 1.0                                   // B constante
      })
      
      energyGeometry.attributes.position.needsUpdate = true
      energyGeometry.attributes.size.needsUpdate = true
      energyGeometry.attributes.color.needsUpdate = true

      // Pulsar nós
      nodes.forEach((_, i) => {
        const pulse = Math.sin(time * 3 + i * 0.1) * 0.2 + 0.8
        nodeSizes[i] = 0.1 * pulse
        nodeColors[i * 3 + 1] = 0.3 * pulse  // Pulsar componente verde
        nodeColors[i * 3 + 2] = 0.8 * pulse  // Pulsar componente azul
      })
      
      nodeGeometry.attributes.size.needsUpdate = true
      nodeGeometry.attributes.color.needsUpdate = true

      // Interação com mouse - criar onda de energia
      raycaster.current.setFromCamera(mouse.current, camera)
      
      // Rotação suave da cena
      scene.rotation.x = Math.sin(time * 0.1) * 0.1
      scene.rotation.y = time * 0.05

      // Mover luzes
      pointLight.position.x = Math.sin(time * 0.5) * 15
      pointLight.position.z = Math.cos(time * 0.3) * 10
      pointLight2.position.y = Math.cos(time * 0.4) * 12
      pointLight2.position.z = Math.sin(time * 0.6) * 8

      renderer.render(scene, camera)
    }
    
    animate()

    // Responsividade
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
      nodeGeometry.dispose()
      nodeMaterial.dispose()
      connectionGeometry.dispose()
      connectionMaterial.dispose()
      energyGeometry.dispose()
      energyMaterial.dispose()
    }
  }, [])

  return (
    <div 
      ref={mountRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-100"
    />
  )
}