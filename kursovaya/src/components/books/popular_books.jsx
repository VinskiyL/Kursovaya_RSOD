import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './books.css';

const PopularBooks = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/books/popular/')
            .then(response => {
                setBooks(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching popular books:', error);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <div className="main_order_container">
            <h2>Самые популярные книги</h2>
            <div className="books-grid">
                {books.map(book => (
                    <div key={book.id} className="book-card">
                        <div className="book-cover-container">
                            {book.cover ? (
                                <img
                                    src={book.cover}
                                    alt={book.title}
                                    className="book-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div className="book-cover placeholder" style={{ display: book.cover ? 'none' : 'flex' }}>
                                <span>Обложка недоступна</span>
                            </div>
                        </div>
                        <div className="book-info">
                            <h3>{book.title}</h3>
                            <p className="authors">
                                {book.authors?.map(author =>
                                    `${author.author_surname} ${author.author_name[0]}.`
                                ).join(', ')}
                            </p>
                            <p className="meta">
                                <span>Индекс: {book.index}</span>
                                <span>Доступно: {book.quantity_remaining}/{book.quantity_total}</span>
                            </p>
                            <Link to={`/books_info/${book.id}`} className="details-link">
                                Подробнее
                            </Link>
                            <div className="popularity-badge">
                                <span>{book.active_bookings} активных броней</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PopularBooks;