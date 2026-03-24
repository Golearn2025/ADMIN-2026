import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, CreditCard, XCircle } from "lucide-react";

interface Payment {
  attempt_no: number;
  status: "pending" | "succeeded" | "failed";
  amount_pence: number;
  currency: string;
  stripe_payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
}

interface PaymentsHistorySectionProps {
  payments: Payment[];
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAmount(amountPence: number, currency: string) {
  const amount = amountPence / 100;
  const symbol = currency === "gbp" ? "£" : currency === "eur" ? "€" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export function PaymentsHistorySection({ payments }: PaymentsHistorySectionProps) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium text-xs text-muted-foreground">Payment History</span>
      </div>
      {!payments || payments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No payment attempts</p>
      ) : (
        <div className="space-y-1.5">
          {payments.map((payment) => (
            <div key={`${payment.attempt_no}-${payment.created_at}`} className="flex items-center justify-between text-xs py-1 px-2 bg-muted/20 rounded">
              <div className="flex items-center gap-2">
                {payment.status === "succeeded" ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : payment.status === "pending" ? (
                  <Clock className="w-3 h-3 text-yellow-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className="font-medium">#{payment.attempt_no}</span>
                <span className="text-muted-foreground">{formatDate(payment.paid_at || payment.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatAmount(payment.amount_pence, payment.currency)}</span>
                <Badge
                  variant={
                    payment.status === "succeeded" ? "default" :
                    payment.status === "pending" ? "secondary" :
                    "destructive"
                  }
                  className="text-[10px] py-0 h-4"
                >
                  {payment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
