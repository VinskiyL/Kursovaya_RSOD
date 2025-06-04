from django_filters import rest_framework as filters
from .models import BooksCatalog, OrderCatalog, ReadersCatalog, BookingCatalog
from django.utils import timezone

class BookFilter(filters.FilterSet):
    author = filters.CharFilter(method='filter_by_author')
    available = filters.BooleanFilter(method='filter_available')
    year = filters.NumberFilter(method='filter_by_year')

    class Meta:
        model = BooksCatalog
        fields = {
            'title': ['icontains'],
            'index': ['exact'],
            'quantity_remaining': ['gte', 'lte'],
            'genres': ['exact'],
        }

    def filter_by_author(self, queryset, name, value):
        return queryset.filter(
            authorsbooks__author__author_surname__icontains=value
        )

    def filter_available(self, queryset, name, value):
        if value:
            return queryset.filter(quantity_remaining__gt=0)
        return queryset.filter(quantity_remaining=0)

    def filter_by_year(self, queryset, name, value):
        return queryset.filter(date_publication__contains=str(value))

    multiple_authors = filters.CharFilter(method='filter_multiple_authors')

    def filter_multiple_authors(self, queryset, name, value):
        surnames = value.split(',')
        qs = queryset
        for surname in surnames:
            qs = qs.filter(authorsbooks__author__author_surname__icontains=surname.strip())
        return qs

class OrderFilter(filters.FilterSet):
    title = filters.CharFilter(
        field_name='title',
        lookup_expr='icontains',
        label='Название книги содержит'
    )
    author = filters.CharFilter(
        field_name='author_surname',
        lookup_expr='icontains',
        label='Фамилия автора содержит'
    )
    date_publication = filters.NumberFilter(
        field_name='date_publication',
        label='Год публикации'
    )

    class Meta:
        model = OrderCatalog
        fields = ['title', 'author', 'date_publication']

class DebtorFilter(filters.FilterSet):
    is_debtor = filters.BooleanFilter(method='filter_debtors')

    class Meta:
        model = ReadersCatalog
        fields = ['is_debtor']

    def filter_debtors(self, queryset, name, value):
        if value:
            current_date = timezone.now().date()
            debtors_ids = BookingCatalog.objects.filter(
                issued=True,
                returned=False,
                date_return__lt=current_date
            ).values_list('reader_id', flat=True).distinct()
            return queryset.filter(id__in=debtors_ids)
        return queryset