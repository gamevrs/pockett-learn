"use client";

import React, { createContext, useContext } from "react";

const EmbedContext = createContext(false);

/** Marks everything below it as an /embed page (the phone app draws the header, the close button and navigation). */
export function EmbedProvider({ children }: { children: React.ReactNode }) {
  return <EmbedContext.Provider value={true}>{children}</EmbedContext.Provider>;
}

/** True on the /embed pages the phone app hosts, already during the server render, so nothing flashes. */
export function useEmbed(): boolean {
  return useContext(EmbedContext);
}
