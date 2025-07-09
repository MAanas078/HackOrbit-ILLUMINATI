import { useState, useEffect } from 'react';
import { motion } from "framer-motion";

const LoadingSpinner = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 50);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className='min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden'>
      {/* Ambient glowing orbs in background */}
      <div className="absolute inset-0 overflow-hidden">
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
      
      {/* Main spinner container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Outer ripple effect */}
        <motion.div
          className="absolute w-32 h-32 rounded-full border border-purple-500/30"
          animate={{ scale: [1, 1.5], opacity: [1, 0] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeOut",
            delay: 0.3
          }}
        />
        
        <motion.div
          className="absolute w-32 h-32 rounded-full border border-purple-500/20"
          animate={{ scale: [1, 1.8], opacity: [1, 0] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeOut" 
          }}
        />
        
        {/* Orbital ring */}
        <motion.div 
          className="absolute w-28 h-28 rounded-full border-2 border-indigo-500/50"
          style={{
            borderRadius: "50%",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "rgba(139, 92, 246, 0.3)",
            boxShadow: "0 0 15px rgba(139, 92, 246, 0.5)",
          }}
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        
        {/* Main spinner - outer ring */}
        <motion.div 
          className="relative w-24 h-24 rounded-full border-4 border-purple-200/20 flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 10px rgba(167, 139, 250, 0.3)",
              "0 0 20px rgba(167, 139, 250, 0.6)",
              "0 0 10px rgba(167, 139, 250, 0.3)"
            ]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Inner spinning circle */}
          <motion.div 
            className="w-20 h-20 border-4 border-t-4 border-purple-600 border-t-violet-400 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          
          {/* Dot indicators on the spinner */}
          <motion.div
            className="absolute w-3 h-3 rounded-full bg-violet-400"
            style={{ top: "2px", left: "calc(50% - 6px)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          
          <motion.div
            className="absolute w-3 h-3 rounded-full bg-indigo-400"
            style={{ bottom: "2px", left: "calc(50% - 6px)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.75 
            }}
          />
        </motion.div>
      </div>
      
      {/* Loading text with typing effect */}
      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.h3 
          className="text-xl font-medium text-purple-200 mb-2"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          Loading DevOS
        </motion.h3>
        
        {/* Progress indicator */}
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden mt-3">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
            style={{ width: `${progress}%` }}
            initial={{ width: "0%" }}
          />
        </div>
        <div className="text-xs text-purple-300 mt-2">{progress}%</div>
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;