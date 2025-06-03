import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

const Genres_adm = () => {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });
    const [offlineMode, setOfflineMode] = useState(false);

    const fetchGenres = async (page = 1, search = '') => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page,
                page_size: pagination.pageSize
            };

            if (search) {
                params['search'] = search;
            }

            const response = await apiClient.get('/admin/genres-list/', { params });
            setGenres(response.data.results || response.data);
            setPagination({
                ...pagination,
                page,
                total: response.data.count || response.data.length
            });
            setOfflineMode(false);
        } catch (err) {
            if (err.message === "Network Error") {
                setOfflineMode(true);
                setError('Сервер недоступен. Работаем в автономном режиме.');
            } else {
                setError('Произошла ошибка при загрузке жанров');
            }
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = () => {
        fetchGenres(1, searchTerm);
    };

    const handlePageChange = (newPage) => {
        fetchGenres(newPage, searchTerm);
    };

    const handleDelete = async (genreId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот жанр?')) {
            try {
                await apiClient.delete(`/admin/genres/${genreId}/`);
                fetchGenres(pagination.page, searchTerm);
            } catch (err) {
                setError('Ошибка при удалении жанра');
                console.error('Ошибка:', err);
            }
        }
    };

    useEffect(() => {
        fetchGenres();
    }, []);

    if (loading && genres.length === 0) {
        return <div className="main_order_container">Загрузка...</div>;
    }

    return (
        <div className="main_order_container">
            <h1 className="admin-title">Управление жанрами</h1>

            {/* Поисковая форма */}
            <div className="search-controls">
                <input
                    type="text"
                    placeholder="Поиск по названию жанра"
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

            <Link to="/new_genres" className="add-book-button">
                Добавить новый жанр
            </Link>

            {/* Пагинация сверху */}
            {!offlineMode && pagination.total > pagination.pageSize && (
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

            {/* Список жанров */}
            {genres.length > 0 ? (
                <div className="books-grid">
                    {genres.map((genre) => (
                        <div key={genre.id} className="book-card">
                            <div className="book-info">
                                <h3>{genre.name}</h3>
                                <div className="admin-actions">
                                    <Link
                                        to={`/new_genres/${genre.id}`}
                                        className="edit-button"
                                    >
                                        Редактировать
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(genre.id)}
                                        className="delete-button"
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-books">Жанры не найдены</p>
            )}

            {/* Пагинация снизу */}
            {!offlineMode && pagination.total > pagination.pageSize && (
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

export default Genres_adm;