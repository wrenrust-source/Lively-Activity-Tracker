import { useEffect, useRef } from 'react';
import { Clock, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface SymptomEntry {
  id: string;
  timestamp: Date;
  symptom: string;
  severity: number;
}

interface SymptomLogProps {
  symptoms: SymptomEntry[];
  onDeleteSymptom: (id: string) => void;
}

export function SymptomLog({ symptoms, onDeleteSymptom }: SymptomLogProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldUseCarousel = symptoms.length > 3;

  // Restore scroll position with backwards-compatibility and clamping
  useEffect(() => {
    if (!shouldUseCarousel || !scrollContainerRef.current) return;

    const legacyKeys = [
      'symptomLogScrollPos',
      'symptomLogScroll',
      'symptomScrollPos',
      'symptomScroll',
      'symptom_scroll_pos',
      'symptom_scroll'
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
      localStorage.setItem('symptomLogScrollPos', String(scrollContainerRef.current.scrollTop));
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
      year: 'numeric',
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return 'bg-green-500';
    if (severity <= 3) return 'bg-yellow-500';
    if (severity <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 2) return 'Mild';
    if (severity <= 3) return 'Moderate';
    if (severity <= 4) return 'Significant';
    return 'Severe';
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Symptom Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {symptoms.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No symptoms logged yet.
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={shouldUseCarousel ? "h-96 overflow-y-auto pr-2 space-y-3" : "space-y-3"}
          >
            {symptoms.map((symptom) => (
              <div
                key={symptom.id}
                className="border rounded-xl p-3 space-y-2 active:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(symptom.timestamp)}</span>
                      <span>•</span>
                      <span>{formatTime(symptom.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{symptom.symptom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-5 h-2 rounded-full ${
                              i < symptom.severity
                                ? getSeverityColor(symptom.severity)
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {getSeverityLabel(symptom.severity)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSymptom(symptom.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
