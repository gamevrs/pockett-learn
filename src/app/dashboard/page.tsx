import React from "react";
import type { Metadata } from "next";
import { PROJECTS } from "@/content";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Your progress" };

export default function DashboardPage() {
  return <Dashboard projects={PROJECTS} />;
}
