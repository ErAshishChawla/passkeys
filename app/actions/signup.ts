"use server";

import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const signup = async (formData: FormData) => {
  try {
    const origin = headers().get("origin");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || "Could not authenticate user");
    }

    return {
      success: true,
      message: "Check your email for a confirmation link.",
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
