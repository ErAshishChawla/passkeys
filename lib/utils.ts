import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts common fields to identify the RP (relying party)
 */
export const getAuthenticatorOptions = () => {
  const webAppBaseUrl = new URL(process.env.NEXT_PUBLIC_ORIGIN!);
  const rpId = webAppBaseUrl.hostname;

  return {
    rpName: "Documenso",
    rpId,
    origin: process.env.NEXT_PUBLIC_ORIGIN,
  };
};
