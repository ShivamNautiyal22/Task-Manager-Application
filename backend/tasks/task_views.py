from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

# ── Import our design patterns ────────────────────────────────────────────────
from .singleton import TaskQueryManager    # Pattern 1: Singleton
from .observers import task_publisher      # Pattern 2: Observer
from .strategies import TaskSorter         # Pattern 3: Strategy
from .factory import TaskFactory           # Pattern 4: Factory
from .serializers import TaskSerializer

# The Singleton: one shared query manager instance for all views
query_manager = TaskQueryManager()


@api_view(['GET', 'POST'])
def task_list_create(request):
    """
    GET  /api/tasks/ — List tasks (uses Singleton + Strategy)
    POST /api/tasks/ — Create task (uses Factory + Observer)
    """

    if request.method == 'GET':
        # Pattern 1 (Singleton): use the single shared manager to filter
        tasks = query_manager.get_tasks_with_filters(
            user=request.user,
            status=request.query_params.get('status'),
            priority=request.query_params.get('priority'),
            category=request.query_params.get('category'),
            search=request.query_params.get('search'),
        )

        # Pattern 3 (Strategy): sort by whatever the user requests
        # e.g. /api/tasks/?sort=priority or ?sort=due_date
        sort_param = request.query_params.get('sort', 'created')
        sorter = TaskSorter.from_param(sort_param)
        tasks = sorter.sort(tasks)

        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        try:
            # Pattern 4 (Factory): factory creates the task with smart defaults
            task = TaskFactory.create(user=request.user, data=request.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Pattern 2 (Observer): notify all observers (writes to ActivityLog)
        task_publisher.notify('created', request.user, task)

        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
def task_detail(request, pk):
    """
    GET    /api/tasks/:id/ — Get single task  (uses Singleton)
    PUT    /api/tasks/:id/ — Update task      (uses Observer)
    DELETE /api/tasks/:id/ — Soft-delete task (uses Observer)
    """

    # Pattern 1 (Singleton): use shared manager to find the task
    task = query_manager.get_task_by_id(user=request.user, pk=pk)
    if task is None:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)

    elif request.method == 'PUT':
        old_status = task.status
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()
            new_status = updated_task.status

            # Pattern 2 (Observer): fire the right event
            if old_status != new_status:
                task_publisher.notify(
                    'status_changed', request.user, updated_task,
                    detail=f'{old_status} → {new_status}'
                )
            else:
                task_publisher.notify('updated', request.user, updated_task)

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        task.is_deleted = True
        task.save()

        # Pattern 2 (Observer): fire deleted event
        task_publisher.notify('deleted', request.user, task)

        return Response({'message': 'Task deleted.'}, status=status.HTTP_204_NO_CONTENT)