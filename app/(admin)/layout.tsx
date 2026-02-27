import { AppShell, Sidebar, Topbar } from "@/components/layout";
import { getUserRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hasAccess } = await getUserRole();

  if (!hasAccess) {
    redirect("/access-denied");
  }

  return (
    <AppShell sidebar={<Sidebar />} topbar={<Topbar />}>
      {children}
    </AppShell>
  );
}
