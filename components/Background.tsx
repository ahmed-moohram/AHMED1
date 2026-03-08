import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const Background: React.FC = () => {
  const { scrollY } = useScroll();
  
  // Parallax translation mapping (Scroll 0-1000 maps to Translate 0-value)
  const blobsY = useTransform(scrollY, [0, 1000], [0, 150]);
  const ecgY = useTransform(scrollY, [0, 1000], [0, 50]);
  const particlesY = useTransform(scrollY, [0, 1000], [0, -180]);

  return (
  <div
    className="fixed inset-0 z-0 pointer-events-none overflow-hidden gpu"
    style={{ background: 'linear-gradient(160deg, #020818 0%, #041229 50%, #020818 100%)' }}
  >
    {/* ── Aurora blobs (pure CSS, GPU-accelerated) ── */}
    <motion.div className="absolute inset-0" style={{ y: blobsY }}>
    <div
      className="blob absolute rounded-full gpu"
      style={{
        top: '-15%', right: '-10%',
        width: '65vw', height: '65vw',
        background: 'radial-gradient(circle, rgba(0,140,200,0.16) 0%, transparent 70%)',
        '--dur': '18s', '--delay': '0s',
      } as React.CSSProperties}
    />
    <div
      className="blob absolute rounded-full gpu"
      style={{
        bottom: '-20%', left: '-12%',
        width: '55vw', height: '55vw',
        background: 'radial-gradient(circle, rgba(0,100,180,0.18) 0%, transparent 70%)',
        '--dur': '22s', '--delay': '-6s',
      } as React.CSSProperties}
    />
    <div
      className="blob absolute rounded-full gpu"
      style={{
        top: '30%', left: '35%',
        width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        '--dur': '14s', '--delay': '-3s',
      } as React.CSSProperties}
    />
    </motion.div>

    {/* ── Subtle dot-grid ── */}
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,212,255,1) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />

    {/* ── ECG heartbeat line (center) ── */}
    <motion.div className="absolute inset-x-0 opacity-25" style={{ top: '42%', y: ecgY }}>
      <svg width="100%" height="64" viewBox="0 0 1440 64" preserveAspectRatio="none">
        <polyline
          className="ecg-path"
          points="0,32 120,32 180,32 210,8 228,56 246,4 262,42 280,32 400,32 520,32 550,8 568,56 586,4 602,42 618,32 740,32 860,32 890,8 908,56 926,4 942,42 958,32 1080,32 1200,32 1230,8 1248,56 1266,4 1282,42 1300,32 1440,32"
          stroke="rgba(0,212,255,0.9)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>

    {/* ── Floating micro-particles ── */}
    <motion.div className="absolute inset-0" style={{ y: particlesY }}>
    {([
      { x:'12%',  y:'18%', s:3, dur:'7s',  del:'0s'   },
      { x:'80%',  y:'12%', s:4, dur:'9s',  del:'-2s'  },
      { x:'35%',  y:'72%', s:2, dur:'11s', del:'-5s'  },
      { x:'65%',  y:'38%', s:3, dur:'8s',  del:'-1s'  },
      { x:'88%',  y:'62%', s:2, dur:'13s', del:'-7s'  },
      { x:'22%',  y:'85%', s:4, dur:'10s', del:'-3s'  },
      { x:'55%',  y:'55%', s:2, dur:'6s',  del:'-4s'  },
    ] as {x:string,y:string,s:number,dur:string,del:string}[]).map((p, i) => (
      <div
        key={i}
        className="particle absolute rounded-full gpu"
        style={{
          left: p.x, top: p.y,
          width: p.s * 2, height: p.s * 2,
          background: 'rgba(0,212,255,0.7)',
          boxShadow: '0 0 6px rgba(0,212,255,0.9)',
          '--dur': p.dur, '--delay': p.del,
        } as React.CSSProperties}
      />
    ))}
    </motion.div>

    {/* ── Scan line ── */}
    <div className="absolute inset-0 overflow-hidden opacity-40">
      <div className="scan-line" />
    </div>

    {/* ── Corner glow accents ── */}
    <div className="absolute top-0 right-0 w-[40vw] h-[40vh] pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at top right, rgba(0,212,255,0.12) 0%, transparent 65%)' }} />
    <div className="absolute bottom-0 left-0 w-[35vw] h-[35vh] pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at bottom left, rgba(0,160,220,0.1) 0%, transparent 65%)' }} />
  </div>
  );
};

export default Background;