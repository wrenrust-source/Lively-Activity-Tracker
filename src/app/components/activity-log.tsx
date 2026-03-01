import { Clock, Heart, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface LogEntry {
  id: string;
  timestamp: Date;
  text: string;
  heartRate?: number;
  audioId?: string;
}

interface ActivityLogProps {
  entries: LogEntry[];
  onDeleteEntry: (id: string) => void;
}

export function ActivityLog({ entries, onDeleteEntry }: ActivityLogProps) {
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

  const getHeartRateStatus = (bpm?: number) => {
    if (!bpm) return null;
    if (bpm < 60) return { label: 'Low', variant: 'secondary' as const };
    if (bpm < 80) return { label: 'Normal', variant: 'default' as const };
    if (bpm < 100) return { label: 'Elevated', variant: 'default' as const };
    return { label: 'High', variant: 'destructive' as const };
  };

  const shouldUseCarousel = entries.length > 3;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No entries yet. Tap the button below to start recording.
          </div>
        ) : (
          <div className={shouldUseCarousel ? "max-h-96 overflow-y-auto pr-2 space-y-3" : "space-y-3"}>
            {entries.map((entry) => {
              const hrStatus = getHeartRateStatus(entry.heartRate);
              return (
                <div
                  key={entry.id}
                  className="border rounded-xl p-3 space-y-2 active:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(entry.timestamp)}</span>
                        <span>•</span>
                        <span>{formatTime(entry.timestamp)}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{entry.text}</p>
                      {entry.heartRate && (
                        <div className="flex items-center gap-2">
                          <Heart className="w-3 h-3 text-red-500" />
                          <span className="text-xs font-medium">
                            {entry.heartRate} BPM
                          </span>
                          {hrStatus && (
                            <Badge variant={hrStatus.variant} className="text-xs px-1.5 py-0">
                              {hrStatus.label}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteEntry(entry.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}