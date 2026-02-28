import { Clock, Heart, AlertCircle, MessageSquare, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogEntry } from './activity-log';
import { SymptomEntry } from './symptom-log';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface CombinedLogProps {
  activities: LogEntry[];
  symptoms: SymptomEntry[];
  onDeleteActivity: (id: string) => void;
  onDeleteSymptom: (id: string) => void;
  onEditActivity: (id: string, newText: string) => void;
}

type CombinedEntry = 
  | { type: 'activity'; data: LogEntry }
  | { type: 'symptom'; data: SymptomEntry };

export function CombinedLog({
  activities,
  symptoms,
  onDeleteActivity,
  onDeleteSymptom,
  onEditActivity,
}: CombinedLogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleEditClick = (activity: LogEntry) => {
    setEditingId(activity.id);
    setEditText(activity.text);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editingId) {
      onEditActivity(editingId, editText.trim());
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
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return 'bg-green-500';
    if (severity <= 3) return 'bg-yellow-500';
    if (severity <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Combine and sort all entries by timestamp
  const combinedEntries: CombinedEntry[] = [
    ...activities.map((a): CombinedEntry => ({ type: 'activity', data: a })),
    ...symptoms.map((s): CombinedEntry => ({ type: 'symptom', data: s })),
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
      <CardContent>
        {/* NAV/TABS removed — render combined entries directly */}
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
              {entries.map((entry) =>
                entry.type === 'activity' ? (
                  <ActivityItem
                    key={entry.data.id}
                    activity={entry.data as LogEntry}
                    onDelete={onDeleteActivity}
                    onEditClick={handleEditClick}
                    formatTime={formatTime}
                  />
                ) : (
                  <SymptomItem
                    key={entry.data.id}
                    symptom={entry.data as SymptomEntry}
                    onDelete={onDeleteSymptom}
                    formatTime={formatTime}
                    getSeverityColor={getSeverityColor}
                  />
                )
              )}
            </div>
          ))
        )}
      </CardContent>

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
    </Card>
  );
}

function ActivityItem({
  activity,
  onDelete,
  onEditClick,
  formatTime,
}: {
  activity: LogEntry;
  onDelete: (id: string) => void;
  onEditClick: (activity: LogEntry) => void;
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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditClick(activity)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
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
