import type { WidgetRegistry } from "@/learn/widget";
import { Signals, checkSignals } from "./Signals";
import { LogExplorer, checkLogExplorer } from "./LogExplorer";
import { CounterRate, checkCounterRate } from "./CounterRate";
import { Percentiles, checkPercentiles } from "./Percentiles";
import { Bottleneck, checkBottleneck } from "./Bottleneck";
import { Trace, checkTrace } from "./Trace";
import { ErrorBudget, checkErrorBudget } from "./ErrorBudget";
import { Alerts, checkAlerts } from "./Alerts";
import { Dashboard, checkDashboard } from "./Dashboard";
import { IncidentBoard, checkIncidentBoard } from "./IncidentBoard";
import { LoadTest, checkLoadTest } from "./LoadTest";

/** Widgets for the "Knowing what's happening" module. Keys are prefixed with "obs-" to stay unique. */
export const OBS_WIDGETS: WidgetRegistry = {
  "obs-signals": { Component: Signals, check: checkSignals },
  "obs-logs": { Component: LogExplorer, check: checkLogExplorer },
  "obs-counter": { Component: CounterRate, check: checkCounterRate },
  "obs-percentiles": { Component: Percentiles, check: checkPercentiles },
  "obs-bottleneck": { Component: Bottleneck, check: checkBottleneck },
  "obs-trace": { Component: Trace, check: checkTrace },
  "obs-budget": { Component: ErrorBudget, check: checkErrorBudget },
  "obs-alerts": { Component: Alerts, check: checkAlerts },
  "obs-dashboard": { Component: Dashboard, check: checkDashboard },
  "obs-incident": { Component: IncidentBoard, check: checkIncidentBoard },
  "obs-loadtest": { Component: LoadTest, check: checkLoadTest },
};
