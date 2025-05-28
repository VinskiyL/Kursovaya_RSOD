from .models import ReadersCatalog
from django.contrib.auth.hashers import make_password
from rest_framework.exceptions import ValidationError
import re
from datetime import date
from rest_framework import serializers
from .models import BooksCatalog, AuthorsCatalog, AuthorsBooks, Comments, BookingCatalog


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
            'issued': {'read_only': True},  # Запрещаем прямое изменение
            'returned': {'read_only': True}  # через API
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
        read_only_fields = fields

class BookListSerializer(serializers.ModelSerializer):
    authors = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()

    class Meta:
        model = BooksCatalog
        fields = [
            'id', 'index', 'title', 'authors', 'volume',
            'quantity_total', 'quantity_remaining', 'available',
            'cover'
        ]
        read_only_fields = fields

    def get_authors(self, obj):
        return AuthorShortSerializer(obj.authors(), many=True).data

    def get_available(self, obj):
        return obj.quantity_remaining > 0

class BookDetailSerializer(BookListSerializer):
    def validate_date_publication(self, value):
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Год должен быть в формате YYYY")
        return value
    class Meta(BookListSerializer.Meta):
        fields = BookListSerializer.Meta.fields + [
            'place_publication', 'information_publication', 'date_publication'
        ]
        read_only_fields = fields

    def validate_date_publication(self, value):
        if value and (not value.isdigit() or len(value) != 4):
            raise serializers.ValidationError("Год должен быть в формате YYYY")
        return value


class PopularBookSerializer(BookListSerializer):
    active_bookings = serializers.IntegerField(read_only=True)

    class Meta(BookListSerializer.Meta):
        fields = BookListSerializer.Meta.fields + ['active_bookings']

class ReadersCatalogSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
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
            'consists_of', 're_registration', 'phone', 'login', 'password', 'mail', 'admin'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate_login(self, value):
        value = value.strip()

        if len(value) < 4:
            raise ValidationError("Логин должен содержать минимум 4 символа.")

        if len(value) > 30:
            raise ValidationError("Логин должен быть не длиннее 30 символов.")

        if not re.match(r'^[a-zA-Z0-9_\-\.]+$', value):
            raise ValidationError(
                "Логин может содержать только латинские буквы, цифры, точки, дефисы и подчеркивания."
            )

        if ReadersCatalog.objects.filter(login__iexact=value).exists():
            raise ValidationError("Пользователь с таким логином уже существует.")

        return value

    def validate_password(self, value):
        if len(value) < 6:
            raise ValidationError("Пароль должен содержать минимум 6 символов.")

        if not re.search(r'[A-Z]', value):
            raise ValidationError("Пароль должен содержать хотя бы одну заглавную букву.")

        if not re.search(r'[a-z]', value):
            raise ValidationError("Пароль должен содержать хотя бы одну строчную букву.")

        if not re.search(r'[0-9]', value):
            raise ValidationError("Пароль должен содержать хотя бы одну цифру.")

        return value

    def validate_phone(self, value):
        if not re.match(r'^\+?[0-9]{10,15}$', value):
            raise ValidationError("Введите корректный номер телефона.")
        return value

    def validate_mail(self, value):
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', value):
            raise ValidationError("Введите корректный email адрес.")
        return value

    def validate(self, data):
        # Проверка даты рождения (минимальный возраст 12 лет)
        from datetime import date, timedelta
        if data['birthday'] and data['birthday'] > date.today() - timedelta(days=13 * 365):
            raise ValidationError({"birthday": "Пользователь должен быть старше 13 лет."})

        return data

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        validated_data['is_active'] = True  # Активируем пользователя при регистрации

        # Устанавливаем дату регистрации, если не указана
        if not validated_data.get('consists_of'):
            validated_data['consists_of'] = date.today()

        return super().create(validated_data)

    def to_representation(self, instance):
        """Скрываем чувствительные данные при выводе"""
        data = super().to_representation(instance)
        data.pop('password', None)
        data.pop('passport_series', None)
        data.pop('passport_number', None)
        return data