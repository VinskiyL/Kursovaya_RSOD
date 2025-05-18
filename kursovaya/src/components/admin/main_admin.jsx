import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './main_admin.css';

const Main_adm = () => {
  const [stats, setStats] = useState({ books: 0, users: 0, orders: 0, bookings: 0, debtors: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/statistics', { withCredentials: true })
      .then(res => setStats(res.data))
      .catch(() => setError('Ошибка загрузки статистики'));
  }, []);

  return (
    <div className="admin-wrapper">
      {/* Левая часть: ссылки */}
      <div className="admin-box">
        <h1 className="admin-title">Панель администратора</h1>
        <ul className="admin-link-list">
          <li><Link to="/books_admin"   className="admin-link">Каталог книг</Link></li>
          <li><Link to="/authors_admin" className="admin-link">Каталог авторов</Link></li>
          <li><Link to="/bookings_admin"className="admin-link">Каталог бронирования</Link></li>
          <li><Link to="/orders_admin"  className="admin-link">Каталог заказов</Link></li>
          <li><Link to="/users_admin"   className="admin-link">Каталог пользователей</Link></li>
          <li><Link to="/reports_admin" className="admin-link">Создать отчёт</Link></li>
          <li><Link to="/comments_admin"className="admin-link">Редактировать комментарии</Link></li>
        </ul>
      </div>

      {/* Правая часть: статистика */}
      <div className="admin-stats">
        <h2 className="stats-title">Статистика</h2>
        {error && <p className="stats-error">{error}</p>}
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Книг</h3>
            <p>{stats.books}</p>
          </div>
          <div className="stat-card">
            <h3>Пользователей</h3>
            <p>{stats.users}</p>
          </div>
          <div className="stat-card">
            <h3>Заказов</h3>
            <p>{stats.orders}</p>
          </div>
          <div className="stat-card">
            <h3>Броней</h3>
            <p>{stats.bookings}</p>
          </div>
          <div className="stat-card">
            <h3>Должников</h3>
            <p>{stats.debtors}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main_adm;
