from decimal import Decimal
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from myapp.models import TenantExpense, Notification
from myapp.serializers import TenantExpenseSerializer


class TenantExpenseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        month = request.query_params.get("month")
        year = request.query_params.get("year")

        queryset = TenantExpense.objects.filter(tenant=user)

        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)

        serializer = TenantExpenseSerializer(queryset, many=True, context={"request": request})

        total_amount = queryset.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_records = queryset.aggregate(total=Count("id"))["total"] or 0

        category_summary_qs = (
            queryset.values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        category_summary = [
            {
                "category": item["category"],
                "total": str(item["total"] or Decimal("0.00"))
            }
            for item in category_summary_qs
        ]

        return Response(
            {
                "results": serializer.data,
                "summary": {
                    "total_monthly_expense": str(total_amount),
                    "total_records": total_records,
                    "category_summary": category_summary,
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = TenantExpenseSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            expense = serializer.save(tenant=request.user)
            return Response(
                TenantExpenseSerializer(expense, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TenantExpenseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, user, pk):
        return TenantExpense.objects.filter(id=pk, tenant=user).first()

    def get(self, request, pk):
        expense = self.get_object(request.user, pk)
        if not expense:
            return Response({"detail": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TenantExpenseSerializer(expense, context={"request": request})
        return Response(serializer.data)

    def put(self, request, pk):
        expense = self.get_object(request.user, pk)
        if not expense:
            return Response({"detail": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TenantExpenseSerializer(
            expense,
            data=request.data,
            partial=False,
            context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(tenant=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        expense = self.get_object(request.user, pk)
        if not expense:
            return Response({"detail": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TenantExpenseSerializer(
            expense,
            data=request.data,
            partial=True,
            context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(tenant=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        expense = self.get_object(request.user, pk)
        if not expense:
            return Response({"detail": "Expense not found."}, status=status.HTTP_404_NOT_FOUND)

        expense.delete()
        return Response({"detail": "Expense deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class TenantExpenseMonthSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        month = request.query_params.get("month")
        year = request.query_params.get("year")

        now = timezone.now()
        month = int(month) if month else now.month
        year = int(year) if year else now.year

        queryset = TenantExpense.objects.filter(
            tenant=user,
            month=month,
            year=year
        )

        total_amount = queryset.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_records = queryset.aggregate(total=Count("id"))["total"] or 0

        category_summary_qs = (
            queryset.values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        category_summary = [
            {
                "category": item["category"],
                "total": str(item["total"] or Decimal("0.00"))
            }
            for item in category_summary_qs
        ]

        return Response(
            {
                "month": month,
                "year": year,
                "total_monthly_expense": str(total_amount),
                "total_records": total_records,
                "category_summary": category_summary,
            },
            status=status.HTTP_200_OK,
        )


class GenerateEndOfMonthExpenseNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        now = timezone.now()

        month = int(request.data.get("month", now.month))
        year = int(request.data.get("year", now.year))

        expenses = TenantExpense.objects.filter(
            tenant=user,
            month=month,
            year=year
        )

        total_amount = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_records = expenses.count()

        title = f"Expense summary for {month}/{year}"
        message = (
            f"You recorded {total_records} expense(s) this month "
            f"with a total spending of Rs {total_amount}."
        )

        already_exists = Notification.objects.filter(
            user=user,
            notification_type="expense",
            title=title
        ).exists()

        if already_exists:
            return Response(
                {"detail": "Expense notification already created for this month."},
                status=status.HTTP_200_OK,
            )

        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type="expense",
            link="/tenant/expenses"
        )

        return Response(
            {
                "detail": "Expense notification created successfully.",
                "notification_id": notification.id
            },
            status=status.HTTP_201_CREATED,
        )