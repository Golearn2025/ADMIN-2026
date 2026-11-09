/**
 * Bookings — same viewport lock as Live Map: out of <main> document scroll,
 * so the shell/sidebar never move; only the table body scrolls.
 */
export default function BookingsLayout({
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
