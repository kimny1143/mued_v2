import React from 'react';
import { View, Text } from 'react-native';

export function SimpleApp() {
  return React.createElement(
    View,
    { style: { flex: 1, backgroundColor: '#fff', padding: 20 } },
    React.createElement(
      Text,
      { style: { fontSize: 20, color: '#000' } },
      'Hello from SimpleApp'
    )
  );
}