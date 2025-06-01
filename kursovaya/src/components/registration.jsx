import React, { useState } from 'react';
import apiClient from '../api/client'; // Используем настроенный axios-клиент
import './registration.css';
//TODO хешировать пароль перед отправкой
//TODO выводить сообщения с бэка

const Registration = () => {
    const initialFormState = {
        surname: '',
        name: '',
        patronymic: '',
        birthday: '',
        education: '',
        profession: '',
        educational_inst: '',
        city: '',
        street: '',
        house: '',
        building_house: '',
        flat: '',
        passport: '',
        issued_by_whom: '',
        date_issue: '',
        phone: '',
        login: '',
        password: '',
        mail: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    // Опции для поля образования
    const educationOptions = [
        { value: '', label: 'Выберите образование' },
        { value: 'secondary', label: 'Среднее' },
        { value: 'special', label: 'Среднее специальное' },
        { value: 'higher', label: 'Высшее' }
    ];

    // Конфигурация полей формы
    const fieldsConfig = [
        { label: 'Фамилия', name: 'surname', required: true },
        { label: 'Имя', name: 'name', required: true },
        { label: 'Отчество', name: 'patronymic' },
        { label: 'Дата рождения', name: 'birthday', type: 'date', required: true },
        {
            label: 'Образование',
            name: 'education',
            type: 'select',
            options: educationOptions,
            required: true
        },
        { label: 'Профессия', name: 'profession' },
        { label: 'Место учёбы', name: 'educational_inst' },
        { label: 'Город', name: 'city', required: true },
        { label: 'Улица', name: 'street', required: true },
        { label: 'Дом', name: 'house', required: true },
        { label: 'Корпус', name: 'building_house' },
        { label: 'Квартира', name: 'flat', type: 'number' },
        {
            label: 'Серия и номер паспорта',
            name: 'passport',
            placeholder: '4510 123456',
            pattern: '\\d{4} \\d{6}',
            required: true
        },
        { label: 'Кем выдан паспорт', name: 'issued_by_whom', required: true },
        { label: 'Дата выдачи паспорта', name: 'date_issue', type: 'date', required: true },
        { label: 'Номер телефона', name: 'phone', type: 'tel', required: true },
        { label: 'Логин', name: 'login', required: true },
        { label: 'Пароль', name: 'password', type: 'password', required: true },
        { label: 'Почта', name: 'mail', type: 'email', required: true }
    ];

    const handleChange = (e) => {
      const { name, value } = e.target;

      // Обновляем значение
      setFormData(prev => ({ ...prev, [name]: value }));

      // Сбрасываем ошибку только если поле валидно
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    };

    const validateField = (name, value) => {
      const fieldConfig = fieldsConfig.find(f => f.name === name);
      if (!fieldConfig) return true;

      // Проверка на обязательность
      if (fieldConfig.required && !value) {
        return 'Это поле обязательно';
      }

      // Специальные проверки для конкретных полей
      switch (name) {
        case 'mail':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Некорректный email';
          }
          break;

        case 'password':
          if (value.length < 6) {
            return 'Пароль должен быть не менее 6 символов';
          }
          break;

        case 'passport':
          if (!/^\d{4} \d{6}$/.test(value)) {
            return 'Формат: XXXX XXXXXX';
          }
          break;
      }

      return ''; // Нет ошибок
    };

    const validateForm = () => {
      const newErrors = {};
      let isValid = true;

      fieldsConfig.forEach(field => {
        const error = validateField(field.name, formData[field.name]);
        if (error) {
          newErrors[field.name] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const [passport_series, passport_number] = formData.passport.split(' ');

            const response = await apiClient.post('/register/', {
                ...formData,
                passport_series,
                passport_number,
                flat: formData.flat ? parseInt(formData.flat, 10) : null,
                admin: false,
                consists_of: new Date().toISOString().split('T')[0]
            });

            if (response.status === 201) {
                setRegistrationSuccess(true);
                setFormData(initialFormState);
            }
        } catch (err) {
            if (err.response?.data) {
                const serverErrors = {};
                Object.entries(err.response.data).forEach(([key, messages]) => {
                    serverErrors[key] = Array.isArray(messages) ? messages.join(' ') : messages;
                });
                setErrors(serverErrors);
            } else if (err.request) {
                      // Обработка ошибок сети (нет ответа от сервера)
                      setErrors({ general: 'Ошибка соединения с сервером' });
            } else {
                // Другие ошибки (например, проблемы в коде)
                setErrors({ general: 'Не удалось завершить регистрацию. Попробуйте позже.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="registration-success">
                <h3>Регистрация завершена успешно!</h3>
                <p>Теперь вы можете войти в систему, используя свои учетные данные.</p>
            </div>
        );
    }

    return (
        <div className="registration-container">
            <h2 className="h2">Регистрация нового пользователя</h2>
            <form onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                    {fieldsConfig.map(({ label, name, type = 'text', required, placeholder, pattern, options }) => (
                        <div className={`form-group ${errors[name] ? 'has-error' : ''}`} key={name}>
                            <label htmlFor={name}>
                                {label}
                                {required && <span className="required-asterisk">*</span>}
                            </label>

                            {type === 'select' ? (
                                <select
                                    id={name}
                                    name={name}
                                    value={formData[name]}
                                    onChange={handleChange}
                                    required={required}
                                    disabled={isSubmitting}
                                >
                                    {options.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    id={name}
                                    type={type}
                                    name={name}
                                    value={formData[name]}
                                    onChange={handleChange}
                                    onBlur={(e) => validateField(name, e.target.value)}
                                    required={required}
                                    placeholder={placeholder}
                                    disabled={isSubmitting}
                                    pattern={pattern}
                                />
                            )}
                            {errors[name] && <div className="error-text">{errors[name]}</div>}
                        </div>
                    ))}
                </div>

                {errors.general && <div className="form-error">{errors.general}</div>}

                <div className="form-actions">
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Registration;