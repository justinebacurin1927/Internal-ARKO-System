from rest_framework import serializers
from .models import Transaction, AccountCategory, BusinessMetric, MetricHistory, Budget, RecurringTransaction

class AccountCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountCategory
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    category = serializers.PrimaryKeyRelatedField(
        queryset=AccountCategory.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Transaction
        fields = ('id', 'amount', 'description', 'type', 'date', 'category', 'category_name', 'category_color', 'user')
        read_only_fields = ('user', 'category_name', 'category_color')

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_color(self, obj):
        return obj.category.color if obj.category else None


class MetricHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricHistory
        fields = ['value', 'recorded_at']


class BusinessMetricSerializer(serializers.ModelSerializer):
    history = serializers.SerializerMethodField()

    class Meta:
        model = BusinessMetric
        fields = ['key', 'name', 'value', 'calculation', 'suffix',
                  'up_is_good', 'decimals', 'updated_at', 'history']
        read_only_fields = ['key', 'name', 'calculation', 'suffix',
                            'up_is_good', 'decimals', 'updated_at', 'history']

    def get_history(self, obj):
        # Return last 30 entries in ascending order (left→right sparkline)
        try:
            qs = obj.history.all().order_by('-recorded_at')[:30]
        except AttributeError:
            return []
        # Reverse so oldest is first
        entries = list(qs)
        entries.reverse()
        return MetricHistorySerializer(entries, many=True).data


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    spent = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    pct = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = ['id', 'category', 'category_name', 'category_color',
                  'month', 'year', 'amount', 'spent', 'remaining', 'pct']
        read_only_fields = ['spent', 'remaining', 'pct']

    def get_category_name(self, obj): return obj.category.name if obj.category else None
    def get_category_color(self, obj): return obj.category.color if obj.category else None

    def get_spent(self, obj):
        from django.db.models import Sum
        from django.utils import timezone
        from datetime import timedelta
        from calendar import monthrange
        _, last_day = monthrange(obj.year, obj.month)
        start = timezone.datetime(obj.year, obj.month, 1, tzinfo=timezone.now().tzinfo)
        end = timezone.datetime(obj.year, obj.month, last_day, 23, 59, 59, tzinfo=timezone.now().tzinfo)
        result = Transaction.objects.filter(
            user=obj.user, category=obj.category,
            type='EXPENSE', date__gte=start, date__lte=end,
        ).aggregate(s=Sum('amount'))['s']
        return result or 0

    def get_remaining(self, obj):
        return max(0, obj.amount - self.get_spent(obj))

    def get_pct(self, obj):
        if obj.amount <= 0: return 0
        return round((self.get_spent(obj) / obj.amount) * 100, 1)


class RecurringTransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()

    class Meta:
        model = RecurringTransaction
        fields = ['id', 'description', 'amount', 'type', 'frequency',
                  'category', 'category_name', 'category_color',
                  'next_date', 'is_active', 'created_at']
        read_only_fields = ['created_at']

    def get_category_name(self, obj): return obj.category.name if obj.category else None
    def get_category_color(self, obj): return obj.category.color if obj.category else None
