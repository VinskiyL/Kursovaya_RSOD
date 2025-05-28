import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiClient from '../../api/client';
import './books_info.css';
//TODO ссылка на брони
const Books_info = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [issueDate, setIssueDate] = useState('');
    const userData = useSelector((state) => state.user.data);
    const isAuthenticated = !!userData;

    useEffect(() => {
        if (!id) {
            setError('ID книги не указан');
            setLoading(false);
            return;
        }

        // Устанавливаем сегодняшнюю дату по умолчанию
        const today = new Date().toISOString().split('T')[0];
        setIssueDate(today);

        const fetchBookDetails = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get(`/books/${id}/`);
                setBook(response.data);
            } catch (err) {
                setError('Произошла ошибка при загрузке данных книги');
                console.error('Ошибка:', err);
                if (err.response?.status === 404) {
                    navigate('/not-found');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchBookDetails();
    }, [id, navigate]);

    const handleBooking = async () => {
        if (!book || !isAuthenticated) return;

        if (quantity > book.quantity_remaining) {
            setError(`Доступно только ${book.quantity_remaining} экземпляров`);
            return;
        }

        try {
            const response = await apiClient.post('/bookings/', {
                index: book.id,
                quantity: quantity,
                date_issue: issueDate, // Передаем только дату выдачи
                // date_return будет установлен на бэкенде
            });

            if (response.status === 201) {
                setBookingSuccess(true);
                const updatedBook = await apiClient.get(`/books/${id}/`);
                setBook(updatedBook.data);
                setQuantity(1);
            }
        } catch (err) {
            console.error('Ошибка бронирования:', err);
            setError(err.response?.data?.error || 'Не удалось забронировать книгу');
            if (err.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value > 0) {
            setQuantity(value);
        }
    };

    const handleDateChange = (e) => {
        const selectedDate = e.target.value;
        const today = new Date().toISOString().split('T')[0];

        if (selectedDate < today) {
            setError('Дата выдачи не может быть раньше сегодняшнего дня');
            setIssueDate(today);
        } else {
            setError('');
            setIssueDate(selectedDate);
        }
    };

    if (loading) {
        return <div className="loading-container">Загрузка данных о книге...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    if (!book) {
        return <div className="not-found-container">Данные о книге не найдены.</div>;
    }

    return (
        <div className="book-detail-container">
            <div className="book-content-wrapper">
                <div className="book-text-content">
                    <h3 className="h_result">{book.title}</h3>
                    <div className="book-authors">
                        <strong>Авторы:</strong> {book.authors?.map(author => (
                            <span key={author.id}>
                                {author.author_surname} {author.author_name[0]}.{author.author_patronymic ? ` ${author.author_patronymic[0]}.` : ''}
                            </span>
                        ))?.reduce((prev, curr) => [prev, ', ', curr]) || 'Не указаны'}
                    </div>

                    <p><strong>Место издания:</strong> {book.place_publication || 'Не указано'}</p>
                    <p><strong>Информация об издательстве:</strong> {book.information_publication || 'Не указано'}</p>
                    <p><strong>Год издания:</strong> {book.date_publication || 'Не указан'}</p>
                    <p><strong>Объем:</strong> {book.volume ? `${book.volume} стр.` : 'Не указан'}</p>
                    <p><strong>Доступно экземпляров:</strong> {book.quantity_remaining} из {book.quantity_total}</p>
                </div>

                {book.cover && (
                    <div className="book-cover place">
                        <img
                            src={`${book.cover}`}
                            alt={`Обложка книги ${book.title}`}
                            className="book-cover_detail"
                            loading="lazy"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {userData && (
                <div className="booking-section">
                    {bookingSuccess ? (
                        <p className="success-message">Книга успешно забронирована!</p>
                    ) : (
                        <div className="booking-controls">
                            <div className="quantity-selector">
                                <label htmlFor="quantity">Количество:</label>
                                <input
                                    type="number"
                                    id="quantity"
                                    min="1"
                                    max={book.quantity_remaining}
                                    value={quantity}
                                    onChange={handleQuantityChange}
                                    className="quantity-input"
                                />
                            </div>
                            <div className="date-selector">
                                <label htmlFor="issue-date">Дата выдачи:</label>
                                <input
                                    type="date"
                                    id="issue-date"
                                    value={issueDate}
                                    onChange={handleDateChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="date-input"
                                />
                            </div>
                            <button
                                onClick={handleBooking}
                                className="main_order-button"
                                disabled={book.quantity_remaining <= 0}
                            >
                                {book.quantity_remaining > 0 ? 'Забронировать' : 'Нет в наличии'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Books_info;