import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../store/order.css';

function Orders_adm() {
     //TODO переделать запрос заказы
    const [query, setQuery] = useState('bc.id,title,author_surname,author_name,author_patronymic,quantyti,date_publication kursovaya."Order_catalog"');
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Состояние для поиска

    const fetchData = async () => {
        setError('');
        try {
            const response = await axios.get(`https://kursovaya.local/order.php`, {
                params: { query },
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true,
            });
            setResults(response.data.data || []);
        } catch (err) {
            setError('Произошла ошибка при поиске.');
            console.error('Ошибка при выполнении запроса:', err.response ? err.response.data : err.message);
        }
    };

    const handleOrder = async (id) => {
        try {
            const response = await axios.get(`https://kursovaya.local/deleteOrder.php`, {
                params: { id }, withCredentials: true,
            });

            const result = response.data;
            if (result.success) {
                alert('Заказ успешно отменён!');
                fetchData();
            } else {
                alert('Не удалось отменить заказ. Попробуйте снова.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка. Попробуйте позже.');
        }
    };

    useEffect(() => {

        fetchData();
    }, [query]); // Добавляем query в зависимости, чтобы перезапрашивать данные при изменении

    // Функция для обработки ввода в поле поиска
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    // Фильтрация результатов на основе searchTerm
    const filteredResults = results.filter(order =>
        order.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className = "main_order_container">
            <input
                type="text"
                placeholder="Поиск по названию книги..."
                value={searchTerm}
                onChange={handleSearchChange}
            />
            //TODO поменять оформление
            <Link to={`/new_order`} className = "table--order">
                <div className = "order">
                 <h2 className = "h2--order">Добавить заказ</h2>
               </div>
            </Link>
            {filteredResults.length > 0 ? (
                filteredResults.map((order) => (
                    <div key={order.id} className = "result_">
                        <h3 className = "h_result">Код заказа {order.id}</h3>
                        <p className = "h_result">Название книги: {order.title}</p>
                        <p className = "h_result">Фамилия автора: {order.author_surname}</p>
                        <p className = "h_result">Имя автора: {order.author_name}</p>
                        <p className = "h_result">Отчество автора: {order.author_patronymic}</p>
                        <p className = "h_result">Количество книг: {order.quantyti}</p>
                        <p className = "h_result">Дата публикации: {order.date_publication}</p>
                        <button onClick={() => handleOrder(order.id)} className = "main_order-button">Отменить заказ</button>
                        //TODO поменять ссылку
                        <Link to={`/new_order_admin/${order.id}`} className = "table--order">
                           <div className = "order">
                            <h2 className = "h2--order">Редактировать</h2>
                          </div>
                        </Link>
                    </div>
                ))
            ) : (
                <p className = "h_result">Заказы не найдены.</p>
            )}
        </div>
    );
}

export default Orders_adm;