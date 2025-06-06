import React from 'react';
import { AppRegistry } from 'react-native';
import { App } from './index';

// Web用の設定
if (typeof document !== 'undefined') {
  AppRegistry.registerComponent('main', () => App);
  
  const rootTag = document.getElementById('root');
  if (rootTag) {
    AppRegistry.runApplication('main', { rootTag });
  }
}