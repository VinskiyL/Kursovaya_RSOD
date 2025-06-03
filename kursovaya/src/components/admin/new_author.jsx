import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Spin } from 'antd';
import apiClient from '../../api/client';
import './books.css';

function New_author() {
    const [form] = Form.useForm();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAuthor = async () => {
            try {
                if (id) {
                    const response = await apiClient.get(`/admin/authors/${id}/`);
                    const authorData = response.data;

                    form.setFieldsValue({
                        author_surname: authorData.author_surname,
                        author_name: authorData.author_name,
                        author_patronymic: authorData.author_patronymic
                    });
                }
            } catch (error) {
                message.error('Ошибка загрузки данных автора');
                console.error('Ошибка загрузки данных автора:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuthor();
    }, [id, form]);

    const onFinish = async (values) => {
        try {
            setLoading(true);

            let response;
            if (id) {
                response = await apiClient.put(`/admin/authors/${id}/`, values);
                message.success('Автор успешно обновлен');
            } else {
                response = await apiClient.post('/admin/authors/', values);
                message.success('Автор успешно добавлен');
            }

            navigate('/authors_admin');
        } catch (error) {
            console.error('Ошибка:', error.response?.data || error);
            message.error(error.response?.data?.message || 'Ошибка сохранения автора');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2>{id ? 'Редактирование автора' : 'Добавление нового автора'}</h2>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                <Form.Item
                    label="Фамилия"
                    name="author_surname"
                    rules={[{ required: true, message: 'Пожалуйста, введите фамилию!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Имя"
                    name="author_name"
                    rules={[{ required: true, message: 'Пожалуйста, введите имя!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Отчество"
                    name="author_patronymic"
                >
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {id ? 'Сохранить изменения' : 'Добавить автора'}
                    </Button>
                    <Button
                        style={{ marginLeft: 10 }}
                        onClick={() => navigate('/authors_admin')}
                    >
                        Отмена
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default New_author;