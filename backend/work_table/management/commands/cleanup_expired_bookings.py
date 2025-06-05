from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from work_table.models import BookingCatalog


class Command(BaseCommand):
    help = "Удаляет брони, которые не были выданы и просрочены на 3 дня"

    def handle(self, *args, **options):
        # Дата, которая была 3 дня назад
        three_days_ago = timezone.now().date() - timedelta(days=3)

        # Находим брони, которые не были выданы и старше 3 дней
        expired_bookings = BookingCatalog.objects.filter(
            issued=False,
            date_issue__lte=three_days_ago,
        )

        # Удаляем их (используем delete(), чтобы сработал переопределенный метод)
        count = expired_bookings.count()
        expired_bookings.delete()

        self.stdout.write(self.style.SUCCESS(f"Deleted {count} expired bookings"))