import { Plane } from "lucide-react";

interface FlightInfoSectionProps {
  pickupFlightNumber?: string | null;
  returnFlightNumber?: string | null;
}

export function FlightInfoSection({ pickupFlightNumber, returnFlightNumber }: FlightInfoSectionProps) {
  const hasFlightInfo = pickupFlightNumber || returnFlightNumber;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Plane className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-xs text-muted-foreground">Flight Info</span>
      </div>
      {!hasFlightInfo ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="flex flex-wrap gap-3 text-xs">
          {pickupFlightNumber && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Pickup:</span>
              <span className="font-mono font-medium">{pickupFlightNumber}</span>
            </div>
          )}
          {returnFlightNumber && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Return:</span>
              <span className="font-mono font-medium">{returnFlightNumber}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
