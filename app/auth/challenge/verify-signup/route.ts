import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

import { verifyRegistrationResponse } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  console.log(
    "-----------------VERIFY SIGNUP POST REQUEST STARTED-------------------"
  );
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
      console.log("No auth cred found in request body");
      response = {
        success: false,
        error: "No auth cred found in request body",
      };
      status = 400;
      throw new Error();
    }

    console.log("Incoming cred: ", incomingCred);

    if (!incomingOptionsUser) {
      console.log("No options user found in request body");
      response = {
        success: false,
        error: "No options user found in request body",
      };
      status = 400;
      throw new Error();
    }

    console.log("Incoming options user: ", incomingOptionsUser);

    // Check if user is logged in
    const userRes = await supabase.auth.getUser();

    console.log("UserRes: ", userRes);

    if (userRes.error) {
      console.log("UserRes Error: ", userRes.error);
      response = {
        success: false,
        error: userRes.error.message || "Error occured while checking user",
      };
      status = 401;
      throw new Error();
    }

    const user = userRes.data.user;

    if (!user) {
      console.log("User not found");
      response = {
        success: false,
        error: "User not found",
      };
      status = 401;
      throw new Error();
    }

    console.log("User: ", user);

    // Fetch the challenge
    const challengeRes = await supabase
      .from("challenges")
      .select("challenge")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("ChallengeRes: ", challengeRes);

    if (challengeRes.error) {
      console.log("ChallengeRes Error: ", challengeRes.error);
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
      console.log("No challenge found");
      response = {
        success: false,
        error: "No challenge found",
      };
      status = 400;
      throw new Error();
    }

    console.log("Challenge: ", challenge);

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        expectedChallenge: challenge as string,
        expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN!,
        expectedRPID: process.env.NEXT_PUBLIC_RP_ID!,
        response: incomingCred,
      });
    } catch (error: any) {
      console.error(error);
      response = {
        success: false,
        error: error.name || "Error verifying the response",
      };
      status = 400;
      throw new Error();
    }

    console.log("Verification: ", verification);

    if (!verification.verified) {
      response = {
        success: false,
        error: "Error verifying the response",
      };
      status = 400;
      throw new Error();
    }

    // Save the public key to the database
    const registrationInfo = verification.registrationInfo;

    if (!registrationInfo) {
      console.log("No registration info found");
      response = {
        success: false,
        error: "No registration info found",
      };
      status = 400;
      throw new Error();
    }

    console.log("Registration Info: ", registrationInfo);

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

    console.log("SavePublicKeyRes: ", savePublicKeyRes);

    if (savePublicKeyRes.error) {
      console.log("SavePublicKeyRes Error: ", savePublicKeyRes.error);
      response = {
        success: false,
        error:
          savePublicKeyRes.error.message ||
          "Error occured while saving public key",
      };
      status = 500;
      throw new Error();
    }

    console.log(
      "-----------------VERIFY SIGNUP POST REQUEST COMPLETED-------------------"
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    console.log(
      "-----------------VERIFY SIGNUP POST REQUEST COMPLETED-------------------"
    );
    return NextResponse.json(response, { status: status });
  }
}
