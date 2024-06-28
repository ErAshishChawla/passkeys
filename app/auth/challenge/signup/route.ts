import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";

import type { Passkey } from "@/types";

export async function POST() {
  let status = 500;
  let response = {
    success: false,
    error: "Internal server error",
  };
  try {
    console.log("-----------------PASSKEY SIGNUP-------------------");
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

    console.log("User: ", user);

    // Get all user passkeys
    const userPassKeysRes = await supabase
      .from("passkeys")
      .select()
      .eq("internal_user_id", user.id);

    console.log("UserPasskeysRes: ", userPassKeysRes);

    if (userPassKeysRes.error) {
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

    // generate excludeCredentials
    const excludedCredentials =
      userPassKeys && userPassKeys?.length > 0
        ? userPassKeys.map((passkey) => {
            return {
              id: passkey?.cred_id,
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
      response = {
        success: false,
        error:
          challengeStorageRes.error.message ||
          "Error occured while storing challenge",
      };
      status = 500;
      throw new Error();
    }

    console.log("-----------------PASSKEY SIGNUP COMPLETED-------------------");

    // return the challenge options to the client
    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error) {
    console.error("Error in passkey signup: ", error);
    console.log("-----------------PASSKEY SIGNUP COMPLETED-------------------");
    return NextResponse.json(response, { status });
  }
}
