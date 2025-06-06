import React from 'react';

export function SimpleApp() {
  // 最もシンプルなReact要素を返す
  return React.createElement('div', 
    { 
      style: { 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        fontFamily: 'Arial, sans-serif'
      } 
    },
    React.createElement('h1', { style: { color: '#333' } }, 'PWA is Working!'),
    React.createElement('p', null, 'Environment: ' + (typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown'))
  );
}