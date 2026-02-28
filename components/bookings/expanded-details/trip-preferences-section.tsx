import { MessageSquare, Music, Thermometer } from "lucide-react";

interface TripPreferencesSectionProps {
  preferences: {
    music?: string;
    temperature?: string;
    communication?: string;
  } | null;
}

export function TripPreferencesSection({ preferences }: TripPreferencesSectionProps) {
  const items = [
    preferences?.music && { icon: Music, label: "Music", value: preferences.music },
    preferences?.temperature && { icon: Thermometer, label: "Temp", value: preferences.temperature },
    preferences?.communication && { icon: MessageSquare, label: "Comm", value: preferences.communication },
  ].filter(Boolean);

  return (
    <div className="text-sm">
      <p className="font-medium text-xs text-muted-foreground mb-2">Trip Preferences</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="flex flex-wrap gap-3 text-xs">
          {items.map((item: any) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <item.icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
