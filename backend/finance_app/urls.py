from django.urls import path
from . import views

urlpatterns = [
    path('balance/', views.BalanceView.as_view(), name='finance-balance'),
    path('transactions/', views.TransactionView.as_view(), name='finance-transactions'),
    path('transactions/<int:pk>/', views.TransactionView.as_view(), name='finance-transaction-detail'),
    path('categories/', views.categories, name='finance-categories'),
]
