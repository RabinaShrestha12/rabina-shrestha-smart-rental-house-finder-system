from io import BytesIO
from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import FurnitureItem

User = get_user_model()


def get_test_image():
    file_obj = BytesIO()
    image = Image.new("RGB", (100, 100), "white")
    image.save(file_obj, "PNG")
    file_obj.seek(0)
    return SimpleUploadedFile(
        "test.png",
        file_obj.read(),
        content_type="image/png"
    )


class FurnitureViewsTests(APITestCase):
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

        self.item = FurnitureItem.objects.create(
            name="Wooden Chair",
            category="Chair",
            furniture_type="Dining Chair",
            color="Brown",
            image=get_test_image(),
            width=120,
            height=120,
            is_active=True,
        )

        self.inactive_item = FurnitureItem.objects.create(
            name="Old Sofa",
            category="Sofa",
            furniture_type="Single Sofa",
            color="Gray",
            image=get_test_image(),
            width=140,
            height=140,
            is_active=False,
        )

    def test_ut01_any_user_can_view_active_furniture_list(self):
        url = reverse("furniture_list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Wooden Chair")

    def test_ut02_furniture_list_shows_only_active_items(self):
        url = reverse("furniture_list")
        response = self.client.get(url)

        names = [item["name"] for item in response.data]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Wooden Chair", names)
        self.assertNotIn("Old Sofa", names)

    def test_ut03_admin_can_create_furniture(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("furniture_create")
        payload = {
            "name": "Study Table",
            "category": "Table",
            "furniture_type": "Office Table",
            "color": "Black",
            "image": get_test_image(),
            "width": 150,
            "height": 100,
            "is_active": True,
        }

        response = self.client.post(url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FurnitureItem.objects.filter(name="Study Table").exists())

    def test_ut04_non_admin_cannot_create_furniture(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("furniture_create")
        payload = {
            "name": "Study Table",
            "category": "Table",
            "furniture_type": "Office Table",
            "color": "Black",
            "image": get_test_image(),
            "width": 150,
            "height": 100,
            "is_active": True,
        }

        response = self.client.post(url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only admin can add furniture.")

    def test_ut05_furniture_create_fails_with_invalid_data(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("furniture_create")
        payload = {
            "name": "",
            "category": "Chair",
            "width": "",
            "height": "",
        }

        response = self.client.post(url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut06_admin_can_update_furniture(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("furniture_update", args=[self.item.id])
        payload = {
            "name": "Updated Wooden Chair",
            "color": "Dark Brown",
        }

        response = self.client.patch(url, payload, format="json")
        self.item.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.item.name, "Updated Wooden Chair")
        self.assertEqual(self.item.color, "Dark Brown")

    def test_ut07_non_admin_cannot_update_furniture(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("furniture_update", args=[self.item.id])
        response = self.client.patch(url, {"name": "No Update"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only admin can update furniture.")

    def test_ut08_update_fails_for_missing_furniture(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("furniture_update", args=[99999])
        response = self.client.patch(url, {"name": "No Item"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Furniture not found.")

    def test_ut09_admin_can_delete_furniture(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("furniture_delete", args=[self.item.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(FurnitureItem.objects.filter(id=self.item.id).exists())

    def test_ut10_non_admin_cannot_delete_furniture(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("furniture_delete", args=[self.item.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only admin can delete furniture.")

    def test_ut11_delete_fails_for_missing_furniture(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("furniture_delete", args=[99999])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Furniture not found.")

    def test_ut12_unauthenticated_user_cannot_create_furniture(self):
        url = reverse("furniture_create")
        response = self.client.post(url, {}, format="multipart")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut13_unauthenticated_user_cannot_update_furniture(self):
        url = reverse("furniture_update", args=[self.item.id])
        response = self.client.patch(url, {"name": "Test"}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut14_unauthenticated_user_cannot_delete_furniture(self):
        url = reverse("furniture_delete", args=[self.item.id])
        response = self.client.delete(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )