"use client";

import { useState, useRef } from "react";
import { User, CheckCircle, XCircle, AlertTriangle, Eye, Upload, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProfilePhotoCardProps {
  driverId: string;
  photoUrl: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onPhotoChange?: () => void;
  isProcessing?: boolean;
}

export function ProfilePhotoCard({
  driverId,
  photoUrl,
  status,
  reviewedBy,
  reviewedAt,
  rejectionReason,
  onApprove,
  onReject,
  onPhotoChange,
  isProcessing = false,
}: ProfilePhotoCardProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(rejectReason);
      setShowRejectInput(false);
      setRejectReason("");
    } catch (error) {
      console.error("Failed to reject profile photo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`/api/admin/drivers/${driverId}/profile-photo/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      // Refresh parent component
      if (onPhotoChange) {
        onPhotoChange();
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start gap-6">
        {/* Photo Preview */}
        <div className="flex-shrink-0">
          <div className="relative h-32 w-32 rounded-lg overflow-hidden border-2 border-border bg-muted">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          {photoUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => window.open(photoUrl, "_blank")}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Full
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isProcessing}
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1" />
                {photoUrl ? "Replace Photo" : "Upload Photo"}
              </>
            )}
          </Button>
        </div>

        {/* Info & Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Profile Photo
              </h3>
              <p className="text-sm text-muted-foreground">
                Driver's profile picture for identification
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Review Info */}
          {reviewedBy && reviewedAt && (
            <div className="text-xs text-muted-foreground mb-4">
              Reviewed by {reviewedBy} on{" "}
              {new Date(reviewedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}

          {/* Rejection Reason */}
          {status === "rejected" && rejectionReason && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 mb-4">
              <p className="text-sm text-red-600">
                <span className="font-semibold">Rejection Reason:</span>{" "}
                {rejectionReason}
              </p>
            </div>
          )}

          {/* Actions */}
          {status === "pending" && photoUrl && (
            <div className="space-y-3">
              {!showRejectInput ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onApprove}
                    disabled={isProcessing || isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectInput(true)}
                    disabled={isProcessing || isSubmitting}
                    className="border-red-500/20 text-red-600 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || isSubmitting}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Submit Rejection
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectReason("");
                      }}
                      disabled={isSubmitting}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!photoUrl && (
            <div className="text-sm text-muted-foreground italic">
              No profile photo uploaded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
