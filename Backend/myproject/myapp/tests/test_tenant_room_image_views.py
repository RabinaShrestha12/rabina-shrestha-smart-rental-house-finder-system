from io import BytesIO
from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import TenantRoomImageSave

User = get_user_model()


def get_test_image(name="room.png"):
    file_obj = BytesIO()
    image = Image.new("RGB", (100, 100), "white")
    image.save(file_obj, "PNG")
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type="image/png")


class TenantRoomImageViewsTests(APITestCase):
    def setUp(self):
        self.tenant = User.objects.create_user(
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

        self.room_image = TenantRoomImageSave.objects.create(
            tenant=self.tenant,
            image=get_test_image("saved1.png"),
            image_name="My Saved Room",
            layout_data='{"items":[{"id":1,"x":10,"y":20}]}',
        )

        self.other_room_image = TenantRoomImageSave.objects.create(
            tenant=self.tenant2,
            image=get_test_image("saved2.png"),
            image_name="Other User Room",
            layout_data='{"items":[]}',
        )

    def test_ut01_tenant_can_view_own_saved_room_images(self):
        self.client.force_authenticate(user=self.tenant)

        url = "/api/tenant/virtual-furniture/room-images/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_ut02_tenant_only_sees_own_saved_room_images(self):
        self.client.force_authenticate(user=self.tenant)

        url = "/api/tenant/virtual-furniture/room-images/"
        response = self.client.get(url)

        ids = [item["id"] for item in response.data]
        self.assertIn(self.room_image.id, ids)
        self.assertNotIn(self.other_room_image.id, ids)

    def test_ut03_tenant_can_create_room_image_save(self):
        self.client.force_authenticate(user=self.tenant)

        url = "/api/tenant/virtual-furniture/room-images/"
        payload = {
            "image": get_test_image("newroom.png"),
            "image_name": "Bedroom Layout",
            "layout_data": '{"items":[{"id":2,"x":50,"y":60}]}',
        }

        response = self.client.post(url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            TenantRoomImageSave.objects.filter(
                tenant=self.tenant,
                image_name="Bedroom Layout"
            ).exists()
        )

    def test_ut04_room_image_create_requires_image(self):
        self.client.force_authenticate(user=self.tenant)

        url = "/api/tenant/virtual-furniture/room-images/"
        payload = {
            "image_name": "No Image Save",
            "layout_data": '{"items":[]}',
        }

        response = self.client.post(url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Image is required.")

    def test_ut05_image_name_defaults_to_uploaded_file_name(self):
        self.client.force_authenticate(user=self.tenant)

        url = "/api/tenant/virtual-furniture/room-images/"
        payload = {
            "image": get_test_image("auto_name.png"),
            "layout_data": '{"items":[]}',
        }

        response = self.client.post(url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["image_name"], "auto_name.png")

    def test_ut06_tenant_can_view_own_saved_room_image_detail(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.room_image.id)

    def test_ut07_tenant_cannot_view_other_users_saved_room_image_detail(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.other_room_image.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ut08_tenant_can_update_room_image_name(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.patch(
            url,
            {"image_name": "Updated Room Name"},
            format="multipart",
        )
        self.room_image.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.room_image.image_name, "Updated Room Name")

    def test_ut09_tenant_can_update_layout_data(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.patch(
            url,
            {"layout_data": '{"items":[{"id":5,"x":99,"y":88}]}'},
            format="multipart",
        )
        self.room_image.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.room_image.layout_data, '{"items":[{"id":5,"x":99,"y":88}]}')

    def test_ut10_tenant_can_update_image_file(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.patch(
            url,
            {"image": get_test_image("updated.png")},
            format="multipart",
        )
        self.room_image.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("updated.png", self.room_image.image.name)

    def test_ut11_updating_image_without_name_uses_new_file_name(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.patch(
            url,
            {"image": get_test_image("freshname.png")},
            format="multipart",
        )
        self.room_image.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.room_image.image_name, "freshname.png")

    def test_ut12_empty_layout_data_becomes_none(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.patch(
            url,
            {"layout_data": ""},
            format="multipart",
        )
        self.room_image.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(self.room_image.layout_data)

    def test_ut13_tenant_cannot_update_other_users_saved_room_image(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.other_room_image.id}/"
        response = self.client.patch(
            url,
            {"image_name": "Hack Name"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ut14_tenant_can_delete_own_saved_room_image(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Room image deleted successfully")
        self.assertFalse(TenantRoomImageSave.objects.filter(id=self.room_image.id).exists())

    def test_ut15_tenant_cannot_delete_other_users_saved_room_image(self):
        self.client.force_authenticate(user=self.tenant)

        url = f"/api/tenant/virtual-furniture/room-images/{self.other_room_image.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ut16_unauthenticated_user_cannot_view_saved_room_images(self):
        url = "/api/tenant/virtual-furniture/room-images/"
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut17_unauthenticated_user_cannot_create_saved_room_image(self):
        url = "/api/tenant/virtual-furniture/room-images/"
        response = self.client.post(
            url,
            {"image": get_test_image("unauth.png")},
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut18_unauthenticated_user_cannot_update_saved_room_image(self):
        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.patch(
            url,
            {"image_name": "Blocked"},
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut19_unauthenticated_user_cannot_delete_saved_room_image(self):
        url = f"/api/tenant/virtual-furniture/room-images/{self.room_image.id}/"
        response = self.client.delete(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )