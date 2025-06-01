from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password, make_password
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from .models import ReadersCatalog
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
    BookingSerializer, BookingCreateSerializer, StatisticsSerializer
)
from .filters import BookFilter
from django.core.cache import cache
from django.db.models import Prefetch
from .models import AuthorsBooks, BookingCatalog, BooksCatalog
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
                    'bookingcatalog',  # Имя обратной связи из BookingCatalog в BooksCatalog
                    filter=Q(bookingcatalog__issued=True) &
                           Q(bookingcatalog__returned=False)
                )
            ).order_by('-active_bookings')[:10]

            cache.set(cache_key, queryset, timeout=3600)  # Кеш на 1 час

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
                Prefetch('genres')  # Добавляем prefetch для жанров
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


class BookAdminView(APIView):
    """
    Административный интерфейс для управления книгами (CRUD)
    """

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

    def check_admin_permissions(self, request):
        """Проверяем, что пользователь является администратором"""
        user = self.get_user_from_token(request)
        if not user or not user.admin:
            raise PermissionDenied("Требуются права администратора")
        return user

    def post(self, request):
        """Создание новой книги"""
        try:
            self.check_admin_permissions(request)

            # Для создания книги используем BookDetailSerializer, так как он содержит все поля
            serializer = BookDetailSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"detail": "Ошибка валидации", "errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Сохраняем книгу
            book = serializer.save()

            # Очищаем кеш списка книг
            cache.delete_many(keys=cache.keys('books_*'))
            cache.delete('popular_books_top10')

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except PermissionDenied as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Ошибка при создании книги: {str(e)}")
            return Response(
                {"detail": "Ошибка сервера при создании книги"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, book_id):
        """Полное обновление книги"""
        try:
            self.check_admin_permissions(request)

            try:
                book = BooksCatalog.objects.get(pk=book_id)
            except BooksCatalog.DoesNotExist:
                return Response(
                    {"detail": "Книга не найдена"},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = BookDetailSerializer(book, data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"detail": "Ошибка валидации", "errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save()

            # Очищаем кеш
            cache.delete_many(keys=cache.keys('books_*'))
            cache.delete('popular_books_top10')
            cache.delete(f'book_{book_id}')

            return Response(serializer.data)

        except PermissionDenied as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Ошибка при обновлении книги: {str(e)}")
            return Response(
                {"detail": "Ошибка сервера при обновлении книги"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request, book_id):
        """Частичное обновление книги"""
        try:
            self.check_admin_permissions(request)

            try:
                book = BooksCatalog.objects.get(pk=book_id)
            except BooksCatalog.DoesNotExist:
                return Response(
                    {"detail": "Книга не найдена"},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = BookDetailSerializer(book, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(
                    {"detail": "Ошибка валидации", "errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save()

            # Очищаем кеш
            cache.delete_many(keys=cache.keys('books_*'))
            cache.delete('popular_books_top10')
            cache.delete(f'book_{book_id}')

            return Response(serializer.data)

        except PermissionDenied as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Ошибка при частичном обновлении книги: {str(e)}")
            return Response(
                {"detail": "Ошибка сервера при обновлении книги"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, book_id):
        """Удаление книги"""
        try:
            self.check_admin_permissions(request)

            try:
                book = BooksCatalog.objects.get(pk=book_id)
            except BooksCatalog.DoesNotExist:
                return Response(
                    {"detail": "Книга не найдена"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Проверяем, нет ли активных бронирований для этой книги
            active_bookings = BookingCatalog.objects.filter(
                index=book,
                issued=True,
                returned=False
            ).exists()

            if active_bookings:
                return Response(
                    {"detail": "Невозможно удалить книгу, так как есть активные бронирования"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            book.delete()

            # Очищаем кеш
            cache.delete_many(keys=cache.keys('books_*'))
            cache.delete('popular_books_top10')
            cache.delete(f'book_{book_id}')

            return Response(status=status.HTTP_204_NO_CONTENT)

        except PermissionDenied as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Ошибка при удалении книги: {str(e)}")
            return Response(
                {"detail": "Ошибка сервера при удалении книги"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )