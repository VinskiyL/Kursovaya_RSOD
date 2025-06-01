import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import './edit.css';

function EditProfile() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState({
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
        passport_series: '',
        passport_number: '',
        issued_by_whom: '',
        date_issue: '',
        phone: '',
        login: '',
        mail: '',
        password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');
    const [passwordCheckRequired, setPasswordCheckRequired] = useState(false);

    // Конфигурация полей формы
    const fieldsConfig = [
        // Личные данные
        { section: 'Личные данные', label: 'Фамилия', name: 'surname', required: true },
        { section: 'Личные данные', label: 'Имя', name: 'name', required: true },
        { section: 'Личные данные', label: 'Отчество', name: 'patronymic' },
        { section: 'Личные данные', label: 'Дата рождения', name: 'birthday', type: 'date', required: true },

        // Образование и работа
        { section: 'Образование и работа', label: 'Образование', name: 'education', type: 'select', options: [
            { value: '', label: 'Выберите образование' },
            { value: 'secondary', label: 'Среднее' },
            { value: 'special', label: 'Среднее специальное' },
            { value: 'higher', label: 'Высшее' }
        ]},
        { section: 'Образование и работа', label: 'Профессия', name: 'profession' },
        { section: 'Образование и работа', label: 'Учебное заведение', name: 'educational_inst' },

        // Адрес
        { section: 'Адрес', label: 'Город', name: 'city', required: true },
        { section: 'Адрес', label: 'Улица', name: 'street', required: true },
        { section: 'Адрес', label: 'Дом', name: 'house', required: true },
        { section: 'Адрес', label: 'Корпус/строение', name: 'building_house' },
        { section: 'Адрес', label: 'Квартира', name: 'flat', type: 'number' },

        // Паспортные данные
        { section: 'Паспортные данные', label: 'Серия паспорта', name: 'passport_series', maxLength: 4 },
        { section: 'Паспортные данные', label: 'Номер паспорта', name: 'passport_number', maxLength: 6 },
        { section: 'Паспортные данные', label: 'Кем выдан', name: 'issued_by_whom' },
        { section: 'Паспортные данные', label: 'Дата выдачи', name: 'date_issue', type: 'date' },

        // Контактные данные
        { section: 'Контактные данные', label: 'Телефон', name: 'phone', type: 'tel' },
        { section: 'Контактные данные', label: 'Email', name: 'mail', type: 'email', required: true },
        { section: 'Контактные данные', label: 'Логин', name: 'login', required: true },

        // Смена пароля
        { section: 'Смена пароля', label: 'Текущий пароль', name: 'password', type: 'password',
          required: passwordCheckRequired, placeholder: 'Введите текущий пароль' },
        { section: 'Смена пароля', label: 'Новый пароль', name: 'new_password', type: 'password',
          placeholder: 'Введите новый пароль' },
        { section: 'Смена пароля', label: 'Подтвердите пароль', name: 'confirm_password', type: 'password',
          placeholder: 'Повторите новый пароль', disabled: !userData.new_password }
    ];

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await apiClient.get('/profile/');
                if (response.data && response.data.success) {
                    setUserData({...response.data.user, password: '', new_password: '', confirm_password: ''});
                }
            } catch (err) {
                setErrors({ general: 'Ошибка загрузки данных профиля' });
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: value
        }));

        // Если начали вводить новый пароль - потребуется проверка текущего
        if (name === 'new_password' && value && !passwordCheckRequired) {
            setPasswordCheckRequired(true);
        }

        // Валидация поля
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error || '' }));
    };

    const validateField = (name, value) => {
        const fieldConfig = fieldsConfig.find(f => f.name === name);
        if (!fieldConfig) return '';

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

            case 'new_password':
                if (value && value.length < 6) {
                    return 'Пароль должен быть не менее 6 символов';
                }
                break;

            case 'confirm_password':
                if (userData.new_password && value !== userData.new_password) {
                    return 'Пароли не совпадают';
                }
                break;
        }

        return ''; // Нет ошибок
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        fieldsConfig.forEach(field => {
            if (field.disabled) return;

            const error = validateField(field.name, userData[field.name]);
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

        // Если пытаемся изменить пароль
        if (userData.new_password) {
            // Проверка подтверждения пароля
            if (userData.new_password !== userData.confirm_password) {
                setErrors({ confirm_password: 'Новый пароль и подтверждение не совпадают' });
                return;
            }

            // Проверка текущего пароля
            if (!userData.password) {
                setErrors({ password: 'Для изменения пароля введите текущий пароль' });
                return;
            }

            // Проверка что новый пароль отличается от текущего
            if (userData.new_password === userData.password) {
                setErrors({ new_password: 'Новый пароль должен отличаться от текущего' });
                return;
            }
        }

        try {
            // Отправляем данные без подтверждения пароля
            const dataToSend = {...userData};

            // Если пароль не меняется - не отправляем поля с паролями
            if (!userData.new_password) {
                delete dataToSend.password;
                delete dataToSend.new_password;
            }

            const response = await apiClient.put('/profile/update/', dataToSend);

            if (response.data.success) {
                if (userData.new_password) {
                    setSuccess('Пароль успешно изменен');
                } else {
                    setSuccess('Профиль успешно обновлен');
                }
                setTimeout(() => navigate('/'), 2000);
            } else {
                setErrors({ general: response.data.message || 'Ошибка обновления профиля' });
            }
        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Ошибка при обновлении профиля' });
        }
    };

    if (loading) return <div className="loading-spinner">Загрузка данных...</div>;

    // Группировка полей по секциям
    const sections = {};
    fieldsConfig.forEach(field => {
        if (!sections[field.section]) {
            sections[field.section] = [];
        }
        sections[field.section].push(field);
    });

    return (
        <div className="edit-profile-container">
            <h2 className="h2">Редактирование профиля</h2>

            {errors.general && <div className="form-error">{errors.general}</div>}
            {success && <div className="form-success">{success}</div>}

            <form onSubmit={handleSubmit} noValidate>
                {Object.entries(sections).map(([sectionName, sectionFields]) => (
                    <div key={sectionName} className="form-section">
                        <h3 className="section-title">{sectionName}</h3>
                        <div className="form-grid">
                            {sectionFields.map(({ label, name, type = 'text', required, placeholder, disabled, options, maxLength }) => (
                                <div className={`form-group ${errors[name] ? 'has-error' : ''}`} key={name}>
                                    <label htmlFor={name}>
                                        {label}
                                        {required && <span className="required-asterisk">*</span>}
                                    </label>

                                    {type === 'select' ? (
                                        <select
                                            id={name}
                                            name={name}
                                            value={userData[name]}
                                            onChange={handleChange}
                                            required={required}
                                            disabled={disabled}
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
                                            value={userData[name]}
                                            onChange={handleChange}
                                            onBlur={(e) => validateField(name, e.target.value)}
                                            required={required}
                                            placeholder={placeholder}
                                            disabled={disabled}
                                            maxLength={maxLength}
                                        />
                                    )}

                                    {errors[name] && <div className="error-text">{errors[name]}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="form-note">
                    <small>Оставьте поля пароля пустыми, если не хотите его менять</small>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-button">
                        Сохранить изменения
                    </button>
                    <button
                        type="button"
                        className="cancel-button_"
                        onClick={() => navigate('/')}
                    >
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditProfile;