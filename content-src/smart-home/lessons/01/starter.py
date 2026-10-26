# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: describe the house.
from dataclasses import dataclass
from enum import Enum


class Room(Enum):
    ...  # HALL, LIVING, KITCHEN, BEDROOM: each value is the lowercase name, e.g. "hall"


class Kind(Enum):
    ...  # LIGHT, THERMOSTAT, LOCK, MOTION, SPEAKER, BLINDS: lowercase values too


@dataclass(frozen=True)
class DeviceSpec:
    ...  # fields: id: str, kind: Kind, room: Room, label: str = ""
    # then a read-only property called title: the label, or the id made readable


CATALOG = []
# 1. add the five one-off devices (thermostat, front_lock, living_speaker, living_blinds, bedroom_blinds)
# 2. add one light and one motion sensor per room with two comprehensions over Room


def catalog():
    ...  # a list of plain dicts: id, kind, room, title (all strings)
