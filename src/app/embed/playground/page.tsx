import React from "react";
import type { Metadata } from "next";
import { Sandbox } from "@/components/sandbox/Sandbox";

export const metadata: Metadata = {
  title: "Playground",
};

/** The code sandbox for the phone app's web view: the same as /playground, without the page heading. */
export default function EmbedPlaygroundPage() {
  return <Sandbox />;
}
