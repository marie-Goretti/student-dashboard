from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient


class ApiRootAndBrowsableApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password123')

    def test_api_root_accessible_anonymously(self):
        response = self.client.get('/api/', HTTP_ACCEPT='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for key in ['auth/login', 'auth/refresh', 'students', 'academics', 'etl', 'dashboard']:
            self.assertIn(key, data)

    def test_api_root_html_browsable_api(self):
        response = self.client.get('/api/', HTTP_ACCEPT='text/html')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Django REST framework', response.content)

    def test_api_auth_login_page_exists(self):
        response = self.client.get('/api-auth/login/')
        self.assertEqual(response.status_code, 200)

    def test_students_browsable_api_authenticated_via_session(self):
        self.client.login(username='testuser', password='password123')
        response = self.client.get('/api/students/', HTTP_ACCEPT='text/html')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'niveaux', response.content)
        self.assertIn(b'etudiants', response.content)
