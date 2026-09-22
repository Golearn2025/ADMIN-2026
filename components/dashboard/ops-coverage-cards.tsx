import { CheckCircle2, Inbox, UserCheck, UserMinus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

interface OpsCoverageCardsProps {
  title?: string;
  incoming: number;
  incomingValue: string;
  completed: number;
  inProgress: number;
  unassigned: number;
  loading?: boolean;
}

export function OpsCoverageCards({
  title = "Jobs board",
  incoming,
  incomingValue,
  completed,
  inProgress,
  unassigned,
  loading,
}: OpsCoverageCardsProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Incoming = completed + in progress + unassigned for the selected trip dates
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Incoming"
          value={incoming}
          subtitle={incomingValue}
          icon={Inbox}
          loading={loading}
        />
        <StatCard
          title="Completed"
          value={completed}
          subtitle="Finished"
          icon={CheckCircle2}
          loading={loading}
        />
        <StatCard
          title="In progress"
          value={inProgress}
          subtitle="Driver accepted"
          icon={UserCheck}
          loading={loading}
        />
        <StatCard
          title="Unassigned"
          value={unassigned}
          subtitle="Need a driver"
          icon={UserMinus}
          loading={loading}
        />
      </div>
    </div>
  );
}
