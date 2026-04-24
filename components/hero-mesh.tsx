'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const vertex = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const fragment = `
    precision highp float;
    uniform float uTime;
    varying vec2 vUv;
    
    // 100x Palette: Black bg, indigo, orange hint
    vec3 colorA = vec3(0.0, 0.0, 0.0);
    vec3 colorB = vec3(0.31, 0.27, 0.90); // #4F46E5
    vec3 colorC = vec3(1.0, 0.30, 0.0); // #FF4D00
    
    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        
        float t = uTime * 0.025;
        
        float v1 = sin(p.x * 2.0 + t) * cos(p.y * 1.5 + t);
        float v2 = sin(p.y * 3.0 - t * 0.5) * sin(p.x * 1.0 + t);
        
        float dist = length(p);
        
        // Base dark mix
        vec3 col = mix(colorA, colorB, v1 + v2);
        
        // Very subtle neon sweeps over 40s
        float neonGlow = max(0.0, sin(dist * 2.5 - t * 3.0)) * 0.08;
        col += colorC * neonGlow;
        
        gl_FragColor = vec4(col, 1.0);
    }
`;

export function HeroMesh() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;
    let isActive = true;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1 });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', resize, false);
    resize();

    const handleVisibilityChange = () => {
      isActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    function update(t: number) {
      animationId = requestAnimationFrame(update);
      if (!isActive) return;
      program.uniforms.uTime.value = t * 0.001;
      renderer.render({ scene: mesh });
    }
    
    // Intersection Observer to init only when in viewport
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
         if (!animationId) animationId = requestAnimationFrame(update);
      } else {
         if (animationId) {
             cancelAnimationFrame(animationId);
             animationId = 0;
         }
      }
    }, { threshold: 0 });
    
    observer.observe(gl.canvas);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen" aria-hidden="true" />;
}
