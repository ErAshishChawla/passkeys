import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

import { generateAuthenticationOptions } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Check if user is logged in
  const userRes = await supabase.auth.getUser();

  if (userRes.error) {
    return NextResponse.json(
      {
        success: false,
        error: userRes.error.message || "Error occured while checking user",
      },
      { status: 401 }
    );
  }

  const user = userRes.data.user;

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "User not found",
      },
      { status: 401 }
    );
  }

  // Get all user passkeys
  const passkeysRes = await supabase
    .from("passkeys")
    .select()
    .eq("internal_user_id", user.id);

  if (passkeysRes.error) {
    return NextResponse.json(
      {
        success: false,
        error:
          passkeysRes.error.message || "Error occured while fetching passkeys",
      },
      { status: 500 }
    );
  }

  const userPasskeys = passkeysRes.data;

  // Generate authentication options
  const options = await generateAuthenticationOptions({
    rpID: process.env.NEXT_PUBLIC_RP_ID!,
    // Require users to use a previously-registered authenticator
    allowCredentials: userPasskeys.map((passkey) => ({
      id: passkey.cred_id,
      transports: passkey.transports.split(",") as AuthenticatorTransport[],
    })),
  });

  const challenge = options.challenge;

  // Save challenge to db
  const insertChallengeRes = await supabase
    .from("challenges")
    .insert([{ user_id: user.id, challenge }]);

  if (insertChallengeRes.error) {
    return NextResponse.json(
      {
        success: false,
        error:
          insertChallengeRes.error.message ||
          "Error occured while adding challenge",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, options: options });
}
