import { Link } from 'react-router-dom';
import './main.css';
import imgBooks from './books.png';
import imgTopBooks from './top_books.jpg';
import imgPrev from './prev.jpg';
import Comments from './comments';

function MainContent() {
    return (
        <>
            <section className="info-section small">
                <div className="info-content">
                    <div className="text-block">
                        <h2>Здесь вы можете:</h2>
                        <ul>
                            <li>Найти книгу</li>
                            <li>Оставить отзыв</li>
                            <li>Забронировать книгу</li>
                            <li>Заказать книгу в библиотеку</li>
                        </ul>
                    </div>
                    <div className="image-block">
                        <img src={imgPrev} alt="Preview" />
                    </div>
                </div>
            </section>

            {/* Унифицированные карточки, книги повыше */}
            <section className="cards-container">
                <Link to="/popular_books" className="card tall">
                    <img src={imgTopBooks} alt="Популярные книги" />
                    <h2>Популярные книги</h2>
                </Link>
                <Link to="/books_table" className="card tall">
                    <img src={imgBooks} alt="Книги" />
                    <h2>Книги</h2>
                </Link>
            </section>

            <Comments />
        </>
    );
}

export default MainContent;
