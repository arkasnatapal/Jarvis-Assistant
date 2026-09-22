import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface StartupScreenProps {
  onComplete: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'ignite' | 'text' | 'dissolve'>('ignite');

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('text'), 500);
    const timer2 = setTimeout(() => setPhase('dissolve'), 2200);
    const timer3 = setTimeout(onComplete, 2900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  // Particle Canvas Beam Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const particles: { r: number; angle: number; speed: number; color: string; alpha: number }[] = [];

    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        r: Math.random() * 220 + 20,
        angle,
        speed: Math.random() * 0.02 + 0.005,
        color: Math.random() > 0.5 ? '#fbbf24' : '#38bdf8',
        alpha: Math.random() * 0.8 + 0.2
      });
    }

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

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
      time += 0.015;

      // Draw Center Singularity Rays
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * p.r * (0.8 + Math.sin(time * 2) * 0.2);
        const py = cy + Math.sin(p.angle) * p.r * (0.8 + Math.cos(time * 2) * 0.2);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.6 + Math.sin(time * 3) * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.5 + 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'dissolve' ? 0 : 1, scale: phase === 'dissolve' ? 1.08 : 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-sans text-slate-100 overflow-hidden select-none pointer-events-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Central Singularity Light Orb Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Glowing Singularity Nucleus */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase === 'ignite' ? [0, 1.25, 1] : 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative flex items-center justify-center"
        >
          {/* Outer Pulsing Aura */}
          <div className="w-52 h-52 rounded-full bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-amber-500/10 blur-2xl animate-pulse" />
          
          {/* Inner Light Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute w-40 h-40 rounded-full border border-amber-400/40 border-dashed flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)]"
          >
            <div className="w-30 h-30 rounded-full border border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)]" />
          </motion.div>

          <div className="absolute w-10 h-10 rounded-full bg-slate-100 shadow-[0_0_40px_#ffffff] animate-ping opacity-80" />
        </motion.div>

        {/* Brand Typography & Expanding Laser Beam */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase !== 'ignite' ? 1 : 0, y: phase !== 'ignite' ? 0 : 20 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mt-12 flex flex-col items-center text-center space-y-3"
        >
          <h1 className="text-4xl lg:text-5xl font-cinzel font-light tracking-[0.6em] shimmer-text uppercase">
            J A R V I S
          </h1>

          {/* Expanding Laser Beam Line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: phase !== 'ignite' ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-56 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#fbbf24]"
          />

          <p className="text-[10px] font-sans tracking-[0.4em] text-slate-400 uppercase font-light pt-1">
            Y O U R   P E R S O N A L   A I   A S S I S T A N T
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
