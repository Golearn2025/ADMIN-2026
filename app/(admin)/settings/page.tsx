import Link from "next/link";
import {
  BellOff,
  MessageSquare,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LINKS = [
  {
    href: "/prices",
    title: "Organization billing",
    description: "Manage pricing, rates, and organization billing settings.",
    icon: Tag,
  },
  {
    href: "/team",
    title: "Team",
    description: "Invite members and manage roles and permissions.",
    icon: Users,
  },
  {
    href: "/communications/messages",
    title: "Communications",
    description: "Messages, notifications, and automation settings.",
    icon: MessageSquare,
  },
  {
    href: "/dispatch",
    title: "Job Dispatch",
    description: "Direct / Premium / Open wave rules and premium driver list.",
    icon: BellOff,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure application preferences and account settings"
      />

      <div className="space-y-4 px-3 sm:px-4 md:px-6 md:space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group block">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BellOff className="h-4 w-4 text-muted-foreground" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Mute and alert preferences are managed from the notification
                bell. Per-channel mute controls will move here later.
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4 text-muted-foreground" />
                More settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Account preferences and deeper org configuration will expand
                here. Use the links above for the most common tasks.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
