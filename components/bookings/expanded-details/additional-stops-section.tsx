import { MapPin } from "lucide-react";

interface AdditionalStop {
  address: string;
  order?: number;
}

interface AdditionalStopsSectionProps {
  stops: AdditionalStop[] | null;
}

export function AdditionalStopsSection({ stops }: AdditionalStopsSectionProps) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-xs text-muted-foreground">Additional Stops</span>
      </div>
      {!stops || stops.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-1">
          {stops.map((stop, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                {stop.order || index + 1}
              </span>
              <span className="flex-1">{stop.address}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
