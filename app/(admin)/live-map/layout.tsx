export default function LiveMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-y-0 right-0 top-16 z-10 left-0 lg:left-64">
      {children}
    </div>
  );
}
