from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Transaction, AccountCategory, BusinessMetric, MetricHistory, Budget, RecurringTransaction
from .serializers import (
    TransactionSerializer, AccountCategorySerializer,
    BusinessMetricSerializer, BudgetSerializer,
    RecurringTransactionSerializer,
)
from django.db.models import Sum, Q
from django.utils import timezone

class BalanceView(APIView):
    def get(self, request):
        income = Transaction.objects.filter(user=request.user, type='INCOME').aggregate(s=Sum('amount'))['s'] or 0
        expenses = Transaction.objects.filter(user=request.user, type='EXPENSE').aggregate(s=Sum('amount'))['s'] or 0
        return Response({
            'balance': income - expenses,
            'income': income,
            'expenses': expenses,
        })

class TransactionView(APIView):
    def get(self, request):
        months = request.query_params.get('months')
        qs = Transaction.objects.filter(user=request.user).select_related('category').order_by('-date')
        if months:
            from django.utils import timezone
            from datetime import timedelta
            qs = qs.filter(date__gte=timezone.now() - timedelta(days=int(months) * 30))
        serializer = TransactionSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if not data.get('category'):
            cat, _ = AccountCategory.objects.get_or_create(
                name='Uncategorized',
                defaults={'type': 'CASH', 'color': '#6b7280'},
            )
            data['category'] = cat.id
        serializer = TransactionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk=None):
        try:
            tx = Transaction.objects.get(pk=pk, user=request.user)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TransactionSerializer(tx, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk=None):
        try:
            tx = Transaction.objects.get(pk=pk, user=request.user)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        tx.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def categories(request):
    if request.method == 'GET':
        qs = AccountCategory.objects.all().order_by('name')
        serializer = AccountCategorySerializer(qs, many=True)
        return Response(serializer.data)
    # POST
    serializer = AccountCategorySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Auto-calculation helpers ───

def _calculate_roas(user):
    """Sum income vs. marketing/advertising category expenses."""
    marketing_keywords = ['ad', 'ads', 'advertising', 'marketing', 'social',
                          'promo', 'ppc', 'sem', 'seo', 'sponsored', 'influencer']
    q = Q()
    for kw in marketing_keywords:
        q |= Q(name__icontains=kw)
    marketing_cats = AccountCategory.objects.filter(q)

    ad_spend = (
        Transaction.objects
        .filter(user=user, type='EXPENSE', category__in=marketing_cats)
        .aggregate(s=Sum('amount'))['s']
    ) or 0

    total_revenue = (
        Transaction.objects
        .filter(user=user, type='INCOME')
        .aggregate(s=Sum('amount'))['s']
    ) or 0

    if ad_spend > 0:
        return round(total_revenue / ad_spend, 2)
    return 0.0


METRIC_DEFAULTS = [
    ('cac',         'CAC',              'manual',     '$',   False, 0),
    ('ltv',         'LTV',              'manual',     '$',   True,  0),
    ('ltv-cac',     'LTV / CAC',        'derived',    'x',   True,  1),
    ('churn',       'Churn Rate',       'manual',     '%',   False, 1),
    ('arpu',        'ARPU',             'manual',     '$',   True,  0),
    ('roas',        'ROAS',             'calculated', 'x',   True,  1),
    ('payback',     'Payback Period',   'manual',     ' mo', False, 0),
    ('dilution',    'Dilution',         'manual',     '%',   False, 0),
    ('market-cap',  'Market Cap',       'manual',     '$',   True,  1),
    ('nps',         'NPS',              'manual',     '',    True,  0),
]


# ─── Metrics View ───

class MetricsView(APIView):
    """List all business KPIs (auto-calculating where possible)
    and update manual ones."""

    def get(self, request):
        # 1. Seed any missing metric rows for this user
        for key, name, calc, suffix, up_is_good, decimals in METRIC_DEFAULTS:
            BusinessMetric.objects.get_or_create(
                user=request.user, key=key,
                defaults=dict(
                    name=name, calculation=calc, suffix=suffix,
                    up_is_good=up_is_good, decimals=decimals,
                ),
            )

        # 2. Fetch with history (limit in serializer)
        metrics = list(
            BusinessMetric.objects
            .filter(user=request.user)
            .prefetch_related('history')
            .order_by('id')
        )

        # 3. Auto-calculate
        for m in metrics:
            if m.key == 'roas' and m.calculation == 'calculated':
                new_val = _calculate_roas(request.user)
                if abs(m.value - new_val) > 0.001:
                    m.value = new_val
                    m.save(update_fields=['value'])

            if m.key == 'ltv-cac' and m.calculation == 'derived':
                ltv = next((x for x in metrics if x.key == 'ltv'), None)
                cac = next((x for x in metrics if x.key == 'cac'), None)
                if ltv and cac and cac.value > 0:
                    m.value = round(ltv.value / cac.value, 1)
                else:
                    m.value = 0.0

        # 4. Serialize
        serializer = BusinessMetricSerializer(metrics, many=True)
        return Response(serializer.data)

    def patch(self, request, key=None):
        try:
            metric = BusinessMetric.objects.get(
                user=request.user, key=key, calculation='manual',
            )
        except BusinessMetric.DoesNotExist:
            return Response(
                {'detail': 'Metric not found or not editable'},
                status=status.HTTP_404_NOT_FOUND,
            )

        value = request.data.get('value')
        if value is None:
            return Response({'detail': 'value is required'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            metric.value = float(value)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid value'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Record history on every manual update
        MetricHistory.objects.create(metric=metric, value=metric.value)
        metric.save()

        serializer = BusinessMetricSerializer(metric)
        return Response(serializer.data)


# ─── Budget Views ───

class BudgetView(APIView):
    def get(self, request):
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        now = timezone.now()
        m = int(month) if month else now.month
        y = int(year) if year else now.year
        budgets = Budget.objects.filter(user=request.user, month=m, year=y).select_related('category')
        if not budgets:
            return Response([])
        serializer = BudgetSerializer(budgets, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        serializer = BudgetSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk=None):
        try:
            budget = Budget.objects.get(pk=pk, user=request.user)
        except Budget.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BudgetSerializer(budget, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk=None):
        try:
            budget = Budget.objects.get(pk=pk, user=request.user)
        except Budget.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        budget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecurringView(APIView):
    def get(self, request):
        qs = RecurringTransaction.objects.filter(user=request.user).select_related('category')
        serializer = RecurringTransactionSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        serializer = RecurringTransactionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, pk=None):
        try:
            rt = RecurringTransaction.objects.get(pk=pk, user=request.user)
        except RecurringTransaction.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RecurringTransactionSerializer(rt, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk=None):
        try:
            rt = RecurringTransaction.objects.get(pk=pk, user=request.user)
        except RecurringTransaction.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        rt.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MonthlySummaryView(APIView):
    def get(self, request):
        year = request.query_params.get('year')
        y = int(year) if year else timezone.now().year

        from calendar import monthrange
        results = []
        for m in range(1, 13):
            _, last_day = monthrange(y, m)
            start = timezone.datetime(y, m, 1, tzinfo=timezone.now().tzinfo)
            end = timezone.datetime(y, m, last_day, 23, 59, 59, tzinfo=timezone.now().tzinfo)

            income = Transaction.objects.filter(
                user=request.user, type='INCOME', date__gte=start, date__lte=end
            ).aggregate(s=Sum('amount'))['s'] or 0

            expenses = Transaction.objects.filter(
                user=request.user, type='EXPENSE', date__gte=start, date__lte=end
            ).aggregate(s=Sum('amount'))['s'] or 0

            # Top 3 expense categories this month
            top_cats = (
                Transaction.objects
                .filter(user=request.user, type='EXPENSE', date__gte=start, date__lte=end)
                .values('category__name', 'category__color')
                .annotate(total=Sum('amount'))
                .order_by('-total')[:3]
            )

            results.append({
                'month': m,
                'year': y,
                'income': income,
                'expenses': expenses,
                'net': income - expenses,
                'top_categories': [
                    {'name': c['category__name'], 'color': c['category__color'], 'total': c['total']}
                    for c in top_cats if c['category__name']
                ],
            })

        now = timezone.now()
        current_month_data = next((r for r in results if r['month'] == now.month), None)
        last_month = now.month - 1 if now.month > 1 else 12
        last_month_data = next((r for r in results if r['month'] == last_month), None)

        # Insights
        insights = {}
        if current_month_data and last_month_data:
            exp_diff = current_month_data['expenses'] - last_month_data['expenses']
            inc_diff = current_month_data['income'] - last_month_data['income']
            if last_month_data['expenses'] > 0:
                insights['expense_change_pct'] = round((exp_diff / last_month_data['expenses']) * 100, 1)
            else:
                insights['expense_change_pct'] = 0
            if last_month_data['income'] > 0:
                insights['income_change_pct'] = round((inc_diff / last_month_data['income']) * 100, 1)
            else:
                insights['income_change_pct'] = 0
            insights['expense_direction'] = 'up' if exp_diff > 0 else 'down'
            insights['income_direction'] = 'up' if inc_diff > 0 else 'down'

        return Response({
            'months': results,
            'current_month': current_month_data,
            'insights': insights,
        })
