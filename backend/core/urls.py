from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from tasks.auth_views import register_view, me_view
from tasks.task_views import task_list_create, task_detail
from tasks.stats_views import task_stats, activity_log

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/register/', register_view),
    path('api/auth/login/', TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/', me_view),

    path('api/tasks/', task_list_create),
    path('api/tasks/stats/', task_stats),      # MUST come before <int:pk>
    path('api/tasks/<int:pk>/', task_detail),

    path('api/activity-log/', activity_log),
]