import { useState, useEffect } from 'react';

/**
 * A hook to create parallax scrolling effects
 * @param speed The speed of the parallax effect (0-1). Higher values = more movement
 * @returns An object containing the current y-offset for the parallax effect
 */
const useParallax = (speed: number = 0.2) => {
  const [offset, setOffset] = useState({ y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setOffset({ y: window.scrollY * speed });
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed]);

  return offset;
};

export default useParallax;
