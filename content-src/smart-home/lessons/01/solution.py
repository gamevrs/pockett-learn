from dataclasses import dataclass
from enum import Enum


class Room(Enum):
    HALL = "hall"
    LIVING = "living"
    KITCHEN = "kitchen"
    BEDROOM = "bedroom"


class Kind(Enum):
    LIGHT = "light"
    THERMOSTAT = "thermostat"
    LOCK = "lock"
    MOTION = "motion"
    SPEAKER = "speaker"
    BLINDS = "blinds"


@dataclass(frozen=True)
class DeviceSpec:
    id: str
    kind: Kind
    room: Room
    label: str = ""

    @property
    def title(self) -> str:
        return self.label or self.id.replace("_", " ").title()


CATALOG: list[DeviceSpec] = [
    DeviceSpec("thermostat", Kind.THERMOSTAT, Room.LIVING),
    DeviceSpec("front_lock", Kind.LOCK, Room.HALL, label="Front door lock"),
    DeviceSpec("living_speaker", Kind.SPEAKER, Room.LIVING),
    DeviceSpec("living_blinds", Kind.BLINDS, Room.LIVING),
    DeviceSpec("bedroom_blinds", Kind.BLINDS, Room.BEDROOM),
]
CATALOG += [DeviceSpec(f"{room.value}_light", Kind.LIGHT, room) for room in Room]
CATALOG += [DeviceSpec(f"{room.value}_motion", Kind.MOTION, room) for room in Room]


def catalog() -> list[dict[str, str]]:
    return [
        {"id": spec.id, "kind": spec.kind.value, "room": spec.room.value, "title": spec.title}
        for spec in CATALOG
    ]
