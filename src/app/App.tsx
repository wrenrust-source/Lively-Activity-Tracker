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
import { Button } from './components/ui/button';
import { HeartRateTrends } from './components/heart-rate-trends';
// Use the public/static assets path for the logo to avoid needing image module type declarations.
// Place Lively.png in the public/assets/ directory so it's served at /assets/Lively.png.
const livelyLogo = '/assets/Lively.png';

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

  function escapeXml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function generateLogsXml(entries: LogEntry[], symptoms: SymptomEntry[]) {
    const exportedAt = new Date().toISOString();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<HealthLogs exportedAt="${exportedAt}">\n`;

    xml += '  <Entries>\n';
    for (const e of entries) {
      const id = escapeXml(String(e.id));
      const ts = escapeXml((e.timestamp instanceof Date) ? e.timestamp.toISOString() : String(e.timestamp));
      const text = escapeXml(e.text || '');
      const audioId = e.audioId ? escapeXml(String(e.audioId)) : '';
      xml += `    <Entry id="${id}" timestamp="${ts}">\n`;
      xml += `      <Text>${text}</Text>\n`;
      if (audioId) xml += `      <AudioId>${audioId}</AudioId>\n`;
      xml += '    </Entry>\n';
    }
    xml += '  </Entries>\n';

    xml += '  <Symptoms>\n';
    for (const s of symptoms) {
      const id = escapeXml(String(s.id));
      const ts = escapeXml((s.timestamp instanceof Date) ? s.timestamp.toISOString() : String(s.timestamp));
      const name = escapeXml(s.symptom || '');
      const sev = String(s.severity ?? '');
      xml += `    <Symptom id="${id}" timestamp="${ts}" severity="${sev}">\n`;
      xml += `      <Name>${name}</Name>\n`;
      xml += '    </Symptom>\n';
    }
    xml += '  </Symptoms>\n';

    xml += '</HealthLogs>\n';
    return xml;
  }

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

  // Save HR summary over last 10 minutes into combined entries
  const handleSaveHrSummary = () => {
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recent = hrSamples.filter(s => new Date(s.timestamp) >= tenMinAgo);
    if (recent.length === 0) {
      // no samples to summarize
      alert('No heart rate samples in the last 10 minutes to save.');
      return;
    }
    const values = recent.map(s => s.bpm);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const high = Math.max(...values);
    const low = Math.min(...values);

    const entry: LogEntry = {
      // minimal guaranteed fields – adapt if your LogEntry requires others
      id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'hr_summary',
      title: 'Heart rate summary',
      text: `Avg ${avg} BPM · High ${high} BPM · Low ${low} BPM`,
      metadata: { avg, high, low },
    } as unknown as LogEntry;

    setEntries(prev => [entry, ...prev]);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      {/* Mobile-width centered container */}
      <div className="mx-auto w-full max-w-[420px] min-h-screen">
        {/* Mobile Header */}
        <div className="bg-primary text-primary-foreground px-4 py-2 pb-3 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-center py-1">
            <img
              src={livelyLogo}
              alt="Lively logo"
              className="h-30 md:h-30 w-auto mx-auto object-contain"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Mobile-width centered container */}
          <div className="mx-auto w-full max-w-[420px] min-h-screen">
            <div className="px-4 py-6 space-y-6">
              {/* Health Insights */}
              <HealthInsights entries={entries} symptoms={symptoms} />

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    try {
                      const xml = generateLogsXml(entries, symptoms);
                      const blob = new Blob([xml], { type: 'application/xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `health-logs-${new Date().toISOString()}.xml`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error('Error exporting logs', e);
                      alert('Failed to export logs. See console for details.');
                    }
                  }}
                >
                  Export XML
                </Button>
              </div>

              {/* Smart Watch Card */}
              <div className="p-4">
                <CpxConnector onHeartRateUpdate={handleHeartRateUpdate} onSaveHrSummary={handleSaveHrSummary} />
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