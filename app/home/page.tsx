"use client";

import React from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

import { Button } from "@/components/ui/button";

function HomePage() {
  const onRegisterPassKey = async () => {
    try {
      const response = await fetch("/auth/challenge/signup", {
        method: "POST",
      });

      const data = await response.json();

      if (!data?.success) {
        throw new Error(
          data?.error || "Error occured while creating challenge"
        );
      }

      const options = data?.options;

      if (!options) {
        throw new Error("No options returned from server");
      }

      const credRes = await startRegistration(options);

      if (!credRes) {
        throw new Error("Error occured while registering passkey");
      }

      const sendCredBody = {
        cred: credRes,
        options_user: options?.user ? options.user : null,
      };

      //   Now we need to send the generated public key to the server
      const verifyCredRes = await fetch("/auth/challenge/verify-signup", {
        method: "POST",
        body: JSON.stringify(sendCredBody),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const verifyCredData = await verifyCredRes.json();

      if (!verifyCredData?.success) {
        throw new Error(
          verifyCredData?.error || "Error occured while verifying passkey"
        );
      }

      console.log("Passkey registered successfully");
    } catch (error) {
      console.error(error);
    }
  };

  const onLoginPassKey = async () => {
    try {
      const response = await fetch("/auth/challenge/signin", {
        method: "POST",
      });

      const data = await response.json();

      if (!data?.success) {
        throw new Error(
          data?.error || "Error occured while creating challenge"
        );
      }

      const options = data?.options;
      console.log("options", options);

      if (!options) {
        throw new Error("No options returned from server");
      }

      const credRes = await startAuthentication(options);

      if (!credRes) {
        throw new Error("Error occured while authenticating passkey");
      }

      const sendCredBody = {
        cred: credRes,
      };

      // Now we need to send the generated public key to the server
      const verifyCredRes = await fetch("/auth/challenge/verify-signin", {
        method: "POST",
        body: JSON.stringify(sendCredBody),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const verifyCredData = await verifyCredRes.json();

      if (!verifyCredData?.success) {
        throw new Error(
          verifyCredData?.error || "Error occured while verifying passkey"
        );
      }

      console.log("Passkey verified successfully");
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-3">
      <Button onClick={onRegisterPassKey}>Create Passkey</Button>
      <Button onClick={onLoginPassKey}>Login with passkey Passkey</Button>
    </div>
  );
}

export default HomePage;
