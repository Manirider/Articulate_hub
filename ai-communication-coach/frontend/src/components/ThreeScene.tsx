'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type ThreeSceneProps = {
  variant?: 'particles' | 'geometric' | 'brain';
  className?: string;
  interactive?: boolean;
};

export function ThreeScene({ variant = 'particles', className = '', interactive = true }: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const allowInteraction = interactive && !reduceMotion;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Build scene based on variant
    const objects: THREE.Object3D[] = [];
    let particleSystem: THREE.Points | null = null;

    if (variant === 'particles' || variant === 'brain') {
      const count = variant === 'brain' ? (reduceMotion ? 240 : 1500) : (reduceMotion ? 160 : 800);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        if (variant === 'brain') {
          // Spherical distribution (brain shape)
          const phi = Math.acos(-1 + (2 * i) / count);
          const theta = Math.sqrt(count * Math.PI) * phi;
          const r = 2 + Math.random() * 0.5;
          positions[i3] = r * Math.cos(theta) * Math.sin(phi);
          positions[i3 + 1] = r * Math.sin(theta) * Math.sin(phi);
          positions[i3 + 2] = r * Math.cos(phi);
        } else {
          positions[i3] = (Math.random() - 0.5) * 10;
          positions[i3 + 1] = (Math.random() - 0.5) * 10;
          positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }

        // Colors — cyan to violet gradient
        const t = Math.random();
        colors[i3] = 0.02 + t * 0.5;      // R
        colors[i3 + 1] = 0.7 - t * 0.3;    // G
        colors[i3 + 2] = 0.83 + t * 0.1;    // B

        sizes[i] = Math.random() * 3 + 1;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      particleSystem = new THREE.Points(geometry, material);
      scene.add(particleSystem);
    }

    if (variant === 'geometric') {
      // Torus knot — main centerpiece
      const torusGeo = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32);
      const torusMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      scene.add(torus);
      objects.push(torus);

      // Floating icosahedron
      const icoGeo = new THREE.IcosahedronGeometry(0.5, 0);
      const icoMat = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const ico = new THREE.Mesh(icoGeo, icoMat);
      ico.position.set(2.5, 1, -1);
      scene.add(ico);
      objects.push(ico);

      // Floating octahedron
      const octGeo = new THREE.OctahedronGeometry(0.4, 0);
      const octMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const oct = new THREE.Mesh(octGeo, octMat);
      oct.position.set(-2, -0.8, 0.5);
      scene.add(oct);
      objects.push(oct);

      // Small particles around geometric objects
      const pCount = 300;
      const pGeo = new THREE.BufferGeometry();
      const pPositions = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPositions[i * 3] = (Math.random() - 0.5) * 8;
        pPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        pPositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(pGeo, pMat);
      scene.add(pts);
      objects.push(pts);
    }

    // Animation loop
    let frameId: number;
    const clock = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (particleSystem) {
        particleSystem.rotation.y = elapsed * 0.05;
        particleSystem.rotation.x = Math.sin(elapsed * 0.03) * 0.1;

        if (allowInteraction) {
          particleSystem.rotation.y += mouseRef.current.x * 0.0003;
          particleSystem.rotation.x += mouseRef.current.y * 0.0003;
        }
      }

      objects.forEach((obj, i) => {
        if (obj instanceof THREE.Mesh) {
          obj.rotation.x = elapsed * (0.1 + i * 0.05);
          obj.rotation.y = elapsed * (0.15 + i * 0.03);
        } else if (obj instanceof THREE.Points) {
          obj.rotation.y = elapsed * 0.02;
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    // Mouse tracking
    function onMouseMove(e: globalThis.MouseEvent) {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    }

    // Resize handler
    function onResize() {
      const el = mountRef.current;
      if (!el) return;
      const newW = el.clientWidth;
      const newH = el.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    }

    if (allowInteraction) window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      if (allowInteraction) window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [variant, interactive]);

  return <div ref={mountRef} className={`w-full h-full ${className}`} />;
}
