import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  padding?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  onClick,
  padding = 'medium',
  style 
}) => {
  const paddingMap = {
    small: '12px',
    medium: '16px',
    large: '20px',
  };

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: paddingMap[padding],
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...(onClick && {
          ':hover': {
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
};