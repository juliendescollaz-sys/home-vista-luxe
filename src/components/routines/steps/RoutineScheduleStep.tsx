import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoutineWizardDraft, RoutineFrequency, DAYS_OF_WEEK, MONTHS } from "@/types/routines";
import { Calendar, Clock, CalendarDays, CalendarClock, Repeat } from "lucide-react";

interface RoutineScheduleStepProps {
  draft: RoutineWizardDraft;
  onUpdate: (updates: Partial<RoutineWizardDraft>) => void;
}

export function RoutineScheduleStep({ draft, onUpdate }: RoutineScheduleStepProps) {
  const { schedule } = draft;

  const updateSchedule = (updates: Partial<typeof schedule>) => {
    onUpdate({ schedule: { ...schedule, ...updates } });
  };

  const toggleDayOfWeek = (day: number) => {
    const currentDays = schedule.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    updateSchedule({ daysOfWeek: newDays });
  };

  const frequencyOptions: { value: RoutineFrequency; label: string; icon: React.ReactNode }[] = [
    { value: "once", label: "Une seule fois", icon: <Calendar className="h-4 w-4" /> },
    { value: "daily", label: "Quotidien", icon: <CalendarDays className="h-4 w-4" /> },
    { value: "weekly", label: "Hebdomadaire", icon: <Repeat className="h-4 w-4" /> },
    { value: "monthly", label: "Mensuel", icon: <CalendarClock className="h-4 w-4" /> },
    { value: "yearly", label: "Annuel", icon: <Calendar className="h-4 w-4" /> },
  ];

  // Generate day of month options
  const daysOfMonth = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Frequency selection */}
      <div className="space-y-3">
        <Label>Fréquence</Label>
        <RadioGroup
          value={schedule.frequency}
          onValueChange={(value: RoutineFrequency) => updateSchedule({ frequency: value })}
          className="grid grid-cols-2 gap-2"
        >
          {frequencyOptions.map((option) => (
            <label
              key={option.value}
              htmlFor={`freq-${option.value}`}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                schedule.frequency === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} id={`freq-${option.value}`} />
              {option.icon}
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Frequency-specific options */}
      {schedule.frequency === "once" && (
        <div className="space-y-3">
          <Label>Date</Label>
          <Input
            type="date"
            value={schedule.date || ""}
            onChange={(e) => updateSchedule({ date: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
      )}

      {schedule.frequency === "daily" && (
        <div className="space-y-3">
          <Label>Jours de la semaine</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <label
                key={day.value}
                className={`flex items-center justify-center w-12 h-10 rounded-lg border cursor-pointer transition-colors ${
                  (schedule.daysOfWeek || []).includes(day.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={(schedule.daysOfWeek || []).includes(day.value)}
                  onCheckedChange={() => toggleDayOfWeek(day.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{day.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {schedule.frequency === "weekly" && (
        <div className="space-y-3">
          <Label>Jour de la semaine</Label>
          <Select
            value={String(schedule.dayOfWeek ?? 1)}
            onValueChange={(v) => updateSchedule({ dayOfWeek: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value} value={String(day.value)}>
                  {day.fullLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {schedule.frequency === "monthly" && (
        <div className="space-y-3">
          <Label>Jour du mois</Label>
          <Select
            value={String(schedule.dayOfMonth ?? 1)}
            onValueChange={(v) => updateSchedule({ dayOfMonth: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {daysOfMonth.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {schedule.frequency === "yearly" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label>Mois</Label>
            <Select
              value={String(schedule.month ?? 1)}
              onValueChange={(v) => updateSchedule({ month: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Jour</Label>
            <Select
              value={String(schedule.dayOfMonthYearly ?? 1)}
              onValueChange={(v) => updateSchedule({ dayOfMonthYearly: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daysOfMonth.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Time selection (always shown) */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Heure
        </Label>
        <Input
          type="time"
          value={schedule.time}
          onChange={(e) => updateSchedule({ time: e.target.value })}
        />
      </div>

      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Conseil :</span> L'heure est basée sur le fuseau horaire 
          configuré dans Home Assistant.
        </p>
      </div>
    </div>
  );
}
