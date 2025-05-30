import { Link } from 'react-router-dom';
import './main/main.css';
import imgBooks from './main/books.png';
import imgBooking from './main/booking.jpg';
import imgOrders from './main/orders.jpg';
import Comments from './main/comments';
import imgTopBooks from './main/top_books.jpg';
import imgPrev from './main/prev.jpg';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';

function Prof() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await apiClient.get('/profile/');
                if (response.data && response.data.success) {
                    setUserData(response.data.user);
                } else {
                    setError('Не удалось получить данные пользователя');
                }
            } catch (err) {
                let errorMessage = 'Ошибка при загрузке данных';
                if (err.response) {
                    if (err.response.status === 401) {
                        errorMessage = 'Требуется авторизация';
                    } else if (err.response.data && err.response.data.message) {
                        errorMessage = err.response.data.message;
                    }
                }
                setError(errorMessage);
                console.error('Ошибка при загрузке данных:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    return (
        <>
            {/* Информационная панель */}
            <section className="info-section small">
                <div className="info-content">
                    <div className="text-block">
                        <h2>Личный кабинет</h2>

                        {loading ? (
                            <div className="loading-spinner">Загрузка данных...</div>
                        ) : error ? (
                            <div className="error-message">
                                <p>{error}</p>
                                <Link to="/login" className="auth-link">Войти в систему</Link>
                            </div>
                        ) : userData ? (
                            <div className="user-info">
                                <div className="info-row">
                                    <span className="info-label" data-label="Имя:">Имя:</span>
                                    <span className="info-value">{userData.name || 'Не указано'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label" data-label="Фамилия:">Фамилия:</span>
                                    <span className="info-value">{userData.surname || 'Не указано'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label" data-label="Логин:">Логин:</span>
                                    <span className="info-value">{userData.login}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label" data-label="Email:">Email:</span>
                                    <span className="info-value">{userData.mail || 'Не указан'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label" data-label="Телефон:">Телефон:</span>
                                    <span className="info-value">{userData.phone || 'Не указан'}</span>
                                </div>
                                <Link to="/edit_profile" className="edit-link">Редактировать профиль</Link>
                            </div>
                        ) : (
                            <p>Данные пользователя не найдены</p>
                        )}
                    </div>
                    <div className="image-block">
                        <img src={imgPrev} alt="Личный кабинет" />
                    </div>
                </div>
            </section>

            {/* Основные функции */}
            <section className="cards-container">
                <Link to="/booking" className="card tall">
                    <img src={imgBooking} alt="Бронирование" />
                    <h2>Бронирование</h2>
                </Link>

                <Link to="/order" className="card tall">
                    <img src={imgOrders} alt="Заказы" />
                    <h2>Заказы</h2>
                </Link>
            </section>

            {/* Каталог книг */}
            <section className="cards-container">
                <Link to="/popular_books" className="card tall">
                    <img src={imgTopBooks} alt="Популярные книги" />
                    <h2>Популярные книги</h2>
                </Link>
                <Link to="/books_table" className="card tall">
                    <img src={imgBooks} alt="Книги" />
                    <h2>Книги</h2>
                </Link>
            </section>

            <Comments />
        </>
    );
}

export default Prof;