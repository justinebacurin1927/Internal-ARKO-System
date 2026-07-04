from django.urls import path
from . import views

urlpatterns = [
    path('balance/', views.BalanceView.as_view(), name='finance-balance'),
    path('transactions/', views.TransactionView.as_view(), name='finance-transactions'),
    path('transactions/<int:pk>/', views.TransactionView.as_view(), name='finance-transaction-detail'),
    path('categories/', views.categories, name='finance-categories'),
    path('metrics/', views.MetricsView.as_view(), name='finance-metrics'),
    path('metrics/<str:key>/', views.MetricsView.as_view(), name='finance-metric-detail'),
    path('budgets/', views.BudgetView.as_view(), name='finance-budgets'),
    path('budgets/<int:pk>/', views.BudgetView.as_view(), name='finance-budget-detail'),
    path('recurring/', views.RecurringView.as_view(), name='finance-recurring'),
    path('recurring/<int:pk>/', views.RecurringView.as_view(), name='finance-recurring-detail'),
    path('monthly-summary/', views.MonthlySummaryView.as_view(), name='finance-monthly-summary'),
]
