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
