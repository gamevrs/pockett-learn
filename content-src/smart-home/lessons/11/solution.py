def wire_home(target: EventBus, devs: dict[str, Device]) -> list[Callable[[], None]]:
    """Connect each device to the events it cares about. Returns the unsubscribe handles."""

    def sensor_for(event: Event) -> Device | None:
        return devs.get(f"{event.payload.get('room')}_motion")

    def on_motion(event: Event) -> None:
        sensor = sensor_for(event)
        if sensor is not None:
            sensor.execute("trigger")

    def on_motion_clear(event: Event) -> None:
        sensor = sensor_for(event)
        if sensor is not None:
            sensor.execute("clear")

    def on_visit(event: Event) -> None:
        room = event.payload.get("room")
        if room in visit_counts:
            count_visit(room)

    def on_temperature(event: Event) -> None:
        thermostat = devs.get("thermostat")
        if thermostat is None:
            return
        was_heating = thermostat.heating
        thermostat.execute("measure", event.payload["value"])
        if thermostat.heating != was_heating:
            target.emit("heating", {"on": thermostat.heating})

    return [
        target.subscribe("motion", on_motion),
        target.subscribe("motion", on_visit),
        target.subscribe("motion_clear", on_motion_clear),
        target.subscribe("temperature", on_temperature),
    ]


wiring = wire_home(bus, devices)
