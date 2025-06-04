import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '../../api/client';

const Orders_adm = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState('id'); // Оставим только поиск по ID и читателю
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 12,
        total: 0
    });

    // Загрузка заказов с сервера
    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/admin/orders/');
            // Обрабатываем разные форматы ответа от сервера
            const ordersData = response.data.orders || response.data.results || response.data;
            setAllOrders(Array.isArray(ordersData) ? ordersData : []);
            setPagination(prev => ({
                ...prev,
                total: response.data.count || ordersData.length || 0
            }));
        } catch (err) {
            setError('Произошла ошибка при загрузке заказов');
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    // Фильтрация заказов на фронтенде
    const filteredOrders = useMemo(() => {
        if (!searchTerm) return allOrders;

        const term = searchTerm.toLowerCase();
        return allOrders.filter(order => {
            if (searchBy === 'id') {
                return order.id.toString().includes(term);
            } else if (searchBy === 'reader') {
                return (order.reader_name || order.reader?.surname || '').toLowerCase().includes(term);
            }
            return true;
        });
    }, [allOrders, searchTerm, searchBy]);

    // Пагинация
    const paginatedOrders = useMemo(() => {
        const start = (pagination.page - 1) * pagination.pageSize;
        return filteredOrders.slice(start, start + pagination.pageSize);
    }, [filteredOrders, pagination.page, pagination.pageSize]);

    // Обработчик поиска
    const handleSearchSubmit = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Смена страницы пагинации
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    // Изменение статуса заказа
    const handleStatusChange = async (orderId) => {
        try {
            const order = allOrders.find(o => o.id === orderId);
            const newStatus = !order.confirmed;

            await apiClient.patch(`/admin/orders/${orderId}/`, {
                confirmed: newStatus
            });

            fetchOrders(); // Обновляем данные после изменения
        } catch (err) {
            setError('Ошибка при изменении статуса заказа');
            console.error('Ошибка:', err);
        }
    };

    // Загрузка данных при монтировании
    useEffect(() => {
        fetchOrders();
    }, []);

    // Обновление общего количества при фильтрации
    useEffect(() => {
        setPagination(prev => ({
            ...prev,
            total: filteredOrders.length
        }));
    }, [filteredOrders]);

    if (loading && allOrders.length === 0) {
        return <div className="main_order_container">Загрузка...</div>;
    }

    return (
        <div className="main_order_container">
            <h1 className="admin-title">Управление заказами</h1>

            {/* Поисковая форма */}
            <div className="search-controls">
                <select
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    className="search-select"
                >
                    <option value="id">По ID</option>
                    <option value="reader">По фамилии читателя</option>
                </select>

                <input
                    type="text"
                    placeholder={
                        searchBy === 'id'
                            ? 'Введите ID заказа'
                            : 'Введите фамилию читателя'
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

            {/* Список заказов */}
            {paginatedOrders.length > 0 ? (
                <div className="orders-grid">
                    {paginatedOrders.map((order) => (
                        <div key={order.id} className="order-card">
                            <div className="order-info">
                                <h3>ID: {order.id}</h3>
                                <p><strong>Название:</strong> {order.title}</p>
                                <p><strong>Автор:</strong> {order.author_surname} {order.author_name} {order.author_patronymic || ''}</p>
                                <p><strong>Читатель:</strong> {order.reader_name || (order.reader?.surname + ' ' + order.reader?.name)}</p>
                                <p><strong>Количество:</strong> {order.quantyti}</p>
                                <p><strong>Год издания:</strong> {order.date_publication}</p>

                                <div className="status-controls">
                                    <button
                                        className={`status-button ${order.confirmed ? 'unconfirm-button' : 'confirm-button'}`}
                                        onClick={() => handleStatusChange(order.id)}
                                    >
                                        {order.confirmed ? 'Отменить подтверждение' : 'Подтвердить заказ'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-orders">
                    {allOrders.length === 0 ? 'Нет данных о заказах' : 'Заказы не найдены'}
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

export default Orders_adm;