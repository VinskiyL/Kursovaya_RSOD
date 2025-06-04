import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Select, DatePicker, Switch, Spin, message } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../../api/client';

const { Option } = Select;

function User_detail() {
    const [form] = Form.useForm();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [readerData, setReaderData] = useState(null);

    useEffect(() => {
        const fetchReaderData = async () => {
            try {
                const response = await apiClient.get(`/readers/${id}/`);
                setReaderData(response.data);

                // Преобразуем строки дат в dayjs объекты
                const formattedData = {
                    ...response.data,
                    birthday: response.data.birthday ? dayjs(response.data.birthday) : null,
                    date_issue: response.data.date_issue ? dayjs(response.data.date_issue) : null,
                    consists_of: response.data.consists_of ? dayjs(response.data.consists_of) : null,
                    re_registration: response.data.re_registration ? dayjs(response.data.re_registration) : null
                };

                form.setFieldsValue(formattedData);
            } catch (error) {
                message.error('Ошибка загрузки данных читателя');
                console.error('Ошибка загрузки данных:', error);
                navigate('/users_admin');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchReaderData();
        } else {
            setLoading(false);
        }
    }, [id, form, navigate]);

    const onFinish = async (values) => {
        try {
            setLoading(true);

            // Подготовка данных перед отправкой
            const dataToSend = {
                ...values,
                re_registration: values.re_registration ? values.re_registration.format('YYYY-MM-DD') : null,
                admin: values.admin || false
            };

            await apiClient.patch(`/readers/${id}/update/`, dataToSend);

            message.success('Данные читателя успешно обновлены');
            navigate('/users_admin');
        } catch (error) {
            console.error('Ошибка обновления:', error.response?.data || error);
            message.error(error.response?.data?.detail || 'Ошибка обновления данных');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 className="h2">Профиль читателя: {readerData?.surname} {readerData?.name}</h2>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                {/* Личная информация */}
                <div className="form-section">
                    <h3>Личная информация</h3>
                    <div className="form-row">
                        <Form.Item
                            label="Фамилия"
                            name="surname"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label="Имя"
                            name="name"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label="Отчество"
                            name="patronymic"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Дата рождения"
                        name="birthday"
                    >
                        <DatePicker
                            disabled
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Образование"
                        name="education"
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Профессия"
                        name="profession"
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Учебное заведение"
                        name="educational_inst"
                    >
                        <Input disabled />
                    </Form.Item>
                </div>

                {/* Контактная информация */}
                <div className="form-section">
                    <h3>Контактная информация</h3>
                    <Form.Item
                        label="Телефон"
                        name="phone"
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="mail"
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Логин"
                        name="login"
                    >
                        <Input disabled />
                    </Form.Item>
                </div>

                {/* Адрес */}
                <div className="form-section">
                    <h3>Адрес</h3>
                    <div className="form-row">
                        <Form.Item
                            label="Город"
                            name="city"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label="Улица"
                            name="street"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                    </div>

                    <div className="form-row">
                        <Form.Item
                            label="Дом"
                            name="house"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label="Корпус"
                            name="building_house"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label="Квартира"
                            name="flat"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                    </div>
                </div>

                {/* Паспортные данные */}
                <div className="form-section">
                    <h3>Паспортные данные</h3>
                    <div className="form-row">
                        <Form.Item
                            label="Серия"
                            name="passport_series"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                        <Form.Item
                            label="Номер"
                            name="passport_number"
                            className="form-item"
                        >
                            <Input disabled />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Кем выдан"
                        name="issued_by_whom"
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        label="Дата выдачи"
                        name="date_issue"
                    >
                        <DatePicker
                            disabled
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                        />
                    </Form.Item>
                </div>

                {/* Учетные данные библиотеки */}
                <div className="form-section">
                    <h3>Учетные данные</h3>
                    <Form.Item
                        label="Дата регистрации"
                        name="consists_of"
                    >
                        <DatePicker
                            disabled
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Дата перерегистрации"
                        name="re_registration"
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Статус администратора"
                        name="admin"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="Статус"
                    >
                        <Input value={readerData?.status || 'Активный'} disabled />
                    </Form.Item>
                </div>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Сохранить изменения
                    </Button>
                    <Button
                        style={{ marginLeft: 10 }}
                        onClick={() => navigate('/users_admin')}
                    >
                        Назад к списку
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default User_detail;