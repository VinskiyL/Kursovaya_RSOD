import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import './new_order.css';

const NewOrder = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        author_surname: '',
        author_name: '',
        author_patronymic: '',
        quantyti: '1', // Установлено значение по умолчанию 1
        date_publication: ''
    });
    const [error, setError] = useState('');

    const validateForm = () => {
        const { title, author_surname, quantyti, date_publication } = formData;
        const surnameRegex = /^[A-Za-zа-яА-ЯёЁ-]+$/;
        const currentYear = new Date().getFullYear();

        // Проверка обязательных полей
        if (!title.trim()) return "Название книги обязательно для заполнения";
        if (!author_surname.trim()) return "Фамилия автора обязательна для заполнения";
        if (!surnameRegex.test(author_surname)) return "Фамилия автора должна содержать только буквы и дефис";

        // Проверка количества
        const quantity = parseInt(quantyti);
        if (isNaN(quantity) || quantity < 1 || quantity > 5) {
            return "Количество книг должно быть от 1 до 5";
        }

        // Проверка года публикации, если указан
        if (date_publication) {
            const year = parseInt(date_publication);
            if (isNaN(year) || year.toString().length !== 4 || year < 1800 || year > currentYear) {
                return `Год публикации должен быть в формате ГГГГ (1800-${currentYear})`;
            }
        }

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
            const response = await apiClient.post('/orders/', {
                ...formData,
                quantyti: parseInt(formData.quantyti) // Преобразуем в число
            });

            if (response.status === 201) {
                alert('Заказ успешно создан!');
                navigate('/order');
            }
        } catch (error) {
            setError('Ошибка: ' + (error.response?.data?.detail || error.message));
            console.error('Ошибка создания заказа:', error);
            alert('Произошла ошибка при создании заказа. Попробуйте позже.');
        }
    };

    return (
        <div className="container_new_order">
            <h1 className="h2">Создание нового заказа</h1>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="container_new_order--form">
                <div className="container_new_order--el">
                    <label>
                        <p className="h_result">
                            Название книги <span className="required-field">*</span>:
                        </p>
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="container_new_order--el">
                    <label>
                        <p className="h_result">
                            Фамилия автора <span className="required-field">*</span>:
                        </p>
                    </label>
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
                    <label>
                        <p className="h_result">
                            Количество (1-5) <span className="required-field">*</span>:
                        </p>
                    </label>
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
                        placeholder="ГГГГ"
                        pattern="\d{4}"
                        title="Введите год в формате ГГГГ"
                    />
                </div>
                <button className="new_order-button" type="submit">
                    Создать заказ
                </button>
            </form>
        </div>
    );
};

export default NewOrder;