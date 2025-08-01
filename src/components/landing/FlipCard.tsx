import React, { useRef, useEffect, useState } from 'react';
import { 
  Beaker, 
  Dna, 
  Pill, 
  Map, 
  Droplets, 
  ShieldCheck 
} from 'lucide-react';

interface FlipCardProps {
  frontTitle: string;
  description: string;
  ctaText: string;
  serviceId: string; // To determine which icon to show
}

const FlipCard: React.FC<FlipCardProps> = ({
  frontTitle,
  description,
  ctaText,
  serviceId,
}) => {
  const [isFlipped, setIsFlipped] = useState(true); // Start with back visible for initial animation
  const cardRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Handle viewport entry detection with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated.current) {
          // Trigger initial animation when card enters viewport
          setTimeout(() => {
            setIsFlipped(false); // Flip to front when visible
            hasAnimated.current = true;
          }, 100); // Small delay to ensure transition happens
        }
      });
    }, { threshold: 0.3 }); // Trigger when 30% of the element is visible
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  // Handle hover effects
  const handleMouseEnter = () => {
    if (hasAnimated.current) { // Only allow hover effect after initial animation
      setIsFlipped(true); // Flip to back on hover
    }
  };
  
  const handleMouseLeave = () => {
    if (hasAnimated.current) { // Only allow hover effect after initial animation
      setIsFlipped(false); // Flip to front on mouse leave
    }
  };

  // Render the appropriate icon based on serviceId
  const renderIcon = () => {
    switch (serviceId) {
      case 'molecular':
        return <Beaker size={80} className="text-white/80 mb-4" />;
      case 'genetic':
        return <Dna size={80} className="text-white/80 mb-4" />;
      case 'toxicology':
        return <Pill size={80} className="text-white/80 mb-4" />;
      case 'travel':
        return <Map size={80} className="text-white/80 mb-4" />;
      case 'blood':
        return <Droplets size={80} className="text-white/80 mb-4" />;
      case 'audit':
        return <ShieldCheck size={80} className="text-white/80 mb-4" />;
      default:
        return null;
    }
  };

  // On small screens, we'll show a combined view instead of the flip animation
  return (
    <>
      {/* For larger screens - flip card animation */}
      <div 
        ref={cardRef}
        className="flip-card hidden md:block" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
          <div className="flip-card-front bg-gradient-to-r from-gray-700 to-secondary flex flex-col items-center justify-center">
            {renderIcon()}
            <h1 className="text-shadow">{frontTitle}</h1>
          </div>

          <div className="flip-card-back">
            <p>{description}</p>
            <p><strong>{ctaText}</strong></p>
          </div>
        </div>
      </div>

      {/* For mobile - combined card with no animation */}
      <div className="md:hidden bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-700 to-secondary p-6 flex flex-col items-center">
          {renderIcon()}
          <h1 className="text-shadow text-white text-xl font-bold">{frontTitle}</h1>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">{description}</p>
          <p className="text-secondary font-medium">{ctaText}</p>
        </div>
      </div>
    </>
  );
};

export default FlipCard;
