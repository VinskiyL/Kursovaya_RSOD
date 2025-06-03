from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password, make_password
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from .models import ReadersCatalog, AuthorsCatalog
from .serializers import ReadersCatalogSerializer
import time
from rest_framework.exceptions import PermissionDenied
import logging
from datetime import datetime
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .serializers import (
    BookListSerializer, BookDetailSerializer, PopularBookSerializer,
    BookingSerializer, BookingCreateSerializer, StatisticsSerializer,
    AuthorShortSerializer, GenreSerializer, BookCreateSerializer
)
from .filters import BookFilter
from django.core.cache import cache
from django.db.models import Prefetch
from .models import AuthorsBooks, BookingCatalog, BooksCatalog, GenresCatalog
from django.db.models import Count, Q
from rest_framework import generics, permissions
from .models import Comments
from .serializers import CommentSerializer
from datetime import timedelta
from .models import OrderCatalog
from .serializers import OrderSerializer
from .filters import OrderFilter
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

class PopularBooksView(generics.ListAPIView):
    serializer_class = PopularBookSerializer
    pagination_class = None

    def get_queryset(self):
        cache_key = 'popular_books_top10'
        queryset = cache.get(cache_key)

        if not queryset:
            queryset = BooksCatalog.objects.annotate(
                active_bookings=Count(
                    'bookingcatalog',
                    filter=Q(bookingcatalog__issued=True) &
                           Q(bookingcatalog__returned=False)
                )
            ).order_by('-active_bookings')[:10]
            cache.set(cache_key, queryset, timeout=3600)
        return queryset


class BookPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

class BookListView(generics.ListAPIView):
    serializer_class = BookListSerializer
    pagination_class = BookPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BookFilter
    search_fields = ['title', 'authors_mark', 'index']
    ordering_fields = ['title', 'date_publication', 'quantity_remaining']
    ordering = ['title']

    def get_queryset(self):
        cache_key = f"books_{self.request.query_params}"
        queryset = cache.get(cache_key)
        if not queryset:
            queryset = BooksCatalog.objects.all().prefetch_related(
                Prefetch('authorsbooks_set', queryset=AuthorsBooks.objects.select_related('author')),
                Prefetch('genres')
            )
            cache.set(cache_key, queryset, timeout=60 * 15)
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data['meta'] = {
            'total_books': self.get_queryset().count(),
            'filters_available': list(self.filterset_class.Meta.fields.keys())
        }
        return response


    def handle_exception(self, exc):
        logger.error(f"Error in BookListView: {str(exc)}")
        return Response(
            {"error": "Произошла ошибка при загрузке книг"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class BookDetailView(generics.RetrieveAPIView):
    queryset = BooksCatalog.objects.all()
    serializer_class = BookDetailSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return super().get_queryset().prefetch_related(
            'authorsbooks_set__author',
            'genres'
        )


class RegisterReaderView(APIView):
    """
    Регистрация нового пользователя
    """

    def post(self, request):
        serializer = ReadersCatalogSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            response = Response(
                {
                    "success": True,
                    "message": "Регистрация прошла успешно!"
                },
                status=status.HTTP_201_CREATED
            )

            logger.info(f"New user registered: {user.login}")
            return response

        logger.warning(f"Registration failed: {serializer.errors}")
        return Response(
            {
                "success": False,
                "errors": serializer.errors,
                "message": "Ошибка валидации данных"
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class CustomAccessToken(AccessToken):
    """
    Кастомный AccessToken с дополнительными claims
    """

    def __init__(self, user, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self['user_id'] = user.id
        self['login'] = user.login
        self['exp'] = int((datetime.now() + timedelta(hours=1)).timestamp())


class AuthAPIView(APIView):
    """
    Базовый класс для аутентификации
    """

    @staticmethod
    def set_auth_cookies(response, user):
        refresh = RefreshToken.for_user(user)
        access_token = str(CustomAccessToken(user))

        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=3600,
            path='/'
        )

        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=86400,
            path='/'
        )

        return response


class LoginAPIView(AuthAPIView):
    """
    Аутентификация пользователя
    """

    def post(self, request):
        login_input = request.data.get('login', '').strip()
        password_input = request.data.get('password', '').strip()

        if not login_input or not password_input:
            return Response(
                {
                    "success": False,
                    "code": "missing_credentials",
                    "message": "Логин и пароль обязательны."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = ReadersCatalog.objects.get(login=login_input)

            if not user.is_active:
                return Response(
                    {
                        "success": False,
                        "code": "account_disabled",
                        "message": "Учетная запись отключена."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            if not check_password(password_input, user.password):
                time.sleep(2)  # Задержка при неверном пароле
                raise ReadersCatalog.DoesNotExist

        except ReadersCatalog.DoesNotExist:
            time.sleep(2)  # Задержка при неверном логине
            return Response(
                {
                    "success": False,
                    "code": "invalid_credentials",
                    "message": "Неверный логин или пароль."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Создаем сериализованные данные пользователя
        user_data = ReadersCatalogSerializer(user).data
        # Добавляем роль в ответ
        user_data['role'] = 'admin' if user.admin else 'user'

        response = Response(
            {
                "success": True,
                "user": user_data,  # Теперь включает роль
                "message": "Аутентификация успешна"
            },
            status=status.HTTP_200_OK
        )

        return self.set_auth_cookies(response, user)


class LogoutAPIView(APIView):
    """
    Выход из системы
    """

    def post(self, request):
        response = Response(
            {
                "success": True,
                "message": "Успешный выход из системы"
            },
            status=status.HTTP_200_OK
        )

        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')

        return response


class RefreshTokenView(AuthAPIView):
    """
    Обновление токена доступа
    """

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response(
                {
                    "success": False,
                    "code": "missing_token",
                    "message": "Refresh токен отсутствует"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            refresh = RefreshToken(refresh_token)
            user = ReadersCatalog.objects.get(id=refresh['user_id'])

            response = Response(
                {
                    "success": True,
                    "message": "Токен успешно обновлен"
                },
                status=status.HTTP_200_OK
            )

            return self.set_auth_cookies(response, user)

        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            return Response(
                {
                    "success": False,
                    "code": "invalid_token",
                    "message": "Недействительный refresh токен"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserProfileView(APIView):
    """
    Получение информации о текущем пользователе
    """

    def get(self, request):
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return Response(
                {
                    "success": False,
                    "code": "unauthorized",
                    "message": "Требуется аутентификация"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            return Response(
                {
                    "success": True,
                    "user": ReadersCatalogSerializer(user).data
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(f"Profile access failed: {str(e)}")
            return Response(
                {
                    "success": False,
                    "code": "invalid_token",
                    "message": "Недействительный токен"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )


class AuthCheckView(APIView):
    """
    Проверка аутентификации пользователя
    """

    def get(self, request):
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return Response(
                {"success": False, "message": "Токен отсутствует"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            return Response(
                {
                    "success": True,
                    "user": ReadersCatalogSerializer(user).data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Auth check failed: {str(e)}")
            return Response(
                {"success": False, "message": "Недействительный токен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

class CommentListCreateView(APIView):
    """
    Список комментариев и создание нового комментария с ручной проверкой токена в куки
    """

    def get(self, request):
        comments = Comments.objects.all().order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден в cookies"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
        except Exception as e:
            logger.error(f"Ошибка при проверке токена или получении пользователя: {e}")
            return Response(
                {"detail": "Недействительный или истёкший токен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        request.user = user  # Важно! Подменяем request.user
        serializer = CommentSerializer(data=request.data, context={'request': request})

        if not serializer.is_valid():
            return Response(
                {"detail": "Ошибка валидации", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()  # Без параметров
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentDetailView(APIView):
    """
    Просмотр, обновление и удаление комментария с ручной проверкой токена и проверкой прав пользователя
    """

    def get_comment(self, pk):
        try:
            return Comments.objects.get(pk=pk)
        except Comments.DoesNotExist:
            return None

    def get_user_from_token(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return None
        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            return user
        except Exception as e:
            logger.error(f"Ошибка получения пользователя из токена: {e}")
            return None

    def get(self, request, pk):
        comment = self.get_comment(pk)
        if not comment:
            return Response({"detail": "Комментарий не найден"}, status=status.HTTP_404_NOT_FOUND)
        serializer = CommentSerializer(comment)
        return Response(serializer.data)

    def put(self, request, pk):
        comment = self.get_comment(pk)
        if not comment:
            return Response({"detail": "Комментарий не найден"}, status=status.HTTP_404_NOT_FOUND)

        user = self.get_user_from_token(request)
        if not user:
            return Response({"detail": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED)

        if comment.user != user and not user.admin:
            raise PermissionDenied("У вас нет прав для этого действия")

        serializer = CommentSerializer(comment, data=request.data, partial=False, context={'request': request})
        if not serializer.is_valid():
            return Response({"detail": "Ошибка валидации", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        comment = self.get_comment(pk)
        if not comment:
            return Response({"detail": "Комментарий не найден"}, status=status.HTTP_404_NOT_FOUND)

        user = self.get_user_from_token(request)
        if not user:
            return Response({"detail": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED)

        if comment.user != user and not user.admin:
            raise PermissionDenied("У вас нет прав для этого действия")

        serializer = CommentSerializer(comment, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({"detail": "Ошибка валидации", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        comment = self.get_comment(pk)
        if not comment:
            return Response({"detail": "Комментарий не найден"}, status=status.HTTP_404_NOT_FOUND)

        user = self.get_user_from_token(request)
        if not user:
            return Response({"detail": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED)

        if comment.user != user and not user.admin:
            raise PermissionDenied("У вас нет прав для этого действия")

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BookingListCreateView(APIView):
    """
    Список бронирований и создание нового бронирования с проверкой токена в куки
    """

    def get(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден в cookies"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
        except Exception as e:
            logger.error(f"Ошибка при проверке токена или получении пользователя: {e}")
            return Response(
                {"detail": "Недействительный или истёкший токен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        bookings = BookingCatalog.objects.all()
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден в cookies"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
        except Exception as e:
            logger.error(f"Ошибка при проверке токена или получении пользователя: {e}")
            return Response(
                {"detail": "Недействительный или истёкший токен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = BookingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "Ошибка валидации", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка доступности книги (дублируется в модели, но оставляем для быстрой валидации)
        book = BooksCatalog.objects.get(pk=serializer.validated_data['index'].id)
        if book.quantity_remaining < serializer.validated_data['quantity']:
            return Response(
                {'error': 'Недостаточно экземпляров книги для бронирования'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создаем бронирование - логика уменьшения количества в модели
        booking = serializer.save(
            reader=user,
            issued=False,
            returned=False
        )

        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )


class BookingDetailView(APIView):
    """
    Просмотр, обновление и удаление бронирования с проверкой токена и прав пользователя
    """

    def get_booking(self, pk):
        try:
            return BookingCatalog.objects.get(pk=pk)
        except BookingCatalog.DoesNotExist:
            return None

    def get_user_from_token(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return None
        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            return user
        except Exception as e:
            logger.error(f"Ошибка получения пользователя из токена: {e}")
            return None

    def get(self, request, pk):
        booking = self.get_booking(pk)
        if not booking:
            return Response({"detail": "Бронирование не найдено"}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookingSerializer(booking)
        return Response(serializer.data)

    def patch(self, request, pk):
        booking = self.get_booking(pk)
        if not booking:
            return Response({"detail": "Бронирование не найдено"}, status=status.HTTP_404_NOT_FOUND)

        user = self.get_user_from_token(request)
        if not user:
            return Response({"detail": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED)

        if booking.reader != user and not user.admin:
            return Response(
                {"detail": "У вас нет прав для этого действия"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Обрабатываем возврат книг
        if 'returned' in request.data and request.data['returned']:
            booking.mark_as_returned()
            return Response(BookingSerializer(booking).data)

        # Для других изменений используем сериализатор
        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"detail": "Ошибка валидации", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        booking = self.get_booking(pk)
        if not booking:
            return Response({"detail": "Бронирование не найдено"}, status=status.HTTP_404_NOT_FOUND)

        user = self.get_user_from_token(request)
        if not user:
            return Response({"detail": "Требуется авторизация"}, status=status.HTTP_401_UNAUTHORIZED)

        if booking.reader != user and not user.admin:
            return Response(
                {"detail": "У вас нет прав для этого действия"},
                status=status.HTTP_403_FORBIDDEN
            )

        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserBookingsListView(generics.ListAPIView):
    serializer_class = BookingSerializer
    pagination_class = BookPagination
    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return BookingCatalog.objects.filter(reader_id=user_id)


class UserBookingsView(APIView):
    """
    Список бронирований текущего пользователя
    """

    def get(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден в cookies"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
        except Exception as e:
            logger.error(f"Ошибка при проверке токена или получении пользователя: {e}")
            return Response(
                {"detail": "Недействительный или истёкший токен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        bookings = BookingCatalog.objects.filter(reader=user)
        serializer = BookingSerializer(bookings, many=True)
        pagination_class = BookPagination
        return Response(serializer.data)

class ProfileUpdateView(APIView):
    """
    Обновление профиля пользователя
    """
    def put(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден в cookies"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
        except Exception as e:
            logger.error(f"Ошибка при проверке токена или получении пользователя: {e}")
            return Response(
                {"detail": "Недействительный или истёкший токен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = ReadersCatalogSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"detail": "Ошибка валидации", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            serializer.save()
            return Response(
                {"success": True, "message": "Профиль успешно обновлен"},
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            return Response(
                {"detail": "Ошибка валидации", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )


class OrderListView(APIView):
    """
    Список заказов, создание и удаление заказа (без редактирования и просмотра деталей)
    """
    filter_backends = [DjangoFilterBackend]
    filterset_class = OrderFilter
    pagination_class = BookPagination

    def get_user_from_token(self, request):
        """Получаем пользователя из access_token в куках"""
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return None

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            return user
        except Exception as e:
            logger.error(f"Ошибка получения пользователя из токена: {e}")
            return None

    def get(self, request):
        """Получение списка заказов пользователя"""
        user = self.get_user_from_token(request)
        if not user:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден или недействителен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        queryset = OrderCatalog.objects.filter(
            reader=user
        ).select_related('reader').order_by('-id')

        # Фильтрация и пагинация
        queryset = self.filterset_class(request.GET, queryset=queryset).qs
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = OrderSerializer(page if page is not None else queryset, many=True)

        return paginator.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    def post(self, request):
        """Создание нового заказа"""
        user = self.get_user_from_token(request)
        if not user:
            return Response(
                {"detail": "Требуется авторизация: access_token не найден или недействителен"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = OrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"detail": "Ошибка валидации", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            serializer.save(reader=user)
            logger.info(f"User {user.id} создал заказ: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Ошибка создания заказа: {str(e)}")
            return Response(
                {"detail": "Ошибка при создании заказа"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, id):
        """Удаление заказа"""
        user = self.get_user_from_token(request)
        if not user:
            return Response(
                {"detail": "Требуется авторизация"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            order = OrderCatalog.objects.get(id=id, reader=user)
            order.delete()
            logger.info(f"User {user.id} удалил заказ {id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except OrderCatalog.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден или у вас нет прав"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Ошибка удаления заказа: {str(e)}")
            return Response(
                {"detail": "Ошибка сервера при удалении"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminPermissionMixin:
    """
    Миксин для проверки прав администратора через куки
    """
    def check_admin_permissions(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            logger.warning("Access token not found in cookies")
            raise PermissionDenied("Требуется авторизация")

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            if not user.admin:
                logger.warning(f"User {user.id} attempted admin access without permissions")
                raise PermissionDenied("Требуются права администратора")
            return user
        except Exception as e:
            logger.error(f"Error verifying admin permissions: {str(e)}")
            raise PermissionDenied("Недействительный токен")

    def dispatch(self, request, *args, **kwargs):
        try:
            self.check_admin_permissions(request)
            return super().dispatch(request, *args, **kwargs)
        except PermissionDenied as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

class StatisticsView(APIView):
    def get_user_from_token(self, request):
        """Получаем пользователя из access_token в куках"""
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return None

        try:
            token = AccessToken(access_token)
            user = ReadersCatalog.objects.get(id=token['user_id'])
            return user
        except Exception as e:
            logger.error(f"Ошибка получения пользователя из токена: {e}")
            return None

    def get(self, request):
        # Проверка прав администратора
        user = self.get_user_from_token(request)
        if not user or not user.admin:
            return Response(
                {"detail": "Требуются права администратора"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Получаем все данные за минимальное количество запросов
            current_date = timezone.now().date()

            # Основная статистика
            stats = {
                'books': BooksCatalog.objects.count(),
                'users': ReadersCatalog.objects.count(),
                'orders': OrderCatalog.objects.filter(confirmed=False).count(),
                'bookings': BookingCatalog.objects.filter(returned=False).count(),
            }

            # Должники - только выданные и не возвращенные книги с просроченной датой
            stats['debtors'] = BookingCatalog.objects.filter(
                issued=True,
                returned=False,
                date_return__lt=current_date
            ).values('reader').distinct().count()

            serializer = StatisticsSerializer(stats)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Ошибка при получении статистики: {str(e)}")
            return Response(
                {"error": "Произошла ошибка при загрузке статистики"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BookAdminListView(AdminPermissionMixin, generics.ListCreateAPIView):
    """
    Административный список книг (с возможностью создания)
    """
    queryset = BooksCatalog.objects.all().prefetch_related(
        Prefetch('authorsbooks_set', queryset=AuthorsBooks.objects.select_related('author')),
        'genres'
    )
    serializer_class = BookDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = BookCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # Очищаем кеш
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class BookAdminDetailView(AdminPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    Детальное представление книги для администратора (CRUD)
    """
    queryset = BooksCatalog.objects.all().prefetch_related(
        Prefetch('authorsbooks_set', queryset=AuthorsBooks.objects.select_related('author')),
        'genres'
    )
    serializer_class = BookDetailSerializer
    lookup_field = 'id'

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Очищаем кеш
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')
        cache.delete(f'book_{instance.id}')

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Проверяем, нет ли активных бронирований
        active_bookings = BookingCatalog.objects.filter(
            index=instance,
            issued=True,
            returned=False
        ).exists()

        if active_bookings:
            return Response(
                {"detail": "Невозможно удалить книгу, так как есть активные бронирования"},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)

        # Очищаем кеш
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')
        cache.delete(f'book_{instance.id}')

        return Response(status=status.HTTP_204_NO_CONTENT)

class AuthorListView(AdminPermissionMixin, generics.ListAPIView):
    """
    Список всех авторов для выбора при создании/редактировании книги
    """
    queryset = AuthorsCatalog.objects.all()
    serializer_class = AuthorShortSerializer
    pagination_class = None

class GenreListView(AdminPermissionMixin, generics.ListAPIView):
    """
    Список всех жанров для выбора при создании/редактировании книги
    """
    queryset = GenresCatalog.objects.all()
    serializer_class = GenreSerializer
    pagination_class = None

class AuthorAdminView(AdminPermissionMixin, generics.ListCreateAPIView):
    """
    Управление авторами (список и создание)
    """
    queryset = AuthorsCatalog.objects.all()
    serializer_class = AuthorShortSerializer
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save()
        # Очищаем кеш книг, так как мог измениться список авторов
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')

class AuthorAdminDetailView(AdminPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    Детальное управление автором
    """
    queryset = AuthorsCatalog.objects.all()
    serializer_class = AuthorShortSerializer
    lookup_field = 'id'

    def perform_update(self, serializer):
        serializer.save()
        # Очищаем кеш книг, так как мог измениться автор
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Проверяем, не связан ли автор с книгами
        if AuthorsBooks.objects.filter(author=instance).exists():
            return Response(
                {"detail": "Невозможно удалить автора, так как есть связанные книги"},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        # Очищаем кеш книг
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')
        return Response(status=status.HTTP_204_NO_CONTENT)

class GenreAdminView(AdminPermissionMixin, generics.ListCreateAPIView):
    """
    Управление жанрами (список и создание)
    """
    queryset = GenresCatalog.objects.all()
    serializer_class = GenreSerializer
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save()
        # Очищаем кеш книг, так как мог измениться список жанров
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')

class GenreAdminDetailView(AdminPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    Детальное управление жанром
    """
    queryset = GenresCatalog.objects.all()
    serializer_class = GenreSerializer
    lookup_field = 'id'

    def perform_update(self, serializer):
        serializer.save()
        # Очищаем кеш книг, так как мог измениться жанр
        keys = cache.keys('books_*')  # Redis поддерживает keys()
        if keys:
            cache.delete_many(keys)
        cache.delete('popular_books_top10')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Проверяем, не связан ли жанр с книгами
        if instance.books.exists():
            return Response(
                {"detail": "Невозможно удалить жанр, так как есть связанные книги"},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        # Очищаем кеш книг
        cache.delete_many(keys=cache.keys('books_*'))
        return Response(status=status.HTTP_204_NO_CONTENT)