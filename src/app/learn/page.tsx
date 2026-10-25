import React from "react";
import type { Metadata } from "next";
import { FoundationsHub } from "@/components/learn/FoundationsHub";

export const metadata: Metadata = {
  title: "Foundations",
  description: "Learn how code really works, from bits and bytes to the four pillars of OOP and design patterns. Every step is interactive.",
};

export default function LearnPage() {
  return <FoundationsHub />;
}
