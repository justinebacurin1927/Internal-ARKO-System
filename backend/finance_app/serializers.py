from rest_framework import serializers
from .models import Transaction, AccountCategory

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
