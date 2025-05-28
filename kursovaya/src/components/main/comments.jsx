import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../api/client';
import './comments.css'

const Comments = () => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Для редактирования — id коммента и временный текст редактируемого коммента
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const { data: user } = useSelector((state) => state.user);
  const isAuthenticated = !!user;
  const currentUser = user || {};

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await apiClient.post('/comments/', {
        comment: newComment,
      });
      setComments([response.data, ...comments]);
      setNewComment('');
      setSuccess('Комментарий успешно добавлен');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Не удалось добавить комментарий');
      console.error('Ошибка при добавлении комментария:', err);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;

    try {
      await apiClient.delete(`/comments/${commentId}/`);
      setComments(comments.filter((comment) => comment.id !== commentId));
      setSuccess('Комментарий успешно удален');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Не удалось удалить комментарий');
      console.error('Ошибка при удалении комментария:', err);
    }
  };

  // Начало редактирования
  const startEditing = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment);
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  // Сохранение отредактированного комментария
  const saveEditing = async (commentId) => {
    if (!editingText.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }

    try {
      const response = await apiClient.put(`/comments/${commentId}/`, {
        comment: editingText,
      });

      setComments(comments.map((comment) =>
        comment.id === commentId ? response.data : comment
      ));
      setEditingCommentId(null);
      setEditingText('');
      setSuccess('Комментарий успешно обновлен');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Не удалось обновить комментарий');
      console.error('Ошибка при обновлении комментария:', err);
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
              <div className="comment-text">
                {editingCommentId === comment.id ? (
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows="3"
                  />
                ) : (
                  comment.comment
                )}
              </div>

              {isAuthenticated && (currentUser.id === comment.user || currentUser.admin) && (
                <div className="comment-actions">
                  {editingCommentId === comment.id ? (
                    <>
                      <button onClick={() => saveEditing(comment.id)} className="save-button">
                        Сохранить
                      </button>
                      <button onClick={cancelEditing} className="cancel-button">
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(comment)} className="edit-button">
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="delete-button"
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
