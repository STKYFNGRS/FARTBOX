'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';

// Import your components
import GameHeader from '../components/GameHeader';

export default function Home() {
  const [gasClouds, setGasClouds] = useState<{ x: number; y: number; size: number; color: string; speed: number }[]>([]);
  const [gasParticles, setGasParticles] = useState<{ x: number; y: number; size: number; color: string; direction: number }[]>([]);
  const { isConnected } = useAccount();
  const router = useRouter();
  
  useEffect(() => {
    // Generate background gas clouds - more of them and varied colors
    const clouds = Array.from({ length: 12 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 30 + Math.random() * 80,
      color: Math.random() > 0.6 
        ? 'green' 
        : Math.random() > 0.3 
          ? 'yellow' 
          : 'toxic',
      speed: 0.5 + Math.random() * 2
    }));
    setGasClouds(clouds);
    
    // Generate floating gas particles
    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 10,
      color: Math.random() > 0.6 
        ? 'green' 
        : Math.random() > 0.3 
          ? 'yellow' 
          : 'toxic',
      direction: Math.random() * 360
    }));
    setGasParticles(particles);
    
    // Animate particles floating around
    const animateParticles = setInterval(() => {
      setGasParticles(prev => prev.map(particle => {
        const radians = particle.direction * Math.PI / 180;
        let newX = particle.x + Math.cos(radians) * 0.1;
        let newY = particle.y + Math.sin(radians) * 0.1;
        
        // Wrap around edges
        if (newX > 105) newX = -5;
        if (newX < -5) newX = 105;
        if (newY > 105) newY = -5;
        if (newY < -5) newY = 105;
        
        // Occasionally change direction
        const newDirection = Math.random() > 0.95 
          ? (particle.direction + (Math.random() * 40 - 20)) % 360 
          : particle.direction;
          
        return {
          ...particle,
          x: newX,
          y: newY,
          direction: newDirection
        };
      }));
    }, 50);
    
    return () => clearInterval(animateParticles);
  }, []);
  
  // Separate useEffect for wallet connection redirect to avoid dependency issues
  useEffect(() => {
    if (isConnected) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        router.push('/lobby');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, router]);
  
  return (
    <main className="flex flex-col h-screen overflow-hidden gas-container">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Glow effect in center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-green-500/10 via-transparent to-transparent"></div>
        
        {/* Gas clouds */}
        {gasClouds.map((cloud, i) => (
          <div 
            key={i}
            className={`absolute rounded-full animate-pulse ${
              cloud.color === 'green' 
                ? 'bg-green-500' 
                : cloud.color === 'yellow' 
                  ? 'bg-yellow-500' 
                  : 'bg-purple-500'
            } opacity-${cloud.size > 70 ? '10' : cloud.size > 40 ? '15' : '20'}`}
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.size}px`,
              height: `${cloud.size}px`,
              filter: 'blur(30px)',
              animationDuration: `${7 - cloud.speed}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
        
        {/* Gas particles */}
        {gasParticles.map((particle, i) => (
          <div 
            key={`p-${i}`}
            className={`absolute rounded-full ${
              particle.color === 'green' 
                ? 'bg-green-400' 
                : particle.color === 'yellow' 
                  ? 'bg-yellow-400' 
                  : 'bg-purple-400'
            } opacity-30`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              filter: 'blur(2px)',
              transition: 'all 0.5s linear'
            }}
          />
        ))}
      </div>
      
      {/* Game Header with wallet connection button */}
      <GameHeader isWalletConnected={isConnected} />
      
      <div className="flex flex-col justify-center items-center flex-1 z-10 px-4">
        <div className="text-center max-w-2xl relative">
          {/* Main title with glow effect */}
          <h2 className="text-6xl sm:text-7xl font-extrabold text-green-400 mb-6 tracking-tighter relative">
            <span className="relative z-10">Fart.box</span>
            <span className="absolute -inset-x-8 top-0 bottom-0 bg-green-500/10 blur-xl rounded-full -z-0"></span>
          </h2>
          <div className="text-4xl font-bold text-yellow-400 mb-12">Gas Dominance</div>
          
          <p className="text-xl text-gray-300 mb-12 max-w-xl mx-auto leading-relaxed">
            Conquer territories with your unique gas signature in this explosive web3 game on Base network.
            Mint your Player NFT, release gas, and form alliances to dominate the map!
          </p>
          
          <div className="bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-green-500/20 mb-12">
            <div className="flex justify-center items-center gap-12">
              <div className="text-center">
                <div className="w-24 h-24 bg-green-500/20 rounded-lg mb-3 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-400">Claim Territories</h3>
              </div>
              
              <div className="text-center">
                <div className="w-24 h-24 bg-yellow-500/20 rounded-lg mb-3 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-yellow-400">Release Gas</h3>
              </div>
              
              <div className="text-center">
                <div className="w-24 h-24 bg-purple-500/20 rounded-lg mb-3 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-purple-400">Form Alliances</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
