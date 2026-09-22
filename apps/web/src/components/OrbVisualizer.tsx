import React, { useEffect, useRef } from 'react';
import { VoiceState } from '@jarvis/shared';

interface OrbVisualizerProps {
  voiceState: VoiceState;
  className?: string;
  size?: number;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
}

export const OrbVisualizer: React.FC<OrbVisualizerProps> = ({
  voiceState,
  className = '',
  size = 440
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Particle field initialization
    const particleCount = 90;
    const particles: Particle3D[] = [];
    const orbRadius = size * 0.38;

    const goldColors = ['#ffd700', '#f59e0b', '#fbbf24', '#f97316', '#ffedd5'];
    const cyanColors = ['#06b6d4', '#38bdf8', '#67e8f9', '#a5f3fc', '#ffffff'];

    for (let i = 0; i < particleCount; i++) {
      // Random position inside sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * orbRadius * 0.88;

      const isCyan = Math.random() > 0.45;
      const colorPalette = isCyan ? cyanColors : goldColors;

      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.2 + 0.8,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    const render = () => {
      // Get device pixel ratio for sharp retina rendering
      const dpr = window.devicePixelRatio || 1;
      const width = size;
      const height = size;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const r = orbRadius;

      // Speed & dynamics depending on voice state
      let rotSpeed = 0.006;
      let waveAmp = 1.0;
      let coreGlowIntensity = 0.4;
      let ribbonColorMode = 'normal'; // normal, listening, thinking, speaking

      if (voiceState === VoiceState.LISTENING) {
        rotSpeed = 0.018;
        waveAmp = 1.65;
        coreGlowIntensity = 0.75;
        ribbonColorMode = 'listening';
      } else if (voiceState === VoiceState.THINKING || voiceState === VoiceState.TRANSCRIBING) {
        rotSpeed = 0.028;
        waveAmp = 2.0;
        coreGlowIntensity = 0.85;
        ribbonColorMode = 'thinking';
      } else if (voiceState === VoiceState.SPEAKING) {
        rotSpeed = 0.015;
        waveAmp = 1.8;
        coreGlowIntensity = 0.9;
        ribbonColorMode = 'speaking';
      }

      time += rotSpeed;

      // 1. Outer Ambient Soft Glow
      const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
      if (ribbonColorMode === 'listening') {
        outerGlow.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
        outerGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.1)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (ribbonColorMode === 'thinking') {
        outerGlow.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
        outerGlow.addColorStop(0.5, 'rgba(14, 165, 233, 0.12)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(255, 200, 120, 0.18)');
        outerGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Translucent Sphere Back Glow / Core Nucleus
      const pulseRadius = r * (0.35 + Math.sin(time * 3) * 0.04 * waveAmp);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius);
      coreGrad.addColorStop(0, `rgba(255, 245, 220, ${coreGlowIntensity + 0.1})`);
      coreGrad.addColorStop(0.4, ribbonColorMode === 'thinking' ? 'rgba(6, 182, 212, 0.6)' : 'rgba(245, 158, 11, 0.5)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw 3D Internal Swirling Ribbons / Double-Helix Waves
      const ribbonCount = 5;
      const fov = 350;

      for (let rb = 0; rb < ribbonCount; rb++) {
        const offsetAngle = (rb * Math.PI * 2) / ribbonCount;
        const phaseShift = time * 1.5 + offsetAngle;
        const ribbonPoints: { x: number; y: number; z: number; px: number; py: number; scale: number }[] = [];

        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * Math.PI * 2;
          
          // Parametric figure-8 / torus knot 3D wave equation
          const waveFreq = 2.0;
          const rad = r * 0.72;
          
          // Base 3D Coordinates
          let rx = rad * Math.sin(t) * Math.cos(t * waveFreq + phaseShift * 0.7);
          let ry = rad * Math.sin(t * waveFreq + phaseShift) * 0.65;
          let rz = rad * Math.cos(t) * Math.cos(phaseShift * 0.5);

          // Additional sine modulation for dynamic fluid morphing
          ry += Math.sin(t * 4 + time * 2) * 12 * waveAmp;
          rx += Math.cos(t * 3 - time * 2) * 10 * waveAmp;

          // 3D Rotation Matrix around Y and X axes
          const angleY = time * 0.8 + offsetAngle * 0.5;
          const angleX = Math.sin(time * 0.5) * 0.4 + 0.2;

          // Rotate Y
          const x1 = rx * Math.cos(angleY) + rz * Math.sin(angleY);
          const z1 = -rx * Math.sin(angleY) + rz * Math.cos(angleY);

          // Rotate X
          const y2 = ry * Math.cos(angleX) - z1 * Math.sin(angleX);
          const z2 = ry * Math.sin(angleX) + z1 * Math.cos(angleX);

          // Perspective Projection
          const scale = fov / (fov + z2);
          const px = cx + x1 * scale;
          const py = cy + y2 * scale;

          ribbonPoints.push({ x: x1, y: y2, z: z2, px, py, scale });
        }

        // Draw Ribbon Path
        if (ribbonPoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ribbonPoints[0].px, ribbonPoints[0].py);

          for (let i = 1; i < ribbonPoints.length - 1; i++) {
            const xc = (ribbonPoints[i].px + ribbonPoints[i + 1].px) / 2;
            const yc = (ribbonPoints[i].py + ribbonPoints[i + 1].py) / 2;
            ctx.quadraticCurveTo(ribbonPoints[i].px, ribbonPoints[i].py, xc, yc);
          }

          // Gradient color stroke along depth
          const grad = ctx.createLinearGradient(
            ribbonPoints[0].px,
            ribbonPoints[0].py,
            ribbonPoints[Math.floor(steps / 2)].px,
            ribbonPoints[Math.floor(steps / 2)].py
          );

          if (ribbonColorMode === 'listening') {
            grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
            grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.75)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0.5)');
          } else if (ribbonColorMode === 'thinking') {
            grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
            grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.75)');
            grad.addColorStop(1, 'rgba(168, 85, 247, 0.5)');
          } else {
            // Gold to Cyan smooth luxury gradient
            if (rb % 2 === 0) {
              grad.addColorStop(0, 'rgba(255, 215, 0, 0.85)');
              grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.65)');
              grad.addColorStop(1, 'rgba(255, 237, 213, 0.3)');
            } else {
              grad.addColorStop(0, 'rgba(125, 211, 252, 0.85)');
              grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.65)');
              grad.addColorStop(1, 'rgba(251, 191, 36, 0.3)');
            }
          }

          ctx.strokeStyle = grad;
          ctx.lineWidth = (2.2 + (rb % 2) * 1.2) * (1 + Math.sin(time * 2) * 0.15);
          ctx.shadowColor = rb % 2 === 0 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(6, 182, 212, 0.5)';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadow
        }
      }

      // 4. Draw Floating 3D Star/Dust Particles
      const rotY = rotSpeed * 1.2;
      const rotX = rotSpeed * 0.4;

      particles.forEach((p) => {
        // Rotate particle in 3D
        const x1 = p.x * Math.cos(rotY) + p.z * Math.sin(rotY);
        const z1 = -p.x * Math.sin(rotY) + p.z * Math.cos(rotY);
        const y2 = p.y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = p.y * Math.sin(rotX) + z1 * Math.cos(rotX);

        p.x = x1;
        p.y = y2;
        p.z = z2;

        const scale = fov / (fov + p.z);
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;

        // Depth opacity
        const depthAlpha = Math.max(0.1, Math.min(1.0, (p.z + r) / (r * 2)));

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * depthAlpha;
        ctx.beginPath();
        ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 5. Translucent Glass Outer Sphere Edge Rim & Specular Highlight Arc
      const glassGrad = ctx.createRadialGradient(
        cx - r * 0.3,
        cy - r * 0.3,
        r * 0.1,
        cx,
        cy,
        r
      );
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      glassGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.02)');
      glassGrad.addColorStop(0.95, 'rgba(180, 220, 255, 0.12)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.28)');

      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer Specular Highlight Rim Line
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top-Left Crescent Glass Highlight
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.96, Math.PI * 1.15, Math.PI * 1.65);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Bottom-Right Soft Golden Refraction Crescent
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.95, Math.PI * 0.2, Math.PI * 0.6);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceState, size]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none drop-shadow-[0_0_40px_rgba(6,182,212,0.25)]"
      />
    </div>
  );
};
