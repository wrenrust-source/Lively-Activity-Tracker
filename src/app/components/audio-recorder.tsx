import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { saveAudioRecording } from '../../lib/audioStorage';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, timestamp: Date, audioId?: string) => void;
}

export function AudioRecorder({ onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
        
        if (transcript.trim()) {
          transcriptRef.current = transcript;
          setLiveTranscript(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Speech recognition error: ' + event.error);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscriptionComplete]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      transcriptRef.current = '';
      recordingStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Capture audio chunks
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.start();
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      setIsRecording(true);
      toast.info('Recording started - speak now');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessing(true);
      
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

    // Save audio and transcript
    if (audioChunksRef.current.length > 0 && transcriptRef.current.trim()) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const timestamp = new Date(recordingStartTimeRef.current);
        
        const audioId = await saveAudioRecording(
          audioBlob,
          transcriptRef.current,
          timestamp,
          duration
        );

        onTranscriptionComplete(transcriptRef.current, timestamp, audioId);
        toast.success('Entry logged successfully');
      } catch (error) {
        console.error('Error saving audio:', error);
        toast.error('Failed to save audio recording');
      }
    } else if (transcriptRef.current.trim()) {
      // Fallback: save text only if no audio chunks
      const timestamp = new Date(recordingStartTimeRef.current);
      onTranscriptionComplete(transcriptRef.current, timestamp);
      toast.success('Entry logged successfully');
    } else {
      toast.error('No speech detected. Please try again.');
    }

    setIsRecording(false);
    setIsProcessing(false);
    setLiveTranscript('');
  };

  const abortRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    audioChunksRef.current = [];
    transcriptRef.current = '';
    
    setIsRecording(false);
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