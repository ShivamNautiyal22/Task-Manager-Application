from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Task, ActivityLog


# ── FR1: Register Account ──────────────────────────────────────────────────

class RegisterTests(APITestCase):
    def test_register_with_valid_data_creates_user(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'alice', 'email': 'alice@example.com',
            'password': 'password123', 'password2': 'password123',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='alice').exists())
        self.assertIn('access', response.data)

    def test_register_with_mismatched_passwords_is_rejected(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'bob', 'email': 'bob@example.com',
            'password': 'password123', 'password2': 'different456',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='bob').exists())

    def test_register_with_short_password_is_rejected(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'carl', 'email': 'carl@example.com',
            'password': '123', 'password2': '123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── FR2: Log In ─────────────────────────────────────────────────────────────

class LoginTests(APITestCase):
    def setUp(self):
        User.objects.create_user(username='alice', password='password123')

    def test_login_with_correct_credentials_returns_token_pair(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'alice', 'password': 'password123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_with_wrong_password_is_rejected(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'alice', 'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ── Shared base: an authenticated client for task-related tests ────────────

class AuthenticatedTaskTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='password123')
        login = self.client.post('/api/auth/login/', {
            'username': 'alice', 'password': 'password123',
        })
        self.access_token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')


# ── FR3: Create Task ─────────────────────────────────────────────────────────

class CreateTaskTests(AuthenticatedTaskTestCase):
    def test_create_task_with_valid_data(self):
        response = self.client.post('/api/tasks/', {
            'title': 'Write dissertation chapter', 'description': 'Chapter 9',
            'due_date': '2026-08-20', 'category': 'personal',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.count(), 1)
        self.assertEqual(Task.objects.first().user, self.user)

    def test_create_task_without_title_is_rejected(self):
        response = self.client.post('/api/tasks/', {'title': '   '})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Task.objects.count(), 0)

    def test_create_task_applies_smart_priority_default(self):
        response = self.client.post('/api/tasks/', {
            'title': 'Fix production bug', 'category': 'urgent',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['priority'], 'high')

    def test_create_task_requires_authentication(self):
        self.client.credentials()
        response = self.client.post('/api/tasks/', {'title': 'No auth'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ── FR4: View / Filter / Search / Sort Tasks ────────────────────────────────

class ListFilterSortTasksTests(AuthenticatedTaskTestCase):
    def setUp(self):
        super().setUp()
        self.client.post('/api/tasks/', {'title': 'Low task', 'priority': 'low'})
        self.client.post('/api/tasks/', {'title': 'High task', 'priority': 'high'})
        self.client.post('/api/tasks/', {'title': 'Medium task', 'priority': 'medium', 'status': 'done'})

    def test_list_returns_only_own_tasks(self):
        response = self.client.get('/api/tasks/')
        self.assertEqual(len(response.data), 3)

    def test_filter_by_status(self):
        response = self.client.get('/api/tasks/?status=done')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Medium task')

    def test_search_by_title(self):
        response = self.client.get('/api/tasks/?search=High')
        self.assertEqual(len(response.data), 1)

    def test_sort_by_priority(self):
        response = self.client.get('/api/tasks/?sort=priority')
        priorities = [t['priority'] for t in response.data]
        self.assertEqual(priorities, ['high', 'medium', 'low'])


# ── FR5 / FR6: Update Task Details / Move on Kanban Board ──────────────────

class UpdateTaskTests(AuthenticatedTaskTestCase):
    def setUp(self):
        super().setUp()
        created = self.client.post('/api/tasks/', {'title': 'Draft chapter'})
        self.task_id = created.data['id']

    def test_update_task_field(self):
        response = self.client.put(f'/api/tasks/{self.task_id}/', {'title': 'Draft chapter 9'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Task.objects.get(id=self.task_id).title, 'Draft chapter 9')

    def test_status_change_logs_status_changed_event(self):
        self.client.put(f'/api/tasks/{self.task_id}/', {'status': 'in_progress'})
        log = ActivityLog.objects.filter(task_id=self.task_id, action='status_changed').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.detail, 'todo → in_progress')

    def test_non_status_update_logs_updated_event_not_status_changed(self):
        self.client.put(f'/api/tasks/{self.task_id}/', {'description': 'Add references'})
        self.assertTrue(ActivityLog.objects.filter(task_id=self.task_id, action='updated').exists())
        self.assertFalse(ActivityLog.objects.filter(task_id=self.task_id, action='status_changed').exists())


# ── FR7 / FR8: Delete Task (soft) + Activity Log ────────────────────────────

class DeleteTaskTests(AuthenticatedTaskTestCase):
    def setUp(self):
        super().setUp()
        created = self.client.post('/api/tasks/', {'title': 'Old task'})
        self.task_id = created.data['id']

    def test_delete_soft_deletes_not_removes(self):
        response = self.client.delete(f'/api/tasks/{self.task_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        task = Task.objects.get(id=self.task_id)
        self.assertTrue(task.is_deleted)

    def test_deleted_task_excluded_from_list(self):
        self.client.delete(f'/api/tasks/{self.task_id}/')
        response = self.client.get('/api/tasks/')
        self.assertEqual(len(response.data), 0)

    def test_delete_logs_activity(self):
        self.client.delete(f'/api/tasks/{self.task_id}/')
        self.assertTrue(ActivityLog.objects.filter(task_id=self.task_id, action='deleted').exists())

    def test_activity_log_survives_after_task_deleted(self):
        self.client.delete(f'/api/tasks/{self.task_id}/')
        create_log = ActivityLog.objects.filter(task_id=self.task_id, action='deleted').first()
        self.assertEqual(create_log.task_title, 'Old task')


# ── FR9: View Task Statistics ────────────────────────────────────────────────

class StatsTests(AuthenticatedTaskTestCase):
    def test_stats_reflect_task_counts(self):
        self.client.post('/api/tasks/', {'title': 'A'})
        created = self.client.post('/api/tasks/', {'title': 'B'})
        self.client.put(f"/api/tasks/{created.data['id']}/", {'status': 'done'})

        response = self.client.get('/api/tasks/stats/')
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['done'], 1)
        self.assertEqual(response.data['completion_rate'], 50.0)