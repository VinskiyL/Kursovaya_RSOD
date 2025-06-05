import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import "./user.css";

const Users_adm = () => {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('surname');
    const [statusFilter, setStatusFilter] = useState('all');
    const [debtorFilter, setDebtorFilter] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });

    const navigate = useNavigate();

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                is_debtor: debtorFilter || undefined
            };
            const response = await apiClient.get('/readers/', { params });
            setAllUsers(response.data.results || response.data);
            setPagination(prev => ({
                ...prev,
                total: response.data.count || response.data.length
            }));
        } catch (err) {
            setError('Произошла ошибка при загрузке пользователей');
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let result = allUsers;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(user => {
                if (searchBy === 'surname') {
                    return user.surname.toLowerCase().includes(term);
                } else if (searchBy === 'id') {
                    return user.id.toString().includes(term);
                } else if (searchBy === 'email') {
                    return user.mail.toLowerCase().includes(term);
                }
                return true;
            });
        }

        if (statusFilter !== 'all') {
            result = result.filter(user =>
                statusFilter === 'active'
                    ? user.status === 'Активный'
                    : user.status === 'Неактивный'
            );
        }

        return result;
    }, [allUsers, searchTerm, searchBy, statusFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (pagination.page - 1) * pagination.pageSize;
        return filteredUsers.slice(start, start + pagination.pageSize);
    }, [filteredUsers, pagination.page, pagination.pageSize]);

    const handleSearchSubmit = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchUsers();
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleSendEmail = async (userId) => {
        try {
            await apiClient.post(`/send-email/${userId}/`);
            alert('Письмо успешно отправлено');
        } catch (err) {
            setError('Ошибка при отправке письма');
            console.error('Ошибка:', err);
        }
    };

    const handleViewDelete = async (userId) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            try {
                await apiClient.delete(`readers/${userId}/delete/`);
                alert('Пользователь успешно удален');
                fetchUsers(); // Обновляем список пользователей после удаления
            } catch (err) {
                setError('Ошибка при удалении пользователя');
                console.error('Ошибка:', err);
            }
        }
    };

    const handleViewDetails = (userId) => {
        navigate(`/users_detail/${userId}`);
    };

    useEffect(() => {
        fetchUsers();
    }, [debtorFilter]);

    useEffect(() => {
        setPagination(prev => ({
            ...prev,
            total: filteredUsers.length
        }));
    }, [filteredUsers]);

    if (loading && allUsers.length === 0) {
        return <div className="loading-container">Загрузка...</div>;
    }

    return (
        <div className="main_container">
            <h1 className="admin-title">Список пользователей</h1>

            <div className="search-controls">
                <select
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="search-select"
                >
                    <option value="surname">По фамилии</option>
                    <option value="id">По ID</option>
                    <option value="email">По email</option>
                </select>

                <input
                    type="text"
                    placeholder={
                        searchBy === 'surname'
                            ? 'Введите фамилию'
                            : searchBy === 'id'
                                ? 'Введите ID'
                                : 'Введите email'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    className="search-input"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="search-select"
                >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Неактивные</option>
                </select>

                <label className="debtor-filter">
                    <input
                        type="checkbox"
                        checked={debtorFilter}
                        onChange={(e) => setDebtorFilter(e.target.checked)}
                    />
                    Только должники
                </label>

                <button
                    onClick={handleSearchSubmit}
                    className="search-button"
                >
                    Найти
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

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

            {paginatedUsers.length > 0 ? (
                <div className="users-grid">
                    {paginatedUsers.map((user) => (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <h3>ID: {user.id}</h3>
                                <p><strong>Фамилия:</strong> {user.surname}</p>
                                <p><strong>Имя:</strong> {user.name}</p>
                                <p><strong>Email:</strong> {user.mail}</p>
                                <p><strong>Телефон:</strong> {user.phone}</p>
                                <p>
                                    <strong>Статус:</strong>
                                    <span className={`status-badge ${user.status === 'Активный' ? 'active' : 'inactive'}`}>
                                        {user.status}
                                    </span>
                                </p>
                                {user.is_debtor && (
                                    <p className="debtor-badge">Должник</p>
                                )}

                                <div className="action-controls">
                                    <button
                                        className="action-button email-button"
                                        onClick={() => handleSendEmail(user.id)}
                                    >
                                        Отправить письмо
                                    </button>
                                    <button
                                        className="action-button details-button"
                                        onClick={() => handleViewDetails(user.id)}
                                    >
                                        Подробнее
                                    </button>
                                    <button
                                        className="action-button delete-button"
                                        onClick={() => handleViewDelete(user.id)}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-users">
                    {allUsers.length === 0 ? 'Нет данных о пользователях' : 'Пользователи не найдены'}
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

export default Users_adm;