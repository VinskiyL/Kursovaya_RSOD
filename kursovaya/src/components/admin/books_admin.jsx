import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../store/order.css';

function Books_adm() {
    //TODO поменять запрос книги
    //TODO поменять под админа
    const [query, setQuery] = useState('index,title,information_publication kursovaya."Books_catalog"');
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Состояние для поиска

    useEffect(() => {
        const fetchData = async () => {
            setError('');
            try {
                const response = await axios.get(`https://kursovaya.local/select.php`, {
                    params: { query },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                setResults(response.data || []);
            } catch (err) {
                setError('Произошла ошибка при поиске.');
                console.error('Ошибка при выполнении запроса:', err.response ? err.response.data : err.message);
            }
        };
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
            <Link to="/new_book" className = "add_book">Добавить книгу</Link>
            {filteredResults.length > 0 ? (
                filteredResults.map((book) => (
                    <div key={book.index} className = "result_">
                        <h3 className = "h_result">{book.title}</h3>
                        <p className = "h_result">Информация об издании: {book.information_publication}</p>
                        <p className = "h_result">Дата публикации: {book.date_publication}</p>
                        //TODO поменять ссылку
                        <Link to={`/new_book/${book.index}`} className = "table--order">
                           <div className = "order">
                            <h2 className = "h2--order">Редактировать</h2>
                          </div>
                        </Link>
                    </div>
                ))
            ) : (
                <p className = "h_result">Книги не найдены.</p>
            )}
        </div>
    );
}

export default Books_adm;