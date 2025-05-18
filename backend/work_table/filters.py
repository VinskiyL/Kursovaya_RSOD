from django_filters import rest_framework as filters
from .models import BooksCatalog, AuthorsCatalog

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