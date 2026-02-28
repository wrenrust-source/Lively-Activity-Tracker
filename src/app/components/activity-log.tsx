import { Clock, Heart, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

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
  onEditEntry: (id: string, newText: string) => void;
}

export function ActivityLog({ entries, onDeleteEntry, onEditEntry }: ActivityLogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleEditClick = (entry: LogEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editingId) {
      onEditEntry(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
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

  const getHeartRateStatus = (bpm?: number) => {
    if (!bpm) return null;
    if (bpm < 60) return { label: 'Low', variant: 'secondary' as const };
    if (bpm < 80) return { label: 'Normal', variant: 'default' as const };
    if (bpm < 100) return { label: 'Elevated', variant: 'default' as const };
    return { label: 'High', variant: 'destructive' as const };
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No entries yet. Tap the button below to start recording.
            </div>
          ) : (
            <>
              {entries.slice(0, 5).map((entry) => {
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(entry)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
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
                  </div>
                );
              })}
              {entries.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Showing 5 of {entries.length} entries
                </p>
              )}
            </>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editingId !== null} onOpenChange={(open) => {
          if (!open) handleCancelEdit();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Entry</DialogTitle>
              <DialogDescription>
                Update the transcript for this audio entry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[120px]"
                placeholder="Edit your entry text..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}