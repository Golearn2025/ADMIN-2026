/**
 * Drivers — layout full-height în zona de conținut (fără scroll dublu pe mobil).
 */
export default function DriversLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden md:h-full">
      {children}
    </div>
  );
}
