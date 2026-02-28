import { normalizeServices } from "@/lib/utils/normalizeServices";
import { Check, DollarSign, Star } from "lucide-react";

interface ServicesSectionProps {
  includedServices: string[];
  paidUpgrades: Record<string, unknown>;
  premiumFeatures: Record<string, unknown>;
}

export function IncludedServicesSection({ services }: { services: string[] }) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Check className="w-3.5 h-3.5 text-green-500" />
        <span className="font-medium text-xs text-muted-foreground">Included Services</span>
      </div>
      {!services || services.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-1">
          {services.map(s => (
            <div key={s} className="flex items-center gap-1.5 text-xs">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaidUpgradesSection({ upgrades }: { upgrades: Record<string, unknown> }) {
  const paid = normalizeServices(upgrades, {
    labelMap: {
      securityEscort: "Security escort",
      champagne: "Champagne",
      flowers: "Flowers",
      meetAndGreet: "Meet & greet",
      childSeat: "Child seat",
    },
  });

  const totalCost = paid.reduce((sum, item) => {
    const value = typeof item.rawValue === 'number' ? item.rawValue : 0;
    return sum + value;
  }, 0);

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-xs text-muted-foreground">Paid Upgrades</span>
        </div>
        {totalCost > 0 && (
          <span className="text-xs font-semibold text-primary">£{(totalCost / 100).toFixed(2)}</span>
        )}
      </div>
      {paid.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-1">
          {paid.map(item => (
            <div key={item.key} className="flex items-center justify-between text-xs">
              <span>{item.label}</span>
              {typeof item.rawValue === 'number' && item.rawValue > 0 ? (
                <span className="font-medium">£{(item.rawValue / 100).toFixed(2)}</span>
              ) : (
                <Check className="w-3 h-3 text-green-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PremiumFeaturesSection({ features }: { features: Record<string, unknown> }) {
  const premium = normalizeServices(features, {
    labelMap: {
      comfortRideMode: "Comfort ride mode",
      frontSeatRequest: "Front seat request",
      paparazziSafeMode: "Paparazzi safe mode",
      personalLuggagePrivacy: "Personal luggage privacy",
    },
  });

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Star className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium text-xs text-muted-foreground">Premium Features</span>
      </div>
      {premium.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-1">
          {premium.map(s => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs">
              <div className="w-1 h-1 rounded-full bg-amber-500" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ServicesSection({ includedServices, paidUpgrades, premiumFeatures }: ServicesSectionProps) {
  return null;
}
