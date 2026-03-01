import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentHeartRate, setCurrentHeartRate] = useState<number>(0);
  // dropdown menu state (portal-based)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const path = (e as any).composedPath ? (e as any).composedPath() : (e as any).path || [];
      const target = e.target as Node | null;
      const clickedBtn = menuBtnRef.current && (menuBtnRef.current.contains(target as Node) || path.indexOf(menuBtnRef.current) !== -1);
      const clickedMenu = menuRef.current && (menuRef.current.contains(target as Node) || path.indexOf(menuRef.current) !== -1);
      if (clickedBtn || clickedMenu) return;
      setMenuOpen(false);
      setMenuPos(null);
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { setMenuOpen(false); setMenuPos(null); } };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

  // Exports XML with a human-friendly Summary section + full entries/symptoms lists.
  // Also computes simple HR statistics and hourly bins (last 24 hours) for trend visualization.
  function generateLogsXml(entries: LogEntry[], symptoms: SymptomEntry[], hrSamples: { timestamp: string; bpm: number }[]) {
    const exportedAt = new Date().toISOString();
    // simple HR stats
    const hrValues = hrSamples.map(s => s.bpm);
    const hrCount = hrValues.length;
    const hrAvg = hrCount ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrCount) : 0;
    const hrMin = hrCount ? Math.min(...hrValues) : 0;
    const hrMax = hrCount ? Math.max(...hrValues) : 0;

    // hourly bins for last 24 hours (timezone local)
    const now = new Date();
    const hours: { hourStartISO: string; samples: number; avgBpm: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const end = new Date(now.getTime() - i * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      const bucket = hrSamples.filter(s => {
        const t = new Date(s.timestamp);
        return t >= start && t < end;
      });
      const samples = bucket.length;
      const avgBpm = samples ? Math.round(bucket.reduce((a, b) => a + b.bpm, 0) / samples) : 0;
      hours.push({ hourStartISO: start.toISOString(), samples, avgBpm });
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<HealthLogs exportedAt="${exportedAt}" generatedBy="Healthtrackingaudiologger">\n`;

    // Summary section for quick viewing / trend ingestion
    xml += '  <Summary>\n';
    xml += `    <TotalEntries>${entries.length}</TotalEntries>\n`;
    xml += `    <TotalSymptoms>${symptoms.length}</TotalSymptoms>\n`;
    xml += '    <HeartRate>\n';
    xml += `      <Samples>${hrCount}</Samples>\n`;
    xml += `      <Avg>${hrAvg}</Avg>\n`;
    xml += `      <Min>${hrMin}</Min>\n`;
    xml += `      <Max>${hrMax}</Max>\n`;
    xml += '    </HeartRate>\n';
    xml += '    <HourlyBins>\n';
    // order ascending (oldest first) for trend charts
    for (let i = hours.length - 1; i >= 0; i--) {
      const h = hours[i];
      xml += `      <Hour start="${h.hourStartISO}" samples="${h.samples}" avgBpm="${h.avgBpm}" />\n`;
    }
    xml += '    </HourlyBins>\n';
    xml += '  </Summary>\n';

    // Detailed lists (still available for auditing)
    xml += '  <Entries>\n';
    for (const e of entries) {
      const id = escapeXml(String(e.id));
      const ts = escapeXml((e.timestamp instanceof Date) ? e.timestamp.toISOString() : String(e.timestamp));
      const text = escapeXml(e.text || '');
      const audioId = e.audioId ? escapeXml(String(e.audioId)) : '';
      const hr = e.heartRate ? escapeXml(String(e.heartRate)) : '';
      xml += `    <Entry id="${id}" timestamp="${ts}" heartRate="${hr}">\n`;
      const title = (e as any).title;
      if (title) xml += `      <Title>${escapeXml(title)}</Title>\n`;
      xml += `      <Text>${text}</Text>\n`;
      if (audioId) xml += `      <AudioId>${audioId}</AudioId>\n`;
      const meta = (e as any).metadata;
      if (meta) xml += `      <Metadata>${escapeXml(JSON.stringify(meta))}</Metadata>\n`;
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

    // Also include raw HR samples for precise trending
    xml += '  <HRSamples>\n';
    for (const s of hrSamples) {
      const ts = escapeXml(s.timestamp);
      xml += `    <Sample timestamp="${ts}" bpm="${s.bpm}" />\n`;
    }
    xml += '  </HRSamples>\n';

    xml += '</HealthLogs>\n';
    return xml;
  }

  // CSV helpful for spreadsheet trend analysis: combine HR samples and entries into flat rows.
  function generateTrendCsv(entries: LogEntry[], hrSamples: { timestamp: string; bpm: number }[]) {
    const rows: string[] = [];
    // header
    rows.push(['timestamp','kind','value','details'].join(','));

    // HR samples (kind=hr)
    for (const s of hrSamples) {
      rows.push([`"${s.timestamp}"`,'hr',String(s.bpm),''].join(','));
    }

    // Activity entries (kind=entry)
    for (const e of entries) {
      const ts = (e.timestamp instanceof Date) ? e.timestamp.toISOString() : String(e.timestamp);
      const text = (e.text || '').replace(/"/g, '""');
      const title = (e as any).title || '';
      const details = title ? `title:${title.replace(/"/g,'""')}` : '';
      rows.push([`"${ts}"`,'entry',`"${text}"`, `"${details}"`].join(','));
    }

    return rows.join('\n');
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

  const handleExportXml = () => {
    try {
      // generate improved XML and CSV
      const xml = generateLogsXml(entries, symptoms, hrSamples);
      const csv = generateTrendCsv(entries, hrSamples);
       const blob = new Blob([xml], { type: 'application/xml' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `health-logs-${new Date().toISOString()}.xml`;
       document.body.appendChild(a);
       a.click();
       a.remove();
       URL.revokeObjectURL(url);
      // also export CSV for easy trend viewing in spreadsheets
      const csvBlob = new Blob([csv], { type: 'text/csv' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const b = document.createElement('a');
      b.href = csvUrl;
      b.download = `health-trends-${new Date().toISOString()}.csv`;
      document.body.appendChild(b);
      // small timeout so downloads don't fight each other
      setTimeout(() => { b.click(); b.remove(); URL.revokeObjectURL(csvUrl); }, 200);
     } catch (err) {
       console.error('Export failed', err);
       alert('Failed to export XML.');
     }
   };

  const handleClearData = () => {
    if (!confirm('Clear all saved entries, symptoms, and heart rate samples? This cannot be undone.')) return;
    setEntries([]);
    setSymptoms([]);
    setHrSamples([]);
    try {
      localStorage.removeItem('hrSamples');
      localStorage.removeItem('entries');
      localStorage.removeItem('symptoms');
    } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      {/* Mobile-width centered container */}
      <div className="mx-auto w-full max-w-[420px] min-h-screen">
        {/* Mobile Header */}
        <div className="bg-primary text-primary-foreground px-4 pb-3 rounded-b-3xl shadow-lg">
          <div className="relative">
            <div className="flex items-center justify-center">
              <img
                src={livelyLogo}
                alt="Lively logo"
                className="h-14 md:h-20 w-auto mx-auto object-contain"
              />
            </div>

            {/* 3-dot menu (top-right of header) */}
            <div className="absolute right-3 top-3">
              <button
                ref={menuBtnRef}
                aria-label="More"
                className="p-2 rounded-full hover:bg-white/20"
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const DROPDOWN_WIDTH = 176;
                  const left = Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8);
                  const top = rect.bottom + 6;
                  setMenuPos({ left, top });
                  setMenuOpen(v => !v);
                }}
              >
                <span className="text-lg leading-none">⋯</span>
              </button>

              {menuOpen && menuPos && createPortal(
              
                  <div
                    ref={menuRef}
                    className="fixed z-50 bg-white rounded-md shadow-lg ring-1 ring-black/5 overflow-hidden border border-slate-200"
                    style={{ left: menuPos.left, top: menuPos.top, width: 176, pointerEvents: 'auto' }}
                    role="menu"
                  >
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleExportXml();
                        setMenuOpen(false);
                        setMenuPos(null);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 text-black text-sm"
                      role="menuitem"
                    >
                      Export XML
                    </button>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleClearData();
                        setMenuOpen(false);
                        setMenuPos(null);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 text-red-600 text-sm"
                      role="menuitem"
                    >
                      Clear saved data
                    </button>
                  </div>,
         document.body
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Mobile-width centered container */}
          <div className="mx-auto w-full max-w-[420px] min-h-screen">
            <div className="px-4 py-2 space-y-2">
              {/* Health Insights */}
              <HealthInsights entries={entries} symptoms={symptoms} />

              {/* Smart Watch Card */}
              <div className="p-4">
                <CpxConnector onHeartRateUpdate={handleHeartRateUpdate} onSaveHrSummary={handleSaveHrSummary} />
              </div>

              

              {/* Tabs + date wrapped in a single primary container */}
              

              <Tabs defaultValue="combined" className="w-full">
                {/* Date navigator for browsing logs by day */}
                <div className="mb-0">
                  <div className="bg-muted  rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center justify-center mb-3">
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                      <button
                        aria-label="Previous day"
                        className="p-1 rounded hover:bg-white/5"
                        onClick={() => {
                          if (selectedDate) setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));
                        }}
                      >
                        ◀
                      </button>
                      
                      <div className="text-sm font-medium px-2">
                        {selectedDate ? selectedDate.toLocaleDateString() : ''}
                      </div>
                      
                      <button
                        aria-label="Next day"
                        className="p-1 rounded hover:bg-white/5"
                        onClick={() => {
                          if (selectedDate) setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
                        }}
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="combined">Combined</TabsTrigger>
                      <TabsTrigger value="activities">Audio Log</TabsTrigger>
                      <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
                      <TabsTrigger value="hrtrends">HR Trends</TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <TabsContent value="combined">
                  <CombinedLog
                    activities={entries}
                    symptoms={symptoms}
                    onDeleteActivity={handleDeleteEntry}
                    onDeleteSymptom={handleDeleteSymptom}
                    hrSamples={hrSamples}
                    filterDate={selectedDate}
                  />
                </TabsContent>

                <TabsContent value="activities">
                    <ActivityLog entries={entries} onDeleteEntry={handleDeleteEntry} filterDate={selectedDate} />
                </TabsContent>

                <TabsContent value="symptoms" className="space-y-1">
                  <SymptomTracker onSymptomAdd={handleSymptomAdd} />
                  <SymptomLog symptoms={symptoms} onDeleteSymptom={handleDeleteSymptom} filterDate={selectedDate} />
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
        {/* Footer matching header color */}
        <footer className=" bg-primary text-primary-foreground px-6 py-4 rounded-t-3xl shadow-lg">
          <div className="max-w-[420px] mx-auto text-center text-sm">
            © {new Date().getFullYear()} Activity Tracker
          </div>
        </footer>
      </div>
      {/* end mobile-width container */}
    </div>
  );
}