from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from myapp.models import Listing
from myapp.view.ai_suggestions_views import tenant_ai_suggest_nearby

User = get_user_model()


class AISuggestionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.tenant = User.objects.create_user(
            username="tenant_ai",
            email="tenant_ai@example.com",
            password="TestPass123",
        )
        self.tenant.role = "tenant"
        self.tenant.is_email_verified = True
        self.tenant.save()

        self.owner = User.objects.create_user(
            username="owner_ai",
            email="owner_ai@example.com",
            password="TestPass123",
        )
        self.owner.role = "owner"
        self.owner.is_email_verified = True
        self.owner.save()

        self.listing1 = Listing.objects.create(
            owner=self.owner,
            title="Room Near City",
            location="Sydney",
            price_per_month=500,
            property_type="room",
            latitude=-33.8688,
            longitude=151.2093,
            is_available=True,
            status="available",
        )

        self.listing2 = Listing.objects.create(
            owner=self.owner,
            title="Expensive Apartment",
            location="Sydney",
            price_per_month=1500,
            property_type="apartment",
            latitude=-33.8700,
            longitude=151.2100,
            is_available=True,
            status="available",
        )

    def test_ut11_ai_suggestion_with_valid_coordinates(self):
        """Validate tenant can get nearby listings using valid coordinates (UT11)"""
        request = self.factory.post(
            "/api/tenant/ai-suggest/",
            {
                "lat": -33.8688,
                "lng": 151.2093,
                "radius_km": 5,
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_ut12_ai_suggestion_without_place_or_coordinates(self):
        """Validate AI suggestion fails when no place or lat/lng is provided (UT12)"""
        request = self.factory.post(
            "/api/tenant/ai-suggest/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Provide place OR lat/lng.")

    def test_ut13_ai_suggestion_with_price_filter(self):
        """Validate AI suggestion returns listings within price range (UT13)"""
        request = self.factory.post(
            "/api/tenant/ai-suggest/",
            {
                "lat": -33.8688,
                "lng": 151.2093,
                "radius_km": 5,
                "min_price": 400,
                "max_price": 700,
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)

        for item in response.data["results"]:
            self.assertGreaterEqual(float(item["price_per_month"]), 400)
            self.assertLessEqual(float(item["price_per_month"]), 700)

    def test_ut14_ai_suggestion_with_property_type_filter(self):
        """Validate AI suggestion filters listings by property type (UT14)"""
        request = self.factory.post(
            "/api/tenant/ai-suggest/",
            {
                "lat": -33.8688,
                "lng": 151.2093,
                "radius_km": 5,
                "property_type": "room",
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant)

        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        for item in response.data["results"]:
            self.assertEqual(item["property_type"], "room")

    def test_ut15_only_tenant_can_access_ai_suggestion(self):
        """Validate non-tenant user cannot access AI suggestion endpoint (UT15)"""
        request = self.factory.post(
            "/api/tenant/ai-suggest/",
            {
                "lat": -33.8688,
                "lng": 151.2093,
                "radius_km": 5,
            },
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 403)