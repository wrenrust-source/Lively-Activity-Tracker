import { useState, useEffect } from 'react';
import { AudioRecorder } from './components/audio-recorder';
import { SmartwatchConnector } from './components/smartwatch-connector';
import { ActivityLog, LogEntry } from './components/activity-log';
import { SymptomTracker } from './components/symptom-tracker';
import { SymptomLog, SymptomEntry } from './components/symptom-log';
import { CombinedLog } from './components/combined-log';
import { HealthInsights } from './components/health-insights';
import { Toaster } from './components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { HeartPulse } from 'lucide-react';

export default function App() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [currentHeartRate, setCurrentHeartRate] = useState<number>(0);

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('healthLog');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const entriesWithDates = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
        setEntries(entriesWithDates);
      } catch (error) {
        console.error('Error loading stored entries:', error);
      }
    }

    const storedSymptoms = localStorage.getItem('symptomLog');
    if (storedSymptoms) {
      try {
        const parsed = JSON.parse(storedSymptoms);
        const symptomsWithDates = parsed.map((symptom: any) => ({
          ...symptom,
          timestamp: new Date(symptom.timestamp),
        }));
        setSymptoms(symptomsWithDates);
      } catch (error) {
        console.error('Error loading stored symptoms:', error);
      }
    }
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('healthLog', JSON.stringify(entries));
    }
  }, [entries]);

  // Save symptoms to localStorage whenever they change
  useEffect(() => {
    if (symptoms.length > 0) {
      localStorage.setItem('symptomLog', JSON.stringify(symptoms));
    }
  }, [symptoms]);

  const handleTranscriptionComplete = (text: string, timestamp: Date) => {
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp,
      text,
      heartRate: currentHeartRate > 0 ? currentHeartRate : undefined,
    };

    setEntries(prev => [newEntry, ...prev]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSymptomAdd = (symptom: string, severity: number, timestamp: Date) => {
    const newSymptom: SymptomEntry = {
      id: crypto.randomUUID(),
      timestamp,
      symptom,
      severity,
    };
    setSymptoms(prev => [newSymptom, ...prev]);
  };

  const handleDeleteSymptom = (id: string) => {
    setSymptoms(prev => prev.filter(symptom => symptom.id !== id));
  };

  const handleHeartRateUpdate = (heartRate: number) => {
    setCurrentHeartRate(heartRate);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      {/* Mobile Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <HeartPulse className="w-7 h-7" />
          <h1 className="text-xl font-bold">Health Tracker</h1>
        </div>
        <p className="text-sm opacity-90">
          Find correlations betwen daily activities and symptoms
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-6 space-y-6">
          {/* Health Insights */}
          <HealthInsights entries={entries} />

          {/* Smart Watch Card */}
          <SmartwatchConnector onHeartRateUpdate={handleHeartRateUpdate} />

          {/* Tabs for different logs */}
          <Tabs defaultValue="combined" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="combined">Combined</TabsTrigger>
              <TabsTrigger value="activities">Audio Log</TabsTrigger>
              <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            </TabsList>

            <TabsContent value="combined" className="mt-4">
              <CombinedLog
                activities={entries}
                symptoms={symptoms}
                onDeleteActivity={handleDeleteEntry}
                onDeleteSymptom={handleDeleteSymptom}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <ActivityLog entries={entries} onDeleteEntry={handleDeleteEntry} />
            </TabsContent>

            <TabsContent value="symptoms" className="mt-4 space-y-4">
              <SymptomTracker onSymptomAdd={handleSymptomAdd} />
              <SymptomLog symptoms={symptoms} onDeleteSymptom={handleDeleteSymptom} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Fixed Bottom Recording Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background border-t border-border shadow-2xl">
        <div className="px-6 py-4">
          <AudioRecorder onTranscriptionComplete={handleTranscriptionComplete} />
        </div>
      </div>

      <Toaster />
    </div>
  );
}