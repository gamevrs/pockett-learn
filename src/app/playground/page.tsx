import React from "react";
import type { Metadata } from "next";
import { Sandbox } from "@/components/sandbox/Sandbox";

export const metadata: Metadata = {
  title: "Python sandbox",
  description: "A free scratchpad: run any Python in your browser.",
};

export default function PlaygroundPage() {
  return <Sandbox />;
}
