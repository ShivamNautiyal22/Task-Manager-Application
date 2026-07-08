from abc import ABC, abstractmethod


# ── Base Strategy interface ───────────────────────────────────────────────────

class SortStrategy(ABC):
    """All sorting strategies must implement apply()."""

    @abstractmethod
    def apply(self, queryset):
        """Takes a Django queryset, returns it sorted."""
        pass


# ── Concrete Strategies ───────────────────────────────────────────────────────

class SortByCreatedAt(SortStrategy):
    """Default: newest tasks first."""
    def apply(self, queryset):
        return queryset.order_by('-created_at')


class SortByDueDate(SortStrategy):
    """Tasks with the earliest due date first. Tasks with no due date go last."""
    def apply(self, queryset):
        # nulls_last puts tasks without due_date at the bottom
        from django.db.models import F
        return queryset.order_by(F('due_date').asc(nulls_last=True))


class SortByPriority(SortStrategy):
    """High priority first, then medium, then low."""
    def apply(self, queryset):
        # Django doesn't sort text fields by custom order natively,
        # so we use a CASE expression to map priority to a number.
        from django.db.models import Case, When, IntegerField
        return queryset.annotate(
            priority_order=Case(
                When(priority='high', then=1),
                When(priority='medium', then=2),
                When(priority='low', then=3),
                default=4,
                output_field=IntegerField(),
            )
        ).order_by('priority_order', '-created_at')


class SortByStatus(SortStrategy):
    """Todo first, then in_progress, then done."""
    def apply(self, queryset):
        from django.db.models import Case, When, IntegerField
        return queryset.annotate(
            status_order=Case(
                When(status='todo', then=1),
                When(status='in_progress', then=2),
                When(status='done', then=3),
                default=4,
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')


# ── Context: the thing that uses a strategy ───────────────────────────────────

class TaskSorter:
    # Map URL query param values to strategy classes
    STRATEGIES = {
        'created': SortByCreatedAt,
        'due_date': SortByDueDate,
        'priority': SortByPriority,
        'status': SortByStatus,
    }

    def __init__(self, strategy: SortStrategy = None):
        self._strategy = strategy or SortByCreatedAt()

    @classmethod
    def from_param(cls, param: str):
        strategy_class = cls.STRATEGIES.get(param, SortByCreatedAt)
        return cls(strategy=strategy_class())

    def sort(self, queryset):
        """Apply the strategy to the queryset and return sorted results."""
        return self._strategy.apply(queryset)