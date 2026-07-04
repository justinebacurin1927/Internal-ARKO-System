from django.db import models
from django.conf import settings

class AccountCategory(models.Model):
    ACCOUNT_TYPES = [('CHECKING','Checking'),('SAVINGS','Savings'),('CREDIT_CARD','Credit Card'),('CASH','Cash'),('INVESTMENT','Investment'),('RECEIVABLE','Receivable'),('PAYABLE','Payable')]
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    color = models.CharField(max_length=20, default='#6b7280')
    icon = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'account_categories'

class BusinessMetric(models.Model):
    CALC_CHOICES = [
        ('manual', 'Manual'),
        ('calculated', 'Auto-calculated'),
        ('derived', 'Derived'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='metrics')
    key = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    value = models.FloatField(default=0)
    calculation = models.CharField(max_length=20, choices=CALC_CHOICES, default='manual')
    suffix = models.CharField(max_length=10, default='')
    up_is_good = models.BooleanField(default=True)
    decimals = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'business_metrics'
        unique_together = [('user', 'key')]


class MetricHistory(models.Model):
    metric = models.ForeignKey(BusinessMetric, on_delete=models.CASCADE, related_name='history')
    value = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'metric_history'
        ordering = ['-recorded_at']


class Budget(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    category = models.ForeignKey(AccountCategory, on_delete=models.CASCADE, related_name='budgets')
    month = models.IntegerField()
    year = models.IntegerField()
    amount = models.FloatField()

    class Meta:
        db_table = 'budgets'
        unique_together = [('user', 'category', 'month', 'year')]


class RecurringTransaction(models.Model):
    FREQ_CHOICES = [
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Biweekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('YEARLY', 'Yearly'),
    ]
    TX_TYPES = [('INCOME', 'Income'), ('EXPENSE', 'Expense'), ('TRANSFER', 'Transfer')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recurring')
    description = models.CharField(max_length=255)
    amount = models.FloatField()
    type = models.CharField(max_length=20, choices=TX_TYPES)
    frequency = models.CharField(max_length=20, choices=FREQ_CHOICES)
    category = models.ForeignKey(AccountCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='recurring')
    next_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recurring_transactions'
        ordering = ['next_date']


class Transaction(models.Model):
    TX_TYPES = [('INCOME','Income'),('EXPENSE','Expense'),('TRANSFER','Transfer')]
    amount = models.FloatField()
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=20, choices=TX_TYPES)
    date = models.DateTimeField()
    category = models.ForeignKey(AccountCategory, on_delete=models.CASCADE, related_name='transactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')

    class Meta:
        db_table = 'transactions'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['date']),
            models.Index(fields=['category']),
        ]
