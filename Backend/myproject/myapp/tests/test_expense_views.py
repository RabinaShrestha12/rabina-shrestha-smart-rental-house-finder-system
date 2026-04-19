from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from myapp.models import TenantExpense, Notification

User = get_user_model()


class TenantExpenseViewsTests(APITestCase):
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
        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@example.com",
            password="TestPass123!",
            role="owner",
        )

        self.expense1 = TenantExpense.objects.create(
            tenant=self.tenant,
            title="Groceries",
            category="Food",
            amount="2500.00",
            date=date(2026, 4, 10),
            note="Monthly groceries",
        )

        self.expense2 = TenantExpense.objects.create(
            tenant=self.tenant,
            title="Bus Fare",
            category="Travel",
            amount="800.00",
            date=date(2026, 4, 12),
            note="Transport cost",
        )

        self.other_user_expense = TenantExpense.objects.create(
            tenant=self.tenant2,
            title="Other Expense",
            category="Shopping",
            amount="1500.00",
            date=date(2026, 4, 15),
            note="Other user expense",
        )

    # -----------------------------
    # LIST / CREATE
    # -----------------------------
    def test_ut01_tenant_can_view_expense_list(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_list_create")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("summary", response.data)
        self.assertEqual(len(response.data["results"]), 2)

    def test_ut02_tenant_can_filter_expense_list_by_month_and_year(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_list_create")
        response = self.client.get(url, {"month": 4, "year": 2026})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["summary"]["total_records"], 2)

    def test_ut03_tenant_can_create_expense(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_list_create")
        payload = {
            "title": "Rent payment",
            "category": "Rent",
            "amount": "12000.00",
            "date": "2026-04-20",
            "note": "April rent",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            TenantExpense.objects.filter(tenant=self.tenant, title="Rent payment").exists()
        )

    def test_ut04_expense_creation_fails_with_invalid_data(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_list_create")
        payload = {
            "title": "",
            "category": "Food",
            "amount": "",
            "date": "",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # -----------------------------
    # DETAIL / UPDATE / DELETE
    # -----------------------------
    def test_ut05_tenant_can_view_expense_detail(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.expense1.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Groceries")

    def test_ut06_tenant_cannot_view_other_users_expense_detail(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.other_user_expense.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Expense not found.")

    def test_ut07_tenant_can_update_expense_with_put(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.expense1.id])
        payload = {
            "title": "Updated Groceries",
            "category": "Food",
            "amount": "3000.00",
            "date": "2026-04-10",
            "note": "Updated note",
        }

        response = self.client.put(url, payload, format="json")
        self.expense1.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.expense1.title, "Updated Groceries")

    def test_ut08_tenant_can_update_expense_with_patch(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.expense1.id])
        response = self.client.patch(url, {"amount": "2800.00"}, format="json")
        self.expense1.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(self.expense1.amount), "2800.00")

    def test_ut09_tenant_cannot_update_other_users_expense(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.other_user_expense.id])
        response = self.client.patch(url, {"amount": "999.00"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Expense not found.")

    def test_ut10_tenant_can_delete_expense(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.expense1.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(TenantExpense.objects.filter(id=self.expense1.id).exists())

    def test_ut11_tenant_cannot_delete_other_users_expense(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_detail", args=[self.other_user_expense.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Expense not found.")

    # -----------------------------
    # MONTH SUMMARY
    # -----------------------------
    def test_ut12_tenant_can_view_month_summary(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_month_summary")
        response = self.client.get(url, {"month": 4, "year": 2026})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["month"], 4)
        self.assertEqual(response.data["year"], 2026)
        self.assertEqual(response.data["total_records"], 2)

    def test_ut13_month_summary_uses_current_month_and_year_by_default(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("tenant_expense_month_summary")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("month", response.data)
        self.assertIn("year", response.data)

    # -----------------------------
    # EXPENSE NOTIFICATION
    # -----------------------------
    def test_ut14_tenant_can_generate_end_of_month_expense_notification(self):
        self.client.force_authenticate(user=self.tenant)

        url = reverse("generate_end_of_month_expense_notification")
        response = self.client.post(url, {"month": 4, "year": 2026}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["detail"], "Expense notification created successfully.")
        self.assertTrue(
            Notification.objects.filter(
                user=self.tenant,
                notification_type="expense",
                title="Expense summary for 4/2026"
            ).exists()
        )

    def test_ut15_duplicate_end_of_month_notification_returns_ok_message(self):
        Notification.objects.create(
            user=self.tenant,
            title="Expense summary for 4/2026",
            message="Already created",
            notification_type="expense",
            link="/tenant/expenses",
        )

        self.client.force_authenticate(user=self.tenant)

        url = reverse("generate_end_of_month_expense_notification")
        response = self.client.post(url, {"month": 4, "year": 2026}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["detail"],
            "Expense notification already created for this month."
        )

    # -----------------------------
    # AUTH
    # -----------------------------
    def test_ut16_unauthenticated_user_cannot_view_expense_list(self):
        url = reverse("tenant_expense_list_create")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut17_unauthenticated_user_cannot_create_expense(self):
        url = reverse("tenant_expense_list_create")
        response = self.client.post(
            url,
            {
                "title": "Unauth expense",
                "category": "Food",
                "amount": "100.00",
                "date": "2026-04-01",
            },
            format="json",
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut18_unauthenticated_user_cannot_view_expense_detail(self):
        url = reverse("tenant_expense_detail", args=[self.expense1.id])
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut19_unauthenticated_user_cannot_view_month_summary(self):
        url = reverse("tenant_expense_month_summary")
        response = self.client.get(url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )

    def test_ut20_unauthenticated_user_cannot_generate_notification(self):
        url = reverse("generate_end_of_month_expense_notification")
        response = self.client.post(url, {"month": 4, "year": 2026}, format="json")

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )