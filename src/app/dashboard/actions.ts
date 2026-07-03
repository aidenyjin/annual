"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const term = (formData.get("term") as string)?.trim();
  if (!name) throw new Error("Class name is required");

  const { data, error } = await supabase
    .from("classes")
    .insert({ user_id: user.id, name, term: term || null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  redirect(`/dashboard/classes/${data.id}`);
}
