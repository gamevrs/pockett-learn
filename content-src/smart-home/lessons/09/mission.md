Time to replace the pile of callbacks with a real **event bus**. Everything that happens in the house (movement, doors, temperature, the clock) becomes an event with a name and a payload, and anything can listen.

Build the bus, give it a log, and attach the first listener. In the scene, the Event log streams every message as you walk, open the door or move the clock.
