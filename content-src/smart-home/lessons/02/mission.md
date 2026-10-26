The plan lists devices, but they are only labels. To bring one to life it needs behaviour, and the hub needs one way to talk to all of them.

Write the `Device` contract, then the first real device: a `Light` with a dimmer. Build every light in the catalog from your `FACTORIES` table and expose a `snapshot()` the scene can poll. The lights glow in their rooms, and you can click one to switch it.
