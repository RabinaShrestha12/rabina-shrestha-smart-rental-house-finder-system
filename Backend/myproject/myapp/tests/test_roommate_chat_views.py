from io import BytesIO
from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import (
    RoommateRequest,
    RoommateChatThread,
    RoommateChatMessage,
)

User = get_user_model()


def get_test_image(name="test.png"):
    file_obj = BytesIO()
    image = Image.new("RGB", (100, 100), "white")
    image.save(file_obj, "PNG")
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type="image/png")


class RoommateChatViewsTests(APITestCase):
    def setUp(self):
        self.tenant1 = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )
        self.tenant2 = User.objects.create_user(
            username="tenant2",
            email="tenant2@example.com",
            password="TestPass123!",
            role="tenant",
        )
        self.tenant3 = User.objects.create_user(
            username="tenant3",
            email="tenant3@example.com",
            password="TestPass123!",
            role="tenant",
        )
        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
        )

        self.roommate_request = RoommateRequest.objects.create(
            from_user=self.tenant1,
            to_user=self.tenant2,
            message="Let us be roommates",
            status="accepted",
        )

        self.thread = RoommateChatThread.objects.create(
            user1=self.tenant1,
            user2=self.tenant2,
        )

        self.message1 = RoommateChatMessage.objects.create(
            thread=self.thread,
            sender=self.tenant1,
            text="Hello roommate",
        )

        self.message2 = RoommateChatMessage.objects.create(
            thread=self.thread,
            sender=self.tenant2,
            text="Hi there",
            is_read=False,
        )

    # -----------------------------
    # SYNC THREADS
    # -----------------------------
    def test_ut01_tenant_can_sync_threads(self):
        self.client.force_authenticate(user=self.tenant1)

        url = "/api/tenant/roommates/chats/sync/"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("created_thread_ids", response.data)

    def test_ut02_non_tenant_cannot_sync_threads(self):
        self.client.force_authenticate(user=self.owner)

        url = "/api/tenant/roommates/chats/sync/"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -----------------------------
    # MY THREADS
    # -----------------------------
    def test_ut03_tenant_can_view_own_threads(self):
        self.client.force_authenticate(user=self.tenant1)

        url = "/api/tenant/roommates/chats/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_ut04_other_tenant_sees_only_own_threads(self):
        self.client.force_authenticate(user=self.tenant3)

        url = "/api/tenant/roommates/chats/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    # -----------------------------
    # THREAD MESSAGES
    # -----------------------------
    def test_ut05_tenant_can_view_thread_messages(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/messages/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["thread_id"], self.thread.id)
        self.assertEqual(len(response.data["results"]), 2)

    def test_ut06_viewing_thread_marks_incoming_messages_read(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/messages/"
        response = self.client.get(url)

        self.message2.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.message2.is_read)

    def test_ut07_thread_messages_returns_404_for_missing_thread(self):
        self.client.force_authenticate(user=self.tenant1)

        url = "/api/tenant/roommates/chats/99999/messages/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Thread not found")

    def test_ut08_unrelated_tenant_cannot_view_thread_messages(self):
        self.client.force_authenticate(user=self.tenant3)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/messages/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Not allowed")

    # -----------------------------
    # SEND MESSAGE
    # -----------------------------
    def test_ut09_tenant_can_send_text_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/send/"
        response = self.client.post(url, {"text": "New message"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            RoommateChatMessage.objects.filter(thread=self.thread, text="New message").exists()
        )

    def test_ut10_tenant_can_send_image_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/send/"
        response = self.client.post(
            url,
            {"image": get_test_image("chat.png")},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_ut11_send_message_requires_text_or_image(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/send/"
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "text or image is required")

    def test_ut12_send_message_returns_404_for_missing_thread(self):
        self.client.force_authenticate(user=self.tenant1)

        url = "/api/tenant/roommates/chats/99999/send/"
        response = self.client.post(url, {"text": "Hello"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Thread not found")

    def test_ut13_unrelated_tenant_cannot_send_message(self):
        self.client.force_authenticate(user=self.tenant3)

        url = f"/api/tenant/roommates/chats/{self.thread.id}/send/"
        response = self.client.post(url, {"text": "Hack"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Not allowed")

    # -----------------------------
    # UPDATE MESSAGE
    # -----------------------------
    def test_ut14_sender_can_update_own_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{self.message1.id}/update/"
        response = self.client.patch(url, {"text": "Updated text"}, format="json")
        self.message1.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.message1.text, "Updated text")

    def test_ut15_user_cannot_update_other_users_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{self.message2.id}/update/"
        response = self.client.patch(url, {"text": "Hack update"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "You can only update your own message")

    def test_ut16_update_returns_404_for_missing_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = "/api/tenant/roommates/messages/99999/update/"
        response = self.client.patch(url, {"text": "Hello"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Message not found")

    def test_ut17_unrelated_tenant_cannot_update_message(self):
        self.client.force_authenticate(user=self.tenant3)

        url = f"/api/tenant/roommates/messages/{self.message1.id}/update/"
        response = self.client.patch(url, {"text": "Hack"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Not allowed")

    def test_ut18_update_message_can_remove_image(self):
        msg = RoommateChatMessage.objects.create(
            thread=self.thread,
            sender=self.tenant1,
            text="With image",
            image=get_test_image("old.png"),
        )

        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{msg.id}/update/"
        response = self.client.patch(url, {"remove_image": True}, format="json")

        msg.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(bool(msg.image))

    def test_ut19_update_message_cannot_become_empty(self):
        msg = RoommateChatMessage.objects.create(
            thread=self.thread,
            sender=self.tenant1,
            text="To empty",
        )

        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{msg.id}/update/"
        response = self.client.patch(url, {"text": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Message cannot be empty. Add text or image.")

    def test_ut20_update_message_with_no_changes_returns_error(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{self.message1.id}/update/"
        response = self.client.patch(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "No changes provided.")

    # -----------------------------
    # DELETE MESSAGE
    # -----------------------------
    def test_ut21_sender_can_delete_own_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{self.message1.id}/delete/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(RoommateChatMessage.objects.filter(id=self.message1.id).exists())

    def test_ut22_user_cannot_delete_other_users_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = f"/api/tenant/roommates/messages/{self.message2.id}/delete/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "You can only delete your own message")

    def test_ut23_delete_returns_404_for_missing_message(self):
        self.client.force_authenticate(user=self.tenant1)

        url = "/api/tenant/roommates/messages/99999/delete/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Message not found")

    def test_ut24_unrelated_tenant_cannot_delete_message(self):
        self.client.force_authenticate(user=self.tenant3)

        url = f"/api/tenant/roommates/messages/{self.message1.id}/delete/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Not allowed")

    # -----------------------------
    # AUTH
    # -----------------------------
    def test_ut25_unauthenticated_user_cannot_view_threads(self):
        url = "/api/tenant/roommates/chats/"
        response = self.client.get(url)

        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_ut26_non_tenant_cannot_view_threads(self):
        self.client.force_authenticate(user=self.owner)

        url = "/api/tenant/roommates/chats/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)