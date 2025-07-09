import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Vortex } from '../../components/ui/vortex';
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { WavyBackground } from '../../components/ui/wavy-background';

// Enhanced GridBackground component with much more visible white grid
const GridBackground = () => {
  return (
    <div className="absolute flex h-full w-full items-center justify-center">
      <div
        className={cn(
          "absolute inset-0 z-[1]",
          "[background-size:40px_40px]",
          // Much higher opacity and white color for grid lines in both modes
          "opacity-10",
          // Using rgba(255,255,255,0.5) for significantly more visible white lines
          "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.5)_1px,transparent_1px)]",
          "[background-image:linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.5)_1px,transparent_1px)]"
        )}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_80%)] opacity-80">
      </div>
    </div>
  );
};

// Retro Noise Background component
const RetroNoiseBackground = () => {
  return (
    <div className="absolute inset-0 z-[1] opacity-20">
      {/* SVG filter for noise effect */}
      <svg className="absolute h-0 w-0">
        <filter id="retro-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0" />
        </filter>
      </svg>
      
      {/* Retro Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_2px]"></div>
      
      {/* Noise filter overlay */}
      <div className="absolute inset-0" style={{ filter: 'url(#retro-noise)' }}></div>
      
      {/* CRT flicker animation */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-5"
        animate={{ opacity: [0.03, 0.05, 0.03] }}
        transition={{ 
          duration: 0.2,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "linear"
        }}
      />
      
      {/* Vintage color tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-indigo-900/10"></div>
    </div>
  );
};

// Floating Geometric Elements
const FloatingElements = () => {
  return (
    <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
      {/* Abstract geometric shapes */}
      <motion.div
        className="absolute -right-16 top-32 h-32 w-32 border border-indigo-500/30 opacity-70"
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      <motion.div
        className="absolute left-16 bottom-32 h-40 w-40 rounded-full border border-purple-500/30 opacity-70"
        animate={{
          rotate: -360,
          scale: [1, 1.05, 1],
        }}
        transition={{
          rotate: { duration: 25, repeat: Infinity, ease: "linear" },
          scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      {/* Small decorative dots */}
      <div className="absolute top-1/4 right-1/3 h-2 w-2 rounded-full bg-indigo-500 opacity-70"></div>
      <div className="absolute top-2/3 left-1/4 h-2 w-2 rounded-full bg-purple-500 opacity-70"></div>
      <div className="absolute bottom-1/4 right-1/4 h-2 w-2 rounded-full bg-blue-500 opacity-70"></div>
      
      {/* Thin lines connecting elements */}
      <div className="absolute top-1/3 left-0 h-px w-32 bg-gradient-to-r from-transparent to-indigo-500/50 opacity-50"></div>
      <div className="absolute bottom-1/3 right-0 h-px w-32 bg-gradient-to-l from-transparent to-purple-500/50 opacity-50"></div>
      
      {/* Techno circuits */}
      <svg className="absolute top-16 left-16 h-48 w-48 stroke-indigo-500/20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,50 Q25,25 50,50 T90,50" strokeWidth="0.5" />
        <path d="M10,60 Q40,80 70,60 T90,60" strokeWidth="0.5" />
        <path d="M50,10 L50,90" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="5" strokeWidth="0.5" />
        <circle cx="70" cy="30" r="2" strokeWidth="0.5" />
        <circle cx="30" cy="70" r="2" strokeWidth="0.5" />
      </svg>
      
      <svg className="absolute bottom-16 right-16 h-48 w-48 stroke-purple-500/20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,20 L80,80" strokeWidth="0.5" />
        <path d="M20,80 L80,20" strokeWidth="0.5" />
        <rect x="40" y="40" width="20" height="20" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="30" strokeWidth="0.5" />
      </svg>
      
      {/* Floating animated elements with motion */}
      <motion.div
        className="absolute left-10 top-1/3 h-16 w-16 rounded-md border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md"
        animate={{ 
          y: [0, -15, 0],
          rotate: [0, 5, 0],
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      />
      
      <motion.div
        className="absolute right-32 bottom-1/3 h-20 w-20 rounded-full border border-purple-500/20 bg-purple-500/5 backdrop-blur-md"
        animate={{ 
          y: [0, 15, 0],
          rotate: [0, -5, 0],
        }}
        transition={{ 
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      />
    </div>
  );
};

// Animated Particle Effect
const ParticleEffect = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Set canvas dimensions
    const setCanvasDimensions = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    // Call once to set initial dimensions
    setCanvasDimensions();
    
    // Update on window resize
    window.addEventListener('resize', setCanvasDimensions);
    
    // Particle configuration
    const particlesArray = [];
    const numberOfParticles = 50;
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = Math.random() > 0.5 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(79, 70, 229, 0.3)'; // Purple/indigo colors
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) {
          this.speedX = -this.speedX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.speedY = -this.speedY;
        }
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Initialize particles
    const init = () => {
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };
    
    // Connect nearby particles with lines
    const connect = () => {
      const maxDistance = 100;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      connect();
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    init();
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 z-[2] opacity-40" />;
};

// Glowing accent lines
const GlowingAccents = () => {
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
      {/* Top right corner accent */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-600/20 blur-3xl"></div>
      
      {/* Bottom left corner accent */}
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-purple-600/20 blur-3xl"></div>
      
      {/* Dynamic glowing line */}
      <motion.div 
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"
        animate={{ 
          opacity: [0.2, 0.5, 0.2],
          width: ['0%', '100%', '0%'],
          left: ['0%', '0%', '100%']
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

// Stat Counter Component
const StatCounter = ({ label, value, duration = 2 }) => {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="text-2xl font-bold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration }}
        >
          {value}
        </motion.span>
      </motion.div>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
};

const HeroSection = () => {
  return (
      <div className="relative h-screen w-full overflow-hidden bg-black">
        {/* Grid Background */}
        {/* <GridBackground /> */}
        
        {/* Add the RetroNoiseBackground component */}
        <RetroNoiseBackground />
        
        {/* Particle network background */}
        {/* <ParticleEffect /> */}
        
        {/* Additional glowing accents */}
        <GlowingAccents />
        
        {/* Floating decorative elements */}
        {/* <FloatingElements /> */}
        
        {/* Animated blobs */}
        <div className="absolute inset-0 z-[2] overflow-hidden">
          <motion.div 
            className="absolute w-64 h-64 rounded-full bg-purple-600/20 blur-3xl"
            initial={{ x: -100, y: -100 }}
            animate={{ x: -80, y: -120 }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute right-0 bottom-0 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl"
            initial={{ x: 100, y: 100 }}
            animate={{ x: 80, y: 120 }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-64 h-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Content */}
        <WavyBackground>
        <div className="relative z-[5] flex h-full w-full flex-col items-center justify-center px-6">
          <div className="max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="mb-6 font-sans text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                Your Developing Environment
                <span className="relative block bg-gradient-to-r from-indigo-800 to-purple-800 bg-clip-text text-transparent">
                  Dev.env
                  <motion.div 
                    className="absolute -bottom-2 left-0 h-0.5 w-0 bg-gradient-to-r from-indigo-400 to-purple-400"
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </span>
              </h1>
            </motion.div>
            
            <motion.p 
              className="mx-auto mb-10 max-w-2xl text-white md:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Join the revolution reshaping how the world connects, shares, and creates value
            </motion.p>
            
            <motion.div 
              className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link to="/get-started">
                <button className="group relative w-full overflow-hidden rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-medium text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/20 sm:w-auto">
                  <span className="relative z-10">Get Started</span>
                  <span className="absolute inset-0 -translate-y-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-transform duration-300 ease-in-out group-hover:translate-y-0"></span>
                </button>
              </Link>
              <Link to="/learn-more">
                <button className="group relative w-full overflow-hidden rounded-md border border-gray-700 bg-black/50 px-6 py-3 font-medium text-gray-300 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500 hover:text-indigo-400 sm:w-auto">
                  <span className="relative z-10">Learn More</span>
                  <span className="absolute inset-0 -translate-y-full bg-indigo-950/20 transition-transform duration-300 ease-in-out group-hover:translate-y-0"></span>
                </button>
              </Link>
            </motion.div>
          </div>
          
          {/* Stats section below main content */}
          <motion.div 
            className="absolute top-100 left-0 right-0 mx-auto grid max-w-3xl grid-cols-3 gap-6 rounded-lg border border-gray-800/50 bg-black/30 p-6 backdrop-blur-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <StatCounter label="Active Nodes" value="10,000+" />
            <StatCounter label="Daily Transactions" value="2.4M+" />
            <StatCounter label="Countries" value="120+" />
          </motion.div>
        </div>
        </WavyBackground>
      </div>
  );
};

export default HeroSection;