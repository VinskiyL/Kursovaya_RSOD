import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Link } from 'react-router-dom';
import './order.css';

const Order = () => {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await apiClient.get('/orders/');
            setOrders(response.data.results || []);
        } catch (err) {
            setError('Произошла ошибка при загрузке заказов.');
            console.error('Ошибка:', err.response ? err.response.data : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await apiClient.delete(`/orders/${id}/`);

            if (response.status === 204) {
                alert('Заказ успешно отменён!');
                fetchOrders();
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

    const filteredOrders = orders.filter(order =>
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.author_surname.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="main_order_container"><p className="h_result">Загрузка...</p></div>;
    if (error) return <div className="main_order_container"><p className="h_result error">{error}</p></div>;

    return (
        <div className="main_order_container">
            <input
                type="text"
                placeholder="Поиск по названию или автору..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
            />

            <Link to="/new_order" className="table--order">
                <div className="order">
                    <h2 className="h2--order">Создать заказ</h2>
                </div>
            </Link>

            {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                    <div key={order.id} className="result_">
                        <h3 className="h_result">Код заказа: {order.id}</h3>
                        <p className="h_result">Название книги: {order.title}</p>
                        <p className="h_result">Автор: {order.author_surname} {order.author_name} {order.author_patronymic}</p>
                        <p className="h_result">Количество: {order.quantyti}</p>
                        <p className="h_result">Год публикации: {order.date_publication}</p>
                        <button
                            onClick={() => handleDelete(order.id)}
                            className="main_order-button"
                        >
                            Отменить заказ
                        </button>
                        <Link
                            to={`/new_order/${order.id}`}
                            className="main_order-button edit-button"
                        >
                            Редактировать
                        </Link>
                    </div>
                ))
            ) : (
                <p className="h_result">Заказы не найдены.</p>
            )}
        </div>
    );
}

export default Order;