import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Clipboard as RNClipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { initWhisper, initWhisperVad, AudioSessionIos } from 'whisper.rn';
import { RealtimeTranscriber } from 'whisper.rn/src/realtime-transcription';
import { AudioPcmStreamAdapter } from 'whisper.rn/src/realtime-transcription/adapters/AudioPcmStreamAdapter';
import RNFS from 'react-native-fs';

// Model filenames - must be added to Xcode "Copy Bundle Resources"
const WHISPER_MODEL = 'ggml-small.bin';
const VAD_MODEL = 'ggml-silero-vad.bin';

interface LogEntry {
  id: string;
  timestamp: Date;
  text: string;
  processingTime: number;
  type: 'info' | 'result' | 'vad' | 'error';
}

export default function App() {
  // State
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isRealtimeMode, setIsRealtimeMode] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [vadStatus, setVadStatus] = useState<'silence' | 'speech_start' | 'speech_continue' | 'speech_end'>('silence');
  const [useVad, setUseVad] = useState(true);

  // Metrics
  const [avgLatency, setAvgLatency] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const latencyRef = useRef<number[]>([]);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const whisperContextRef = useRef<any>(null);
  const vadContextRef = useRef<any>(null);
  const realtimeTranscriberRef = useRef<RealtimeTranscriber | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const processedSlicesRef = useRef<Set<number>>(new Set()); // Track processed slices to avoid duplicates

  // Initialize on mount
  useEffect(() => {
    initializeModels();
    return () => {
      cleanup();
    };
  }, []);

  const initializeModels = async () => {
    try {
      // Request microphone permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setInitError('マイクの許可が必要です');
        return;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      addLog('Whisperモデルを読み込み中...', 0, 'info');

      try {
        // Initialize Whisper
        const whisperContext = await initWhisper({
          filePath: WHISPER_MODEL,
          isBundleAsset: true,
        });
        whisperContextRef.current = whisperContext;
        addLog('Whisper初期化完了（whisper-small）', 0, 'info');

        // Initialize VAD
        try {
          const vadContext = await initWhisperVad({
            filePath: VAD_MODEL,
            isBundleAsset: true,
          });
          vadContextRef.current = vadContext;
          addLog('VAD初期化完了（silero-vad）', 0, 'info');
        } catch (vadError: any) {
          console.log('VAD init error:', vadError);
          addLog(`VAD初期化失敗（VADなしで続行）: ${vadError.message}`, 0, 'error');
        }

        setIsInitialized(true);
      } catch (whisperError: any) {
        console.log('Whisper init error:', whisperError);
        setIsInitialized(true);
        addLog('録音テストモードで起動（Whisper無効）', 0, 'error');
        addLog(`理由: ${whisperError.message}`, 0, 'error');
      }
    } catch (error: any) {
      setInitError(error.message);
    }
  };

  const cleanup = async () => {
    await stopTranscribing();
  };

  const addLog = useCallback((text: string, processingTime: number, type: LogEntry['type'] = 'info') => {
    console.log(`[MUEDnote] ${text}${processingTime > 0 ? ` (${processingTime}ms)` : ''}`);

    setLogs((prev) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${prev.length}`,
        timestamp: new Date(),
        text,
        processingTime,
        type,
      };
      // Keep only last 100 logs
      const newLogs = [...prev, entry].slice(-100);
      return newLogs;
    });

    if (processingTime > 0) {
      latencyRef.current.push(processingTime);
      // Keep last 10 for average
      if (latencyRef.current.length > 10) {
        latencyRef.current.shift();
      }
      const avg = latencyRef.current.reduce((a, b) => a + b, 0) / latencyRef.current.length;
      setAvgLatency(avg);
      setTotalProcessed((prev) => prev + 1);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const startRealtimeTranscription = async () => {
    if (!whisperContextRef.current) {
      addLog('Whisperが初期化されていません', 0, 'error');
      return;
    }

    try {
      addLog('リアルタイム文字起こし開始...', 0, 'info');

      // Clear processed slices tracking for new session
      processedSlicesRef.current.clear();

      // Create audio stream adapter
      const audioStream = new AudioPcmStreamAdapter({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // VOICE_RECOGNITION
        bufferSize: 16 * 1024,
      });

      // Create RealtimeTranscriber with VAD support
      const transcriber = new RealtimeTranscriber(
        {
          whisperContext: whisperContextRef.current,
          vadContext: useVad ? vadContextRef.current : undefined,
          audioStream,
          fs: RNFS,
        },
        {
          audioSliceSec: 15, // Process every 15 seconds (longer chunks)
          audioMinSec: 2, // Minimum 2 seconds of audio
          autoSliceOnSpeechEnd: true,
          vadPreset: 'continuous',
          vadOptions: {
            threshold: 0.3, // More sensitive (lower = catches more speech)
            minSpeechDurationMs: 150, // Shorter min to catch speech start
            minSilenceDurationMs: 800, // Wait 800ms of silence before ending
            maxSpeechDurationS: 30, // Max continuous speech
            speechPadMs: 200, // More padding around speech (200ms before/after)
          },
          vadThrottleMs: 2000, // Reduce VAD processing frequency (less logs)
          transcribeOptions: {
            language: 'ja',
          },
          // Reduce log verbosity - only log important events
          logger: (msg: string) => {
            if (msg.includes('Transcribed') || msg.includes('error') || msg.includes('started') || msg.includes('stopped')) {
              console.log(`[Transcriber] ${msg}`);
            }
          },
        },
        {
          onStatusChange: (isActive: boolean) => {
            setIsCapturing(isActive);
            addLog(isActive ? 'キャプチャ開始' : 'キャプチャ停止', 0, 'info');
          },
          onVad: (event: any) => {
            setVadStatus(event.type);
            if (event.type === 'speech_start') {
              addLog('音声検出開始', 0, 'vad');
            } else if (event.type === 'speech_end') {
              addLog(`音声検出終了 (信頼度: ${(event.confidence * 100).toFixed(0)}%)`, 0, 'vad');
            }
          },
          onTranscribe: (event: any) => {
            if (event.type === 'transcribe' && event.data?.result) {
              // Skip if we've already processed this slice (prevents duplicate logs)
              if (processedSlicesRef.current.has(event.sliceIndex)) {
                console.log(`[Transcriber] Skipping duplicate slice ${event.sliceIndex}`);
                return;
              }
              processedSlicesRef.current.add(event.sliceIndex);

              const trimmedResult = event.data.result.trim();
              if (trimmedResult && trimmedResult !== '.') {
                addLog(`認識: ${trimmedResult}`, event.processTime || 0, 'result');
                setCurrentTranscript((prev) => {
                  if (prev.endsWith(trimmedResult)) return prev;
                  return prev + trimmedResult + ' ';
                });
              }
            }
          },
          onError: (error: string) => {
            addLog(`エラー: ${error}`, 0, 'error');
          },
        }
      );

      realtimeTranscriberRef.current = transcriber;
      await transcriber.start();

      setIsTranscribing(true);
      addLog(`リアルタイム文字起こし中...（VAD: ${useVad && vadContextRef.current ? '有効' : '無効'}）`, 0, 'info');
    } catch (error: any) {
      addLog(`開始エラー: ${error.message}`, 0, 'error');
    }
  };

  const startBatchRecording = async () => {
    try {
      addLog('録音開始...', 0, 'info');

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsTranscribing(true);
      addLog('録音中...（話してください）', 0, 'info');
    } catch (error: any) {
      addLog(`録音エラー: ${error.message}`, 0, 'error');
    }
  };

  const stopTranscribing = async () => {
    if (isRealtimeMode && realtimeTranscriberRef.current) {
      try {
        await realtimeTranscriberRef.current.stop();
        realtimeTranscriberRef.current = null;
        setIsTranscribing(false);
        setIsCapturing(false);
        setVadStatus('silence');
        addLog('リアルタイム文字起こし停止', 0, 'info');
      } catch (error: any) {
        addLog(`停止エラー: ${error.message}`, 0, 'error');
      }
    } else if (recordingRef.current) {
      try {
        const startTime = Date.now();

        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        setIsTranscribing(false);

        if (uri) {
          addLog(`録音完了: ${uri.split('/').pop()}`, 0, 'info');

          try {
            const file = new FileSystem.File(uri);
            if (file.exists) {
              const sizeMB = (file.size / 1024 / 1024).toFixed(2);
              addLog(`ファイルサイズ: ${sizeMB} MB`, 0, 'info');
            }
          } catch {
            // Skip file size check
          }

          if (whisperContextRef.current) {
            addLog('文字起こし処理中...', 0, 'info');
            try {
              const { promise } = whisperContextRef.current.transcribe(uri, {
                language: 'ja',
              });
              const result = await promise;
              const processingTime = Date.now() - startTime;

              if (result?.result) {
                addLog(`認識結果: ${result.result}`, processingTime, 'result');
                setCurrentTranscript(result.result);
              }
            } catch (e: any) {
              addLog(`文字起こしエラー: ${e.message}`, 0, 'error');
            }
          }
        }
      } catch (error: any) {
        addLog(`停止エラー: ${error.message}`, 0, 'error');
      }
    }
  };

  const handleToggle = () => {
    if (isTranscribing) {
      stopTranscribing();
    } else {
      setCurrentTranscript(''); // Clear previous transcript
      if (isRealtimeMode) {
        startRealtimeTranscription();
      } else {
        startBatchRecording();
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setCurrentTranscript('');
    setAvgLatency(0);
    setTotalProcessed(0);
    latencyRef.current = [];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'result': return '#4ade80';
      case 'vad': return '#fbbf24';
      case 'error': return '#ef4444';
      default: return '#e2e8f0';
    }
  };

  const getStatusIndicatorColor = () => {
    if (vadStatus === 'speech_start' || vadStatus === 'speech_continue') return '#4ade80'; // Green when speech detected
    if (vadStatus === 'speech_end') return '#fbbf24'; // Yellow when speech ended
    if (isCapturing) return '#60a5fa'; // Blue when capturing
    if (isTranscribing) return '#a78bfa'; // Purple when processing
    return '#64748b'; // Gray when idle
  };

  const getVadStatusText = () => {
    switch (vadStatus) {
      case 'speech_start': return '🎤 音声開始';
      case 'speech_continue': return '🎤 音声継続';
      case 'speech_end': return '⏸️ 音声終了';
      default: return '⏹️ 無音';
    }
  };

  if (initError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>初期化エラー</Text>
          <Text style={styles.errorText}>{initError}</Text>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MUEDnote PoC</Text>
        <Text style={styles.subtitle}>
          {isRealtimeMode ? 'リアルタイムモード' : 'バッチ処理モード'}
        </Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>リアルタイムモード</Text>
        <Switch
          value={isRealtimeMode}
          onValueChange={setIsRealtimeMode}
          disabled={isTranscribing}
          trackColor={{ false: '#374151', true: '#3b82f6' }}
          thumbColor={isRealtimeMode ? '#60a5fa' : '#9ca3af'}
        />
      </View>

      {/* VAD Toggle - only shown in realtime mode */}
      {isRealtimeMode && (
        <View style={styles.modeContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.modeLabel}>VAD (音声検出)</Text>
            {vadContextRef.current && <Text style={{ color: '#4ade80', fontSize: 12 }}>✓</Text>}
          </View>
          <Switch
            value={useVad}
            onValueChange={setUseVad}
            disabled={isTranscribing || !vadContextRef.current}
            trackColor={{ false: '#374151', true: '#10b981' }}
            thumbColor={useVad ? '#34d399' : '#9ca3af'}
          />
        </View>
      )}

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>
            {avgLatency > 0 ? `${avgLatency.toFixed(0)}ms` : '--'}
          </Text>
          <Text style={styles.metricLabel}>平均遅延</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{totalProcessed}</Text>
          <Text style={styles.metricLabel}>処理数</Text>
        </View>
        <View style={styles.metricBox}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusIndicatorColor() }]} />
          <Text style={styles.metricLabel}>
            {useVad && isTranscribing ? getVadStatusText() : (isCapturing ? '録音中' : (isTranscribing ? '処理中' : '待機'))}
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={[styles.metricValue, { color: isInitialized ? '#4ade80' : '#fbbf24' }]}>
            {isInitialized ? 'Ready' : 'Init...'}
          </Text>
          <Text style={styles.metricLabel}>Status</Text>
        </View>
      </View>

      {/* Current Transcript */}
      {currentTranscript ? (
        <View style={styles.transcriptContainer}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptLabel}>認識結果:</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                RNClipboard.setString(currentTranscript);
                Alert.alert('コピー完了', '認識結果をクリップボードにコピーしました');
              }}
            >
              <Text style={styles.copyButtonText}>📋 コピー</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
            <Text style={styles.transcriptText}>{currentTranscript}</Text>
          </ScrollView>
        </View>
      ) : null}

      {/* Log List */}
      <View style={styles.logContainer}>
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>ログ</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>クリア</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
        >
          {logs.map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
              <Text style={[styles.logText, { color: getLogColor(log.type) }]}>{log.text}</Text>
              {log.processingTime > 0 && (
                <Text style={styles.logLatency}>{log.processingTime}ms</Text>
              )}
            </View>
          ))}
          {logs.length === 0 && (
            <Text style={styles.emptyLog}>ログがありません</Text>
          )}
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isTranscribing && styles.recordButtonActive,
            !isInitialized && styles.recordButtonDisabled,
          ]}
          onPress={handleToggle}
          disabled={!isInitialized}
        >
          <View style={[styles.recordDot, isTranscribing && styles.recordDotActive]} />
          <Text style={styles.recordButtonText}>
            {isTranscribing ? '停止' : (isRealtimeMode ? 'リアルタイム開始' : '録音開始')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
  },
  modeLabel: {
    fontSize: 16,
    color: '#e2e8f0',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  transcriptContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4ade80',
    maxHeight: 150,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  transcriptScroll: {
    maxHeight: 100,
  },
  copyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  transcriptText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
  },
  logContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearButton: {
    fontSize: 14,
    color: '#60a5fa',
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    padding: 12,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  logTime: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    width: 65,
  },
  logText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  logLatency: {
    fontSize: 11,
    color: '#4ade80',
    fontFamily: 'monospace',
  },
  emptyLog: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  recordDotActive: {
    backgroundColor: '#ffffff',
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
