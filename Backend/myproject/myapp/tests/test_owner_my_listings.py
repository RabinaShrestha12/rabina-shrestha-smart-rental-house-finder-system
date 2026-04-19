from io import BytesIO
from PIL import Image

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import Listing, PropertyGalleryImage

User = get_user_model()


def get_test_image(name="test.png"):
    file_obj = BytesIO()
    image = Image.new("RGB", (100, 100), "white")
    image.save(file_obj, "PNG")
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type="image/png")


class OwnerMyListingsTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
        )

        self.owner2 = User.objects.create_user(
            username="owner2",
            email="owner2@example.com",
            password="TestPass123!",
            role="owner",
        )

        self.tenant = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123!",
            role="tenant",
        )

        self.listing = Listing.objects.create(
            owner=self.owner,
            title="Test Room",
            description="Nice room",
            property_type="room",
            price_per_month=12000,
            location="Kathmandu",
        )

        self.other_listing = Listing.objects.create(
            owner=self.owner2,
            title="Other Room",
            description="Another room",
            property_type="flat",
            price_per_month=15000,
            location="Pokhara",
        )

        self.gallery1 = PropertyGalleryImage.objects.create(
            listing=self.listing,
            image=get_test_image("gallery1.png"),
        )

        self.gallery2 = PropertyGalleryImage.objects.create(
            listing=self.listing,
            image=get_test_image("gallery2.png"),
        )

    def test_ut01_owner_can_view_own_listings(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listings")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Test Room")

    def test_ut02_owner_only_sees_own_listings(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listings")
        response = self.client.get(url)

        ids = [item["id"] for item in response.data]
        self.assertIn(self.listing.id, ids)
        self.assertNotIn(self.other_listing.id, ids)

    def test_ut03_owner_can_view_own_listing_detail(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_detail", args=[self.listing.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.listing.id)

    def test_ut04_owner_cannot_view_other_owner_listing_detail(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_detail", args=[self.other_listing.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Not found.")

    def test_ut05_owner_can_update_own_listing(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_update", args=[self.listing.id])
        payload = {
            "title": "Updated Test Room",
            "location": "Lalitpur",
            "price_per_month": "14000.00",
        }

        response = self.client.patch(url, payload, format="json")
        self.listing.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.listing.title, "Updated Test Room")
        self.assertEqual(self.listing.location, "Lalitpur")

    def test_ut06_owner_cannot_update_other_owner_listing(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_update", args=[self.other_listing.id])
        response = self.client.patch(url, {"title": "Hack"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Not found.")

    def test_ut07_owner_update_fails_with_invalid_data(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_update", args=[self.listing.id])
        response = self.client.patch(url, {"title": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ut08_owner_can_add_gallery_images_during_update(self):
        self.client.force_authenticate(user=self.owner)

        old_count = PropertyGalleryImage.objects.filter(listing=self.listing).count()

        url = reverse("owner_my_listing_update", args=[self.listing.id])
        payload = {
            "title": "Test Room",
            "gallery_images": [get_test_image("new1.png"), get_test_image("new2.png")],
        }

        response = self.client.patch(url, payload, format="multipart")

        new_count = PropertyGalleryImage.objects.filter(listing=self.listing).count()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(new_count, old_count + 2)

    def test_ut09_owner_can_remove_selected_gallery_images(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_update", args=[self.listing.id])
        payload = {
            "remove_gallery_image_ids": [self.gallery1.id],
        }

        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            PropertyGalleryImage.objects.filter(id=self.gallery1.id).exists()
        )
        self.assertTrue(
            PropertyGalleryImage.objects.filter(id=self.gallery2.id).exists()
        )

    def test_ut10_invalid_remove_gallery_image_ids_are_ignored(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_update", args=[self.listing.id])
        payload = {
            "remove_gallery_image_ids": ["abc", "xyz"],
        }

        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            PropertyGalleryImage.objects.filter(id=self.gallery1.id).exists()
        )
        self.assertTrue(
            PropertyGalleryImage.objects.filter(id=self.gallery2.id).exists()
        )

    def test_ut11_owner_can_delete_own_listing(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_delete", args=[self.listing.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Deleted successfully.")
        self.assertFalse(Listing.objects.filter(id=self.listing.id).exists())

    def test_ut12_owner_cannot_delete_other_owner_listing(self):
        self.client.force_authenticate(user=self.owner)

        url = reverse("owner_my_listing_delete", args=[self.other_listing.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Not found.")

    def test_ut13_unauthenticated_user_cannot_view_owner_listings(self):
        url = reverse("owner_my_listings")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut14_unauthenticated_user_cannot_view_owner_listing_detail(self):
        url = reverse("owner_my_listing_detail", args=[self.listing.id])
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut15_unauthenticated_user_cannot_update_owner_listing(self):
        url = reverse("owner_my_listing_update", args=[self.listing.id])
        response = self.client.patch(url, {"title": "Test"}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_ut16_unauthenticated_user_cannot_delete_owner_listing(self):
        url = reverse("owner_my_listing_delete", args=[self.listing.id])
        response = self.client.delete(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )