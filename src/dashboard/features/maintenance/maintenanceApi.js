import { supabase } from "../../../lib/supabaseClient";

const TABLE = "oil_changes";

export async function listOilChanges() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, cars(id, make, model, year)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createOilChange(values) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOilChange(id, values) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOilChange(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
