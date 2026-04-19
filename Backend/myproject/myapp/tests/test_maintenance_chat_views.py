from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from myapp.models import MaintenanceRequest, ProviderMessage
from myapp.view.maintenance_chat_views import (
    owner_send_maintenance_message,
    owner_get_maintenance_messages,
    provider_send_job_message,
    provider_get_job_messages,
    owner_delete_maintenance_message,
)

User = get_user_model()


class MaintenanceChatTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="Test123",
        )
        self.owner.role = "owner"
        self.owner.is_email_verified = True
        self.owner.save()

        self.provider = User.objects.create_user(
            username="provider1",
            email="provider1@example.com",
            password="Test123",
        )
        self.provider.role = "provider"
        self.provider.is_email_verified = True
        self.provider.save()

        self.other = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="Test123",
        )
        self.other.role = "owner"
        self.other.is_email_verified = True
        self.other.save()

        self.job = MaintenanceRequest.objects.create(
            owner=self.owner,
            assigned_provider=self.provider,
            title="Fix AC",
            description="AC not working",
            status="assigned",
        )

    def test_ut21_owner_send_message(self):
        request = self.factory.post(
            f"/api/owner/maintenance/{self.job.id}/messages/send/",
            {"text": "Please fix it soon"},
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = owner_send_maintenance_message(request, self.job.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["text"], "Please fix it soon")

    def test_ut22_provider_send_message(self):
        request = self.factory.post(
            f"/api/provider/maintenance/{self.job.id}/messages/send/",
            {"text": "I will come tomorrow"},
            format="json",
        )
        force_authenticate(request, user=self.provider)

        response = provider_send_job_message(request, self.job.id)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["text"], "I will come tomorrow")

    def test_ut23_owner_view_messages(self):
        ProviderMessage.objects.create(
            maintenance=self.job,
            owner=self.owner,
            provider=self.provider,
            sender=self.provider,
            text="Hello",
        )

        request = self.factory.get(
            f"/api/owner/maintenance/{self.job.id}/messages/"
        )
        force_authenticate(request, user=self.owner)

        response = owner_get_maintenance_messages(request, self.job.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_ut24_unauthorized_user_cannot_access(self):
        request = self.factory.get(
            f"/api/provider/maintenance/{self.job.id}/messages/"
        )
        force_authenticate(request, user=self.other)

        response = provider_get_job_messages(request, self.job.id)

        self.assertEqual(response.status_code, 403)

    def test_ut25_owner_delete_message(self):
        msg = ProviderMessage.objects.create(
            maintenance=self.job,
            owner=self.owner,
            provider=self.provider,
            sender=self.owner,
            text="Delete this",
        )

        request = self.factory.delete(
            f"/api/owner/maintenance/messages/{msg.id}/delete/"
        )
        force_authenticate(request, user=self.owner)

        response = owner_delete_maintenance_message(request, msg.id)

        self.assertEqual(response.status_code, 200)