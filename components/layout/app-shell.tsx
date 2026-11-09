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
        {/*
          overflow-y-auto: content pages (Automations, etc.) scroll here.
          Full-viewport pages must use h-full/flex-1/min-h-0/overflow-hidden
          and nested scroll — never h-[100dvh-…] (double-counts topbar → black void).
        */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
