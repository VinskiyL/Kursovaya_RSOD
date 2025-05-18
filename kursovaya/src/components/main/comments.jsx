import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../api/client';
import '../store/order.css';

const Comments = () => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Получаем данные пользователя из Redux store
    const { data: user } = useSelector((state) => state.user);
    const isAuthenticated = !!user;
    const currentUser = user || {};

    // Получение списка комментариев
    const fetchComments = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/comments/');
            setComments(response.data);
            setError('');
        } catch (err) {
            setError('Не удалось загрузить комментарии');
            console.error('Ошибка при загрузке комментариев:', err);
        } finally {
            setLoading(false);
        }
    };

    // Добавление нового комментария
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('Токен авторизации не найден');
            }
            const response = await apiClient.post('/comments/', {
                comment: newComment
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setComments([response.data, ...comments]);
            setNewComment('');
            setSuccess('Комментарий успешно добавлен');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Не удалось добавить комментарий');
            console.error('Ошибка:', err);
        }
    };

    // Удаление комментария
    const handleDelete = async (commentId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;

        try {
            await apiClient.delete(`/comments/${commentId}/`);
            setComments(comments.filter(comment => comment.id !== commentId));
            setSuccess('Комментарий успешно удален');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Не удалось удалить комментарий');
            console.error('Ошибка при удалении комментария:', err);
        }
    };

    useEffect(() => {
        fetchComments();
    }, []);

    if (loading) return <div>Загрузка комментариев...</div>;

    return (
        <div className="comments-container">
            <h2>Отзывы</h2>

            {isAuthenticated ? (
                <form onSubmit={handleSubmit} className="comment-form">
                    <div className="form-group">
                        <label htmlFor="new-comment">Ваш отзыв:</label>
                        <textarea
                            id="new-comment"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            required
                            rows="3"
                            placeholder="Напишите ваш отзыв..."
                        />
                    </div>
                    <button type="submit" className="submit-button">
                        Добавить комментарий
                    </button>
                </form>
            ) : (
                <div className="auth-notice">
                    <p>Чтобы оставить комментарий, пожалуйста, авторизуйтесь</p>
                </div>
            )}

            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            <div className="comments-list">
                {comments.length === 0 ? (
                    <p>Пока нет комментариев</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="comment-item">
                            <div className="comment-header">
                                <span className="comment-author">
                                    {comment.user_info?.name || 'Анонимный пользователь'}
                                    {comment.user_info?.is_admin && ' (Администратор)'}
                                </span>
                                <span className="comment-date">
                                    {new Date(comment.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="comment-text">{comment.comment}</div>

                            {isAuthenticated && currentUser.id === comment.user && (
                                <button
                                    onClick={() => handleDelete(comment.id)}
                                    className="delete-button"
                                >
                                    Удалить
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Comments;