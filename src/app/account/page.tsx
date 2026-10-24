import React from "react";
import type { Metadata } from "next";
import { AccountPanel } from "@/components/auth/AccountPanel";

export const metadata: Metadata = {
  title: "Account",
  description: "Sign in to sync your pockett. progress across devices.",
};

export default function AccountPage() {
  return <AccountPanel />;
}
