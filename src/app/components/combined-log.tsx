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
}

type CombinedEntry = 
  | { type: 'activity'; data: LogEntry }
  | { type: 'symptom'; data: SymptomEntry }
  | { type: 'hr'; data: { timestamp: string; avg: number; high: number; low: number } };
 
export function CombinedLog({
  activities,
  symptoms,
  onDeleteActivity,
  onDeleteSymptom,
  hrSamples = [],
}: CombinedLogProps) {
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
  // create hr buckets (30-minute) and produce hr summary entries
  const hrBuckets: Record<string, { timestamp: string; avg: number; high: number; low: number }[]> = {};
  (hrSamples || []).forEach(s => {
    const dt = new Date(s.timestamp);
    const mins = dt.getMinutes();
    const flooredMin = mins < 30 ? 0 : 30;
    const bucketDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), flooredMin, 0, 0);
    const bucketKey = bucketDate.toISOString();
    hrBuckets[bucketKey] = hrBuckets[bucketKey] || [];
    hrBuckets[bucketKey].push({ timestamp: bucketKey, avg: s.bpm, high: s.bpm, low: s.bpm });
  });

  // collapse per-bucket samples into avg/high/low
  const hrSummaryEntries: { timestamp: string; avg: number; high: number; low: number }[] = Object.keys(hrBuckets).map(k => {
    const arr = hrBuckets[k].map(x => x.avg);
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const high = Math.max(...arr);
    const low = Math.min(...arr);
    return { timestamp: k, avg, high, low };
  });

  const combinedEntries: CombinedEntry[] = [
    ...activities.map((a): CombinedEntry => ({ type: 'activity', data: a })),
    ...symptoms.map((s): CombinedEntry => ({ type: 'symptom', data: s })),
    // insert hr summaries as entries
    ...hrSummaryEntries.map(h => ({ type: 'hr', data: h })),
  ].sort((a, b) => {
    const tA = new Date(a.data.timestamp).getTime();
    const tB = new Date(b.data.timestamp).getTime();
    // chronological order (oldest first)
    return tA - tB;
  });
 
   // Group entries by date
   const groupedByDate = combinedEntries.reduce((acc, entry) => {
     const date = formatDate(entry.data.timestamp);
     if (!acc[date]) acc[date] = [];
     acc[date].push(entry);
     return acc;
   }, {} as Record<string, CombinedEntry[]>);
 
   return (
     <Card className="flex flex-col">
       <CardHeader className="pb-3">
         <CardTitle className="text-lg">Combined Timeline</CardTitle>
       </CardHeader>
       <CardContent>
         {/* render combined entries (activities, symptoms, and HR summaries) in chronological order */}
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
                 // hr summary
                 return (
                   <div key={(entry.data as any).timestamp} className="rounded-md border p-2 bg-muted/30">
                     <div className="flex items-center justify-between text-sm">
                       <div className="text-xs text-muted-foreground">
                         {new Date((entry.data as any).timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                       </div>
                       <div className="flex gap-4">
                         <div className="text-xs">Avg: <span className="font-medium">{(entry.data as any).avg}</span></div>
                         <div className="text-xs">High: <span className="font-medium text-destructive">{(entry.data as any).high}</span></div>
                         <div className="text-xs">Low: <span className="font-medium text-success">{(entry.data as any).low}</span></div>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           ))
         )}
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
