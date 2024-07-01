"use server";

import { getAuthenticatorOptions } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

import { generateRegistrationOptions } from "@simplewebauthn/server";

import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";

export async function createPasskeyRegistrationOptions() {
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

  const userPassKeys = userPassKeysRes.data;

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

  const { rpId, rpName } = getAuthenticatorOptions();

  let options;
  try {
    options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpId,
      userName: user.email as string,
      userID: new TextEncoder().encode(user.id as string),
      userDisplayName: user.email as string,
      attestationType: "none",
      excludeCredentials: excludedCredentials,
      timeout: 600000,
    });
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Error occured while generating options",
    };
  }

  const challenge = options.challenge;

  const challengeStorageRes = await supabase.from("challenges").insert({
    user_id: user.id as string,
    challenge: challenge,
  });

  if (challengeStorageRes.error) {
    console.log("ChallengeStorageRes Error: ", challengeStorageRes.error);
    return {
      success: false,
      error:
        challengeStorageRes.error.message ||
        "Error occured while storing challenge",
    };
  }

  return {
    success: true,
    options,
  };
}
