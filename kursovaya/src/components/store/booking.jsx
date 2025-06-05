import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import "./booking.css";

const Booking = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });

    const fetchBookings = async (page = 1, search = '') => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page,
                page_size: pagination.pageSize,
                search
            };

            const response = await apiClient.get('/bookings/my/', { params });

            if (Array.isArray(response?.data?.results)) {
                setBookings(response.data.results);
                setPagination({
                    ...pagination,
                    page,
                    total: response.data.count
                });
            } else if (Array.isArray(response?.data)) {
                setBookings(response.data);
                setPagination({
                    ...pagination,
                    page,
                    total: response.data.length
                });
            } else {
                console.error('Неожиданный формат ответа:', response.data);
                setError('Ошибка формата данных');
                setBookings([]);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка при загрузке бронирований');
            console.error('Полная ошибка:', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data
            });
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const cancelBooking = async (bookingId) => {
        try {
            const response = await apiClient.delete(`/bookings/${bookingId}/`);

            if (response.status === 204) {
                alert('Бронирование успешно отменено!');
                fetchBookings(pagination.page, searchTerm);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Не удалось отменить бронирование');
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleSearch = () => {
        fetchBookings(1, searchTerm);
    };

    const handlePageChange = (newPage) => {
        fetchBookings(newPage, searchTerm);
    };

    const filteredBookings = bookings
        .filter(booking => booking?.book_title && typeof booking.book_title === 'string')
        .filter(booking =>
            booking.book_title.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (loading && bookings.length === 0) return <div className="main_order_container">Загрузка...</div>;

    if (error) return (
        <div className="main_order_container">
            <p className="error-message">{error}</p>
            <button
                onClick={() => fetchBookings(pagination.page, searchTerm)}
                className="retry-button"
            >
                Повторить попытку
            </button>
        </div>
    );

    return (
        <div className="main_order_container">
            <h2>Мои бронирования</h2>
            <div className="search-controls">
                <input
                    type="text"
                    placeholder="Поиск по названию книги..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="search-input"
                />
                <button
                    onClick={handleSearch}
                    className="search-button"
                >
                    Найти
                </button>
            </div>

            {pagination.total > pagination.pageSize && (
                <div className="pagination">
                    {Array.from(
                        { length: Math.ceil(pagination.total / pagination.pageSize) },
                        (_, i) => i + 1
                    ).map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            disabled={page === pagination.page}
                            className={page === pagination.page ? 'active' : ''}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}

            {filteredBookings.length > 0 ? (
                <div className="bookings-grid">
                    {filteredBookings.map(booking => (
                        <div key={booking.id} className="booking-card">
                            <h3>{booking.book_title}</h3>
                            <div className="booking-meta">
                                <p><strong>ID:</strong> {booking.id}</p>
                                <p><strong>Количество:</strong> {booking.quantity || 1}</p>
                                <p><strong>Дата выдачи:</strong> {new Date(booking.date_issue).toLocaleDateString()}</p>
                                <p><strong>Дата возврата:</strong> {new Date(booking.date_return).toLocaleDateString()}</p>
                                <p><strong>Статус:</strong>
                                    <span className={`status-badge ${
                                        booking.returned ? 'status-returned' :
                                        booking.issued ? 'status-issued' : 'status-pending'
                                    }`}>
                                        {booking.returned ? 'Возвращена' :
                                         booking.issued ? 'Выдана' : 'Ожидает'}
                                    </span>
                                </p>
                            </div>

                            {/* Показываем кнопку отмены только если issued=false */}
                            {!booking.issued && (
                                <div className="cancel-button-container">
                                    <button
                                        onClick={() => cancelBooking(booking.id)}
                                        className="cancel-button"
                                    >
                                        Отменить бронирование
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-bookings">
                    {searchTerm ? 'Ничего не найдено' : 'Нет активных бронирований'}
                </p>
            )}

            {pagination.total > pagination.pageSize && (
                <div className="pagination">
                    {Array.from(
                        { length: Math.ceil(pagination.total / pagination.pageSize) },
                        (_, i) => i + 1
                    ).map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            disabled={page === pagination.page}
                            className={page === pagination.page ? 'active' : ''}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Booking;