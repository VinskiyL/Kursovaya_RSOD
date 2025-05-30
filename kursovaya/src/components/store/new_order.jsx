import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import './new_order.css';

const New = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        author_surname: '',
        author_name: '',
        author_patronymic: '',
        quantyti: '',
        date_publication: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await apiClient.get(`/orders/${id}/`);
                setFormData(response.data);
            } catch (err) {
                setError('Произошла ошибка при загрузке заказа.');
                console.error('Ошибка:', err.response ? err.response.data : err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchOrder();
        else setLoading(false);
    }, [id]);

    const validateForm = () => {
        const { title, author_surname, quantyti } = formData;
        const surnameRegex = /^[A-Za-zа-яА-ЯёЁ-]+$/;
        const quantityRegex = /^[1-4]$/;

        if (!title) return "Требуется название.";
        if (!surnameRegex.test(author_surname)) return "Фамилия автора обязательна и должна состоять только из букв и '-'.";
        if (!quantityRegex.test(quantyti)) return "Количество должно быть числом от 1 до 4.";

        return null;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            const response = id
                ? await apiClient.put(`/orders/${id}/`, formData)
                : await apiClient.post('/orders/', formData);

            if (response.status === 200 || response.status === 201) {
                alert(`Заказ успешно ${id ? 'обновлён' : 'создан'}!`);
                navigate('/order');
            }
        } catch (error) {
            setError('Ошибка: ' + (error.response?.data?.message || error.message));
            alert('Произошла ошибка. Попробуйте позже.');
        }
    };

    if (loading) return <div className="container_new_order"><p className="h_result">Загрузка...</p></div>;

    return (
        <div className="container_new_order">
            <h1 className="h2">{id ? `Редактирование заказа #${id}` : 'Создание нового заказа'}</h1>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="container_new_order--form">
                <div className="container_new_order--el">
                    <label><p className="h_result">Название книги (обязательно):</p></label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="container_new_order--el">
                    <label><p className="h_result">Фамилия автора (обязательно):</p></label>
                    <input
                        type="text"
                        name="author_surname"
                        value={formData.author_surname}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="container_new_order--el">
                    <label><p className="h_result">Имя автора:</p></label>
                    <input
                        type="text"
                        name="author_name"
                        value={formData.author_name}
                        onChange={handleChange}
                    />
                </div>
                <div className="container_new_order--el">
                    <label><p className="h_result">Отчество автора:</p></label>
                    <input
                        type="text"
                        name="author_patronymic"
                        value={formData.author_patronymic}
                        onChange={handleChange}
                    />
                </div>
                <div className="container_new_order--el">
                    <label><p className="h_result">Количество (1-5):</p></label>
                    <input
                        type="number"
                        name="quantyti"
                        value={formData.quantyti}
                        onChange={handleChange}
                        min="1"
                        max="5"
                        required
                    />
                </div>
                <div className="container_new_order--el">
                    <label><p className="h_result">Год публикации:</p></label>
                    <input
                        type="text"
                        name="date_publication"
                        value={formData.date_publication}
                        onChange={handleChange}
                    />
                </div>
                <button className="new_order-button" type="submit">
                    {id ? 'Сохранить изменения' : 'Создать заказ'}
                </button>
            </form>
        </div>
    );
};

export default New;