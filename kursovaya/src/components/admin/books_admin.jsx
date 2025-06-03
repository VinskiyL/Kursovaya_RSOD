import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './books.css';

const Books_adm = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('title');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });
    const [offlineMode, setOfflineMode] = useState(false);

    const fetchBooks = async (page = 1, search = '', searchField = 'title') => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page,
                page_size: pagination.pageSize
            };

            if (search) {
                if (searchField === 'author') {
                    params['author'] = search;
                } else if (searchField === 'multiple_authors') {
                    params['multiple_authors'] = search;
                } else {
                    params['search'] = search;
                }
            }

            const response = await apiClient.get('/books/', { params });
            setBooks(response.data.results);
            setPagination({
                ...pagination,
                page,
                total: response.data.count
            });
            setOfflineMode(false);
        } catch (err) {
            if (err.message === "Network Error") {
                setOfflineMode(true);
                setError('Сервер недоступен. Работаем в автономном режиме.');
            } else {
                setError('Произошла ошибка при загрузке книг');
            }
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = () => {
        fetchBooks(1, searchTerm, searchBy);
    };

    const handlePageChange = (newPage) => {
        fetchBooks(newPage, searchTerm, searchBy);
    };

    const handleDelete = async (bookId) => {
        if (window.confirm('Вы уверены, что хотите удалить эту книгу?')) {
            try {
                await apiClient.delete(`/admin/books/${bookId}/`);
                fetchBooks(pagination.page, searchTerm, searchBy);
            } catch (err) {
                setError('Ошибка при удалении книги');
                console.error('Ошибка:', err);
            }
        }
    };

    const renderCover = (book) => {
        if (offlineMode || !book.cover) {
            return (
                <div className="book-cover placeholder">
                    <span>Обложка недоступна</span>
                </div>
            );
        }

        return (
            <img
                src={`${book.cover.replace(/^\/?media\//, '')}`}
                alt={book.title}
                className="book-cover"
                loading="lazy"
                onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                }}
            />
        );
    };

    useEffect(() => {
        fetchBooks();
    }, []);

    if (loading && books.length === 0) {
        return <div className="main_order_container">Загрузка...</div>;
    }

    return (
        <div className="main_order_container">
            <h1 className="admin-title">Управление книгами</h1>

            {/* Поисковая форма */}
            <div className="search-controls">
                <select
                    value={searchBy}
                    onChange={(e) => {
                        setSearchBy(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="search-select"
                >
                    <option value="title">По названию</option>
                    <option value="author">По автору (фамилия)</option>
                    <option value="multiple_authors">По нескольким авторам (через запятую)</option>
                    <option value="index">По индексу</option>
                </select>

                <input
                    type="text"
                    placeholder={
                        searchBy === 'multiple_authors'
                            ? 'Введите фамилии авторов через запятую'
                            : `Поиск по ${searchBy === 'title' ? 'названию' : searchBy === 'author' ? 'автору' : 'индексу'}`
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

            <Link to="/new_book" className="add-book-button">
                Добавить новую книгу
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

            {/* Список книг */}
            {books.length > 0 ? (
                <div className="books-grid">
                    {books.map((book) => (
                        <div key={book.id} className="book-card">
                            <div className="book-cover-container">
                                {renderCover(book)}
                                <div className="book-cover placeholder" style={{ display: 'none' }}>
                                    <span>Обложка не загружена</span>
                                </div>
                            </div>
                            <div className="book-info">
                                <h3>{book.title}</h3>
                                <p className="authors">
                                    {book.authors?.map(a =>
                                        `${a.author_surname} ${a.author_name[0]}.`
                                    ).join(', ')}
                                </p>
                                <p className="meta">
                                    <span>Индекс: {book.index}</span>
                                    <span>Доступно: {book.quantity_remaining}/{book.quantity_total}</span>
                                </p>
                                <div className="admin-actions">
                                    <Link
                                        to={`/new_book/${book.id}`}
                                        className="edit-button"
                                    >
                                        Редактировать
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(book.id)}
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
                <p className="no-books">Книги не найдены</p>
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

export default Books_adm;