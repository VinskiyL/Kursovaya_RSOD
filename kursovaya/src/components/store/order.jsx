import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Link } from 'react-router-dom';
import './order.css';

const Order = () => {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });

    const fetchOrders = async (page = 1, search = '') => {
        setError('');
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pagination.pageSize,
                search
            };

            const response = await apiClient.get('/orders/', { params });
            setOrders(response.data.results || []);
            setPagination({
                ...pagination,
                page,
                total: response.data.count
            });
        } catch (err) {
            setError('Произошла ошибка при загрузке заказов.');
            console.error('Ошибка:', err.response ? err.response.data : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Вы уверены, что хотите отменить этот заказ?')) {
            return;
        }

        try {
            const response = await apiClient.delete(`/orders/${id}/`);

            if (response.status === 204) {
                alert('Заказ успешно отменён!');
                fetchOrders(pagination.page, searchTerm);
            } else {
                alert('Не удалось отменить заказ. Попробуйте снова.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка. Попробуйте позже.');
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleSearch = () => {
        fetchOrders(1, searchTerm);
    };

    const handlePageChange = (newPage) => {
        fetchOrders(newPage, searchTerm);
    };

    const filteredOrders = orders.filter(order =>
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.author_surname.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && orders.length === 0) return <div className="main_order_container">Загрузка...</div>;
    if (error) return (
        <div className="main_order_container">
            <p className="error-message">{error}</p>
            <button
                onClick={() => fetchOrders(pagination.page, searchTerm)}
                className="retry-button"
            >
                Повторить попытку
            </button>
        </div>
    );

    return (
        <div className="main_order_container">
            <div className="search-controls">
                <input
                    type="text"
                    placeholder="Поиск по названию или автору..."
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

            <h2>Мои заказы</h2>

            <Link to="/new_order" className="create-order-button">
                Создать новый заказ
            </Link>

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

            {filteredOrders.length > 0 ? (
                <div className="orders-grid">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="order-card">
                            <h3>{order.title}</h3>
                            <div className="order-meta">
                                <p><strong>ID:</strong> {order.id}</p>
                                <p><strong>Автор:</strong> {order.author_surname} {order.author_name} {order.author_patronymic}</p>
                                <p><strong>Количество:</strong> {order.quantyti}</p>
                                <p><strong>Год публикации:</strong> {order.date_publication}</p>
                                <p><strong>Статус:</strong>
                                    <span className={`status-badge ${
                                        order.confirmed ? 'status-confirmed' : 'status-pending'
                                    }`}>
                                        {order.confirmed ? 'Подтверждён' : 'Ожидает'}
                                    </span>
                                </p>
                            </div>

                            <div className="cancel-button-container">
                                <button
                                    onClick={() => handleDelete(order.id)}
                                    className="cancel-button"
                                >
                                    Отменить заказ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-orders">
                    {searchTerm ? 'Ничего не найдено' : 'Нет активных заказов'}
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
}

export default Order;