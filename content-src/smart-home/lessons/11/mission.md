Right now the scene still pokes sensors and the thermostat directly. Move that knowledge into your code: when `motion` arrives the room's sensor triggers, when `motion_clear` arrives it resets, when `temperature` arrives the thermostat measures and announces `heating` if it switched.

After this lesson the scene only talks to the bus. Walk around, drag the outdoor temperature down and watch the heating events appear in the log. Use the "Send a bad reading" button to see the dead-letter box catch a broken event.
