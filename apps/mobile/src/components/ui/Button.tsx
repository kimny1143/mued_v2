import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'medium',
  children,
  style,
  disabled,
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? '#e5e7eb' : '#3b82f6',
          color: disabled ? '#9ca3af' : 'white',
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? '#f9fafb' : 'white',
          color: disabled ? '#9ca3af' : '#374151',
          border: `1px solid ${disabled ? '#e5e7eb' : '#d1d5db'}`,
        };
      case 'danger':
        return {
          backgroundColor: disabled ? '#fee2e2' : '#ef4444',
          color: disabled ? '#fca5a5' : 'white',
          border: 'none',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '6px 12px',
          fontSize: '14px',
        };
      case 'medium':
        return {
          padding: '8px 16px',
          fontSize: '16px',
        };
      case 'large':
        return {
          padding: '10px 20px',
          fontSize: '18px',
        };
    }
  };

  return (
    <button
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};