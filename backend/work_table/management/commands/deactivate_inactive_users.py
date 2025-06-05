from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q  # Добавьте этот импорт
from work_table.models import ReadersCatalog


class Command(BaseCommand):
    help = 'Деактивирует пользователей, которые не перерегистрировались более года'

    def handle(self, *args, **options):
        today = timezone.now().date()
        one_year_ago = today - timedelta(days=395)

        # Условие 1: Нет re_registration и consists_of старше года
        condition1 = Q(re_registration__isnull=True) & Q(consists_of__lt=one_year_ago)

        # Условие 2: re_registration старше года
        condition2 = Q(re_registration__lt=one_year_ago)

        # Находим пользователей, удовлетворяющих любому из условий
        inactive_users = ReadersCatalog.objects.filter(condition1 | condition2, is_active=True)

        count = inactive_users.count()
        inactive_users.update(is_active=False)

        self.stdout.write(self.style.SUCCESS(f'Deactivated {count} users'))