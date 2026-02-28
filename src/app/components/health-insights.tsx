import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, TrendingUp, Calendar } from 'lucide-react';
import { LogEntry } from './activity-log';
import { SymptomEntry } from './symptom-log';

interface HealthInsightsProps {
  entries: LogEntry[];
  symptoms?: SymptomEntry[];
}

export function HealthInsights({ entries, symptoms = [] }: HealthInsightsProps) {
  const todayEntries = entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  const todaySymptoms = symptoms.filter(symptom => {
    const symptomDate = new Date(symptom.timestamp);
    const today = new Date();
    return symptomDate.toDateString() === today.toDateString();
  });

  const totalToday = todayEntries.length + todaySymptoms.length;

  const avgHeartRate = entries
    .filter(e => e.heartRate)
    .reduce((acc, e) => acc + (e.heartRate || 0), 0) / 
    (entries.filter(e => e.heartRate).length || 1);

  const totalEntries = entries.length + symptoms.length;

  return (
    <div className="grid gap-3 grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
          <CardTitle className="text-xs font-medium">Today</CardTitle>
          <Calendar className="w-3 h-3 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xl font-bold">{totalToday}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totalEntries} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
          <CardTitle className="text-xs font-medium">Avg HR</CardTitle>
          <Activity className="w-3 h-3 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xl font-bold">
            {entries.filter(e => e.heartRate).length > 0 
              ? Math.round(avgHeartRate) 
              : '—'}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">BPM avg</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
          <CardTitle className="text-xs font-medium">Status</CardTitle>
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xl font-bold">✓</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {entries.filter(e => e.heartRate).length} HR
          </p>
        </CardContent>
      </Card>
    </div>
  );
}