from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password, make_password
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from .models import ReadersCatalog
from .serializers import ReadersCatalogSerializer
import time
import logging
from datetime import datetime, timedelta
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import BooksCatalog
from .serializers import BookListSerializer, BookDetailSerializer, AuthorShortSerializer, PopularBookSerializer
from .filters import BookFilter
from django.core.cache import cache
from django.db.models import Prefetch
from .models import AuthorsBooks, AuthorsCatalog
from django.db.models import Count, Q
from rest_framework import generics, permissions
from .models import Comments
from .serializers import CommentSerializer

logger = logging.getLogger(__name__)

class CommentListCreateView(generics.ListCreateAPIView):
    queryset = Comments.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comments.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        # Проверяем, что пользователь является автором комментария
        if serializer.instance.user != self.request.user and not self.request.user.admin:
            raise PermissionDenied("Вы не можете редактировать этот комментарий")
        serializer.save()

    def perform_destroy(self, instance):
        # Проверяем, что пользователь является автором комментария или админом
        if instance.user != self.request.user and not self.request.user.admin:
            raise PermissionDenied("Вы не можете удалить этот комментарий")
        instance.delete()

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
                Prefetch('authorsbooks_set', queryset=AuthorsBooks.objects.select_related('author'))
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
            'authorsbooks_set__author'
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