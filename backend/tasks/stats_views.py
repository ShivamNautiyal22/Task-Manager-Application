from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Task, ActivityLog
from .serializers import ActivityLogSerializer


@api_view(['GET'])
def task_stats(request):
    user = request.user
    tasks = Task.objects.filter(user=user, is_deleted=False)

    total = tasks.count()
    done = tasks.filter(status='done').count()
    in_progress = tasks.filter(status='in_progress').count()
    todo = tasks.filter(status='todo').count()
    completion_rate = round((done / total * 100), 1) if total > 0 else 0

    today = timezone.now().date()
    next_week = today + timedelta(days=7)
    due_this_week = tasks.filter(
        due_date__gte=today,
        due_date__lte=next_week,
    ).count()

    streak = calculate_streak(user)

    return Response({
        'total': total,
        'done': done,
        'in_progress': in_progress,
        'todo': todo,
        'completion_rate': completion_rate,
        'due_this_week': due_this_week,
        'streak': streak,
    })


def calculate_streak(user):
    logs = ActivityLog.objects.filter(
        user=user,
        action='status_changed',
        detail__contains='→ done',
    ).order_by('-timestamp')

    if not logs.exists():
        return 0

    streak = 0
    today = timezone.now().date()
    check_date = today
    active_dates = set(log.timestamp.date() for log in logs)

    while check_date in active_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak


@api_view(['GET'])
def activity_log(request):
    logs = ActivityLog.objects.filter(user=request.user)[:50]
    serializer = ActivityLogSerializer(logs, many=True)
    return Response(serializer.data)