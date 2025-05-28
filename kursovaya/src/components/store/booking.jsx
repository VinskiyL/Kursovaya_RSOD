import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
//TODO css
const Booking = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchBookings = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/bookings/my/');

            if (Array.isArray(response?.data)) {
                setBookings(response.data);
            } else if (response?.data?.results) {
                setBookings(response.data.results);
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
                fetchBookings();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Не удалось отменить бронирование');
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const filteredBookings = bookings
        .filter(booking => booking?.book_title && typeof booking.book_title === 'string')
        .filter(booking =>
            booking.book_title.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (loading) return <div className="main_order_container">Загрузка...</div>;

    if (error) return (
        <div className="main_order_container">
            <p style={{ color: 'red' }}>{error}</p>
            <button onClick={fetchBookings}>Повторить попытку</button>
        </div>
    );

    return (
        <div className="main_order_container">
            <h2>Мои бронирования</h2>

            <input
                type="text"
                placeholder="Поиск по названию книги..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
            />

            {filteredBookings.length > 0 ? (
                <div className="bookings-list">
                    {filteredBookings.map(booking => (
                        <div key={booking.id} className="booking-card">
                            <h3>{booking.book_title}</h3>
                            <p><strong>ID:</strong> {booking.id}</p>
                            <p><strong>Дата выдачи:</strong> {new Date(booking.date_issue).toLocaleDateString()}</p>
                            <p><strong>Дата возврата:</strong> {new Date(booking.date_return).toLocaleDateString()}</p>
                            <p><strong>Статус:</strong>
                                {booking.returned
                                    ? 'Возвращена'
                                    : booking.issued
                                        ? 'Выдана'
                                        : 'Ожидает'
                                }
                            </p>

                            {!booking.issued && !booking.returned && (
                                <button
                                    onClick={() => cancelBooking(booking.id)}
                                    className="cancel-button"
                                >
                                    Отменить бронирование
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p>{searchTerm ? 'Ничего не найдено' : 'Нет активных бронирований'}</p>
            )}
        </div>
    );
};

export default Booking;