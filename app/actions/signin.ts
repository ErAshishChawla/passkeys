"use server";

import { createClient } from "@/utils/supabase/server";

export const signin = async (formData: FormData) => {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || "Could not authenticate user");
    }

    return {
      success: true,
      message: "Sign in successful. Redirecting...",
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
