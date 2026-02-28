import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

interface SymptomTrackerProps {
  onSymptomAdd: (symptom: string, severity: number, timestamp: Date) => void;
}

const commonSymptoms = [
  'Headache',
  'Fatigue',
  'Nausea',
  'Dizziness',
  'Pain',
  'Anxiety',
  'Stress',
  'Insomnia',
];

export function SymptomTracker({ onSymptomAdd }: SymptomTrackerProps) {
  const [customSymptom, setCustomSymptom] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState(1);

  const handleQuickAdd = (symptom: string) => {
    onSymptomAdd(symptom, selectedSeverity, new Date());
    toast.success(`${symptom} logged`);
  };

  const handleCustomAdd = () => {
    if (customSymptom.trim()) {
      onSymptomAdd(customSymptom.trim(), selectedSeverity, new Date());
      toast.success(`${customSymptom} logged`);
      setCustomSymptom('');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Log Symptom</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Selector */}
        <div>
          <label className="text-sm mb-2 block">Severity</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedSeverity(level)}
                className={`flex-1 h-10 rounded-lg border-2 transition-all ${
                  selectedSeverity === level
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            1 = Mild, 5 = Severe
          </p>
        </div>

        {/* Quick Add Symptoms */}
        <div>
          <label className="text-sm mb-2 block">Quick Add</label>
          <div className="flex flex-wrap gap-2">
            {commonSymptoms.map((symptom) => (
              <Badge
                key={symptom}
                variant="outline"
                className="cursor-pointer hover:bg-accent active:scale-95 transition-transform px-3 py-1.5"
                onClick={() => handleQuickAdd(symptom)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {symptom}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom Symptom */}
        <div>
          <label className="text-sm mb-2 block">Custom Symptom</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter symptom..."
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleCustomAdd}
              disabled={!customSymptom.trim()}
              className="px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
