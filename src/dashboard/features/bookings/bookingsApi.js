import { supabase } from "../../../lib/supabaseClient";

const TABLE = "bookings";

export async function listBookings() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, cars(id, make, model, year)")
    .order("pickup_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createBooking(values) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBooking(id, values) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBooking(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
