import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';

const Books_info = () => {
    const { index } = useParams(); // Извлечение bookId из параметров URL
    //TODO поменять запрос книга
    const [query, setQuery] = useState('b.index,b.title,b.place_publication,b.information_publication,b.volume,b.date_publication,STRING_AGG(ac.author_surname,\',\') AS author_surname kursovaya."Books_catalog" b JOIN kursovaya."Authors_Books" ab ON b.index=ab.book_id JOIN kursovaya."Authors_catalog" ac ON ac.id=ab.author_id GROUP BY b.index,b.title,b.place_publication,b.information_publication,b.volume,b.date_publication');
    const [books, setBooks] = useState([]);
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
                setBooks(response.data || []);
            } catch (err) {
                setError('Произошла ошибка при запросе.');
                console.error('Ошибка при выполнении запроса:', err.response ? err.response.data : err.message);
            }
        };
        fetchData();
    }, []);

    if (error) {
        return <p>{error}</p>;
    }

    if (!books || books.length === 0) {
        return <p>Данные о книге не найдены.</p>;
    }

    const book = books.find(b => b.index === index);

    if (!book) {
        return <p>Данные о книге не найдены.</p>;
    }

    return (
            <>
                <h3 className = "h_result">{book.title}</h3>
                <p className = "h_result">Место публикации: {book.place_publication}</p>
                <p className = "h_result">Информация об издании: {book.information_publication}</p>
                <p className = "h_result">Дата публикации: {book.date_publication}</p>
                <p className = "h_result">Количество страниц: {book.volume}</p>
                <p className = "h_result">Авторы: {book.author_surname}</p>
                {isAuthenticated && <button onClick={() => handleBooking(book.index)} className = "main_order-button">Забронировать</button>}
            </>
        );
};

export default Books_info;


