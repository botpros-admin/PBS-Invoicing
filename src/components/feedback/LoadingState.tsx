import React from 'react';
import DnaSpinner from '../common/DnaSpinner';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  fullScreen = false,
  size = 'medium',
  className = '',
}) => {
  const sizeMap = {
    small: { width: 200, height: 100 },
    medium: { width: 300, height: 150 },
    large: { width: 400, height: 200 },
  };

  const { width, height } = sizeMap[size];

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90'
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <DnaSpinner text={message} width={width} height={height} />
      </div>
    </div>
  );
};

export default LoadingState;