import { supabase } from "../../../lib/supabaseClient";

const TABLE = "insurance_records";

// Embeds each record's car via the car_id foreign key (PostgREST returns
// it as a single nested object, not an array, since it's the many-to-one
// side) so the list page can show the car's name without a second query.
export async function listInsuranceRecords() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, cars(id, make, model, year)")
    .order("expiry_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createInsuranceRecord(values) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInsuranceRecord(id, values) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInsuranceRecord(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
