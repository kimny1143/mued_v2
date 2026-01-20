/**
 * InteractiveSpectrum
 * Real-time spectrum visualization with tappable frequency band selection
 * Visualizes only the original (A) audio signal to prevent answer spoilers
 *
 * Supports multiple visualization styles:
 * - bar: Classic bar chart
 * - line: Smooth waveform line
 * - mirror: Mirrored bars (up/down from center)
 * - glow: Neon glow effect bars
 * - dots: Particle/dot visualization
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { audioService } from '../../services/audioService';
import { FREQUENCY_BANDS, FrequencyBand } from '../../types/game';
import { colors, borderRadius } from '../../constants/theme';

export type SpectrumStyle = 'bar' | 'line' | 'mirror' | 'glow' | 'dots';

interface InteractiveSpectrumProps {
  isPlaying: boolean;
  onFrequencySelect: (freq: FrequencyBand) => void;
  selectedFrequency?: FrequencyBand | null;
  correctFrequency?: FrequencyBand | null;
  hasAnswered: boolean;
  disabled?: boolean;
  fullscreen?: boolean;
  style?: SpectrumStyle;
  onSwipe?: (direction: 'left' | 'right') => void;
}

const BAR_COUNT = 64; // Number of spectrum bars to display
const SAMPLE_RATE = 48000; // Audio sample rate
const MIN_FREQ = 30; // Minimum frequency to display (Hz)
const MAX_FREQ = 16000; // Maximum frequency to display (Hz)

export function InteractiveSpectrum({
  isPlaying,
  onFrequencySelect,
  selectedFrequency,
  correctFrequency,
  hasAnswered,
  disabled,
  fullscreen = false,
  style = 'bar',
  onSwipe,
}: InteractiveSpectrumProps) {
  const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(0));
  const animationRef = useRef<number | null>(null);

  // Touch tracking for swipe vs tap detection
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  // Fullscreen mode uses entire screen, otherwise use padded width
  const spectrumWidth = fullscreen ? screenWidth : screenWidth - 32;
  // Fullscreen: leave room for labels at bottom
  const labelHeight = fullscreen ? 50 : 40;
  const spectrumHeight = fullscreen ? screenHeight - labelHeight - 20 : isLandscape ? 150 : 200;

  // Calculate band widths for tap detection
  const bandWidth = spectrumWidth / FREQUENCY_BANDS.length;
  const barWidth = spectrumWidth / BAR_COUNT - 1;

  // Update spectrum visualization from audio analyser
  useEffect(() => {
    if (!isPlaying) {
      // Fade out bars when not playing
      setBars((prev) => prev.map((v) => v * 0.9));
      return;
    }

    const updateSpectrum = () => {
      const data = audioService.getFrequencyData();
      if (data) {
        const binCount = data.length; // 256 bins for fftSize=512
        const freqPerBin = SAMPLE_RATE / 2 / binCount; // Hz per bin

        // Logarithmic frequency mapping for more even distribution
        const logMin = Math.log10(MIN_FREQ);
        const logMax = Math.log10(MAX_FREQ);
        const logStep = (logMax - logMin) / BAR_COUNT;

        const newBars: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          // Calculate frequency range for this bar (logarithmic)
          const freqLow = Math.pow(10, logMin + i * logStep);
          const freqHigh = Math.pow(10, logMin + (i + 1) * logStep);

          // Find corresponding FFT bins
          const binLow = Math.floor(freqLow / freqPerBin);
          const binHigh = Math.min(Math.ceil(freqHigh / freqPerBin), binCount - 1);

          // Average the bins in this range
          let sum = 0;
          let count = 0;
          for (let bin = binLow; bin <= binHigh; bin++) {
            if (bin >= 0 && bin < binCount) {
              sum += data[bin];
              count++;
            }
          }

          // Normalize to 0-1 range
          const avg = count > 0 ? sum / count / 255 : 0;
          newBars.push(avg);
        }
        setBars(newBars);
      }
      animationRef.current = requestAnimationFrame(updateSpectrum);
    };

    animationRef.current = requestAnimationFrame(updateSpectrum);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  // Touch handlers to distinguish between tap and swipe
  const handleTouchStart = useCallback((event: any) => {
    touchStartRef.current = {
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (event: any) => {
      if (disabled || hasAnswered || !touchStartRef.current) return;

      const { locationX } = event.nativeEvent;
      const startX = touchStartRef.current.x;
      const diffX = locationX - startX;
      const timeDiff = Date.now() - touchStartRef.current.time;

      const SWIPE_THRESHOLD = 50; // Minimum horizontal distance for swipe
      const TAP_MAX_TIME = 300; // Maximum time for a tap

      // Swipe detection
      if (Math.abs(diffX) > SWIPE_THRESHOLD) {
        if (onSwipe) {
          onSwipe(diffX > 0 ? 'right' : 'left');
        }
      }
      // Tap detection - small movement and quick touch
      else if (timeDiff < TAP_MAX_TIME && Math.abs(diffX) < 20) {
        const bandIndex = Math.floor(locationX / bandWidth);
        if (bandIndex >= 0 && bandIndex < FREQUENCY_BANDS.length) {
          onFrequencySelect(FREQUENCY_BANDS[bandIndex].value);
        }
      }

      touchStartRef.current = null;
    },
    [disabled, hasAnswered, bandWidth, onFrequencySelect, onSwipe]
  );

  // Get background color for frequency band (feedback after answer)
  const getBandBackground = useCallback(
    (bandValue: FrequencyBand): string => {
      if (!hasAnswered) return 'transparent';

      if (bandValue === correctFrequency) {
        return 'rgba(34, 197, 94, 0.3)'; // green for correct
      }
      if (bandValue === selectedFrequency && selectedFrequency !== correctFrequency) {
        return 'rgba(239, 68, 68, 0.3)'; // red for wrong selection
      }
      return 'transparent';
    },
    [hasAnswered, correctFrequency, selectedFrequency]
  );

  // Generate smooth line path for line style
  const linePath = useMemo(() => {
    if (bars.length === 0) return '';
    const points: string[] = [];
    bars.forEach((value, index) => {
      const x = index * (barWidth + 1) + barWidth / 2;
      const y = spectrumHeight - value * spectrumHeight;
      if (index === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        // Smooth curve using quadratic bezier
        const prevX = (index - 1) * (barWidth + 1) + barWidth / 2;
        const midX = (prevX + x) / 2;
        points.push(`Q ${prevX + barWidth} ${spectrumHeight - bars[index - 1] * spectrumHeight} ${midX} ${(spectrumHeight - bars[index - 1] * spectrumHeight + y) / 2}`);
        points.push(`T ${x} ${y}`);
      }
    });
    return points.join(' ');
  }, [bars, barWidth, spectrumHeight]);

  // Render spectrum based on style
  const renderSpectrum = () => {
    switch (style) {
      case 'line':
        return (
          <G>
            {/* Gradient fill under line */}
            <Defs>
              <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.6" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.1" />
              </LinearGradient>
            </Defs>
            {/* Fill area */}
            <Path
              d={`${linePath} L ${spectrumWidth} ${spectrumHeight} L 0 ${spectrumHeight} Z`}
              fill="url(#lineGradient)"
            />
            {/* Line stroke */}
            <Path
              d={linePath}
              stroke={colors.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        );

      case 'mirror':
        return (
          <G>
            <Defs>
              <LinearGradient id="mirrorGradientUp" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0.7" />
              </LinearGradient>
              <LinearGradient id="mirrorGradientDown" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#4ECDC4" stopOpacity="0.7" />
              </LinearGradient>
            </Defs>
            {bars.map((value, index) => {
              const barHeight = Math.max(1, value * (spectrumHeight / 2 - 10));
              const centerY = spectrumHeight / 2;
              return (
                <G key={`mirror-${index}`}>
                  {/* Upper bar */}
                  <Rect
                    x={index * (barWidth + 1)}
                    y={centerY - barHeight}
                    width={barWidth}
                    height={barHeight}
                    fill="url(#mirrorGradientUp)"
                    rx={1}
                  />
                  {/* Lower bar (mirrored) */}
                  <Rect
                    x={index * (barWidth + 1)}
                    y={centerY}
                    width={barWidth}
                    height={barHeight}
                    fill="url(#mirrorGradientDown)"
                    rx={1}
                  />
                </G>
              );
            })}
            {/* Center line */}
            <Line
              x1={0}
              y1={spectrumHeight / 2}
              x2={spectrumWidth}
              y2={spectrumHeight / 2}
              stroke={colors.primary}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          </G>
        );

      case 'glow':
        return (
          <G>
            <Defs>
              <LinearGradient id="glowGradient" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <Stop offset="50%" stopColor="#FFD93D" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.6" />
              </LinearGradient>
            </Defs>
            {bars.map((value, index) => {
              const barHeight = Math.max(2, value * spectrumHeight);
              const glowIntensity = value;
              return (
                <G key={`glow-${index}`}>
                  {/* Glow effect (larger, blurred bar behind) */}
                  <Rect
                    x={index * (barWidth + 1) - 2}
                    y={spectrumHeight - barHeight - 4}
                    width={barWidth + 4}
                    height={barHeight + 8}
                    fill={colors.primary}
                    opacity={glowIntensity * 0.3}
                    rx={3}
                  />
                  {/* Main bar */}
                  <Rect
                    x={index * (barWidth + 1)}
                    y={spectrumHeight - barHeight}
                    width={barWidth}
                    height={barHeight}
                    fill="url(#glowGradient)"
                    rx={1}
                  />
                </G>
              );
            })}
          </G>
        );

      case 'dots':
        return (
          <G>
            <Defs>
              <LinearGradient id="dotGradient" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor="#C7F464" stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            {bars.map((value, index) => {
              const numDots = Math.max(1, Math.floor(value * 12));
              const dotSpacing = spectrumHeight / 14;
              return (
                <G key={`dots-${index}`}>
                  {Array.from({ length: numDots }).map((_, dotIndex) => {
                    const dotY = spectrumHeight - (dotIndex + 1) * dotSpacing;
                    const dotSize = 3 + (dotIndex / numDots) * 2;
                    const opacity = 0.5 + (dotIndex / numDots) * 0.5;
                    return (
                      <Circle
                        key={`dot-${index}-${dotIndex}`}
                        cx={index * (barWidth + 1) + barWidth / 2}
                        cy={dotY}
                        r={dotSize}
                        fill={colors.primary}
                        opacity={opacity}
                      />
                    );
                  })}
                </G>
              );
            })}
          </G>
        );

      case 'bar':
      default:
        return (
          <G>
            {bars.map((value, index) => {
              const barHeight = Math.max(2, value * spectrumHeight);
              return (
                <Rect
                  key={`bar-${index}`}
                  x={index * (barWidth + 1)}
                  y={spectrumHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill={colors.primary}
                  rx={1}
                />
              );
            })}
          </G>
        );
    }
  };

  return (
    <View style={[styles.container, fullscreen && styles.fullscreenContainer]}>
      <View
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Svg
          width={spectrumWidth}
          height={spectrumHeight + labelHeight}
          viewBox={`0 0 ${spectrumWidth} ${spectrumHeight + labelHeight}`}
        >
          {/* Band backgrounds (visible after answering) */}
          {FREQUENCY_BANDS.map((band, i) => (
            <Rect
              key={`bg-${band.value}`}
              x={i * bandWidth}
              y={0}
              width={bandWidth}
              height={spectrumHeight}
              fill={getBandBackground(band.value)}
            />
          ))}

          {/* Spectrum visualization (style-dependent) */}
          {renderSpectrum()}

          {/* Vertical divider lines between bands */}
          {FREQUENCY_BANDS.map((_, i) => {
            if (i === 0) return null;
            return (
              <Line
                key={`line-${i}`}
                x1={i * bandWidth}
                y1={0}
                x2={i * bandWidth}
                y2={spectrumHeight}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            );
          })}

          {/* Frequency labels */}
          {FREQUENCY_BANDS.map((band, i) => (
            <SvgText
              key={`label-${band.value}`}
              x={i * bandWidth + bandWidth / 2}
              y={spectrumHeight + 25}
              fontSize={fullscreen ? 13 : 11}
              fill={colors.textMuted}
              textAnchor="middle"
              fontWeight={hasAnswered && band.value === correctFrequency ? 'bold' : 'normal'}
            >
              {band.label}
            </SvgText>
          ))}

          {/* Horizontal baseline */}
          <Line
            x1={0}
            y1={spectrumHeight}
            x2={spectrumWidth}
            y2={spectrumHeight}
            stroke={colors.border}
            strokeWidth={1}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.lg,
    padding: 8,
    overflow: 'hidden',
  },
  fullscreenContainer: {
    flex: 1,
    borderRadius: 0,
    padding: 0,
  },
});
