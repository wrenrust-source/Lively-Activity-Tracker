import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Trash2, Check, Edit2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, timestamp: Date) => void;
}

export function AudioRecorder({ onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [showEditButton, setShowEditButton] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);

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
        let newFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            newFinal += transcriptSegment + ' ';
          } else {
            interim += transcriptSegment;
          }
        }

        // Update interim text
        if (interim) {
          setInterimTranscript(interim);
          
          // Clear the silence timeout when user is speaking
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }

        // Accumulate final text
        if (newFinal.trim()) {
          setFinalTranscript((prev) => prev + newFinal);
          setInterimTranscript('');
          
          // Start silence timer
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              setShowEditButton(true);
            }
          }, 2500);
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
        if (isRecordingRef.current && recognitionRef.current) {
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
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.start();
      
      // Start speech recognition
      isRecordingRef.current = true;
      setIsRecording(true);
      setFinalTranscript('');
      setInterimTranscript('');
      setShowEditButton(false);
      setIsEditing(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      toast.info('Recording started - speak now');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please grant permission.');
      isRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    
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
    isRecordingRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(false);
    setInterimTranscript('');
    setFinalTranscript('');
    setShowEditButton(false);
    setIsEditing(false);
    setEditableText('');
    toast.info('Recording cancelled');
  };

  const confirmEntry = () => {
    const textToLog = editableText || finalTranscript;
    if (!textToLog.trim()) {
      toast.error('No text to log');
      return;
    }

    onTranscriptionComplete(textToLog.trim(), new Date());
    toast.success('Entry logged successfully');
    
    // Reset state and exit recording screen
    isRecordingRef.current = false;
    setIsRecording(false);
    setFinalTranscript('');
    setInterimTranscript('');
    setShowEditButton(false);
    setIsEditing(false);
    setEditableText('');
  };

  const startEditing = () => {
    setEditableText(finalTranscript);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditableText('');
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
              {isEditing ? (
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="w-full p-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                  rows={5}
                  autoFocus
                />
              ) : (
                <div className="text-lg leading-relaxed mb-4">
                  {interimTranscript ? (
                    <span className="opacity-90">{interimTranscript}</span>
                  ) : finalTranscript ? (
                    <span className="opacity-90">{finalTranscript}</span>
                  ) : (
                    <span className="opacity-50 italic">Listening...</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Edit Button - appears after 2.5s of silence */}
          {showEditButton && !isEditing && finalTranscript && (
            <button
              onClick={startEditing}
              className="absolute top-8 right-8 p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors animate-in fade-in duration-300"
              title="Edit text"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}

          {/* Abort Button */}
          <button
            onClick={abortRecording}
            className="absolute bottom-8 left-8 p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors animate-in fade-in slide-in-from-bottom-4 duration-300"
            title="Cancel recording"
          >
            <Trash2 className="w-6 h-6" />
          </button>

          {/* Confirm Button - bottom right */}
          {finalTranscript && (
            <button
              onClick={confirmEntry}
              className="absolute bottom-8 right-8 p-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors animate-in fade-in slide-in-from-bottom-4 duration-300"
              title="Confirm entry"
            >
              <Check className="w-6 h-6" />
            </button>
          )}

          {/* Cancel Edit Button */}
          {isEditing && (
            <button
              onClick={cancelEditing}
              className="absolute bottom-24 right-8 p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors"
              title="Cancel editing"
            >
              <Square className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </>
  );
}