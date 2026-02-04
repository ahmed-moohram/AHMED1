import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#FAFAFA] overflow-hidden">
      {/* 
        PREMIUM GRADIENT MESH
        Using large, soft gradients to create a "pearlescent" look.
        Static for 120fps performance, but looks alive due to blending.
      */}
      
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 85% 20%, rgba(165, 180, 252, 0.55) 0%, rgba(250, 250, 250, 0) 55%)',
            'radial-gradient(circle at 15% 80%, rgba(249, 168, 212, 0.50) 0%, rgba(250, 250, 250, 0) 55%)',
            'radial-gradient(ellipse at top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 65%)'
          ].join(',')
        }}
      />
    </div>
  );
};

export default Background;