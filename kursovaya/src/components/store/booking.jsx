import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Booking = () =>{
    //TODO переделать запрос брони
    const [query, setQuery] = useState('bc.index,title,information_publication,quantity,date_issue,date_return,b.id kursovaya."Books_catalog"');
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Состояние для поиска

    const fetchData = async () => {
        setError('');
        try {
            const response = await axios.get(`https://kursovaya.local/booking.php`, {
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

    const handleBooking = async (index) => {
        try {
            const response = await axios.get(`https://kursovaya.local/deleteBooking.php`, {
                params: { index }, withCredentials: true,
            });

            const result = response.data;
            if (result.success) {
                alert('Бронирование успешно отменено!');
                fetchData();
            } else {
                alert('Не удалось отменить бронирование. Попробуйте снова.');
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
    const filteredResults = results.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className = "main_order_container">
            <input
                type="text"
                placeholder="Поиск по названию книги..."
                value={searchTerm}
                onChange={handleSearchChange}
            />
            {filteredResults.length > 0 ? (
                filteredResults.map((book) => {
                    return (
                        <div key={book.id} className = "result_">
                            <h3 className = "h_result">Номер брони: {book.id}</h3>
                            <p className = "h_result">Название книги: {book.title}</p>
                            <p className = "h_result">Информация об издании: {book.information_publication}</p>
                            <p className = "h_result">Количество книг: {book.quantity}</p>
                            <p className = "h_result">Дата бронирования: {book.date_issue}</p>
                            <p className = "h_result">Дата возврата: {book.date_return}</p>
                            <button onClick={() => handleBooking(book.index)} className = "main_order-button">Отменить бронирование</button>
                        </div>
                    );
                })
            ) : (
                <p className = "h_result">Брони не найдены.</p>
            )}
        </div>
    );
}

export default Booking;