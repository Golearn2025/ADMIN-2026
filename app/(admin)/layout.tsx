import { AppShell, Sidebar, Topbar } from "@/components/layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell topbar={<Topbar />} sidebar={<Sidebar />}>
      {children}
    </AppShell>
  );
}
