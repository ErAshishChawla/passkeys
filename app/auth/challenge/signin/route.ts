import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

import { generateAuthenticationOptions } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  console.log("-----------------VERIFY SIGNIN-------------------");
  let response = {
    success: false,
    error: "An error occured",
  };
  let status = 500;

  try {
    const supabase = createClient();

    // Check if user is logged in
    const userRes = await supabase.auth.getUser();

    if (userRes.error) {
      response = {
        success: false,
        error: userRes.error.message || "Error occured while checking user",
      };
      status = 401;
      throw new Error();
    }

    const user = userRes.data.user;

    if (!user) {
      response = {
        success: false,
        error: "User not found",
      };
      status = 401;
      throw new Error();
    }

    // Get all user passkeys
    const passkeysRes = await supabase
      .from("passkeys")
      .select()
      .eq("internal_user_id", user.id);

    if (passkeysRes.error) {
      response = {
        success: false,
        error:
          passkeysRes.error.message || "Error occured while fetching passkeys",
      };
      status = 500;
      throw new Error();
    }

    const userPasskeys = passkeysRes.data;

    if (!userPasskeys || userPasskeys.length === 0) {
      response = {
        success: false,
        error: "No passkeys found",
      };
      status = 400;
      throw new Error();
    }

    const allowedCredentials =
      userPasskeys?.map((passkey) => {
        return {
          id: passkey?.cred_id,
          transports: (passkey?.transports as string)?.split(
            ","
          ) as AuthenticatorTransport[],
        };
      }) || [];

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: process.env.NEXT_PUBLIC_RP_ID!,
      // Require users to use a previously-registered authenticator
      allowCredentials: allowedCredentials,
    });

    const challenge = options.challenge;

    // Save challenge to db
    const insertChallengeRes = await supabase
      .from("challenges")
      .insert([{ user_id: user.id, challenge }]);

    if (insertChallengeRes.error) {
      response = {
        success: false,
        error:
          insertChallengeRes.error.message ||
          "Error occured while adding challenge",
      };
      status = 500;
      throw new Error();
    }

    console.log("-----------------SIGNIN CHALLENGE SENT-------------------");
    return NextResponse.json({ success: true, options: options });
  } catch (error) {
    console.error(error);
    console.log("-----------------SIGNIN CHALLENGE SENT-------------------");
    return NextResponse.json(response, { status });
  }
}
