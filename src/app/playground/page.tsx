import React from "react";
import type { Metadata } from "next";
import { Sandbox } from "@/components/sandbox/Sandbox";

export const metadata: Metadata = {
  title: "Code sandbox",
  description: "A free scratchpad: run Python, JavaScript or SQL.",
};

export default function PlaygroundPage() {
  return <Sandbox />;
}
