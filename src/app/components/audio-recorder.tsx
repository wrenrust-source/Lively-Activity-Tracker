import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, timestamp: Date) => void;
}

export function AudioRecorder({ onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let transcript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            transcript += transcriptSegment + ' ';
          } else {
            interim += transcriptSegment;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (transcript.trim()) {
          setInterimTranscript('');
          onTranscriptionComplete(transcript, new Date());
          toast.success('Entry logged successfully');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Speech recognition error: ' + event.error);
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart recognition if still recording to handle pauses better
        if (recognitionRef.current && isRecording) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, onTranscriptionComplete]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsRecording(false);
    setIsProcessing(false);
    setInterimTranscript('');
  };

  const abortRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setIsRecording(false);
    setIsProcessing(false);
    setInterimTranscript('');
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

      {/* Recording Preview Overlay */}
      {isRecording && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 flex flex-col items-center justify-center p-6 z-50">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white text-center max-w-lg">
              <div className="text-lg leading-relaxed mb-4">
                {interimTranscript ? (
                  <span className="opacity-90">{interimTranscript}</span>
                ) : (
                  <span className="opacity-50 italic">Listening...</span>
                )}
              </div>
            </div>
          </div>

          {/* Abort Button */}
          <button
            onClick={abortRecording}
            className="absolute bottom-8 left-8 p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors animate-in fade-in slide-in-from-bottom-4 duration-300"
            title="Cancel recording"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}