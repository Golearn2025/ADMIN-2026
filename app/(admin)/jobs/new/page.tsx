"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { WizardProgress } from "@/components/jobs/wizard-progress";
import { StepCustomer } from "@/components/jobs/step-customer";
import { StepTrip } from "@/components/jobs/step-trip";
import { StepVehicle } from "@/components/jobs/step-vehicle";
import { StepPrice } from "@/components/jobs/step-price";
import { StepConfirm } from "@/components/jobs/step-confirm";
import { useNewJob } from "@/hooks/use-new-job";
import { Button } from "@/components/ui/button";

export default function NewJobPage() {
  const {
    step, stepIndex, STEPS,
    goNext, goPrev, setStep,
    customer, setCustomer,
    trip, setTrip,
    vehicle, setVehicle,
    price, setPrice,
    quoteLoading, quoteError, fetchQuote,
    createLoading, createError, createJob,
    createdBooking,
    actionLoading, actionResult,
    markPaid, sendPaymentLink,
  } = useNewJob();

  const STEP_TITLES: Record<string, string> = {
    customer: "1. Client",
    trip: "2. Detalii cursă",
    vehicle: "3. Vehicul",
    price: "4. Preț",
    confirm: "5. Confirmare",
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Job nou"
        subtitle="Creează o rezervare manual din admin"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/jobs">
              <ArrowLeft className="w-4 h-4 mr-1" /> Înapoi la Jobs
            </Link>
          </Button>
        }
      />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Progress */}
        <WizardProgress
          steps={STEPS}
          currentStep={step}
          currentIndex={stepIndex}
          onStepClick={(s, i) => {
            if (i < stepIndex) setStep(s);
          }}
        />

        {/* Step card */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-1">
            <h2 className="text-base font-semibold text-foreground mb-4">{STEP_TITLES[step]}</h2>

            {step === "customer" && (
              <StepCustomer
                value={customer}
                onChange={setCustomer}
                onNext={goNext}
              />
            )}

            {step === "trip" && (
              <StepTrip
                value={trip}
                onChange={setTrip}
                onNext={goNext}
                onPrev={goPrev}
              />
            )}

            {step === "vehicle" && (
              <StepVehicle
                value={vehicle}
                onChange={setVehicle}
                onNext={() => {
                  goNext();
                  // Auto-fetch quote when entering price step
                  setTimeout(fetchQuote, 100);
                }}
                onPrev={goPrev}
              />
            )}

            {step === "price" && (
              <StepPrice
                value={price}
                onChange={setPrice}
                onFetchQuote={fetchQuote}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                onNext={goNext}
                onPrev={goPrev}
              />
            )}

            {step === "confirm" && (
              <StepConfirm
                customer={customer}
                trip={trip}
                vehicle={vehicle}
                price={price}
                createLoading={createLoading}
                createError={createError}
                createdBooking={createdBooking}
                actionLoading={actionLoading}
                actionResult={actionResult}
                onCreateJob={createJob}
                onMarkPaid={markPaid}
                onSendPaymentLink={sendPaymentLink}
                onPrev={goPrev}
              />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Admin · Vantage Lane · Booking creat cu source=admin
        </p>
      </div>
    </div>
  );
}
