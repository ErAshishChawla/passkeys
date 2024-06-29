import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

import { verifyAuthenticationResponse } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  console.log("-----------------VERIFY SIGNIN-------------------");
  let response = {
    success: false,
    error: "An error occured",
  };
  let status = 500;

  try {
    const supabase = createClient();

    // Check if we have the auth object in the request body
    const parsedBody = await req.json();
    const incomingCred = parsedBody?.cred;

    if (!incomingCred) {
      response = {
        success: false,
        error: "No auth cred found in request body",
      };
      status = 400;
      throw new Error();
    }

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

    // Fetch matching pass key
    const passKeyRes = await supabase
      .from("passkeys")
      .select()
      .eq("internal_user_id", user.id)
      .eq("cred_id", incomingCred.id)
      .maybeSingle();

    if (passKeyRes.error) {
      response = {
        success: false,
        error:
          passKeyRes.error.message || "Error occured while checking passkey",
      };
      status = 500;
      throw new Error();
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
      response = {
        success: false,
        error:
          challengeRes.error.message ||
          "Error occured while checking challenge",
      };
      status = 500;
      throw new Error();
    }

    const challenge = challengeRes.data?.challenge;

    if (!challenge) {
      response = {
        success: false,
        error: "No challenge found",
      };
      status = 400;
      throw new Error();
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        expectedChallenge: challenge,
        expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN!,
        expectedRPID: "lol",
        response: incomingCred,
        authenticator: {
          credentialID: passKey.cred_id,
          credentialPublicKey: new Uint8Array(passKey.cred_public_key),
          counter: passKey.counter,
          transports: passKey.transports.split(","),
        },
      });
    } catch (error: any) {
      console.error(error);
      response = {
        success: false,
        error: error.name,
      };
      status = 400;
      throw new Error();
    }

    console.log("Verification: ", verification);
    console.log("-----------------SIGNIN VERIFIED-------------------");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    console.log("-----------------SIGNIN VERIFIED-------------------");
    return NextResponse.json(response, { status });
  }
}
