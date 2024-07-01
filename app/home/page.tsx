"use client";

import React from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

import { Button } from "@/components/ui/button";
import { createPasskeyRegistrationOptions } from "../actions/passkey-signup";
import { verifyRegistrationPasskey } from "../actions/passkey-signup-verification";
import { createPasskeySiginOptions } from "../actions/passkey-signin";
import { verifySigninPasskey } from "../actions/passkey-signin-verification";

function HomePage() {
  const handleCreatePasskeySubmit = async (e: any) => {
    e.preventDefault();
    console.log(
      "--------------On Register Passkey function started-----------------"
    );
    try {
      const passkeyOptionsRes = await createPasskeyRegistrationOptions();

      console.log("passkeyOptionsRes", passkeyOptionsRes);

      if (!passkeyOptionsRes?.success) {
        throw new Error(
          passkeyOptionsRes?.error || "Error occured while creating challenge"
        );
      }

      const options = passkeyOptionsRes?.options;

      console.log("options", options);

      if (!options) {
        throw new Error("No options returned from server");
      }

      const credRes = await startRegistration(options);

      console.log("credRes", credRes);

      if (!credRes) {
        throw new Error("Error occured while registering passkey");
      }

      const sendCredBody = {
        cred: credRes,
        options_user: options?.user ? options.user : null,
      };

      console.log("sendCredBody", sendCredBody);

      const formData = new FormData();
      formData.append("cred", JSON.stringify(credRes));
      formData.append(
        "options_user",
        JSON.stringify(options?.user ? options.user : null)
      );

      const verifyCredRes = await verifyRegistrationPasskey(formData);

      console.log("verifyCredRes", verifyCredRes);

      if (!verifyCredRes?.success) {
        throw new Error(
          verifyCredRes?.error || "Error occured while verifying passkey"
        );
      }

      alert("Passkey registered successfully");
    } catch (error: any) {
      // console.error(error);
      alert(error?.message || "Error occured while registering passkey");
    }
    console.log(
      "--------------On Register Passkey function completed-----------------"
    );
  };

  const onLoginPassKey = async () => {
    console.log(
      "--------------On Login Passkey function started-----------------"
    );
    try {
      const signinOptionsRes = await createPasskeySiginOptions();

      console.log("signinOptionsRes", signinOptionsRes);

      if (!signinOptionsRes?.success) {
        throw new Error(
          signinOptionsRes?.error || "Error occured while creating challenge"
        );
      }

      const options = signinOptionsRes?.options;

      console.log("options", options);

      if (!options) {
        throw new Error("No options returned from server");
      }

      const credRes = await startAuthentication(options);

      console.log("credRes", credRes);

      if (!credRes) {
        throw new Error("Error occured while authenticating passkey");
      }

      const formData = new FormData();
      formData.append("cred", JSON.stringify(credRes));

      // Now we need to send the generated public key to the server
      const verifyCredRes = await verifySigninPasskey(formData);

      console.log("verifyCredRes", verifyCredRes);

      if (!verifyCredRes?.success) {
        throw new Error(
          verifyCredRes?.error || "Error occured while verifying passkey"
        );
      }

      alert("Passkey verified successfully");
    } catch (error) {
      console.error(error);
    }
    console.log(
      "--------------On Login Passkey function completed-----------------"
    );
  };
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-3">
      <form onSubmit={handleCreatePasskeySubmit}>
        <Button type="submit">Create Passkey</Button>
      </form>
      <Button onClick={onLoginPassKey}>Login with passkey Passkey</Button>
    </div>
  );
}

export default HomePage;
