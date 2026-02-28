import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { saveAudioRecording } from '../../lib/audioStorage';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, timestamp: Date, audioId?: string) => void;
}

// Initialize Web Speech API
function initSpeechRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API not available in this browser');
    return null;
  }
  return new SpeechRecognition();
}

let recognitionRestartTimeout: any = null;

export function AudioRecorder({ onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('✓ Speech recognition STARTED');
        if (recognitionRestartTimeout) {
          clearTimeout(recognitionRestartTimeout);
          recognitionRestartTimeout = null;
        }
      };

      recognition.onresult = (event: any) => {
        console.log('Speech result received', { resultIndex: event.resultIndex, resultsLength: event.results.length });
        
        // Clear any pending restart timeout when we get results
        if (recognitionRestartTimeout) {
          clearTimeout(recognitionRestartTimeout);
          recognitionRestartTimeout = null;
        }
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            console.log('Final result:', transcript, 'confidence:', confidence);
            finalTranscript += transcript + ' ';
          } else {
            console.log('Interim result:', transcript);
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          transcriptRef.current += finalTranscript;
        }
        
        const displayText = (transcriptRef.current + interimTranscript).trim();
        if (displayText) {
          setLiveTranscript(displayText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('✗ Speech recognition ERROR:', event.error);
        
        // Don't show error toast for these harmless errors
        if (!['no-speech', 'audio-capture', 'network'].includes(event.error)) {
          toast.error('Speech error: ' + event.error, { duration: 2000 });
        }
        
        // Attempt to restart on error if still recording
        if (isRecordingRef.current) {
          console.log('Attempting to restart recognition after error...');
          try {
            recognitionRestartTimeout = setTimeout(() => {
              recognition.start();
            }, 100);
          } catch (e) {
            console.log('Could not restart recognition:', e);
          }
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ENDED');
        
        // Restart if still recording
        if (isRecordingRef.current) {
          if (recognitionRestartTimeout) {
            clearTimeout(recognitionRestartTimeout);
          }
          
          console.log('Restarting speech recognition for continuous capture...');
          try {
            recognitionRestartTimeout = setTimeout(() => {
              try {
                recognition.start();
                console.log('✓ Recognition restarted');
              } catch (e) {
                console.log('Could not restart recognition:', e);
              }
            }, 100);
          } catch (e) {
            console.log('Error setting up restart:', e);
          }
        }
      };
    } else {
      toast.error('Web Speech API not supported in your browser. Try Chrome or Edge.');
    }

    return () => {
      if (recognitionRestartTimeout) {
        clearTimeout(recognitionRestartTimeout);
        recognitionRestartTimeout = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition:', e);
        }
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.log('Error closing audio context:', e);
        }
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      transcriptRef.current = '';
      recordingStartTimeRef.current = Date.now();
      setLiveTranscript('');

      console.log('========== STARTING RECORDING ==========');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // Disable auto gain to see real levels
        } 
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      console.log('✓ Microphone stream acquired');
      console.log('  Track enabled:', audioTrack.enabled);
      console.log('  Track state:', audioTrack.readyState);
      console.log('  Audio settings:', audioTrack.getSettings());

      // Create audio context to monitor levels
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Monitor audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      const levelCheckInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > maxLevel) maxLevel = average;
        if (average > 10) {
          console.log('🔊 Audio detected! Level:', Math.round(average));
        }
      }, 100);

      // Store interval ID to clear later
      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      // Attach properties after assigning mediaRecorder
      (mediaRecorder as any).levelCheckInterval = levelCheckInterval;
      (mediaRecorder as any).maxAudioLevel = () => maxLevel;
      
      let totalChunks = 0;
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          totalChunks++;
          console.log(`Audio chunk #${totalChunks}: ${event.data.size} bytes`);
        }
      };
      
      mediaRecorder.onerror = (event: any) => {
        console.error('✗ MediaRecorder error:', event.error);
        toast.error('Recording error: ' + event.error);
      };

      mediaRecorder.onstart = () => {
        console.log('✓ MediaRecorder started');
      };

      mediaRecorder.onstop = () => {
        clearInterval(levelCheckInterval);
        console.log('✓ MediaRecorder stopped. Total chunks:', totalChunks, 'Max audio level:', maxLevel);
      };
      
      mediaRecorder.start(100);
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('✗ Could not start speech recognition:', e);
          toast.error('Speech recognition unavailable. Check browser support.');
        }
      } else {
        console.warn('⚠ Speech recognition not initialized');
        toast.error('Speech recognition not available in your browser');
      }
      
      setIsRecording(true);
      isRecordingRef.current = true;
      toast.info('Recording started - please speak clearly');
    } catch (error: any) {
      console.error('✗ Error accessing microphone:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Check browser settings.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Check your device.');
      } else {
        toast.error('Could not access microphone: ' + error.message);
      }
    }
  };

  const stopRecording = async () => {
    console.log('========== STOPPING RECORDING ==========');
    
    // Clear restart timeout
    if (recognitionRestartTimeout) {
      clearTimeout(recognitionRestartTimeout);
      recognitionRestartTimeout = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessing(true);
      
      // Clear level check interval
      if ((mediaRecorderRef.current as any).levelCheckInterval) {
        clearInterval((mediaRecorderRef.current as any).levelCheckInterval);
      }
      
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Wait for the last data chunk to be processed
      await new Promise(resolve => {
        const checkStop = () => {
          if (mediaRecorderRef.current?.state === 'inactive') {
            resolve(null);
          } else {
            setTimeout(checkStop, 50);
          }
        };
        checkStop();
      });
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }

    // Analyze results
    const finalTranscript = transcriptRef.current.trim();
    const totalAudioSize = audioChunksRef.current.reduce((sum, blob) => sum + blob.size, 0);
    const maxAudioLevel = (mediaRecorderRef.current as any)?.maxAudioLevel?.() || 0;
    
    console.log('Recording Analysis:');
    console.log('  Transcript:', finalTranscript || '(empty)');
    console.log('  Audio chunks:', audioChunksRef.current.length);
    console.log('  Total audio size:', totalAudioSize, 'bytes');
    console.log('  Max audio level:', maxAudioLevel);
    
    if (totalAudioSize === 0) {
      console.warn('⚠ WARNING: No audio data captured at all!');
      console.warn('  - Microphone might not be recording');
      console.warn('  - Check microphone permissions and device');
    }
    
    if (audioChunksRef.current.length > 0 && finalTranscript) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const timestamp = new Date(recordingStartTimeRef.current);
        
        console.log('Saving audio:', audioBlob.size, 'bytes, duration:', duration.toFixed(1), 'seconds');
        
        const audioId = await saveAudioRecording(
          audioBlob,
          finalTranscript,
          timestamp,
          duration
        );

        onTranscriptionComplete(finalTranscript, timestamp, audioId);
        toast.success('Entry logged successfully');
      } catch (error) {
        console.error('Error saving audio:', error);
        toast.error('Failed to save audio recording');
      }
    } else if (finalTranscript) {
      const timestamp = new Date(recordingStartTimeRef.current);
      onTranscriptionComplete(finalTranscript, timestamp);
      toast.success('Entry logged (text only)');
    } else if (audioChunksRef.current.length > 0) {
      // Audio was captured but no speech detected
      console.log('Audio captured but no transcript. Attempting to save audio-only...');
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const timestamp = new Date(recordingStartTimeRef.current);
        
        const audioId = await saveAudioRecording(
          audioBlob,
          '[No speech detected]',
          timestamp,
          duration
        );
        
        onTranscriptionComplete('[No speech detected]', timestamp, audioId);
        toast.success('Audio saved (speech not detected)');
      } catch (error) {
        console.error('Error saving audio:', error);
        toast.error('Failed to save audio recording');
      }
    } else {
      console.error('No audio and no transcript');
      toast.error('No audio detected. Check your microphone and try again.');
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setIsProcessing(false);
    setLiveTranscript('');
  };

  const abortRecording = () => {
    console.log('Recording aborted by user');
    
    // Clear restart timeout
    if (recognitionRestartTimeout) {
      clearTimeout(recognitionRestartTimeout);
      recognitionRestartTimeout = null;
    }
    
    if ((mediaRecorderRef.current as any)?.levelCheckInterval) {
      clearInterval((mediaRecorderRef.current as any).levelCheckInterval);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    audioChunksRef.current = [];
    transcriptRef.current = '';
    
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsProcessing(false);
    setLiveTranscript('');
    toast.info('Recording cancelled');
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {!isRecording ? (
          <Button
            size="lg"
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 h-14 text-base rounded-full"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </Button>
        ) : (
          <Button
            size="lg"
            variant="destructive"
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 h-14 text-base rounded-full animate-pulse"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </Button>
        )}
        
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        )}
        
        {isRecording && (
          <p className="text-xs text-center text-muted-foreground">
            Speak clearly about your activity and feelings
          </p>
        )}
      </div>

      {/* Recording Overlay with Live Transcript */}
      {isRecording && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-4 max-w-[430px] mx-auto">
          <div className="w-full max-w-sm">
            {/* Text Preview Area */}
            <div className="bg-background/95 rounded-2xl p-6 min-h-32 flex items-center justify-center shadow-lg mb-8">
              <p className="text-center text-sm text-foreground/70 opacity-80 leading-relaxed whitespace-pre-wrap">
                {liveTranscript || (
                  <span className="text-muted-foreground italic">Listening...</span>
                )}
              </p>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between gap-4">
              {/* Abort Button */}
              <button
                onClick={abortRecording}
                className="w-12 h-12 rounded-full bg-destructive/20 hover:bg-destructive/30 flex items-center justify-center transition-colors"
                title="Abort recording"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </button>

              {/* Spacer - takes up middle space */}
              <div className="flex-1" />

              {/* Stop Button */}
              <button
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors animate-pulse"
                title="Stop recording"
              >
                <Square className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}