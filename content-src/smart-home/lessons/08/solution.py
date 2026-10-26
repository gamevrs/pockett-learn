import functools
import time
from collections import deque

call_entries: deque[str] = deque(maxlen=60)


def audit(line: str) -> None:
    call_entries.append(line)


def call_log() -> list[str]:
    return list(call_entries)


def _brief(value: Any, limit: int = 60) -> str:
    text = repr(value)
    return text if len(text) <= limit else text[: limit - 3] + "..."


def logged(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        shown = ", ".join([_brief(arg) for arg in args] + [f"{key}={_brief(val)}" for key, val in kwargs.items()])
        try:
            result = func(*args, **kwargs)
        except Exception as err:
            audit(f"{func.__name__}({shown}) raised {type(err).__name__}: {err}")
            raise
        audit(f"{func.__name__}({shown}) -> {_brief(result)}")
        return result

    return wrapper


def timed(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        started = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            elapsed_ms = (time.perf_counter() - started) * 1000
            audit(f"{func.__name__} took {elapsed_ms:.2f} ms")

    return wrapper


def retry(times: int = 3, on: tuple[type[BaseException], ...] = (Exception,)):
    if times < 1:
        raise ValueError("times must be at least 1")

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except on as err:
                    if attempt == times:
                        raise
                    audit(f"{func.__name__} failed ({err}); retry {attempt}/{times - 1}")

        return wrapper

    return decorator


command = logged(command)
run_routine = logged(run_routine)
run_preset = logged(run_preset)
motion_detected = logged(motion_detected)
