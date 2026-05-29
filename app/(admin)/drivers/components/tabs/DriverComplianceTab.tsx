"use client";

import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Car,
  User,
  Clock,
} from "lucide-react";
import type { Driver, DriverDocument, VehicleDocument } from "@/lib/features/drivers/drivers.types";
import {
  buildDriverComplianceRows,
  buildVehicleComplianceRows,
  getDriverComplianceBreakdown,
} from "@/lib/features/drivers/compliance.utils";
import { ComplianceDocumentList } from "../ComplianceDocumentList";

interface DriverComplianceTabProps {
  driver: Driver;
  driverDocuments: DriverDocument[];
  vehicleDocuments: VehicleDocument[];
  vehicles?: { id?: string; vehicle_id?: string; license_plate?: string; plate?: string }[];
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "green" | "red" | "orange";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-600"
      : tone === "red"
        ? "text-red-600"
        : tone === "orange"
          ? "text-orange-600"
          : "text-foreground";

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-3 text-center min-w-0">
      <dt className="text-xs text-muted-foreground leading-tight">{label}</dt>
      <dd className={`text-xl font-bold mt-1 ${valueClass}`}>{value}</dd>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6 flex flex-col items-center text-center sm:items-start sm:text-left">
      <div className="flex items-center justify-center gap-2 mb-3 w-full sm:justify-start">
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <h3 className="font-semibold text-sm md:text-base leading-snug">{title}</h3>
      </div>
      <div className="w-full flex flex-col items-center sm:items-start">{children}</div>
    </div>
  );
}

export function DriverComplianceTab({
  driver,
  driverDocuments,
  vehicleDocuments,
  vehicles = [],
}: DriverComplianceTabProps) {
  const breakdown = getDriverComplianceBreakdown(driver);
  const driverRows = buildDriverComplianceRows(
    driverDocuments,
    breakdown.driver.required
  );
  const vehicleRows = buildVehicleComplianceRows(
    vehicleDocuments,
    vehicles,
    breakdown.vehicle.perVehicle
  );

  const driverProgress =
    breakdown.driver.required > 0
      ? (breakdown.driver.approved / breakdown.driver.required) * 100
      : 0;
  const vehicleProgress =
    breakdown.vehicle.required > 0
      ? (breakdown.vehicle.approved / breakdown.vehicle.required) * 100
      : 0;

  const requirements = [
    { label: "Șofer activ", met: driver.is_active, icon: User },
    { label: "Șofer aprobat", met: driver.is_approved, icon: Shield },
    {
      label: "Are vehicul",
      met: driver.total_vehicles > 0,
      icon: Car,
      detail:
        driver.total_vehicles > 0
          ? `${driver.total_vehicles} vehicul${driver.total_vehicles > 1 ? "e" : ""}`
          : undefined,
    },
    {
      label: "Documente șofer complete",
      met: breakdown.driver.missing === 0 && breakdown.driver.expired === 0,
      icon: FileText,
      detail: `${breakdown.driver.approved}/${breakdown.driver.required} aprobate`,
    },
    {
      label: "Documente vehicul complete",
      met:
        driver.total_vehicles > 0 &&
        breakdown.vehicle.missing === 0 &&
        breakdown.vehicle.expired === 0,
      icon: Car,
      detail:
        driver.total_vehicles > 0
          ? `${breakdown.vehicle.approved}/${breakdown.vehicle.required} aprobate`
          : "Fără vehicul",
    },
    {
      label: "Fără documente expirate",
      met: breakdown.driver.expired + breakdown.vehicle.expired === 0,
      icon: Clock,
      detail:
        breakdown.driver.expired + breakdown.vehicle.expired > 0
          ? `${breakdown.driver.expired + breakdown.vehicle.expired} expirate`
          : undefined,
    },
  ];

  const issues: string[] = [];
  if (!driver.is_active) issues.push("Contul șoferului nu e activ");
  if (!driver.is_approved) issues.push("Șoferul nu e aprobat");
  if (driver.total_vehicles === 0) issues.push("Nu are vehicul înregistrat");
  if (breakdown.driver.missing > 0)
    issues.push(`${breakdown.driver.missing} document(e) șofer lipsă/neaprobate`);
  if (breakdown.vehicle.missing > 0)
    issues.push(`${breakdown.vehicle.missing} document(e) vehicul lipsă/neaprobate`);
  if (breakdown.driver.expired + breakdown.vehicle.expired > 0)
    issues.push(
      `${breakdown.driver.expired + breakdown.vehicle.expired} document(e) expirate`
    );

  const statusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge variant="success">Compliant</Badge>;
      case "expired":
        return <Badge variant="warning">Documente expirate</Badge>;
      case "missing":
        return <Badge variant="destructive">Documente lipsă</Badge>;
      case "no_vehicle":
        return <Badge variant="warning">Fără vehicul</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <SummaryCard icon={Shield} title="Status compliance">
          {statusBadge(driver.compliance_status)}
        </SummaryCard>
        <SummaryCard icon={CheckCircle} title="Poate primi curse">
          <Badge variant={driver.can_receive_jobs ? "success" : "destructive"}>
            {driver.can_receive_jobs ? "DA" : "NU"}
          </Badge>
        </SummaryCard>
        <SummaryCard icon={User} title="Status cont">
          <Badge variant={driver.is_active ? "success" : "secondary"}>
            {driver.is_active ? "Activ" : "Inactiv"}
          </Badge>
        </SummaryCard>
      </div>

      {/* Driver documents */}
      <section className="rounded-lg border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:text-left sm:gap-3">
          <FileText className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h3 className="text-lg font-semibold">Documente șofer</h3>
            <p className="text-sm text-muted-foreground">
              Obligatorii per șofer (identitate, permis, PCO, etc.)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell label="Necesare" value={breakdown.driver.required} />
          <StatCell label="Aprobate" value={breakdown.driver.approved} tone="green" />
          <StatCell label="Expirate" value={breakdown.driver.expired} tone="red" />
          <StatCell label="Lipsă" value={breakdown.driver.missing} tone="orange" />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Progres documente șofer</span>
            <span>{Math.round(driverProgress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, driverProgress)}%` }}
            />
          </div>
        </div>

        <ComplianceDocumentList
          rows={driverRows.rows}
          emptyMessage="Niciun document șofer încărcat"
        />
      </section>

      {/* Vehicle documents */}
      <section className="rounded-lg border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:text-left sm:gap-3">
          <Car className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h3 className="text-lg font-semibold">Documente vehicul</h3>
            <p className="text-sm text-muted-foreground">
              {breakdown.vehicle.perVehicle} obligatorii × {breakdown.vehicle.vehicles}{" "}
              vehicul(e) = {breakdown.vehicle.required} total
            </p>
          </div>
        </div>

        {driver.total_vehicles === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            Șoferul nu are vehicul — documentele de mașină nu se aplică.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCell label="Necesare" value={breakdown.vehicle.required} />
              <StatCell label="Aprobate" value={breakdown.vehicle.approved} tone="green" />
              <StatCell label="Expirate" value={breakdown.vehicle.expired} tone="red" />
              <StatCell label="Lipsă" value={breakdown.vehicle.missing} tone="orange" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progres documente vehicul</span>
                <span>{Math.round(vehicleProgress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, vehicleProgress)}%` }}
                />
              </div>
            </div>

            <ComplianceDocumentList
              rows={vehicleRows.rows}
              emptyMessage="Niciun document vehicul încărcat"
            />
          </>
        )}
      </section>

      {/* Checklist */}
      <section className="rounded-lg border border-border bg-card p-4 md:p-6">
        <h3 className="text-lg font-semibold text-center sm:text-left mb-4">
          Checklist compliance
        </h3>
        <ul className="space-y-2">
          {requirements.map((req, i) => {
            const Icon = req.icon;
            return (
              <li
                key={i}
                className={`flex flex-col gap-2 rounded-lg border-l-4 p-3 sm:flex-row sm:items-center sm:justify-between ${
                  req.met
                    ? "border-l-green-500 bg-green-500/5"
                    : "border-l-red-500 bg-red-500/5"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${req.met ? "text-green-500" : "text-red-500"}`}
                  />
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="text-sm font-medium leading-snug">{req.label}</p>
                    {req.detail ? (
                      <p className="text-xs text-muted-foreground">{req.detail}</p>
                    ) : null}
                  </div>
                </div>
                {req.met ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto sm:mx-0 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mx-auto sm:mx-0 shrink-0" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-4 border-t border-border flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold">Rezultat final</p>
            <p className="text-sm text-muted-foreground">
              Total: {breakdown.total.approved}/{breakdown.total.required} documente
              aprobate
            </p>
          </div>
          <Badge
            variant={driver.can_receive_jobs ? "success" : "destructive"}
            className="whitespace-normal text-center max-w-full"
          >
            {driver.can_receive_jobs ? "Poate primi curse" : "Nu poate primi curse"}
          </Badge>
        </div>
      </section>

      {issues.length > 0 && (
        <section className="rounded-lg border border-red-500/30 bg-card p-4 md:p-6">
          <div className="flex items-center justify-center gap-2 mb-4 sm:justify-start">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <h3 className="font-semibold">Probleme de rezolvat</h3>
          </div>
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li
                key={i}
                className="text-sm text-center sm:text-left py-2 px-3 rounded-md bg-red-500/5"
              >
                {issue}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
