import React, { useState } from 'react';
import axios from 'axios';
import imgSearch from './search.png'; // Убедитесь, что путь к изображению правильный
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

    const handleBooking = async (index) => {
            try {
                const response = await axios.get(`https://kursovaya.local/addBooking.php`, {
                    params: { index }, withCredentials: true,
                });

                const result = response.data;
                if (result.success) {
                    alert('Бронирование успешно!');
                } else {
                    alert('Не удалось забронировать. Попробуйте снова.');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Произошла ошибка. Попробуйте позже.');
            }
        };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await axios.get(`https://kursovaya.local/search.php`, {
                params: { query }, // Передаем данные в качестве параметров URL
                headers: {
                    'Content-Type': 'application/json', // Можно оставить, но не обязательно для GET-запроса
                },
            });

            setResults(response.data || []); // Предполагаем, что данные возвращаются в формате { results: [...] }
        } catch (err) {
            setError('Произошла ошибка при поиске.');
            console.error('Ошибка при выполнении запроса:', err.response ? err.response.data : err.message);
        }
    };

    return (
        <div className="search-container">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Автор, книга"
                    required
                />
                <button type="submit" className="search-button">
                    <img className='search' src={imgSearch} alt="search" />
                </button>
            </form>
            {error && <p className = "h_result">{error}</p>}
            {results.length > 0 &&
                <div className = "result_search">
                    {results.map((result) => (
                        <div key={result.length + result.index + result.id}>
                            {result.title &&
                                <div className = "result_" key={result.index}>
                                    <h2 className = "h_result">Книга:</h2>
                                    <h3 className = "h_result">{result.title}</h3>
                                    <p className = "h_result">Информация об издании: {result.information_publication}</p>
                                    <p className = "h_result">Дата публикации: {result.date_publication}</p>
                                    <Link to={`/books_info/${result.index}`} className = "table--order">
                                       <div className = "order">
                                           <h2 className = "h2--order">Подробнее</h2>
                                       </div>
                                    </Link>
                                    {isAuthenticated &&
                                        <button onClick={() => handleBooking(result.index)} className = "main_order-button">Забронировать</button>
                                    }
                                </div>
                            }
                            {result.author_surname &&
                                <div className = "result_" key={result.id + result.length}>
                                    <h2 className = "h_result">Автор:</h2>
                                    <h3 className = "h_result">{result.author_surname} {result.author_name} {result.author_patronymic}</h3>
                                    <Link to={`/authors_info/${result.id}`} className = "table--order">
                                        <div className = "order">
                                            <h2 className = "h2--order">Подробнее</h2>
                                        </div>
                                    </Link>
                                </div>
                            }
                        </div>
                    ))}
                </div>
            }
            {results.length === 0 && !error && <p className = "h_result">Нет результатов для вашего запроса.</p>}
        </div>
    );
};

export default Search;