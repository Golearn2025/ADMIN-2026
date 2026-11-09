/** Viewport lock — same pattern as Live Map / Bookings (no shell scroll). */
export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-y-0 left-0 right-0 top-16 z-0 flex flex-col overflow-hidden bg-background lg:left-64">
      {children}
    </div>
  );
}
