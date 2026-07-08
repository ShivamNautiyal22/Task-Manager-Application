class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            # First time: create and store the instance
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        # Always return the stored instance
        return cls._instances[cls]


class TaskQueryManager(metaclass=SingletonMeta):
    def get_active_tasks(self, user):
        """Return all non-deleted tasks for a user."""
        from .models import Task
        return Task.objects.filter(user=user, is_deleted=False)

    def get_tasks_with_filters(self, user, status=None, priority=None,
                                category=None, search=None):
        """Return tasks filtered by optional parameters."""
        from .models import Task
        qs = Task.objects.filter(user=user, is_deleted=False)
        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if category:
            qs = qs.filter(category__icontains=category)
        if search:
            qs = qs.filter(title__icontains=search)
        return qs

    def get_task_by_id(self, user, pk):
        """Return a single task by ID, or None if not found."""
        from .models import Task
        try:
            return Task.objects.get(pk=pk, user=user, is_deleted=False)
        except Task.DoesNotExist:
            return None