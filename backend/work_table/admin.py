from django.contrib import admin
from django.utils.html import format_html
from .models import (
    AuthorsBooks,
    AuthorsCatalog,
    BookingCatalog,
    BooksCatalog,
    Comments,
    OrderCatalog,
    ReadersCatalog,
    BooksGenres,
    GenresCatalog
)


class AuthorsBooksAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'book')
    list_filter = ('author', 'book')
    search_fields = ('author__author_surname', 'book__title')


class AuthorsCatalogAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'author_surname', 'author_name', 'author_patronymic')
    search_fields = ('author_surname', 'author_name', 'author_patronymic')
    list_filter = ('author_surname',)

    def full_name(self, obj):
        return f"{obj.author_surname} {obj.author_name} {obj.author_patronymic or ''}"

    full_name.short_description = 'Полное имя'


class BookingCatalogAdmin(admin.ModelAdmin):
    list_display = ('id', 'book_info', 'reader_info', 'date_issue', 'date_return', 'status')
    list_filter = ('issued', 'returned', 'date_issue')
    search_fields = ('index__title', 'reader__surname')
    date_hierarchy = 'date_issue'

    def book_info(self, obj):
        return f"{obj.index.title} ({obj.index.index})"

    book_info.short_description = 'Книга'

    def reader_info(self, obj):
        return f"{obj.reader.surname} {obj.reader.name}"

    reader_info.short_description = 'Читатель'

    def status(self, obj):
        if obj.returned:
            return "Возвращена"
        elif obj.issued:
            return "Выдана"
        return "В обработке"

    status.short_description = 'Статус'


class BooksGenresInline(admin.TabularInline):
    model = BooksGenres
    extra = 1
    verbose_name = "Жанр"
    verbose_name_plural = "Жанры книги"


class BooksCatalogAdmin(admin.ModelAdmin):
    list_display = ('id', 'title_with_cover', 'index', 'authors_display', 'genres_display', 'quantity_status')
    search_fields = ('title', 'index', 'authors_mark')
    list_filter = ('quantity_remaining', 'genres__name')  # Фильтрация по имени жанра
    readonly_fields = ('authors_display', 'cover_preview', 'genres_list')
    inlines = [BooksGenresInline]  # Оставляем только inline для связи книг и жанров

    fieldsets = (
        ('Основное', {
            'fields': ('title', 'index', 'authors_mark', 'cover', 'cover_preview')
        }),
        ('Издание', {
            'fields': ('place_publication', 'date_publication', 'information_publication', 'volume')
        }),
        ('Экземпляры', {
            'fields': ('quantity_total', 'quantity_remaining')
        }),
        ('Дополнительно', {
            'fields': ('genres_list',),
            'classes': ('collapse',)
        })
    )

    def title_with_cover(self, obj):
        if obj.cover:
            return format_html(
                '<img src="{}" style="max-height: 30px; margin-right: 10px;"/>{}',
                obj.cover.url,
                obj.title
            )
        return obj.title

    title_with_cover.short_description = 'Название'

    def authors_display(self, obj):
        return obj.get_authors_names()

    authors_display.short_description = 'Авторы'

    def genres_display(self, obj):
        return ", ".join([genre.name for genre in obj.genres.all()])

    genres_display.short_description = 'Жанры'

    def genres_list(self, obj):
        return ", ".join([genre.name for genre in obj.genres.all()])

    genres_list.short_description = 'Список жанров'

    def quantity_status(self, obj):
        return f"{obj.quantity_remaining}/{obj.quantity_total}"

    quantity_status.short_description = 'Доступно'

    def cover_preview(self, obj):
        if obj.cover:
            return format_html('<img src="{}" style="max-height: 200px;"/>', obj.cover.url)
        return "Нет обложки"

    cover_preview.short_description = 'Предпросмотр обложки'


class CommentsAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_info', 'short_comment')
    search_fields = ('user__surname', 'comment')

    def user_info(self, obj):
        return f"{obj.user.surname} {obj.user.name}"

    user_info.short_description = 'Пользователь'

    def short_comment(self, obj):
        return obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment

    short_comment.short_description = 'Комментарий'


class OrderCatalogAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author_full', 'reader_info', 'quantyti', 'date_publication')
    search_fields = ('title', 'author_surname', 'reader__surname')

    def author_full(self, obj):
        return f"{obj.author_surname} {obj.author_name or ''} {obj.author_patronymic or ''}"

    author_full.short_description = 'Автор'

    def reader_info(self, obj):
        return f"{obj.reader.surname} {obj.reader.name}"

    reader_info.short_description = 'Читатель'


class ReadersCatalogAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'birthday', 'contact_info', 'is_active', 'admin_status')
    search_fields = ('surname', 'name', 'login', 'phone')
    list_filter = ('is_active', 'admin', 'city')
    readonly_fields = ('password_display',)
    fieldsets = (
        ('Персональные данные', {
            'fields': ('surname', 'name', 'patronymic', 'birthday')
        }),
        ('Образование и работа', {
            'fields': ('education', 'profession', 'educational_inst')
        }),
        ('Контактные данные', {
            'fields': ('city', 'street', 'house', 'building_house', 'flat', 'phone', 'mail')
        }),
        ('Паспортные данные', {
            'fields': ('passport_series', 'passport_number', 'issued_by_whom', 'date_issue')
        }),
        ('Учетные данные', {
            'fields': ('login', 'password_display', 'is_active', 'admin')
        })
    )

    def full_name(self, obj):
        return f"{obj.surname} {obj.name} {obj.patronymic or ''}"

    full_name.short_description = 'ФИО'

    def contact_info(self, obj):
        return f"{obj.phone} | {obj.mail}"

    contact_info.short_description = 'Контакты'

    def admin_status(self, obj):
        return "Админ" if obj.admin else "Читатель"

    admin_status.short_description = 'Статус'

    def password_display(self, obj):
        return "********"

    password_display.short_description = 'Пароль'


@admin.register(GenresCatalog)
class GenresCatalogAdmin(admin.ModelAdmin):
    list_display = ('name', 'books_count')
    search_fields = ('name',)

    def books_count(self, obj):
        return obj.books.count()

    books_count.short_description = 'Количество книг'


admin.site.register(AuthorsBooks, AuthorsBooksAdmin)
admin.site.register(AuthorsCatalog, AuthorsCatalogAdmin)
admin.site.register(BookingCatalog, BookingCatalogAdmin)
admin.site.register(BooksCatalog, BooksCatalogAdmin)
admin.site.register(Comments, CommentsAdmin)
admin.site.register(OrderCatalog, OrderCatalogAdmin)
admin.site.register(ReadersCatalog, ReadersCatalogAdmin)