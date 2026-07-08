from .models import Task

class TaskFactory:

    # Default priority per category keyword (optional smart defaults)
    CATEGORY_PRIORITY_MAP = {
        'urgent': 'high',
        'work': 'high',
        'personal': 'low',
        'shopping': 'low',
    }

    @classmethod
    def create(cls, user, data: dict) -> Task:
        """
        Create and save a new Task.
        Applies smart defaults if values are missing.
        """
        title = data.get('title', '').strip()
        if not title:
            raise ValueError("Task title cannot be empty.")

        category = data.get('category', '').strip().lower()

        # Smart default: if category matches a known keyword and no priority given,
        # auto-set the priority
        priority = data.get('priority', '')
        if not priority:
            priority = cls.CATEGORY_PRIORITY_MAP.get(category, 'medium')

        task = Task.objects.create(
            user=user,
            title=title,
            description=data.get('description', '').strip(),
            priority=priority,
            status=data.get('status', 'todo'),
            due_date=data.get('due_date') or None,
            category=category,
        )
        return task
