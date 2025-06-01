import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './main_admin.css';
import apiClient from '../../api/client';

const Main_adm = () => {
  const [stats, setStats] = useState({
    books: 0,
    users: 0,
    orders: 0,
    bookings: 0,
    debtors: 0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await apiClient.get('/statistics/');

        if (response.data) {
          setStats({
            books: response.data.books || 0,
            users: response.data.users || 0,
            orders: response.data.orders || 0,
            bookings: response.data.bookings || 0,
            debtors: response.data.debtors || 0
          });
        }
      } catch (err) {
        console.error('Ошибка при загрузке статистики:', err);
        setError(err.response?.data?.message || 'Ошибка загрузки статистики');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="admin-wrapper">
        <div className="loading-spinner">Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      {/* Левая часть: ссылки */}
      <div className="admin-box">
        <h1 className="admin-title">Панель администратора</h1>
        <ul className="admin-link-list">
          <li><Link to="/books_admin" className="admin-link">Каталог книг</Link></li>
          <li><Link to="/authors_admin" className="admin-link">Каталог авторов</Link></li>
          <li><Link to="/bookings_admin" className="admin-link">Каталог бронирования</Link></li>
          <li><Link to="/orders_admin" className="admin-link">Каталог заказов</Link></li>
          <li><Link to="/users_admin" className="admin-link">Каталог пользователей</Link></li>
          <li><Link to="/reports_admin" className="admin-link">Создать отчёт</Link></li>
          <li><Link to="/comments_admin" className="admin-link">Редактировать комментарии</Link></li>
        </ul>
      </div>

      {/* Правая часть: статистика */}
      <div className="admin-stats">
        <h2 className="stats-title">Статистика</h2>
        {error && <p className="stats-error">{error}</p>}
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Книг</h3>
            <p>{stats.books.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Пользователей</h3>
            <p>{stats.users.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Новых заказов</h3>
            <p>{stats.orders.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Броней</h3>
            <p>{stats.bookings.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Должников</h3>
            <p>{stats.debtors.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main_adm;