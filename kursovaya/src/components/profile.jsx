import { Link } from 'react-router-dom';
import './main/main.css';
import imgBooks from './main/books.png';
import imgBooking from './main/booking.jpg';
import imgOrders from './main/orders.jpg';
import Comments from './main/comments';
import imgTopBooks from './main/top_books.jpg';
import imgPrev from './main/prev.jpg';
//TODO добавить ссылку на редактирование профиля
//TODO Добавить информацию о юзере в инфо
function Prof() {
    return (
        <>
            {/* Информационная панель */}
            <section className="info-section small">
                <div className="info-content">
                    <div className="text-block">
                        <h2>Личный кабинет</h2>
                        <ul>
                            <li>Просмотр бронирований</li>
                            <li>Управление заказами</li>
                            <li>Доступ к каталогу книг</li>
                            <li>История посещений</li>
                        </ul>
                    </div>
                    <div className="image-block">
                        <img src={imgPrev} alt="Личный кабинет" />
                    </div>
                </div>
            </section>

            {/* Основные функции */}
            <section className="cards-container">
                <Link to="/booking" className="card tall">
                    <img src={imgBooking} alt="Бронирование" />
                    <h2>Бронирование</h2>
                </Link>

                <Link to="/order" className="card tall">
                    <img src={imgOrders} alt="Заказы" />
                    <h2>Заказы</h2>
                </Link>
            </section>

            {/* Каталог книг */}
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

export default Prof;