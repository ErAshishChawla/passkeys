"use server";

import { getAuthenticatorOptions } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

import { verifyRegistrationResponse } from "@simplewebauthn/server";

export async function verifyRegistrationPasskey(formData: FormData) {
  const incomingCred = JSON.parse(formData.get("cred") as string);
  const incomingOptionsUser = JSON.parse(
    formData.get("options_user") as string
  );

  if (!incomingCred) {
    return {
      success: false,
      error: "No auth cred found in request body",
    };
  }

  if (!incomingOptionsUser) {
    return {
      success: false,
      error: "No options user found in request body",
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

  const userPassKeysRes = await supabase
    .from("passkeys")
    .select()
    .eq("internal_user_id", user.id);

  if (userPassKeysRes.error) {
    return {
      success: false,
      error:
        userPassKeysRes.error.message ||
        "Error occured while fetching passkeys",
    };
  }

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
    verification = await verifyRegistrationResponse({
      expectedChallenge: challenge as string,
      expectedOrigin: origin as string,
      expectedRPID: rpId,
      response: incomingCred,
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

  // Save the public key to the database
  const registrationInfo = verification.registrationInfo;

  if (!registrationInfo) {
    console.log("No registration info found");
    return {
      success: false,
      error: "No registration info found",
    };
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
    return {
      success: false,
      error:
        savePublicKeyRes.error.message ||
        "Error occured while saving public key",
    };
  }

  return {
    success: true,
  };
}
