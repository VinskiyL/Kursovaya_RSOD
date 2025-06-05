import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

const Authors_adm = () => {
    const [authors, setAuthors] = useState([]);
    const [allAuthors, setAllAuthors] = useState([]); // Добавляем состояние для хранения всех авторов
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('surname');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });
    const [offlineMode, setOfflineMode] = useState(false);

    const fetchAuthors = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page,
                page_size: pagination.pageSize
            };

            const response = await apiClient.get('/admin/authors-list/', { params });
            setAllAuthors(response.data.results || response.data); // Сохраняем всех авторов
            setAuthors(response.data.results || response.data);
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
                setError('Произошла ошибка при загрузке авторов');
            }
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = () => {
        if (!searchTerm) {
            setAuthors(allAuthors);
            return;
        }

        const filtered = allAuthors.filter(author => {
            if (searchBy === 'surname') {
                return author.author_surname.toLowerCase().includes(searchTerm.toLowerCase());
            } else if (searchBy === 'name') {
                return author.author_name.toLowerCase().includes(searchTerm.toLowerCase());
            } else if (searchBy === 'full_name') {
                const fullName = `${author.author_surname} ${author.author_name} ${author.author_patronymic || ''}`.toLowerCase();
                return fullName.includes(searchTerm.toLowerCase());
            }
            return true;
        });

        setAuthors(filtered);
    };

    const handlePageChange = (newPage) => {
        fetchAuthors(newPage);
    };

    const handleDelete = async (authorId) => {
        if (window.confirm('Вы уверены, что хотите удалить этого автора?')) {
            try {
                await apiClient.delete(`/admin/authors/${authorId}/`);
                fetchAuthors(pagination.page);
            } catch (err) {
                setError('Ошибка при удалении автора');
                console.error('Ошибка:', err);
            }
        }
    };

    useEffect(() => {
        fetchAuthors();
    }, []);

    if (loading && authors.length === 0) {
        return <div className="main_order_container">Загрузка...</div>;
    }

    return (
        <div className="main_order_container">
            <h1 className="admin-title">Управление авторами</h1>

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
                    <option value="surname">По фамилии</option>
                    <option value="name">По имени</option>
                    <option value="full_name">По полному имени</option>
                </select>

                <input
                    type="text"
                    placeholder={
                        searchBy === 'full_name'
                            ? 'Введите ФИО автора'
                            : `Поиск по ${searchBy === 'surname' ? 'фамилии' : 'имени'}`
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

            <Link to="/new_author" className="add-book-button">
                Добавить нового автора
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

            {/* Список авторов */}
            {authors.length > 0 ? (
                <div className="books-grid">
                    {authors.map((author) => (
                        <div key={author.id} className="book-card">
                            <div className="book-info">
                                <h3>{author.author_surname} {author.author_name} {author.author_patronymic || ''}</h3>
                                <div className="admin-actions">
                                    <Link
                                        to={`/new_author/${author.id}`}
                                        className="edit-button"
                                    >
                                        Редактировать
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(author.id)}
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
                <p className="no-books">Авторы не найдены</p>
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

export default Authors_adm;