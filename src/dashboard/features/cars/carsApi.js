import { supabase } from "../../../lib/supabaseClient";

// Thin wrapper around the `cars` table — keeps the Supabase query shape in
// one place per feature, the same way content.js keeps the public site's
// data separate from its presentational components.
const TABLE = "cars";

export async function listCars() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCar(values) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCar(id, values) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Cascades to that car's insurance/license/oil-change/booking rows —
// enforced at the database level (on delete cascade), not here.
export async function deleteCar(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
