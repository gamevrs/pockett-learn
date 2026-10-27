import type { Metadata } from "next";
import { FrameApp } from "@/components/stage/FrameApp";

// This page is only ever shown inside the site's own pages. It carries no content of its own.
export const metadata: Metadata = {
  title: "Live demo",
  robots: { index: false, follow: false },
};

export default function FramePage() {
  return <FrameApp />;
}
