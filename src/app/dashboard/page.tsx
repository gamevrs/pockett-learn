import React from "react";
import type { Metadata } from "next";
import { PROJECTS } from "@/content";
import { FOUNDATIONS } from "@/content/foundations";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { summariseForDashboard } from "@/components/dashboard/summary";

export const metadata: Metadata = { title: "Your progress" };

export default function DashboardPage() {
  return <Dashboard summary={summariseForDashboard(PROJECTS, FOUNDATIONS)} />;
}
