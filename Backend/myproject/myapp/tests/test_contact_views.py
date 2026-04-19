from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import ContactMessage

User = get_user_model()


class ContactViewsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin1",
            email="admin@example.com",
            password="TestPass123!",
            role="admin",
        )

        self.owner = User.objects.create_user(
            username="owner1",
            email="owner@example.com",
            password="TestPass123!",
            role="owner",
        )

        self.contact = ContactMessage.objects.create(
            name="Kechan Shrestha",
            email="kechan@example.com",
            phone="9800000000",
            subject="Test Subject",
            message="This is a test contact message.",
        )

    def test_ut01_public_user_can_submit_contact_message(self):
        url = reverse("public_contact_create")
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "9811111111",
            "subject": "Need help",
            "message": "Please contact me back.",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["detail"], "Contact message submitted successfully.")
        self.assertTrue(
            ContactMessage.objects.filter(email="john@example.com").exists()
        )

    def test_ut02_contact_message_creation_fails_with_invalid_data(self):
        url = reverse("public_contact_create")
        payload = {
            "name": "",
            "email": "invalid-email",
            "phone": "",
            "subject": "",
            "message": "",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut03_admin_can_view_contact_messages(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("admin_contact_messages")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_ut04_non_admin_cannot_view_contact_messages(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("admin_contact_messages")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["detail"],
            "You do not have permission to view contact messages."
        )

    def test_ut05_unauthenticated_user_cannot_view_admin_contact_messages(self):
        url = reverse("admin_contact_messages")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )