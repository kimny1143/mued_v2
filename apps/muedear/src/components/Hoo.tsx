/**
 * Hoo Mascot Component
 * MUEDear's owl mascot with different moods
 */

import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

// Hoo image assets
const HOO_IMAGES = {
  studio: require('../../assets/images/Gemini_Generated_Image_3ur6243ur6243ur6 (1).png'),
  icon: require('../../assets/images/Gemini_Generated_Image_3ur6243ur6243ur6.png'),
};

type HooVariant = 'studio' | 'icon';
type HooSize = 'small' | 'medium' | 'large';

interface HooProps {
  variant?: HooVariant;
  size?: HooSize;
  style?: object;
}

const { width: screenWidth } = Dimensions.get('window');

const SIZE_MAP: Record<HooSize, number> = {
  small: screenWidth * 0.25,
  medium: screenWidth * 0.4,
  large: screenWidth * 0.6,
};

export function Hoo({ variant = 'studio', size = 'medium', style }: HooProps) {
  const imageSize = SIZE_MAP[size];

  return (
    <View style={[styles.container, style]}>
      <Image
        source={HOO_IMAGES[variant]}
        style={[
          styles.image,
          {
            width: imageSize,
            height: imageSize,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: 20,
  },
});
