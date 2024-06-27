import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

import { verifyAuthenticationResponse } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Check if we have the auth object in the request body
  const parsedBody = await req.json();
  const incomingCred = parsedBody?.cred;

  if (!incomingCred) {
    return NextResponse.json(
      {
        success: false,
        error: "No auth cred found in request body",
      },
      { status: 400 }
    );
  }

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

  // Fetch matching pass key
  const passKeyRes = await supabase
    .from("passkeys")
    .select()
    .eq("internal_user_id", user.id)
    .eq("cred_id", incomingCred.id)
    .maybeSingle();

  if (passKeyRes.error) {
    return NextResponse.json(
      {
        success: false,
        error:
          passKeyRes.error.message || "Error occured while checking passkey",
      },
      { status: 500 }
    );
  }

  const passKey = passKeyRes.data;

  // fetch latest challenge
  const challengeRes = await supabase
    .from("challenges")
    .select("challenge")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (challengeRes.error) {
    return NextResponse.json(
      {
        success: false,
        error:
          challengeRes.error.message ||
          "Error occured while checking challenge",
      },
      { status: 500 }
    );
  }

  const challenge = challengeRes.data?.challenge;

  if (!challenge) {
    return NextResponse.json(
      {
        success: false,
        error: "No challenge found",
      },
      { status: 400 }
    );
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      expectedChallenge: challenge,
      expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID!,
      response: incomingCred,
      authenticator: {
        credentialID: passKey.cred_id,
        credentialPublicKey: new Uint8Array(passKey.cred_public_key),
        counter: passKey.counter,
        transports: passKey.transports.split(","),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Error occured while verifying passkey" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
