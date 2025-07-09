import React, { useState } from 'react';
import { Shield, Star, Crown, Check } from 'lucide-react';
import { Vortex } from '../../components/ui/vortex';

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

export default function SubscriptionPlans() {
  const [hoveredCard, setHoveredCard] = useState(null);
  
  const plans = [
    {
      name: "Essential",
      tagline: "For personal projects",
      price: "$3.99",
      period: "per month",
      discount: "20% OFF",
      icon: <Shield size={20} />,
      color: "from-indigo-600 to-indigo-500",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      buttonColor: "bg-indigo-600",
      textColor: "text-indigo-400",
      features: [
        "Basic DevOS Environment",
        "128-bit Secure Storage",
        "Standard Monitoring",
        "2 Projects Limit"
      ]
    },
    {
      name: "Advanced",
      tagline: "For growing teams",
      price: "$7.99",
      period: "per month",
      discount: "35% OFF",
      icon: <Star size={20} />,
      color: "from-violet-600 to-violet-500",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      buttonColor: "bg-violet-600",
      textColor: "text-violet-400",
      popular: true,
      features: [
        "Enhanced DevOS Environment",
        "256-bit Secure Storage",
        "Real-time Analytics",
        "AI-powered Automation",
        "10 Projects Support"
      ]
    },
    {
      name: "Ultimate",
      tagline: "For enterprise needs",
      price: "$12.99",
      period: "per month",
      discount: "40% OFF",
      icon: <Crown size={20} />,
      color: "from-purple-600 to-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      buttonColor: "bg-purple-600",
      textColor: "text-purple-400",
      features: [
        "Advanced DevOS Architecture",
        "Quantum-resistant Storage",
        "Predictive Analytics",
        "24/7 System Monitoring",
        "Unlimited Projects",
        "Priority Support"
      ]
    }
  ];
  
  return (
    
    <div className="min-h-screen py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header Section with minimalist design */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            DevOS <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Subscription Plans</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Choose the right plan to power your development workflow with our secure, efficient operating system
          </p>
        </div>
        
        {/* Subscription Cards with cleaner layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-gray-900 rounded-xl overflow-hidden transition-all duration-300 ${
                hoveredCard === index ? 'translate-y-[-4px]' : ''
              } ${plan.popular ? 'ring-1 ring-violet-500/50' : ''}`}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Accent line */}
              <div className={`h-1 w-full bg-gradient-to-r ${plan.color}`}></div>
              
              {/* Popular badge - more subtle */}
              {plan.popular && (
                <div className="absolute top-3 right-3">
                  <span className="text-xs font-medium bg-violet-500/20 text-violet-300 px-2 py-1 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}
              
              <div className="p-6">
                {/* Plan header with icon */}
                <div className="flex items-center space-x-3 mb-5">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${plan.bgColor} ${plan.textColor}`}>
                    {plan.icon}
                  </div>
                  <div>
                    <h2 className="text-white text-xl font-bold">{plan.name}</h2>
                    <p className="text-gray-500 text-sm">{plan.tagline}</p>
                  </div>
                </div>
                
                {/* Pricing */}
                <div className="flex items-baseline mb-6">
                  <span className="text-white text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-500 ml-2 text-sm">{plan.period}</span>
                  <span className={`ml-2 text-xs ${plan.bgColor} ${plan.textColor} px-2 py-1 rounded`}>
                    {plan.discount}
                  </span>
                </div>
                
                {/* Features list - cleaner with consistent spacing */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start text-gray-400">
                      <Check size={16} className={`mt-0.5 mr-3 ${plan.textColor}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Call to action button - simplified and cleaner */}
                <button 
                  className={`w-full ${plan.buttonColor} text-white font-medium py-3 px-4 rounded-lg transition-all duration-300`}
                >
                  Get Started
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Features section - simplified and more aligned with DevOS */}
        <div className="mt-24 text-center">
          <h2 className="text-white text-2xl font-bold mb-3">All DevOS Plans Include</h2>
          <p className="text-gray-400 max-w-lg mx-auto mb-12">
            Enterprise-grade features to power your development workflow
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Shield size={20} /></div>,
                title: "Secure Environment",
                description: "End-to-end encryption for all your projects"
              },
              {
                icon: <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400"><Shield size={20} /></div>,
                title: "Privacy First",
                description: "Zero tracking and comprehensive privacy controls"
              },
              {
                icon: <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><Shield size={20} /></div>,
                title: "High Performance",
                description: "Optimized system resources for maximum efficiency"
              },
              {
                icon: <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Shield size={20} /></div>,
                title: "Cross-Platform",
                description: "Works seamlessly across all your devices"
              }
            ].map((feature, index) => (
              <div key={index} className="flex flex-col items-center">
                {feature.icon}
                <h3 className="text-gray-100 font-bold text-lg mt-4 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}