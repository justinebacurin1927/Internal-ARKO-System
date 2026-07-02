from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Transaction, AccountCategory
from .serializers import TransactionSerializer, AccountCategorySerializer
from django.db.models import Sum, Q

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
