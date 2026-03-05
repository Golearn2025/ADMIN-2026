import { Check, DollarSign, Star } from "lucide-react";

/**
 * Convert camelCase to Human Readable
 */
function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Normalize any value to array - handles both arrays and objects
 */
function normalizeList(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    // Extract keys where value is truthy (for {luxury: true, comfort: true} → ['luxury', 'comfort'])
    return Object.entries(value)
      .filter(([_, val]) => val === true || (typeof val === "string" && val.trim().length > 0) || (typeof val === "number" && val > 0))
      .map(([key, val]) => {
        // If value is just true, return the key name
        if (val === true) return key;
        // Otherwise return the full entry
        return { key, value: val };
      });
  }
  return [];
}

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

export function PaidUpgradesSection({ upgrades }: { upgrades: any }) {
  const upgradesList = normalizeList(upgrades);

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-xs text-muted-foreground">Paid Upgrades</span>
        </div>
      </div>
      {upgradesList.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-1">
          {upgradesList.map((item: any, i: number) => {
            const displayText = typeof item === "string"
              ? humanize(item)
              : item?.label ?? humanize(item?.key ?? JSON.stringify(item));

            return (
              <div key={`${typeof item === "string" ? item : item?.key ?? "upgrade"}-${i}`} className="flex items-center gap-1.5 text-xs">
                <Check className="w-3 h-3 text-primary" />
                <span>{displayText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PremiumFeaturesSection({ features }: { features: any }) {
  const featuresList = normalizeList(features);

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Star className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium text-xs text-muted-foreground">Premium Features</span>
      </div>
      {featuresList.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None</p>
      ) : (
        <div className="space-y-1">
          {featuresList.map((item: any, i: number) => {
            const displayText = typeof item === "string"
              ? humanize(item)
              : item?.label ?? humanize(item?.key ?? JSON.stringify(item));

            return (
              <div key={`${typeof item === "string" ? item : item?.key ?? "feature"}-${i}`} className="flex items-center gap-1.5 text-xs">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                <span>{displayText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ServicesSection({ includedServices, paidUpgrades, premiumFeatures }: ServicesSectionProps) {
  return null;
}
