"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AuthUserInfo = {
  email: string;
  name: string;
};

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata || {};
  const candidates = [
    meta.full_name,
    meta.name,
    meta.display_name,
    [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim(),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const email = user.email || "";
  return email.includes("@") ? email.split("@")[0]! : email || "Admin";
}

export function UserMenu() {
  const [info, setInfo] = useState<AuthUserInfo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      setInfo({
        email: data.user.email || "—",
        name: displayNameFromUser(data.user),
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-muted"
          aria-label="Account menu"
        >
          <User className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <div className="truncate text-sm font-medium text-foreground">
            {info?.name || "Loading…"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {info?.email || ""}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/sign-out" className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
