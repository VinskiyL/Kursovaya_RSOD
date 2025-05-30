from django.urls import path
from .views import (
    RegisterReaderView, LoginAPIView, LogoutAPIView,
    RefreshTokenView, UserProfileView, AuthCheckView,
    BookListView, BookDetailView, PopularBooksView,
    CommentListCreateView, CommentDetailView, UserBookingsListView,
    BookingDetailView, BookingListCreateView, UserBookingsView,
    ProfileUpdateView, OrderDetailView, OrderListView
)

urlpatterns = [
    path('register/', RegisterReaderView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('auth/check/', AuthCheckView.as_view(), name='auth-check'),
    path('books/', BookListView.as_view(), name='book-list'),
    path('books/<int:id>/', BookDetailView.as_view(), name='book-detail'),
    path('api/books/popular/', PopularBooksView.as_view(), name='popular-books'),
    path('comments/', CommentListCreateView.as_view(), name='comment-list'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment-detail'),
    path('bookings/', BookingListCreateView.as_view()),
    path('bookings/<int:pk>/', BookingDetailView.as_view()),
    path('users/<int:user_id>/bookings/', UserBookingsListView.as_view(), name='user-bookings'),
    path('bookings/my/', UserBookingsView.as_view(), name='user-bookings'),
    path('profile/update/', ProfileUpdateView.as_view(), name='profile-update'),
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:id>/', OrderDetailView.as_view(), name='order-detail'),
]