import { supabase } from "./supabaseClient.js";

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

async function get(key, shared = false) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error(`Key not found: ${key}`);
  }

  const { data, error } = await supabase
    .from("user_storage")
    .select("key, value")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Key not found: ${key}`);
  }

  return { key, value: data.value, shared };
}

async function set(key, value, shared = false) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { key, value, shared };
  }

  const { error } = await supabase
    .from("user_storage")
    .upsert({ user_id: userId, key, value }, { onConflict: "user_id,key" });

  if (error) {
    throw error;
  }

  return { key, value, shared };
}

async function del(key, shared = false) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { key, deleted: false, shared };
  }

  const { data, error } = await supabase
    .from("user_storage")
    .delete()
    .eq("user_id", userId)
    .eq("key", key)
    .select("key")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { key, deleted: Boolean(data), shared };
}

async function list(prefix = "", shared = false) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { keys: [], prefix, shared };
  }

  let query = supabase
    .from("user_storage")
    .select("key")
    .eq("user_id", userId);

  if (prefix) {
    query = query.like("key", `${prefix}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    keys: (data || []).map((row) => row.key),
    prefix,
    shared,
  };
}

export function installStorageShim() {
  if (typeof window !== "undefined" && !window.storage) {
    window.storage = { get, set, delete: del, list };
  }
}
