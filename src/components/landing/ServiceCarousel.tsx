import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  bgImage: string;
}

interface ServiceCarouselProps {
  services: ServiceItem[];
}

const ServiceCarousel: React.FC<ServiceCarouselProps> = ({ services }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const handleNext = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex === services.length - 1 ? 0 : prevIndex + 1));
      setIsTransitioning(false);
    }, 300);
  };
  
  const handlePrev = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex === 0 ? services.length - 1 : prevIndex - 1));
      setIsTransitioning(false);
    }, 300);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left, go to next
      handleNext();
    }
    
    if (touchEnd - touchStart > 50) {
      // Swipe right, go to prev
      handlePrev();
    }
  };
  
  // Auto-scroll every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);
  
  const currentService = services[currentIndex];
  
  return (
    <div 
      className="relative overflow-hidden" 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="min-h-[70vh] bg-cover bg-center transition-opacity duration-500"
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.85), rgba(239, 58, 77, 0.6)), url(${currentService.bgImage})` 
        }}
      >
        <div className="container mx-auto px-4 py-20 flex items-center min-h-[70vh]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-lg border border-white/10 shadow-xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                {currentService.title}
              </h2>
              
              <p className="text-white/90 text-lg mb-6">
                {currentService.description}
              </p>
              
              <div className="space-y-4 mb-8">
                {currentService.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle2 className="text-secondary mr-3 mt-1 flex-shrink-0" size={20} />
                    <p className="text-white/90">{feature}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center">
                <a 
                  href={currentService.ctaLink} 
                  className="inline-flex justify-center items-center px-5 py-3 bg-white text-gray-800 font-medium rounded hover:bg-gray-100 transition-colors"
                >
                  {currentService.ctaText}
                </a>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handlePrev}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <ArrowLeft size={18} className="text-white" />
                  </button>
                  
                  <div className="flex space-x-1">
                    {services.map((_, index) => (
                      <div 
                        key={index}
                        className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-secondary' : 'bg-white/40'}`}
                      ></div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleNext}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <ArrowRight size={18} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCarousel;
