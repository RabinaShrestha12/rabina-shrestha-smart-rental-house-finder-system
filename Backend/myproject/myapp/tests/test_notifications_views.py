from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import Notification

User = get_user_model()


class NotificationsViewsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )

        self.other_user = User.objects.create_user(
            username="tenant2",
            email="tenant2@example.com",
            password="TestPass123!",
            role="tenant",
        )

        self.notification1 = Notification.objects.create(
            user=self.user,
            title="Payment successful",
            message="Your payment was successful.",
            notification_type="general",
            is_read=False,
            link="/tenant/payments/",
        )

        self.notification2 = Notification.objects.create(
            user=self.user,
            title="Contract updated",
            message="Your contract has been updated.",
            notification_type="general",
            is_read=False,
            link="/tenant/contracts/",
        )

        self.other_notification = Notification.objects.create(
            user=self.other_user,
            title="Other user notification",
            message="This belongs to another user.",
            notification_type="general",
            is_read=False,
            link="/other/",
        )

    # -----------------------------
    # NOTIFICATIONS
    # -----------------------------
    def test_ut01_user_can_view_own_notifications(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("my_notifications")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_ut02_user_only_sees_own_notifications(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("my_notifications")
        response = self.client.get(url)

        ids = [item["id"] for item in response.data]
        self.assertIn(self.notification1.id, ids)
        self.assertIn(self.notification2.id, ids)
        self.assertNotIn(self.other_notification.id, ids)

    def test_ut03_user_can_mark_own_notification_as_read(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("mark_notification_read", args=[self.notification1.id])
        response = self.client.post(url)

        self.notification1.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.notification1.is_read)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["notif_id"], self.notification1.id)

    def test_ut04_user_cannot_mark_other_users_notification_as_read(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("mark_notification_read", args=[self.other_notification.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Notification not found.")

    def test_ut05_mark_notification_read_works_with_patch(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("mark_notification_read", args=[self.notification2.id])
        response = self.client.patch(url, {}, format="json")

        self.notification2.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.notification2.is_read)

    # -----------------------------
    # REMINDERS
    # -----------------------------
    def test_ut06_user_can_create_reminder_placeholder(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("create_reminder")
        payload = {
            "title": "Pay rent",
            "amount": "12000",
            "due_date": "2026-04-30",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["message"], "Reminder created (placeholder)")

    def test_ut07_user_can_view_reminders_placeholder(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("my_reminders")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_ut08_user_can_update_reminder_placeholder(self):
        self.client.force_authenticate(user=self.user)

        url = reverse("update_reminder", args=[1])
        payload = {
            "title": "Updated reminder",
            "amount": "1000",
        }

        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ok"], True)
        self.assertEqual(response.data["reminder_id"], 1)

    # -----------------------------
    # AUTH
    # -----------------------------
    def test_ut09_unauthenticated_user_cannot_view_notifications(self):
        url = reverse("my_notifications")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut10_unauthenticated_user_cannot_mark_notification_read(self):
        url = reverse("mark_notification_read", args=[self.notification1.id])
        response = self.client.post(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut11_unauthenticated_user_cannot_create_reminder(self):
        url = reverse("create_reminder")
        response = self.client.post(url, {"title": "Test"}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut12_unauthenticated_user_cannot_view_reminders(self):
        url = reverse("my_reminders")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut13_unauthenticated_user_cannot_update_reminder(self):
        url = reverse("update_reminder", args=[1])
        response = self.client.patch(url, {"title": "Test"}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )