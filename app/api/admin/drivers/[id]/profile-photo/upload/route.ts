import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get("photo") as File;

    if (!photo) {
      return NextResponse.json(
        { error: "No photo provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!photo.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 5MB" },
        { status: 400 }
      );
    }

    // Get current driver data for history
    const { data: driver } = await supabase
      .from("drivers")
      .select("profile_photo_url")
      .eq("id", id)
      .single();

    // Upload to Supabase Storage
    const fileExt = photo.name.split(".").pop();
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("driver-profile-photos")
      .upload(filePath, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload photo" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("driver-profile-photos")
      .getPublicUrl(filePath);

    // Update driver with new photo URL and reset status to pending
    const { error: updateError } = await supabase
      .from("drivers")
      .update({
        profile_photo_url: publicUrl,
        profile_photo_status: "pending",
        profile_photo_reviewed_by: null,
        profile_photo_reviewed_at: null,
        profile_photo_rejection_reason: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update driver" },
        { status: 500 }
      );
    }

    // Log to audit_logs for activity tracking
    const { error: logError } = await supabase.from("audit_logs").insert({
      entity_type: "driver",
      entity_id: id,
      action: "profile_photo_changed",
      old_value: { profile_photo_url: driver?.profile_photo_url },
      new_value: { profile_photo_url: publicUrl },
      performed_by: user.id,
    });

    if (logError) {
      console.error("Failed to log to audit_logs:", logError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      success: true,
      photoUrl: publicUrl 
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
