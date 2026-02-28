import { AlertCircle, FileText } from "lucide-react";

interface NotesSectionProps {
  internalNotes?: string | null;
  customRequirements?: string | null;
}

export function NotesSection({ internalNotes, customRequirements }: NotesSectionProps) {
  const hasNotes = internalNotes || customRequirements;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-xs text-muted-foreground">Notes & Requirements</span>
      </div>
      {!hasNotes ? (
        <p className="text-xs text-muted-foreground italic">No notes</p>
      ) : (
        <div className="space-y-2">
          {customRequirements && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] text-orange-600 font-medium uppercase">Customer</span>
              </div>
              <p className="text-xs bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200 dark:border-orange-900">
                {customRequirements}
              </p>
            </div>
          )}
          {internalNotes && (
            <div>
              <span className="text-[10px] text-muted-foreground uppercase mb-1 block">Internal</span>
              <p className="text-xs bg-muted/30 p-2 rounded">
                {internalNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
