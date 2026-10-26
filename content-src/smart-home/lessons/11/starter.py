# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: wire the devices to the bus.
def wire_home(target, devs):
    ...
    # Subscribe handlers on `target` (the bus passed in) that act on `devs` (the devices passed in):
    #   "motion"        -> trigger the sensor f"{room}_motion" (ignore rooms that have none)
    #   "motion"        -> count the visit with count_visit, but only for rooms in visit_counts
    #   "motion_clear"  -> clear that room's sensor
    #   "temperature"   -> thermostat.execute("measure", payload["value"]); if the heating state
    #                      changed, target.emit("heating", {"on": new_state})
    # Return the list of unsubscribe functions.


# Connect the hub's own bus and devices. Keep the result so the wiring can be undone.
