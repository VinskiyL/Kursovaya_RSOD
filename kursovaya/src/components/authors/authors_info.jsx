import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const Authors_info = () => {
    const { id } = useParams();
    //TODO поменять запрос автор
    const [query, setQuery] = useState('ac.id,ac.author_surname,ac.author_name,ac.author_patronymic,STRING_AGG(b.title,\',\') AS title kursovaya."Authors_catalog" ac JOIN kursovaya."Authors_Books" ab ON ac.id=ab.author_id JOIN kursovaya."Books_catalog" b ON b.index=ab.book_id GROUP BY ac.id,ac.author_surname,ac.author_name,ac.author_patronymic');
    const [authors, setAuthors] = useState([]);
    const [error, setError] = useState('');

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
                setAuthors(response.data || []);
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

    if (!authors || authors.length === 0) {
        return <p>Данные об авторе не найдены.</p>;
    }

    const author = authors.find(b => b.id === id);

    if (!author) {
        return <p>Данные об авторе не найдены.</p>;
    }

    return (
        <>
            <h3 className = "h_result">{author.author_surname} {author.author_name} {author.author_patronymic}</h3>
            <p className = "h_result">Книги: {author.title}</p>
        </>
    );
};

export default Authors_info;
