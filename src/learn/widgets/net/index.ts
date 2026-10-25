import type { WidgetRegistry } from "@/learn/widget";
import { NetworkMap, checkNetworkMap } from "./NetworkMap";
import { PacketSplitter, checkPacketSplitter } from "./PacketSplitter";
import { IpExplorer, checkIpExplorer } from "./IpExplorer";
import { RouterMap, checkRouterMap } from "./RouterMap";
import { Ports, checkPorts } from "./Ports";
import { Transport, checkTransport } from "./Transport";
import { DnsWalk, checkDnsWalk } from "./DnsWalk";
import { HttpBuilder, checkHttpBuilder } from "./HttpBuilder";
import { Layers, checkLayers } from "./Layers";
import { Tls, checkTls } from "./Tls";
import { Journey, checkJourney } from "./Journey";

/** Widgets for the "Networking" module. Keys are prefixed with "net-" to stay unique. */
export const NET_WIDGETS: WidgetRegistry = {
  "net-map": { Component: NetworkMap, check: checkNetworkMap },
  "net-packets": { Component: PacketSplitter, check: checkPacketSplitter },
  "net-ip": { Component: IpExplorer, check: checkIpExplorer },
  "net-routes": { Component: RouterMap, check: checkRouterMap },
  "net-ports": { Component: Ports, check: checkPorts },
  "net-transport": { Component: Transport, check: checkTransport },
  "net-dns": { Component: DnsWalk, check: checkDnsWalk },
  "net-http": { Component: HttpBuilder, check: checkHttpBuilder },
  "net-layers": { Component: Layers, check: checkLayers },
  "net-tls": { Component: Tls, check: checkTls },
  "net-journey": { Component: Journey, check: checkJourney },
};
