import React, { ReactNode } from 'react';

interface ParallaxSectionProps {
  id?: string;
  bgImage?: string;
  bgColor?: string;
  speed?: number;
  overlay?: boolean;
  overlayColor?: string;
  minHeight?: string;
  className?: string;
  fixedBackground?: boolean;
  children: ReactNode;
}

const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  id,
  bgImage,
  bgColor = 'bg-transparent',
  speed = 0.2,
  overlay = false,
  overlayColor = 'bg-black/50',
  minHeight = 'min-h-[50vh]',
  className = '',
  fixedBackground = false,
  children
}) => {
  return (
    <section
      id={id}
      className={`relative overflow-hidden ${bgColor} ${minHeight} ${className}`}
      style={{
        backgroundAttachment: bgImage ? 'fixed' : 'scroll'
      }}
    >
      {bgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: `url(${bgImage})`,
            transform: fixedBackground ? 'none' : `translateY(${speed * 50}px)`,
            backgroundAttachment: 'fixed',
            backgroundSize: 'cover'
          }}
        ></div>
      )}
      
      {overlay && bgImage && (
        <div className={`absolute inset-0 ${overlayColor} -z-10`}></div>
      )}
      
      {children}
    </section>
  );
};

export default ParallaxSection;
