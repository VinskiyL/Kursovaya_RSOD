# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


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
    issued = models.BooleanField()
    returned = models.BooleanField()

    class Meta:
        managed = True
        db_table = 'Booking_catalog'


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
    login = models.TextField(unique=True)
    password = models.TextField()
    mail = models.TextField()
    admin = models.BooleanField()

    class Meta:
        managed = True
        db_table = 'Readers_catalog'
        unique_together = [('passport_series', 'passport_number')]
