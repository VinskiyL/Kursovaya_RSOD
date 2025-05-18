import React, { useState } from 'react';
import axios from 'axios';
import './new_order.css';

const New = () => {
    const [formData, setFormData] = useState({
        title: '',
        author_surname: '',
        author_name: '',
        author_patronymic: '',
        quantity: '',
        date_publication: ''
    });
    const [error, setError] = useState('');

    const validateForm = () => {
        const { title, author_surname, quantity, author_name, author_patronymic} = formData;
        const surnameRegex = /^[A-Za-zа-яА-ЯёЁ-]+$/;
        const quantityRegex = /^(0*[1-4])$/; // только цифры от 1 до 4

        if (!title) return "Требуется название.";
        if (author_name && !surnameRegex.test(author_name)) return "Имя автора должно состоять только из букв и '-'.";
        if (author_patronymic && !surnameRegex.test(author_patronymic)) return "Отчество автора должно состоять только из букв и '-'.";
        if (!surnameRegex.test(author_surname)) return "Фамилия автора обязательна и должна состоять только из букв и '-'.";
        if (!quantityRegex.test(quantity)) return "Количество должно быть числом от 1 до 4.";

        return null; // No errors
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
            const response = await axios.get('https://kursovaya.local/addOrder.php', {
                params: {
                    title: formData.title,
                    author_surname: formData.author_surname,
                    author_name: formData.author_name,
                    author_patronymic: formData.author_patronymic,
                    quantity: formData.quantity,
                    date_publication: formData.date_publication
                },
                withCredentials: true,
            });

            if (response.data.success) {
                alert('Заказ успешно создан!');
                // Здесь можно вызвать функцию для обновления данных
                // fetchData();
            } else {
                alert('Не удалось сделать заказ. Попробуйте снова.');
            }
        } catch (error) {
            setError('Ошибка: ' + error.message);
            alert('Произошла ошибка. Попробуйте позже.');
        }
    };

    return (
        <div className="container_new_order">
            <h1 className = "h2">Создание заказа</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit} className = "container_new_order--form">
                <div className="container_new_order--el">
                    <label><p className = "h_result">Название книги (обязательно):</p></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                </div>
                <div className="container_new_order--el">
                    <label><p className = "h_result">Фамилия автора (обязательно):</p></label>
                    <input type="text" name="author_surname" value={formData.author_surname} onChange={handleChange} required />
                </div>
                <div className="container_new_order--el">
                    <label><p className = "h_result">Имя автора (не обязательно):</p></label>
                    <input type="text" name="author_name" value={formData.author_name} onChange={handleChange} />
                </div>
                <div className="container_new_order--el">
                    <label><p className = "h_result">Отчество автора (не обязательно):</p></label>
                    <input type="text" name="author_patronymic" value={formData.author_patronymic} onChange={handleChange} />
                 </div>
                 <div className="container_new_order--el">
                     <label><p className = "h_result">Количество книг от 1 до 4 (обязательно):</p></label>
                     <input type="number" name="quantity" value={formData.quantity} min="1" max="4" onChange={handleChange}/>
                 </div>
                 <div className="container_new_order--el">
                     <label><p className = "h_result">Дата публикации книги (не обязательно):</p></label>
                     <input
                         type="date"
                         name="date_publication"
                         value={formData.date_publication}
                         onChange={handleChange}
                     />
                 </div>
                 <button className="new_order-button" type="submit">
                     Заказать
                 </button>
             </form>
         </div>
     );
 };

 export default New;

