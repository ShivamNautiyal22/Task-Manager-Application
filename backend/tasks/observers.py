from abc import ABC, abstractmethod


# ── Base Observer interface ──────────────────────────────────────────────────

class BaseObserver(ABC):
    @abstractmethod
    def update(self, event: str, user, task, detail: str = ''):
        """Called by the publisher when an event occurs."""
        pass


# ── Concrete Observer: writes to ActivityLog ─────────────────────────────────

class ActivityLogObserver(BaseObserver):

    def update(self, event: str, user, task, detail: str = ''):
        from .models import ActivityLog
        ActivityLog.objects.create(
            user=user,
            task=task,
            task_title=task.title,
            action=event,
            detail=detail,
        )


# ── Publisher: the thing views call ──────────────────────────────────────────

class EventPublisher:
    def __init__(self):
        self._observers: list[BaseObserver] = []

    def register(self, observer: BaseObserver):
        """Add an observer to the notification list."""
        self._observers.append(observer)

    def notify(self, event: str, user, task, detail: str = ''):
        """Tell every registered observer that an event occurred."""
        for observer in self._observers:
            observer.update(event, user, task, detail)

task_publisher = EventPublisher()
task_publisher.register(ActivityLogObserver())