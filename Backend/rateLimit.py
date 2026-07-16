"""Small in-process safety limiter. Use a shared Redis/API-gateway limiter in production."""
from collections import defaultdict, deque
from threading import Lock
from time import monotonic


class SlidingWindowLimiter:
    def __init__(self):
        self._requests = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int = 60) -> int | None:
        now = monotonic()
        with self._lock:
            entries = self._requests[key]
            while entries and entries[0] <= now - window_seconds:
                entries.popleft()
            if len(entries) >= limit:
                return max(1, int(window_seconds - (now - entries[0])) + 1)
            entries.append(now)
        return None


limiter = SlidingWindowLimiter()
