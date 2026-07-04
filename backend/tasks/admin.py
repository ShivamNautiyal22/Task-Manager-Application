from django.contrib import admin
from .models import Task, ActivityLog

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'status', 'priority', 'due_date', 'is_deleted']
    list_filter = ['status', 'priority', 'is_deleted']

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'task_title', 'timestamp']