import { useEffect, useRef } from 'react';
import { Clock, Heart, AlertCircle, MessageSquare, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogEntry } from './activity-log';
import { SymptomEntry } from './symptom-log';

interface CombinedLogProps {
  activities: LogEntry[];
  symptoms: SymptomEntry[];
  onDeleteActivity: (id: string) => void;
  onDeleteSymptom: (id: string) => void;
  hrSamples?: { timestamp: string; bpm: number }[];
  filterDate?: Date | null;
}

type CombinedEntry = 
  | { type: 'activity'; data: LogEntry }
  | { type: 'symptom'; data: SymptomEntry };

export function CombinedLog({
  activities,
  symptoms,
  onDeleteActivity,
  onDeleteSymptom,
  hrSamples = [],
  filterDate,
}: CombinedLogProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const totalEntries = activities.length + symptoms.length;
  const shouldUseCarousel = totalEntries > 3;

  // Restore scroll position with backwards-compatibility and clamping
  useEffect(() => {
    if (!shouldUseCarousel || !scrollContainerRef.current) return;

    const legacyKeys = [
      'combinedLogScrollPos',
      'combinedLogScroll',
      'combinedScrollPos',
      'combinedScroll',
      'combined_log_scroll_pos',
      'combined_log_scroll'
    ];

    function parseSaved(val: string | null) {
      if (!val) return NaN;
      const cleaned = val.replace(/px$/i, '').trim();
      const n = parseInt(cleaned, 10);
      return isNaN(n) ? NaN : n;
    }

    let found: number | null = null;
    for (const k of legacyKeys) {
      try {
        const v = localStorage.getItem(k);
        const n = parseSaved(v);
        if (!isNaN(n)) {
          found = n;
          break;
        }
      } catch (e) {
        // ignore and continue
      }
    }

    if (found === null) return;

    requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const target = Math.min(Math.max(0, found as number), max);
      el.scrollTop = target;
    });
  }, [shouldUseCarousel]);

  // Save scroll position
  const handleScroll = () => {
    if (shouldUseCarousel && scrollContainerRef.current) {
      localStorage.setItem('combinedLogScrollPos', String(scrollContainerRef.current.scrollTop));
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }); 
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return 'bg-green-500';
    if (severity <= 3) return 'bg-yellow-500';
    if (severity <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Combine and sort all entries by timestamp
  function sameDay(a: Date, b?: Date | null) {
    if (!b) return true;
    const da = new Date(a);
    return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate();
  }

  const filteredActivities = filterDate ? activities.filter(a => sameDay(a.timestamp, filterDate)) : activities;
  const filteredSymptoms = filterDate ? symptoms.filter(s => sameDay(s.timestamp, filterDate)) : symptoms;

  const combinedEntries: CombinedEntry[] = [
    ...filteredActivities.map((a): CombinedEntry => ({ type: 'activity', data: a })),
    ...filteredSymptoms.map((s): CombinedEntry => ({ type: 'symptom', data: s })),
  ].sort((a, b) => {
    const timeA = new Date(a.data.timestamp).getTime();
    const timeB = new Date(b.data.timestamp).getTime();
    return timeB - timeA;
  });

  // Group entries by date
  const groupedByDate = combinedEntries.reduce((acc, entry) => {
    const date = formatDate(entry.data.timestamp);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, CombinedEntry[]>);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Combined Timeline</CardTitle>
      </CardHeader>
      <CardContent className={shouldUseCarousel ? "flex-1 min-h-0 overflow-hidden" : ""}>
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={shouldUseCarousel ? "h-96 overflow-y-auto pr-2 space-y-3" : "space-y-3"}
        >
          {Object.keys(groupedByDate).length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No entries yet. Start logging activities and symptoms.
            </div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => (
              <div key={date} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground px-1">
                  {date}
                </h3>
                {entries.map((entry) => {
                  if (entry.type === 'activity') {
                    return (
                      <ActivityItem
                        key={(entry.data as LogEntry).id}
                        activity={entry.data as LogEntry}
                        onDelete={onDeleteActivity}
                        formatTime={formatTime}
                      />
                    );
                  }
                  if (entry.type === 'symptom') {
                    return (
                      <SymptomItem
                        key={(entry.data as SymptomEntry).id}
                        symptom={entry.data as SymptomEntry}
                        onDelete={onDeleteSymptom}
                        formatTime={formatTime}
                        getSeverityColor={getSeverityColor}
                      />
                    );
                  }
                })}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  activity,
  onDelete,
  formatTime,
}: {
  activity: LogEntry;
  onDelete: (id: string) => void;
  formatTime: (date: Date) => string;
}) {
  return (
    <div className="border rounded-xl p-3 space-y-2 bg-blue-50/50 border-blue-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Audio</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(activity.timestamp)}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{activity.text}</p>
          {activity.heartRate && (
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium">{activity.heartRate} BPM</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(activity.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function SymptomItem({
  symptom,
  onDelete,
  formatTime,
  getSeverityColor,
}: {
  symptom: SymptomEntry;
  onDelete: (id: string) => void;
  formatTime: (date: Date) => string;
  getSeverityColor: (severity: number) => string;
}) {
  return (
    <div className="border rounded-xl p-3 space-y-2 bg-red-50/50 border-red-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-600">Symptom</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(symptom.timestamp)}
            </span>
          </div>
          <p className="text-sm font-medium">{symptom.symptom}</p>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-5 h-2 rounded-full ${
                  i < symptom.severity ? getSeverityColor(symptom.severity) : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(symptom.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
