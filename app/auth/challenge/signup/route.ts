import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";

import type { Passkey } from "@/types";

export async function POST() {
  console.log(
    "-----------------PASSKEY SIGNUP POST REQUEST STARTED-------------------"
  );
  let status = 500;
  let response = {
    success: false,
    error: "Internal server error",
  };
  try {
    const supabase = createClient();

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
      response = {
        success: false,
        error: "User not found",
      };
      status = 401;
      console.log("User not found");
      throw new Error();
    }

    console.log("User: ", user);

    // Get all user passkeys
    const userPassKeysRes = await supabase
      .from("passkeys")
      .select()
      .eq("internal_user_id", user.id);

    console.log("UserPasskeysRes: ", userPassKeysRes);

    if (userPassKeysRes.error) {
      console.log("UserPasskeysRes Error: ", userPassKeysRes.error);
      response = {
        success: false,
        error:
          userPassKeysRes.error.message ||
          "Error occured while checking user passkeys",
      };
      status = 500;
      throw new Error();
    }

    const userPassKeys = userPassKeysRes.data;
    console.log("UserPasskeys: ", userPassKeys);

    // generate excludeCredentials
    const excludedCredentials =
      userPassKeys && userPassKeys?.length > 0
        ? userPassKeys.map((passkey) => {
            return {
              id: passkey?.cred_id,
              type: "public-key",
              transports: (passkey?.transports as string)?.split(
                ","
              ) as AuthenticatorTransportFuture[],
            };
          })
        : [];

    console.log("Excluded Credentials: ", excludedCredentials);

    const options = await generateRegistrationOptions({
      rpName: process.env.NEXT_PUBLIC_RP_NAME!,
      rpID: process.env.NEXT_PUBLIC_RP_ID!,
      userName: user.email as string,
      userID: new TextEncoder().encode(user.id as string),
      attestationType: "none",
      excludeCredentials: excludedCredentials,
      timeout: 600000,
    });

    console.log("Options: ", options);

    const challenge = options.challenge;

    console.log("Challenge: ", challenge);

    // We store the challenge
    const challengeStorageRes = await supabase.from("challenges").insert({
      user_id: user.id as string,
      challenge: challenge,
    });

    console.log("ChallengeStorageRes: ", challengeStorageRes);

    if (challengeStorageRes.error) {
      console.log("ChallengeStorageRes Error: ", challengeStorageRes.error);
      response = {
        success: false,
        error:
          challengeStorageRes.error.message ||
          "Error occured while storing challenge",
      };
      status = 500;
      throw new Error();
    }

    console.log(
      "-----------------PASSKEY SIGNUP POST REQUEST COMPLETED-------------------"
    );

    // return the challenge options to the client
    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error) {
    console.error("Error in passkey signup: ", error);
    console.log(
      "-----------------PASSKEY SIGNUP POST REQUEST COMPLETED-------------------"
    );
    return NextResponse.json(response, { status });
  }
}
