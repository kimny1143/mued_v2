import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { initWhisper, WhisperContext } from 'whisper.rn';
import { Platform } from 'react-native';

// For iOS: model is added to Xcode project and copied to main bundle
// We pass just the filename and whisper.rn will look in the bundle
const MODEL_FILENAME = 'ggml-small.bin';

interface TranscriptionResult {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  text: string;
  processingTime: number; // ms
}

export default function App() {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Metrics
  const [avgLatency, setAvgLatency] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const whisperContextRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize whisper on mount
  useEffect(() => {
    initializeWhisper();
    return () => {
      cleanup();
    };
  }, []);

  const initializeWhisper = async () => {
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

      // Initialize Whisper with the model
      addLog('Whisperモデルを読み込み中...', 0);

      try {
        // On iOS, set isBundleAsset: true to load from app's main bundle
        // The model file must be added to Xcode project with "Copy Bundle Resources"
        const context = await initWhisper({
          filePath: MODEL_FILENAME,
          isBundleAsset: true,
        });
        whisperContextRef.current = context;
        setIsInitialized(true);
        addLog('Whisper初期化完了（whisper-small）', 0);
      } catch (whisperError: any) {
        // Fallback for Expo Go or if model not found
        console.log('Whisper init error:', whisperError);
        setIsInitialized(true);
        addLog('録音テストモードで起動（Whisper無効）', 0);
        addLog(`理由: ${whisperError.message}`, 0);
      }
    } catch (error: any) {
      setInitError(error.message);
    }
  };

  const cleanup = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (whisperContextRef.current) {
      // Cleanup whisper context if needed
    }
  };

  const addLog = (text: string, processingTime: number) => {
    // Output to Metro terminal for easier debugging
    console.log(`[MUEDnote] ${text}${processingTime > 0 ? ` (${processingTime}ms)` : ''}`);

    setLogs((prev) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${prev.length}`,
        timestamp: new Date(),
        text,
        processingTime,
      };
      return [...prev, entry];
    });

    // Update metrics
    if (processingTime > 0) {
      setTotalProcessed((prev) => prev + 1);
      setAvgLatency((prev) => {
        const newTotal = totalProcessed + 1;
        return (prev * totalProcessed + processingTime) / newTotal;
      });
    }

    // Auto scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const startRecording = async () => {
    try {
      addLog('録音開始...', 0);

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
      setIsRecording(true);
      addLog('録音中...（話してください）', 0);
    } catch (error: any) {
      addLog(`録音エラー: ${error.message}`, 0);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      const startTime = Date.now();

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        addLog(`録音完了: ${uri.split('/').pop()}`, 0);

        // Get file info using new File API
        try {
          const file = new FileSystem.File(uri);
          if (file.exists) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            addLog(`ファイルサイズ: ${sizeMB} MB`, 0);
          }
        } catch {
          // Fallback: skip file size check if API not available
          addLog('ファイル情報取得スキップ', 0);
        }

        // Attempt transcription if whisper is available
        if (whisperContextRef.current) {
          addLog('文字起こし処理中...', 0);
          try {
            const { promise } = whisperContextRef.current.transcribe(uri, {
              language: 'ja',
            });
            const result = await promise;
            const processingTime = Date.now() - startTime;

            if (result?.result) {
              addLog(`認識結果: ${result.result}`, processingTime);
              setCurrentTranscript(result.result);
            }
          } catch (e: any) {
            addLog(`文字起こしエラー: ${e.message}`, 0);
          }
        } else {
          // Manual test mode - show that recording works
          const processingTime = Date.now() - startTime;
          addLog('（Whisperモデル未ロード - 録音は正常に動作）', processingTime);
          addLog('実機でprebuildしてモデルをロードすると文字起こしが動作します', 0);
        }
      }
    } catch (error: any) {
      addLog(`停止エラー: ${error.message}`, 0);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setCurrentTranscript('');
    setAvgLatency(0);
    setTotalProcessed(0);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
        <Text style={styles.subtitle}>Whisper音声認識テスト</Text>
      </View>

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
          <Text style={[styles.metricValue, { color: isInitialized ? '#4ade80' : '#fbbf24' }]}>
            {isInitialized ? 'Ready' : 'Init...'}
          </Text>
          <Text style={styles.metricLabel}>Status</Text>
        </View>
      </View>

      {/* Current Transcript */}
      {currentTranscript ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>最新の認識結果:</Text>
          <Text style={styles.transcriptText}>{currentTranscript}</Text>
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
              <Text style={styles.logText}>{log.text}</Text>
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
            isRecording && styles.recordButtonActive,
            !isInitialized && styles.recordButtonDisabled,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!isInitialized}
        >
          <View style={[styles.recordDot, isRecording && styles.recordDotActive]} />
          <Text style={styles.recordButtonText}>
            {isRecording ? '停止' : '録音開始'}
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
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  transcriptContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4ade80',
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 5,
  },
  transcriptText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  logContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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
    padding: 15,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  logTime: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
    width: 70,
  },
  logText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  logLatency: {
    fontSize: 12,
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
    // Animation would be added here
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
