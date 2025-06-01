from django.db import models
from django.utils import timezone
from datetime import timedelta


class AuthorsBooks(models.Model):
    id = models.AutoField(primary_key=True)
    author = models.ForeignKey('AuthorsCatalog', models.CASCADE)
    book = models.ForeignKey('BooksCatalog', models.CASCADE)

    class Meta:
        managed = True
        db_table = 'Authors_Books'
        unique_together = (('author', 'book'),)


class AuthorsCatalog(models.Model):
    id = models.AutoField(primary_key=True)
    author_surname = models.TextField()
    author_name = models.TextField()
    author_patronymic = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'Authors_catalog'


class BookingCatalog(models.Model):
    index = models.ForeignKey('BooksCatalog', models.PROTECT)
    reader = models.ForeignKey('ReadersCatalog', models.PROTECT)
    quantity = models.IntegerField()
    date_issue = models.DateField()
    date_return = models.DateField()
    id = models.AutoField(primary_key=True)
    issued = models.BooleanField(default=False)
    returned = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Получаем текущее состояние из базы, если запись уже существует
        if self.pk:
            old_booking = BookingCatalog.objects.get(pk=self.pk)
        else:
            old_booking = None

        # Для новых записей устанавливаем даты по умолчанию
        if not self.pk:
            if not self.date_issue:
                self.date_issue = timezone.now().date()
            if not self.date_return:
                self.date_return = self.date_issue + timedelta(days=30)

            # При создании новой записи сразу вычитаем количество
            if self.index.quantity_remaining < self.quantity:
                raise ValueError("Недостаточно экземпляров книги для бронирования")
            self.index.quantity_remaining -= self.quantity
            self.index.save()

        # Обрабатываем возврат книг (только при изменении returned с False на True)
        if self.returned and (old_booking and not old_booking.returned):
            if not self.issued:
                raise ValueError("Невозможно вернуть невыданные книги")
            self.index.quantity_remaining += self.quantity
            self.index.save()

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Проверяем условия перед удалением
        if self.issued and not self.returned:
            raise ValueError("Невозможно удалить выданную и невозвращенную книгу")

        # Если запись не выдана, возвращаем количество
        if not self.issued:
            self.index.quantity_remaining += self.quantity
            self.index.save()

        super().delete(*args, **kwargs)

    def mark_as_returned(self):
        if not self.issued:
            raise ValueError("Книга не была выдана")
        if self.returned:
            raise ValueError("Книга уже возвращена")

        self.returned = True
        self.save()

    class Meta:
        ordering = ['-date_issue']
        managed = True
        db_table = 'Booking_catalog'
        unique_together = [('index', 'reader')]


class BooksCatalog(models.Model):
    id = models.AutoField(primary_key=True)  # Автоматический числовой первичный ключ
    index = models.TextField(unique=True)   # Текстовое поле для индекса, но не первичный ключ
    authors_mark = models.TextField()
    title = models.TextField()
    place_publication = models.TextField()
    information_publication = models.TextField()
    volume = models.IntegerField()
    quantity_total = models.IntegerField()
    quantity_remaining = models.IntegerField()
    cover = models.ImageField(upload_to='covers/', blank=True, null=True)
    date_publication = models.TextField()
    genres = models.ManyToManyField(
        'GenresCatalog',
        through='BooksGenres',
        related_name='books'
    )

    class Meta:
        db_table = 'Books_catalog'
        managed = True

    @property
    def authors_list(self):
        if not hasattr(self, '_cached_authors'):
            self._cached_authors = list(self.authors())
        return self._cached_authors

    def get_authors_names(self):
        return ", ".join(
            f"{a.author_surname} {a.author_name[0]}."
            for a in self.authors_list
        )

    def authors(self):
        return AuthorsCatalog.objects.filter(authorsbooks__book=self)

    @property
    def genres_list(self):
        if not hasattr(self, '_cached_genres'):
            self._cached_genres = list(self.genres.all())
        return self._cached_genres

    def get_genres_names(self):
        return ", ".join(g.name for g in self.genres_list)


class Comments(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey('ReadersCatalog', models.DO_NOTHING)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'Comments'
        ordering = ['-created_at']


class OrderCatalog(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.TextField()
    author_surname = models.TextField()
    author_name = models.TextField(blank=True, null=True)
    author_patronymic = models.TextField(blank=True, null=True)
    quantyti = models.IntegerField()
    reader = models.ForeignKey('ReadersCatalog', models.CASCADE)
    date_publication = models.TextField(blank=True, null=True)
    confirmed = models.BooleanField(default=False)

    class Meta:
        managed = True
        db_table = 'Order_catalog'


class ReadersCatalog(models.Model):
    is_active = models.BooleanField(default=True)
    id = models.AutoField(primary_key=True)
    surname = models.TextField()
    name = models.TextField()
    patronymic = models.TextField(blank=True, null=True)
    birthday = models.DateField()
    education = models.TextField()
    profession = models.TextField(blank=True, null=True)
    educational_inst = models.TextField(blank=True, null=True)
    city = models.TextField()
    street = models.TextField()
    house = models.IntegerField()
    building_house = models.TextField(blank=True, null=True)
    flat = models.IntegerField(blank=True, null=True)
    passport_series = models.IntegerField()
    passport_number = models.IntegerField()
    issued_by_whom = models.TextField()
    date_issue = models.DateField()
    consists_of = models.DateField()
    re_registration = models.DateField(blank=True, null=True)
    phone = models.TextField()
    login = models.TextField(unique=True, blank=False, null=False)
    password = models.TextField()
    mail = models.TextField()
    admin = models.BooleanField()

    class Meta:
        managed = True
        db_table = 'Readers_catalog'
        unique_together = [('passport_series', 'passport_number')]


class GenresCatalog(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(unique=True)

    class Meta:
        managed = True
        db_table = 'Genres_catalog'

    def __str__(self):
        return self.name


class BooksGenres(models.Model):
    id = models.AutoField(primary_key=True)
    book = models.ForeignKey('BooksCatalog', models.CASCADE)
    genre = models.ForeignKey('GenresCatalog', models.CASCADE)

    class Meta:
        managed = True
        db_table = 'Books_Genres'
        unique_together = (('book', 'genre'),)