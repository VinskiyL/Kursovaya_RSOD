import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '../../api/client';
import "./booking.css";

const Bookings_adm = () => {
    const [allBookings, setAllBookings] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('id');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });

    const fetchBookings = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/admin/bookings/');
            setAllBookings(response.data.results || response.data);
            setPagination(prev => ({
                ...prev,
                total: response.data.count || response.data.length
            }));
        } catch (err) {
            setError('Произошла ошибка при загрузке бронирований');
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    // Фильтрация бронирований на фронтенде
    const filteredBookings = useMemo(() => {
        if (!searchTerm) return allBookings;

        const term = searchTerm.toLowerCase();
        return allBookings.filter(booking => {
            if (searchBy === 'id') {
                return booking.id.toString().includes(term);
            } else if (searchBy === 'reader') {
                return booking.reader_name.toLowerCase().includes(term);
            } else if (searchBy === 'book') {
                return booking.book_title.toLowerCase().includes(term);
            }
            return true;
        });
    }, [allBookings, searchTerm, searchBy]);

    // Пагинация
    const paginatedBookings = useMemo(() => {
        const start = (pagination.page - 1) * pagination.pageSize;
        return filteredBookings.slice(start, start + pagination.pageSize);
    }, [filteredBookings, pagination.page, pagination.pageSize]);

    const handleSearchSubmit = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleStatusChange = async (bookingId, field) => {
        try {
            await apiClient.patch(`/admin/bookings/${bookingId}/`, {
                [field]: true
            });
            fetchBookings(); // Обновляем данные после изменения
        } catch (err) {
            setError('Ошибка при изменении статуса бронирования');
            console.error('Ошибка:', err);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        setPagination(prev => ({
            ...prev,
            total: filteredBookings.length
        }));
    }, [filteredBookings]);

    if (loading && allBookings.length === 0) {
        return <div className="main_order_container">Загрузка...</div>;
    }

    return (
        <div className="main_order_container">
            <h1 className="admin-title">Управление бронированиями</h1>

            {/* Поисковая форма */}
            <div className="search-controls">
                <select
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="search-select"
                >
                    <option value="id">По ID</option>
                    <option value="reader">По фамилии читателя</option>
                    <option value="book">По названию книги</option>
                </select>

                <input
                    type="text"
                    placeholder={
                        searchBy === 'id'
                            ? 'Введите ID бронирования'
                            : searchBy === 'reader'
                                ? 'Введите фамилию читателя'
                                : 'Введите название книги'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    className="search-input"
                />

                <button
                    onClick={handleSearchSubmit}
                    className="search-button"
                >
                    Найти
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Пагинация сверху */}
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

            {/* Список бронирований */}
            {paginatedBookings.length > 0 ? (
                <div className="books-grid">
                    {paginatedBookings.map((booking) => (
                        <div key={booking.id} className="book-card">
                            <div className="book-info">
                                <h3>ID:{booking.id}</h3>
                                <p><strong>Книга:</strong> {booking.book_title}</p>
                                <p><strong>Читатель:</strong> {booking.reader_name}</p>
                                <p><strong>Количество:</strong> {booking.quantity}</p>
                                <p><strong>Дата выдачи:</strong> {new Date(booking.date_issue).toLocaleDateString()}</p>
                                <p><strong>Дата возврата:</strong> {new Date(booking.date_return).toLocaleDateString()}</p>

                                <div className="status-controls">
                                    {!booking.issued && (
                                        <button
                                            className="status-button issue-button"
                                            onClick={() => handleStatusChange(booking.id, 'issued')}
                                        >
                                            Отметить как выданное
                                        </button>
                                    )}

                                    {booking.issued && !booking.returned && (
                                        <button
                                            className="status-button return-button"
                                            onClick={() => handleStatusChange(booking.id, 'returned')}
                                        >
                                            Отметить как возвращенное
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-books">
                    {allBookings.length === 0 ? 'Нет данных о бронированиях' : 'Бронирования не найдены'}
                </p>
            )}

            {/* Пагинация снизу */}
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

export default Bookings_adm;