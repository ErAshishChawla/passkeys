import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

import { verifyRegistrationResponse } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  console.log("-----------------VERIFY SIGNUP-------------------");
  let status: number = 500;
  let response: { [key: string]: any } = {
    success: false,
    error: "An error occured",
  };
  try {
    const supabase = createClient();

    // Check if we have the auth object in the request body
    const parsedBody = await req.json();
    const incomingCred = parsedBody?.cred;
    const incomingOptionsUser = parsedBody?.options_user;

    if (!incomingCred) {
      response = {
        success: false,
        error: "No auth cred found in request body",
      };
      status = 400;
      throw new Error();
    }

    if (!incomingOptionsUser) {
      response = {
        success: false,
        error: "No options user found in request body",
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

    // Fetch the challenge
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
          "Error occured while fetching challenge",
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

    const verificationResult = await verifyRegistrationResponse({
      expectedChallenge: challenge as string,
      expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID!,
      response: incomingCred,
    });

    if (!verificationResult.verified) {
      response = {
        success: false,
        error: "Error verifying the response",
      };
      status = 400;
      throw new Error();
    }

    // Save the public key to the database
    const registrationInfo = verificationResult.registrationInfo;

    if (!registrationInfo) {
      response = {
        success: false,
        error: "No registration info found",
      };
      status = 400;
      throw new Error();
    }

    const savePublicKeyRes = await supabase.from("passkeys").insert([
      {
        cred_id: registrationInfo.credentialID,
        cred_public_key: Array.from(registrationInfo.credentialPublicKey),
        internal_user_id: user.id,
        webauthn_user_id: incomingOptionsUser.id,
        counter: registrationInfo.counter,
        backup_eligible: registrationInfo.credentialBackedUp,
        backup_status: registrationInfo.credentialBackedUp,
        transports:
          incomingCred?.response?.transports.map((t: any) => t).join(",") || [],
        last_used: null,
      },
    ]);

    if (savePublicKeyRes.error) {
      response = {
        success: false,
        error:
          savePublicKeyRes.error.message ||
          "Error occured while saving public key",
      };
      status = 500;
      throw new Error();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(response, { status: status });
  }
}
