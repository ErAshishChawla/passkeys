import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";

import type { Passkey } from "@/types";

export async function POST() {
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
  const userPassKeysRes = await supabase
    .from("passkeys")
    .select()
    .eq("internal_user_id", user.id);

  if (userPassKeysRes.error) {
    return NextResponse.json(
      {
        success: false,
        error:
          userPassKeysRes.error.message ||
          "Error occured while checking user passkeys",
      },
      { status: 500 }
    );
  }

  const userPassKeys = userPassKeysRes.data;

  // generate excludeCredentials
  const excludedCredentials = userPassKeys.map((passkey) => {
    return {
      id: passkey?.cred_id,
      transports: (passkey.transports as string).split(
        ","
      ) as AuthenticatorTransportFuture[],
    };
  });

  const options = await generateRegistrationOptions({
    rpName: process.env.NEXT_PUBLIC_RP_NAME!,
    rpID: process.env.NEXT_PUBLIC_RP_ID!,
    userName: user.email as string,
    attestationType: "none",
    excludeCredentials: excludedCredentials,
  });

  const challenge = options.challenge;

  // We store the challenge
  const challengeStorageRes = await supabase.from("challenges").insert({
    user_id: user.id as string,
    challenge: challenge,
  });

  if (challengeStorageRes.error) {
    return NextResponse.json(
      {
        success: false,
        error:
          challengeStorageRes.error.message ||
          "Error occured while storing challenge",
      },
      { status: 500 }
    );
  }

  // return the challenge options to the client
  return NextResponse.json({
    success: true,
    options,
  });
}
