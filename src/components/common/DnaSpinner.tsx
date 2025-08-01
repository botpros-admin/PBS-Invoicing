import React, { useEffect, useRef } from 'react';

interface DnaSpinnerProps {
  text?: string; // Optional text to display below the spinner
  width?: number; // Optional width for the canvas container
  height?: number; // Optional height for the canvas container
}

const DNAHelix: React.FC<DnaSpinnerProps> = ({ text, width = 300, height = 150 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null); // Ref to store animation frame ID

  useEffect(() => {
    const canvas = canvasRef.current;
    // Ensure canvas exists before proceeding
    if (!canvas) {
      console.warn("DNAHelix: Canvas ref not available yet.");
      return;
    }

    const ctx = canvas.getContext("2d");
    // Ensure context exists before proceeding
    if (!ctx) {
      console.error("DNAHelix: Failed to get 2D context.");
      return;
    }

    // Set canvas dimensions (important for context drawing)
    canvas.width = width;
    canvas.height = height;

    let angle = 0;
    const dots = 30;
    const spacing = 8;
    const radius = 40;
    const speed = 0.04;
    const dotSize = 4;

    // Define draw function *after* confirming ctx exists
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Center drawing
      ctx.translate(canvas.width / 2, canvas.height / 2);

      for (let i = 0; i < dots; i++) {
        const x = (i - (dots - 1) / 2) * spacing;
        const phase = angle + i * 0.3;
        const y1 = Math.cos(phase) * radius;
        const y2 = -Math.cos(phase) * radius;
        const scale = (Math.sin(phase) + 1.5) / 2.5;
        const currentDotSize = Math.max(1, dotSize * scale);

        // Draw grey dot
        ctx.beginPath();
        ctx.arc(x, y1, currentDotSize, 0, Math.PI * 2);
        ctx.fillStyle = "#aaa"; // Grey color
        ctx.fill();

        // Draw red dot
        ctx.beginPath();
        ctx.arc(x, y2, currentDotSize, 0, Math.PI * 2);
        ctx.fillStyle = "#ef3a4d"; // Red color
        ctx.fill();
      }

      // Reset transform
      ctx.resetTransform();
      angle += speed;
      // Store the frame ID in the ref
      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    // Start drawing
    draw();

    // Cleanup function
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [width, height]); // Dependencies

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas ref={canvasRef} style={{ width: `${width}px`, height: `${height}px` }} className="block" />
      {text && <p className="text-gray-600 text-center mt-4">{text}</p>}
    </div>
  );
};

export default DNAHelix;
