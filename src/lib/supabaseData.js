import { supabase } from "@/utils/supabase";

const hasSupabaseConfig = () => {
  return Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
};

const toSerializable = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

export const upsertRow = async (table, row, onConflict = "id") => {
  if (!hasSupabaseConfig() || !row) {
    return;
  }

  const payload = toSerializable(row);
  if (!payload) {
    return;
  }

  const { error } = await supabase.from(table).upsert([payload], { onConflict });
  if (error) {
    // RLS errors (403) are expected if the table has restrictive policies
    // Don't block the app for RLS failures - just log and continue
    if (error.code === "PGRST301" || error.code === "42501" || error.status === 403) {
      console.debug(`Supabase RLS policy prevented upsert to ${table}. This may be expected.`);
      return;
    }
    console.warn(`Supabase upsert failed for ${table}:`, error.code, error.message);
  }
};

export const upsertRows = async (table, rows, onConflict = "id") => {
  if (!hasSupabaseConfig() || !Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const payload = rows.map(toSerializable).filter(Boolean);
  if (!payload.length) {
    return;
  }

  const { error } = await supabase.from(table).upsert(payload, { onConflict });
  if (error) {
    // RLS errors are expected if the table has restrictive policies
    if (error.code === "PGRST301" || error.code === "42501" || error.status === 403) {
      console.debug(`Supabase RLS policy prevented bulk upsert to ${table}. This may be expected.`);
      return;
    }
    console.warn(`Supabase bulk upsert failed for ${table}:`, error.code, error.message);
  }
};

export const deleteRowsByField = async (table, field, value) => {
  if (!hasSupabaseConfig() || value === undefined || value === null) {
    return;
  }

  const { error } = await supabase.from(table).delete().eq(field, value);
  if (error) {
    console.warn(`Supabase delete failed for ${table}:`, error.message);
  }
};

const getFileExtension = (name = "") => {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
};

export const uploadProfilePhoto = async (userId, file) => {
  if (!hasSupabaseConfig() || !userId || !file) {
    return "";
  }

  const ext = getFileExtension(file.name);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    // Bucket not found or storage not available - don't block user signup/login
    if (uploadError.status === 400 || uploadError.message?.includes("Bucket not found")) {
      console.debug("Profile photo bucket not available. Skipping upload.");
      return "";
    }
    console.warn("Supabase profile photo upload failed:", uploadError.code, uploadError.message);
    return "";
  }

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return data?.publicUrl || "";
};
