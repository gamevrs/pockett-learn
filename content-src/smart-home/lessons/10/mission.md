Real houses are messy. Try sending the bus a motion event for a room that does not exist: your strict `lights_follow` raises, and the failure bounces back to whoever published the event. Meanwhile any panel or widget that subscribes and is later thrown away would keep listening forever.

Make the bus resilient: isolate handler failures into a dead-letter box and support weak subscriptions. The scene's Dead letters panel lists every handler that crashed, while the rest of the house carries on.
