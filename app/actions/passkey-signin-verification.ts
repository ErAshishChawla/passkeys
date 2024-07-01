"use server";

import { getAuthenticatorOptions } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

import { verifyAuthenticationResponse } from "@simplewebauthn/server";

export async function verifySigninPasskey(formData: FormData) {
  const incomingCred = JSON.parse(formData.get("cred") as string);

  if (!incomingCred) {
    return {
      success: false,
      error: "No auth cred found in request body",
    };
  }

  const supabase = createClient();

  const userRes = await supabase.auth.getUser();

  if (userRes.error) {
    return {
      success: false,
      error: userRes.error.message || "Error occured while checking user",
    };
  }

  const user = userRes.data.user;

  if (!user) {
    return {
      success: false,
      error: "User not found",
    };
  }

  // Fetch matching pass key
  const passKeyRes = await supabase
    .from("passkeys")
    .select()
    .eq("internal_user_id", user.id)
    .eq("cred_id", incomingCred.id)
    .maybeSingle();

  console.log("PassKeyRes: ", passKeyRes);

  if (passKeyRes.error) {
    console.log("PassKeyRes Error: ", passKeyRes.error);
    return {
      success: false,
      error: passKeyRes.error.message || "No matching passkey found for user",
    };
  }

  const passKey = passKeyRes.data;

  console.log("PassKey: ", passKey);

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
    return {
      success: false,
      error:
        challengeRes.error.message || "Error occured while fetching challenge",
    };
  }

  const challenge = challengeRes.data?.challenge;

  const { rpId, origin } = getAuthenticatorOptions();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      expectedChallenge: challenge,
      expectedOrigin: origin!,
      expectedRPID: rpId!,
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
    return {
      success: false,
      error: error?.message || "Error occured while verifying passkey",
    };
  }

  if (!verification?.verified) {
    return {
      success: false,
      error: "Passkey verification failed",
    };
  }

  return {
    success: true,
  };
}
