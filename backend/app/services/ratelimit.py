"""A small in-memory rate limiter: at most `limit` requests per `window` seconds for each key.

It lives in the API's memory, so it resets when the server restarts and each copy of the
server counts separately. That is enough for one free instance. With several copies it
would move to Redis, keeping the same interface.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, limit: int, window: float):
        self.limit = limit
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str) -> bool:
        """Counts one request for this key. False means the limit is already used up."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True

    def check(self, key: str, message: str = "Too many tries. Please wait a few minutes.") -> None:
        if not self.hit(key):
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, message)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request) -> str:
    """The visitor's address. Behind Vercel and Render it is the first X-Forwarded-For entry."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
