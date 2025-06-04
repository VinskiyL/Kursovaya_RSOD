from .models import ReadersCatalog
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.exceptions import ValidationError
from datetime import date, timedelta
from rest_framework import serializers
from .models import(
    BooksCatalog, AuthorsCatalog, Comments,
    BookingCatalog, GenresCatalog, OrderCatalog,
    AuthorsBooks
)

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenresCatalog
        fields = ['id', 'name']

class BookingSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='index.title', read_only=True)
    reader_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BookingCatalog
        fields = [
            'id', 'index', 'reader', 'quantity', 'date_issue',
            'date_return', 'issued', 'returned', 'book_title', 'reader_name'
        ]
        extra_kwargs = {
            'index': {'required': True},
            'reader': {'required': True},
            'quantity': {'required': True},
            'date_issue': {'required': True},
            'date_return': {'required': True},
            'issued': {'required': False},  # Разрешаем изменение через API
            'returned': {'required': False}  # Разрешаем изменение через API
        }

    def get_reader_name(self, obj):
        return f"{obj.reader.surname} {obj.reader.name}"

    def validate(self, data):
        instance = self.instance

        # Для существующих записей
        if instance:
            # Проверка при попытке выдачи
            if 'issued' in data and data['issued'] and not instance.issued:
                if instance.index.quantity_remaining < instance.quantity:
                    raise serializers.ValidationError(
                        "Недостаточно экземпляров книги для выдачи"
                    )

            # Проверка при попытке возврата
            if 'returned' in data and data['returned'] and not instance.returned:
                if not instance.issued:
                    raise serializers.ValidationError(
                        "Невозможно вернуть невыданные книги"
                    )

        return data


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingCatalog
        fields = ['index', 'quantity', 'date_issue']
        extra_kwargs = {
            'quantity': {
                'min_value': 1,
                'max_value': 5
            }
        }

    def validate(self, data):
        # Проверяем доступность книг при создании брони
        if data['index'].quantity_remaining < data['quantity']:
            raise serializers.ValidationError(
                "Недостаточно экземпляров книги для бронирования"
            )
        return data

class CommentSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = Comments
        fields = ['id', 'user', 'user_info', 'comment', 'created_at']
        read_only_fields = ['user', 'user_info', 'created_at']

    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'name': obj.user.login,
            'is_admin': obj.user.admin
        }

    def create(self, validated_data):
        # Автоматически устанавливаем текущего пользователя как автора комментария
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class AuthorShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorsCatalog
        fields = ['id', 'author_surname', 'author_name', 'author_patronymic']

class BookListSerializer(serializers.ModelSerializer):
    authors = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    genres = GenreSerializer(many=True, read_only=True)

    class Meta:
        model = BooksCatalog
        fields = [
            'id', 'index', 'title', 'authors', 'genres', 'volume',
            'quantity_total', 'quantity_remaining', 'available',
            'cover'
        ]
        read_only_fields = fields

    def get_authors(self, obj):
        return AuthorShortSerializer(obj.authors(), many=True).data

    def get_available(self, obj):
        return obj.quantity_remaining > 0


class BookDetailSerializer(BookListSerializer):
    authors = AuthorShortSerializer(many=True, required=False)
    genres = GenreSerializer(many=True, required=False)
    author_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    genre_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta(BookListSerializer.Meta):
        fields = BookListSerializer.Meta.fields + [
            'place_publication', 'information_publication', 'date_publication',
            'authors', 'genres', 'author_ids', 'genre_ids'
        ]
        read_only_fields = ['authors', 'genres']

    def validate_date_publication(self, value):
        if value and (not value.isdigit() or len(value) != 4):
            raise serializers.ValidationError("Год должен быть в формате YYYY")
        return value

    def create(self, validated_data):
        author_ids = validated_data.pop('author_ids', [])
        genre_ids = validated_data.pop('genre_ids', [])

        book = super().create(validated_data)

        # Добавляем авторов
        for author_id in author_ids:
            AuthorsBooks.objects.create(book=book, author_id=author_id)

        # Добавляем жанры
        if genre_ids:
            book.genres.set(genre_ids)

        return book

    def update(self, instance, validated_data):
        author_ids = validated_data.pop('author_ids', None)
        genre_ids = validated_data.pop('genre_ids', None)

        book = super().update(instance, validated_data)

        # Обновляем авторов, если переданы
        if author_ids is not None:
            # Удаляем старых авторов
            AuthorsBooks.objects.filter(book=book).delete()
            # Добавляем новых
            for author_id in author_ids:
                AuthorsBooks.objects.create(book=book, author_id=author_id)

        # Обновляем жанры, если переданы
        if genre_ids is not None:
            book.genres.set(genre_ids)

        return book


class PopularBookSerializer(BookListSerializer):
    active_bookings = serializers.IntegerField(read_only=True)

    class Meta(BookListSerializer.Meta):
        fields = BookListSerializer.Meta.fields + ['active_bookings']


class ReadersCatalogSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        min_length=6,
        max_length=128
    )
    new_password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        min_length=6,
        max_length=128
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        min_length=6,
        max_length=128
    )

    class Meta:
        model = ReadersCatalog
        fields = [
            'id', 'surname', 'name', 'patronymic', 'birthday', 'education', 'profession',
            'educational_inst', 'city', 'street', 'house', 'building_house', 'flat',
            'passport_series', 'passport_number', 'issued_by_whom', 'date_issue',
            'consists_of', 're_registration', 'phone', 'login', 'password',
            'new_password', 'confirm_password', 'mail', 'admin'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'new_password': {'write_only': True},
            'confirm_password': {'write_only': True},
        }

    def validate_login(self, value):
        if not value:
            raise serializers.ValidationError("Логин не может быть пустым")
        if ReadersCatalog.objects.filter(login=value).exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует")
        return value

    def validate(self, data):
        # Проверка даты рождения
        if data.get('birthday') and data['birthday'] > date.today() - timedelta(days=13 * 365):
            raise ValidationError({"birthday": "Пользователь должен быть старше 13 лет."})

        # Проверка пароля только если меняем
        if 'new_password' in data:
            if 'password' not in data:
                raise ValidationError({"password": "Требуется текущий пароль"})

            if data['new_password'] == data['password']:
                raise ValidationError({"new_password": "Новый пароль должен отличаться от текущего"})

            if 'confirm_password' not in data or data['new_password'] != data['confirm_password']:
                raise ValidationError({"confirm_password": "Новый пароль и подтверждение не совпадают"})

        return data

    def update(self, instance, validated_data):
        # Изменение пароля
        if 'new_password' in validated_data:
            current_password = validated_data['password']
            if not check_password(current_password, instance.password):
                raise ValidationError({"password": "Неверный текущий пароль"})

            instance.password = make_password(validated_data['new_password'])
            validated_data.pop('password', None)
            validated_data.pop('new_password', None)
            validated_data.pop('confirm_password', None)

        # Обновление остальных полей
        for attr, value in validated_data.items():
            if hasattr(instance, attr):
                setattr(instance, attr, value)

        instance.save()
        return instance

    def to_representation(self, instance):
        """Скрываем пароли при выводе"""
        data = super().to_representation(instance)
        data.pop('password', None)
        data.pop('new_password', None)
        data.pop('confirm_password', None)
        return data

    def create(self, validated_data):
        # Хеширование пароля перед созданием пользователя
        validated_data['password'] = make_password(validated_data.get('password'))
        return super().create(validated_data)


class OrderSerializer(serializers.ModelSerializer):
    reader_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderCatalog
        fields = [
            'id', 'title', 'author_surname', 'author_name', 'author_patronymic',
            'quantyti', 'reader', 'reader_name', 'date_publication', 'confirmed'
        ]
        read_only_fields = ['reader', 'reader_name']
        extra_kwargs = {
            'quantyti': {
                'min_value': 1,
                'max_value': 5
            },
            'title': {'required': True},
            'author_surname': {'required': True}
        }

    def get_reader_name(self, obj):
        return f"{obj.reader.surname} {obj.reader.name}"

    def validate(self, data):
        # Проверяем, может ли текущий пользователь изменять confirmed
        request = self.context.get('request')
        if request and request.user and not request.user.admin:
            if 'confirmed' in data and data['confirmed'] != self.instance.confirmed:
                raise serializers.ValidationError({
                    'confirmed': 'Только администратор может изменять этот статус'
                })

        if 'author_patronymic' in data and data['author_patronymic'] == '':
            data['author_patronymic'] = None

        if 'date_publication' in data and data['date_publication']:
            if not data['date_publication'].isdigit() or len(data['date_publication']) != 4:
                raise serializers.ValidationError({
                    'date_publication': 'Год публикации должен быть в формате YYYY'
                })
        return data

class StatisticsSerializer(serializers.Serializer):
    books = serializers.IntegerField()
    users = serializers.IntegerField()
    orders = serializers.IntegerField()
    bookings = serializers.IntegerField()
    debtors = serializers.IntegerField()

class AuthorsBooksSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorsBooks
        fields = ['id', 'author', 'book']


class BookCreateSerializer(serializers.ModelSerializer):
    author_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    genre_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = BooksCatalog
        fields = [
            'index', 'title', 'place_publication', 'information_publication',
            'volume', 'quantity_total', 'date_publication', 'cover',
            'author_ids', 'genre_ids'
        ]

    def create(self, validated_data):
        author_ids = validated_data.pop('author_ids', [])
        genre_ids = validated_data.pop('genre_ids', [])

        # Устанавливаем quantity_remaining равным quantity_total
        validated_data['quantity_remaining'] = validated_data['quantity_total']

        book = super().create(validated_data)

        # Добавляем авторов
        for author_id in author_ids:
            AuthorsBooks.objects.create(book=book, author_id=author_id)

        # Добавляем жанры
        if genre_ids:
            book.genres.set(genre_ids)

        return book