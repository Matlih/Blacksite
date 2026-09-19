import React from 'react';

interface MinimalLineLoaderProps {
  text?: string;
}

export const MinimalLineLoader: React.FC<MinimalLineLoaderProps> = ({ text = "DECRYPTING" }) => {
  return (
    <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-gunmetal-950 backdrop-blur-md">
      
      {/* The Breathing Core Container */}
      <div className="relative flex items-center justify-center w-32 h-32 mb-8">
        
        {/* The Breath Glow (Pulses) */}
        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[40px] animate-pulse-slow" />
        <div className="absolute inset-4 bg-blue-500/30 rounded-full blur-[25px] animate-pulse-slow" style={{ animationDelay: '0.5s' }} />

        {/* The Logo */}
        <img 
          src="/app_logo.png" 
          alt="Blacksite" 
          className="relative z-10 w-24 h-auto object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] animate-pulse-slow" 
          style={{ animationDelay: '0.2s' }}
        />
      </div>

      {/* Terminal Text */}
      <div className="flex flex-col items-center gap-3">
        <div className="font-mono text-[10px] tracking-[0.4em] text-cyan-500/80 uppercase">
          {text}
        </div>
        
        {/* Stealthy Progress Bar */}
        <div className="w-32 h-[1px] bg-ops-800 relative overflow-hidden mt-1 opacity-50">
          <div className="absolute inset-y-0 left-0 bg-cyan-500 w-1/4" style={{ animation: 'bounceLeftRight 2s ease-in-out infinite alternate' }} />
        </div>
      </div>

      <style>{`
        @keyframes bounceLeftRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};
