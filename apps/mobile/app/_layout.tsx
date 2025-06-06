import { Slot } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  console.log('RootLayout rendering');
  
  return <Slot />;
}