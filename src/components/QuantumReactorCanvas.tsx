import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from 'motion/react';
import { minerVisuals } from './MinerVisual';

export interface QuantumReactorCanvasProps {
  planId: string;
  active?: boolean;
  starting?: boolean;
  step?: number;
  className?: string;
}

// Generate smooth circular radial particle texture programmatically (no external image fetch required)
function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function QuantumReactorCanvas({
  planId,
  active = false,
  starting = false,
  step = 0,
  className = '',
}: QuantumReactorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const renderStaticRef = useRef<(() => void) | null>(null);

  // Color reference for the specific miner plan
  const visual = minerVisuals[planId];
  const accentHex = visual?.accent ?? '#00E5FF';

  // Refs to hold live state for RAF loop without rebuilding scene
  const stateRef = useRef({
    active,
    starting,
    step,
    accentColor: new THREE.Color(accentHex),
    targetColor: new THREE.Color(accentHex),
    shockwaveProgress: 0,
    shockwaveActive: false,
    ignitionPulse: 0,
  });

  useEffect(() => {
    stateRef.current.active = active;
    stateRef.current.starting = starting;
    stateRef.current.step = step;
    stateRef.current.targetColor.set(accentHex);

    // Trigger shockwave on step 2 (ignition phase)
    if (starting && step === 2) {
      stateRef.current.shockwaveActive = true;
      stateRef.current.shockwaveProgress = 0;
      stateRef.current.ignitionPulse = 1.0;
    }
    renderStaticRef.current?.();
  }, [active, starting, step, accentHex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 270;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#040a12', 0.045);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, 0.2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      // The product layers and CSS ignition remain available without WebGL.
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Textures & Materials
    const particleTexture = createParticleTexture();

    // 3. Cyber Quantum Ground Ring Grid (Floor wireframe)
    const gridGeometry = new THREE.RingGeometry(0.8, 3.2, 36, 6);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentHex),
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = -1.05;
    scene.add(gridMesh);

    // 4. Concentric Energy Rings
    // Inner Ring
    const innerRingGeo = new THREE.TorusGeometry(1.65, 0.016, 8, 80);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentHex),
      transparent: true,
      opacity: 0.35,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2.2;
    innerRing.position.set(0, 0.1, -0.4);
    scene.add(innerRing);

    // Outer Ring
    const outerRingGeo = new THREE.TorusGeometry(2.1, 0.012, 8, 90);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentHex),
      transparent: true,
      opacity: 0.25,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2.1;
    outerRing.position.set(0, 0.1, -0.4);
    scene.add(outerRing);

    // 5. Blast Shockwave Disc (Triggered on step 2)
    const shockwaveGeo = new THREE.RingGeometry(0.1, 0.35, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentHex),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.rotation.x = -Math.PI / 2;
    shockwaveMesh.position.y = -0.5;
    scene.add(shockwaveMesh);

    // 6. Quantum Core Particle Stream (77 particles, calibrated for clean luxury presence)
    const particleCount = 77;
    const SPEED_SCALE = 0.25; // 25% of current speed as requested
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const baseAngles = new Float32Array(particleCount);
    const baseRadii = new Float32Array(particleCount);
    const baseHeights = new Float32Array(particleCount);
    const highlights = new Float32Array(particleCount);

    const baseColor = new THREE.Color(accentHex);
    const highlightColor = new THREE.Color('#ffffff');

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 2.2;
      const y = -1.0 + Math.random() * 2.4;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7 - 0.3;

      baseAngles[i] = angle;
      baseRadii[i] = radius;
      baseHeights[i] = y;

      // Velocities (scaled to 25% of original)
      velocities[i * 3] = (Math.random() - 0.5) * 0.01 * SPEED_SCALE;
      velocities[i * 3 + 1] = (0.006 + Math.random() * 0.014) * SPEED_SCALE;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01 * SPEED_SCALE;

      // Color variation between accent and bright highlights
      highlights[i] = Math.random() * 0.45;
      const mixedColor = baseColor.clone().lerp(highlightColor, highlights[i]);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      scales[i] = 14.0 + Math.random() * 24.0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.19,
      map: particleTexture,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Dynamic Ambient Core Light
    const coreLight = new THREE.PointLight(baseColor, 1.8, 8);
    coreLight.position.set(0, 0.4, 0.2);
    scene.add(coreLight);

    const rimLight = new THREE.PointLight(baseColor, 1.2, 6);
    rimLight.position.set(0, -0.6, -1.2);
    scene.add(rimLight);

    // 8. Render Animation Loop
    let animationFrameId: number | null = null;
    let lastFrame: number | null = null;
    let elapsed = 0;
    let inView = true;
    const particleColor = new THREE.Color();
    const updateColors = () => {
      const current = stateRef.current.accentColor;
      if (reducedMotion) current.copy(stateRef.current.targetColor);
      else current.lerp(stateRef.current.targetColor, .08);
      gridMaterial.color.copy(current);
      innerRingMat.color.copy(current);
      outerRingMat.color.copy(current);
      coreLight.color.copy(current);
      rimLight.color.copy(current);
      shockwaveMat.color.copy(current);
      for (let i = 0; i < particleCount; i++) {
        particleColor.copy(current).lerp(highlightColor, highlights[i]);
        colors[i * 3] = particleColor.r;
        colors[i * 3 + 1] = particleColor.g;
        colors[i * 3 + 2] = particleColor.b;
      }
      (particleGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    };
    renderStaticRef.current = () => { updateColors(); renderer.render(scene, camera); };

    const animate = (frameTime: number) => {
      if (document.hidden || !inView || reducedMotion) { animationFrameId = null; return; }
      animationFrameId = requestAnimationFrame(animate);

      const delta = lastFrame === null ? 0 : Math.min((frameTime - lastFrame) / 1000, .05);
      lastFrame = frameTime;
      elapsed += delta;
      const { active: isActive, starting: isStarting, step: currStep, shockwaveActive } = stateRef.current;

      updateColors();

      // Rotation speeds scaled to 25%
      let ringSpeed = 0.4 * SPEED_SCALE;
      let particleSpeedMultiplier = 1.0 * SPEED_SCALE;

      if (isStarting) {
        if (currStep === 0) {
          // Implosion / charge-up
          ringSpeed = 1.2 * SPEED_SCALE;
          particleSpeedMultiplier = 1.8 * SPEED_SCALE;
          coreLight.intensity = 1.0 + Math.sin(elapsed * 20 * SPEED_SCALE) * 0.5;
        } else if (currStep === 1) {
          // High-frequency vortex
          ringSpeed = 3.6 * SPEED_SCALE;
          particleSpeedMultiplier = 3.2 * SPEED_SCALE;
          coreLight.intensity = 2.4 + Math.sin(elapsed * 35 * SPEED_SCALE) * 1.2;
        } else if (currStep === 2) {
          // Full reactor ignition
          ringSpeed = 2.0 * SPEED_SCALE;
          particleSpeedMultiplier = 2.5 * SPEED_SCALE;
          coreLight.intensity = 4.2 + (stateRef.current.ignitionPulse * 3.0);
        }
      } else if (isActive) {
        // Active mining continuous hum
        ringSpeed = 0.85 * SPEED_SCALE;
        particleSpeedMultiplier = 1.4 * SPEED_SCALE;
        coreLight.intensity = 2.2 + Math.sin(elapsed * 2.5 * SPEED_SCALE) * 0.4;
        innerRingMat.opacity = 0.45;
        outerRingMat.opacity = 0.35;
      } else {
        // Idle ready state
        ringSpeed = 0.35 * SPEED_SCALE;
        particleSpeedMultiplier = 0.8 * SPEED_SCALE;
        coreLight.intensity = 1.4 + Math.sin(elapsed * 1.5 * SPEED_SCALE) * 0.3;
        innerRingMat.opacity = 0.25;
        outerRingMat.opacity = 0.15;
      }

      // Decay ignition pulse
      if (stateRef.current.ignitionPulse > 0.01) {
        stateRef.current.ignitionPulse *= 0.94;
      }

      // Ring rotations
      innerRing.rotation.z -= delta * ringSpeed;
      outerRing.rotation.z += delta * (ringSpeed * 0.65);
      gridMesh.rotation.z += delta * 0.06 * SPEED_SCALE;

      // Shockwave progression
      if (shockwaveActive) {
        stateRef.current.shockwaveProgress += delta * 1.8;
        const p = stateRef.current.shockwaveProgress;
        if (p < 1.0) {
          const scale = 0.1 + p * 6.5;
          shockwaveMesh.scale.set(scale, scale, 1);
          shockwaveMat.opacity = (1.0 - p) * 0.85;
        } else {
          stateRef.current.shockwaveActive = false;
          shockwaveMat.opacity = 0;
        }
      }

      // Update particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;

        // Angle and radius swirl
        let radius = baseRadii[i];
        let height = posArray[idx + 1];

        // Move upward
        height += velocities[idx + 1] * particleSpeedMultiplier * delta * 60;

        // Reset if reached top
        if (height > 1.8) {
          height = -1.1;
          baseAngles[i] = Math.random() * Math.PI * 2;
        }

        posArray[idx + 1] = height;

        // In step 0 (charge-up): particles pull toward center
        if (isStarting && currStep === 0) {
          radius *= 0.75;
        }

        // Swirl around Y axis (scaled to 25%)
        baseAngles[i] += delta * SPEED_SCALE * (0.8 + (1.5 / Math.max(0.4, radius))) * (isStarting && currStep === 1 ? 2.8 : 1.0);

        posArray[idx] = Math.cos(baseAngles[i]) * radius;
        posArray[idx + 2] = Math.sin(baseAngles[i]) * radius * 0.75 - 0.35;
      }

      posAttr.needsUpdate = true;

      // Subtle camera micro-float or boot jitter
      if (isStarting && currStep === 1 && !reducedMotion) {
        camera.position.x = (Math.random() - 0.5) * 0.04;
        camera.position.y = 1.2 + (Math.random() - 0.5) * 0.03;
      } else {
        camera.position.x = Math.sin(elapsed * 0.6 * SPEED_SCALE) * 0.06;
        camera.position.y = 1.2 + Math.cos(elapsed * 0.4 * SPEED_SCALE) * 0.04;
      }
      camera.lookAt(0, 0.15, 0);

      renderer.render(scene, camera);
    };

    const resume = () => {
      if (document.hidden || !inView || reducedMotion || animationFrameId !== null) return;
      lastFrame = null;
      animationFrameId = requestAnimationFrame(animate);
    };
    const visibilityChanged = () => {
      if (document.hidden && animationFrameId !== null) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
      else resume();
    };
    const intersection = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting ?? true;
      if (!inView && animationFrameId !== null) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
      else resume();
    });
    intersection.observe(container);
    document.addEventListener('visibilitychange', visibilityChanged);
    renderStaticRef.current();
    resume();

    // 9. Resize Handling via ResizeObserver
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 270;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (reducedMotion) renderStaticRef.current?.();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Resource Cleanup
    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      renderStaticRef.current = null;

      // Dispose Three.js resources cleanly
      gridGeometry.dispose();
      gridMaterial.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`quantum-reactor-canvas-wrap ${className}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    />
  );
}
