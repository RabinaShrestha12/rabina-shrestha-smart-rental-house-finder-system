from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from myapp.models import Listing, Notification, Tenant, Owner
from myapp.view.ai_suggestions_views import (
    _to_float,
    _clamp,
    _haversine_km,
    _score_listing,
    _geocode_place_nominatim,
    tenant_ai_suggest_nearby,
)

User = get_user_model()


class AISuggestionsViewsTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        # Tenant user
        self.tenant_user = User.objects.create_user(
            username="tenant1",
            email="tenant1@example.com",
            password="TestPass123",
        )
        self.tenant_user.role = "tenant"
        self.tenant_user.is_email_verified = True
        self.tenant_user.save()
        Tenant.objects.get_or_create(user=self.tenant_user, defaults={"location": ""})

        # Owner user
        self.owner_user = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="OwnerPass123",
        )
        self.owner_user.role = "owner"
        self.owner_user.is_email_verified = True
        self.owner_user.save()

        # Owner profile if your project uses Owner model
        self.owner_profile, _ = Owner.objects.get_or_create(
            user=self.owner_user,
            defaults={"location": ""}
        )

    def create_listing(
        self,
        title="Test House",
        location="Kathmandu",
        price_per_month=10000,
        property_type="room",
        latitude=27.7172,
        longitude=85.3240,
        is_available=True,
    ):
        """
        IMPORTANT:
        If your Listing model uses owner = ForeignKey(User), keep owner=self.owner_user.
        If your Listing model uses owner = ForeignKey(Owner), change to owner=self.owner_profile.
        """

        return Listing.objects.create(
            owner=self.owner_user,   # change to self.owner_profile if needed
            title=title,
            location=location,
            price_per_month=Decimal(str(price_per_month)),
            property_type=property_type,
            latitude=Decimal(str(latitude)) if latitude is not None else None,
            longitude=Decimal(str(longitude)) if longitude is not None else None,
            is_available=is_available,
        )

    # =========================
    # Helper function tests
    # =========================
    def test_to_float_valid_values(self):
        self.assertEqual(_to_float("12.5"), 12.5)
        self.assertEqual(_to_float(10), 10.0)
        self.assertEqual(_to_float("0"), 0.0)

    def test_to_float_invalid_values(self):
        self.assertIsNone(_to_float(""))
        self.assertIsNone(_to_float(None))
        self.assertIsNone(_to_float("abc"))

    def test_clamp_values(self):
        self.assertEqual(_clamp(0.5), 0.5)
        self.assertEqual(_clamp(-1), 0.0)
        self.assertEqual(_clamp(2), 1.0)
        self.assertEqual(_clamp("bad"), 0.0)

    def test_haversine_same_point(self):
        d = _haversine_km(27.7172, 85.3240, 27.7172, 85.3240)
        self.assertAlmostEqual(d, 0.0, places=4)

    def test_haversine_different_points(self):
        d = _haversine_km(27.7172, 85.3240, 27.7000, 85.3000)
        self.assertGreater(d, 0)

    def test_score_listing_with_budget_range(self):
        score, reasons = _score_listing(
            distance_km=1.0,
            price=10000,
            min_price=8000,
            max_price=12000,
            radius_km=2.0,
        )
        self.assertTrue(0.0 <= score <= 1.0)
        self.assertTrue(any("Within your budget" in r for r in reasons))

    def test_score_listing_with_min_only(self):
        score, reasons = _score_listing(
            distance_km=1.0,
            price=12000,
            min_price=10000,
            max_price=None,
            radius_km=2.0,
        )
        self.assertTrue(0.0 <= score <= 1.0)
        self.assertTrue(any("Meets minimum budget" in r for r in reasons))

    def test_score_listing_with_max_only(self):
        score, reasons = _score_listing(
            distance_km=1.0,
            price=9000,
            min_price=None,
            max_price=10000,
            radius_km=2.0,
        )
        self.assertTrue(0.0 <= score <= 1.0)
        self.assertTrue(any("Within max budget" in r for r in reasons))

    # =========================
    # Geocode tests
    # =========================
    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_success(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"lat": "27.7172", "lon": "85.3240"}]
        mock_get.return_value = mock_response

        result = _geocode_place_nominatim("Kathmandu")
        self.assertEqual(result, (27.7172, 85.3240))

    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_empty(self, mock_get):
        result = _geocode_place_nominatim("")
        self.assertIsNone(result)
        mock_get.assert_not_called()

    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_403(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 403
        mock_get.return_value = mock_response

        result = _geocode_place_nominatim("Kathmandu")
        self.assertIsNone(result)

    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_429(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response

        result = _geocode_place_nominatim("Kathmandu")
        self.assertIsNone(result)

    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_non_200(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        result = _geocode_place_nominatim("Kathmandu")
        self.assertIsNone(result)

    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_empty_result(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        result = _geocode_place_nominatim("Unknown")
        self.assertIsNone(result)

    @patch("myapp.view.ai_suggestions_views.requests.get")
    def test_geocode_place_exception(self, mock_get):
        mock_get.side_effect = Exception("Network error")
        result = _geocode_place_nominatim("Kathmandu")
        self.assertIsNone(result)

    # =========================
    # Main view tests
    # =========================
    def test_ai_suggest_requires_authentication(self):
        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240},
            format="json",
        )
        response = tenant_ai_suggest_nearby(request)
        self.assertIn(response.status_code, [401, 403])

    def test_ai_suggest_rejects_non_tenant(self):
        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240},
            format="json",
        )
        force_authenticate(request, user=self.owner_user)
        response = tenant_ai_suggest_nearby(request)
        self.assertEqual(response.status_code, 403)

    def test_ai_suggest_requires_place_or_latlng(self):
        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Provide place OR lat/lng.")

    @patch("myapp.view.ai_suggestions_views._geocode_place_nominatim", return_value=None)
    def test_ai_suggest_geocode_fail(self, mock_geocode):
        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"place": "Unknown Place"},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Could not geocode this place name", response.data["detail"])

    def test_ai_suggest_success_with_latlng(self):
        self.create_listing(
            title="Nearby Room",
            price_per_month=9000,
            property_type="room",
            latitude=27.7172,
            longitude=85.3240,
            is_available=True,
        )
        self.create_listing(
            title="Far House",
            price_per_month=15000,
            property_type="house",
            latitude=28.0000,
            longitude=85.5000,
            is_available=True,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {
                "lat": 27.7172,
                "lng": 85.3240,
                "radius_km": 2,
                "min_price": 8000,
                "max_price": 10000,
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertFalse(response.data["fallback_used"])
        self.assertEqual(response.data["results"][0]["title"], "Nearby Room")

        self.assertTrue(
            Notification.objects.filter(
                user=self.tenant_user,
                title="AI Nearby Suggestions"
            ).exists()
        )

    def test_ai_suggest_filters_property_type(self):
        self.create_listing(
            title="Room Listing",
            property_type="room",
            latitude=27.7172,
            longitude=85.3240,
        )
        self.create_listing(
            title="House Listing",
            property_type="house",
            latitude=27.7173,
            longitude=85.3241,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {
                "lat": 27.7172,
                "lng": 85.3240,
                "radius_km": 2,
                "property_type": "house",
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "House Listing")

    def test_ai_suggest_property_type_all(self):
        self.create_listing(
            title="Room Listing",
            property_type="room",
            latitude=27.7172,
            longitude=85.3240,
        )
        self.create_listing(
            title="House Listing",
            property_type="house",
            latitude=27.7173,
            longitude=85.3241,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {
                "lat": 27.7172,
                "lng": 85.3240,
                "radius_km": 2,
                "property_type": "all",
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_ai_suggest_filters_budget(self):
        self.create_listing(
            title="Cheap Room",
            price_per_month=7000,
            latitude=27.7172,
            longitude=85.3240,
        )
        self.create_listing(
            title="Budget Room",
            price_per_month=9000,
            latitude=27.7173,
            longitude=85.3241,
        )
        self.create_listing(
            title="Expensive Room",
            price_per_month=15000,
            latitude=27.7174,
            longitude=85.3242,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {
                "lat": 27.7172,
                "lng": 85.3240,
                "radius_km": 2,
                "min_price": 8000,
                "max_price": 10000,
            },
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Budget Room")

    def test_ai_suggest_ignores_unavailable_listings(self):
        self.create_listing(
            title="Unavailable Room",
            latitude=27.7172,
            longitude=85.3240,
            is_available=False,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240, "radius_km": 2},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_ai_suggest_skips_missing_coordinates(self):
        self.create_listing(
            title="No Coordinates",
            latitude=None,
            longitude=None,
            is_available=True,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240, "radius_km": 2},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_ai_suggest_fallback_radius_used(self):
        self.create_listing(
            title="Slightly Far Room",
            price_per_month=9500,
            property_type="room",
            latitude=27.7350,
            longitude=85.3400,
            is_available=True,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240, "radius_km": 1},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertTrue(response.data["fallback_used"])
        self.assertGreaterEqual(response.data["radius_km_used"], 3.0)

    def test_ai_suggest_no_results_even_after_fallback(self):
        self.create_listing(
            title="Very Far Room",
            price_per_month=10000,
            property_type="room",
            latitude=30.0000,
            longitude=88.0000,
            is_available=True,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240, "radius_km": 1},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertFalse(response.data["fallback_used"])

    @patch("myapp.view.ai_suggestions_views._geocode_place_nominatim", return_value=(27.7172, 85.3240))
    def test_ai_suggest_success_with_place_name(self, mock_geocode):
        self.create_listing(
            title="Place Based Room",
            price_per_month=10000,
            property_type="room",
            latitude=27.7172,
            longitude=85.3240,
            is_available=True,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"place": "Kathmandu", "radius_km": 2},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["center"]["place"], "Kathmandu")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Place Based Room")

    def test_ai_suggest_results_ranked(self):
        self.create_listing(
            title="Closer Room",
            price_per_month=10000,
            property_type="room",
            latitude=27.7172,
            longitude=85.3240,
            is_available=True,
        )
        self.create_listing(
            title="Farther Room",
            price_per_month=10000,
            property_type="room",
            latitude=27.7250,
            longitude=85.3300,
            is_available=True,
        )

        request = self.factory.post(
            "/api/tenant/ai-suggest-nearby/",
            {"lat": 27.7172, "lng": 85.3240, "radius_km": 5},
            format="json",
        )
        force_authenticate(request, user=self.tenant_user)
        response = tenant_ai_suggest_nearby(request)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 2)
        self.assertEqual(response.data["results"][0]["title"], "Closer Room")