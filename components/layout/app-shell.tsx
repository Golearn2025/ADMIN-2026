import { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  topbar?: ReactNode;
  sidebar?: ReactNode;
}

export function AppShell({ children, topbar, sidebar }: AppShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {sidebar && (
        <aside className="hidden shrink-0 border-r border-border lg:flex">
          {sidebar}
        </aside>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        {topbar && (
          <header className="flex-shrink-0 border-b border-border">
            {topbar}
          </header>
        )}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
