from django.urls import path
from .views import (
    RegisterReaderView, LoginAPIView, LogoutAPIView,
    RefreshTokenView, UserProfileView, AuthCheckView,
    BookListView, BookDetailView, PopularBooksView,
    CommentListCreateView, CommentDetailView, UserBookingsListView,
    BookingDetailView, BookingListCreateView, UserBookingsView,
    ProfileUpdateView, OrderListView, StatisticsView,
    BookAdminListView, BookAdminDetailView, BookingAdminDetailView,
    AuthorListView, GenreListView, BookingAdminView,
    AuthorAdminView, AuthorAdminDetailView, AdminOrderDetailView,
    GenreAdminView, GenreAdminDetailView, AdminOrderListView
)

urlpatterns = [
    # Аутентификация и пользователи
    path('register/', RegisterReaderView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('auth/check/', AuthCheckView.as_view(), name='auth-check'),
    path('profile/update/', ProfileUpdateView.as_view(), name='profile-update'),

    # Книги (публичный доступ)
    path('books/', BookListView.as_view(), name='book-list'),
    path('books/<int:id>/', BookDetailView.as_view(), name='book-detail'),
    path('books/popular/', PopularBooksView.as_view(), name='popular-books'),

    # Комментарии
    path('comments/', CommentListCreateView.as_view(), name='comment-list'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment-detail'),

    # Бронирования
    path('bookings/', BookingListCreateView.as_view(), name='booking-list'),
    path('bookings/<int:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('users/<int:user_id>/bookings/', UserBookingsListView.as_view(), name='user-bookings-list'),
    path('bookings/my/', UserBookingsView.as_view(), name='user-bookings-my'),
    path('admin/bookings/', BookingAdminView.as_view(), name='admin-bookings-list'),
    path('admin/bookings/<int:pk>/', BookingAdminDetailView.as_view(), name='admin-bookings-detail'),

    # Заказы
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:id>/', OrderListView.as_view(), name='order-detail'),
    path('admin/orders/', AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/orders/<int:order_id>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),

    # Статистика
    path('statistics/', StatisticsView.as_view(), name='statistics'),

    # Административные endpoints (требуют прав администратора)
    # Книги
    path('admin/books/', BookAdminListView.as_view(), name='admin-books-list'),
    path('admin/books/<int:id>/', BookAdminDetailView.as_view(), name='admin-books-detail'),

    # Авторы
    path('admin/authors/', AuthorAdminView.as_view(), name='admin-authors-list'),
    path('admin/authors/<int:id>/', AuthorAdminDetailView.as_view(), name='admin-authors-detail'),
    path('admin/authors-list/', AuthorListView.as_view(), name='admin-authors-select-list'),

    # Жанры
    path('admin/genres/', GenreAdminView.as_view(), name='admin-genres-list'),
    path('admin/genres/<int:id>/', GenreAdminDetailView.as_view(), name='admin-genres-detail'),
    path('admin/genres-list/', GenreListView.as_view(), name='admin-genres-select-list'),
]