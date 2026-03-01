import { useState, useEffect } from 'react';
import { AudioRecorder } from './components/audio-recorder';
import { CpxConnector } from './components/cpx-connector';
import { ActivityLog, LogEntry } from './components/activity-log';
import { SymptomTracker } from './components/symptom-tracker';
import { SymptomLog, SymptomEntry } from './components/symptom-log';
import { CombinedLog } from './components/combined-log';
import { HealthInsights } from './components/health-insights';
import { Toaster } from './components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { HeartPulse } from 'lucide-react';
import { HeartRateTrends } from './components/heart-rate-trends';

export default function App() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [currentHeartRate, setCurrentHeartRate] = useState<number>(0);

  // store recent HR samples (newest first). persisted as ISO timestamps.
  const [hrSamples, setHrSamples] = useState<{ timestamp: string; bpm: number }[]>(() => {
    try {
      const raw = localStorage.getItem('hrSamples');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem('hrSamples', JSON.stringify(hrSamples.slice(0, 2000))); } catch {}
  }, [hrSamples]);

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

  const handleTranscriptionComplete = (text: string, timestamp: Date, audioId?: string) => {
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp,
      text,
      heartRate: currentHeartRate > 0 ? currentHeartRate : undefined,
      audioId,
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
    // push sample when valid >0, include timestamp
    if (heartRate > 0) {
      const sample = { timestamp: new Date().toISOString(), bpm: heartRate };
      setHrSamples(prev => [sample, ...prev].slice(0, 2000));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      {/* Mobile-width centered container */}
      <div className="mx-auto w-full max-w-[420px] min-h-screen">
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
          {/* Mobile-width centered container */}
          <div className="mx-auto w-full max-w-[420px] min-h-screen">
            <div className="px-4 py-6 space-y-6">
              {/* Health Insights */}
              <HealthInsights entries={entries} symptoms={symptoms} />

              {/* Smart Watch Card */}
              <div className="p-4">
                <CpxConnector onHeartRateUpdate={handleHeartRateUpdate} />
              </div>

              {/* Tabs for different logs */}
              <Tabs defaultValue="combined" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="combined">Combined</TabsTrigger>
                  <TabsTrigger value="activities">Audio Log</TabsTrigger>
                  <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
                  <TabsTrigger value="hrtrends">HR Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="combined">
                  <CombinedLog
                    activities={entries}
                    symptoms={symptoms}
                    onDeleteActivity={handleDeleteEntry}
                    onDeleteSymptom={handleDeleteSymptom}
                    hrSamples={hrSamples}
                  />
                </TabsContent>

                <TabsContent value="activities">
                  <ActivityLog entries={entries} onDeleteEntry={handleDeleteEntry} />
                </TabsContent>

                <TabsContent value="symptoms" className="mt-4 space-y-4">
                  <SymptomTracker onSymptomAdd={handleSymptomAdd} />
                  <SymptomLog symptoms={symptoms} onDeleteSymptom={handleDeleteSymptom} />
                </TabsContent>

                <TabsContent value="hrtrends">
                  <HeartRateTrends samples={hrSamples} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          {/* end mobile-width container */}
        </div>

        {/* Fixed Bottom Recording Button */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background border-t border-border shadow-2xl">
          <div className="px-6 py-4">
            <AudioRecorder onTranscriptionComplete={handleTranscriptionComplete} />
          </div>
        </div>

        <Toaster />
      </div>
      {/* end mobile-width container */}
    </div>
  );
}