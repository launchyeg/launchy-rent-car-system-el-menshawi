import { supabase } from "../../../lib/supabaseClient";

const TABLE = "license_renewals";

export async function listLicenseRenewals() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, cars(id, make, model, year)")
    .order("expiry_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createLicenseRenewal(values) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLicenseRenewal(id, values) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLicenseRenewal(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
