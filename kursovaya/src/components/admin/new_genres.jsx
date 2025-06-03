import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Spin } from 'antd';
import apiClient from '../../api/client';

function New_genres() {
    const [form] = Form.useForm();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGenre = async () => {
            try {
                if (id) {
                    const response = await apiClient.get(`/admin/genres/${id}/`);
                    const genreData = response.data;

                    form.setFieldsValue({
                        name: genreData.name
                    });
                }
            } catch (error) {
                message.error('Ошибка загрузки данных жанра');
                console.error('Ошибка загрузки данных жанра:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGenre();
    }, [id, form]);

    const onFinish = async (values) => {
        try {
            setLoading(true);

            let response;
            if (id) {
                response = await apiClient.put(`/admin/genres/${id}/`, values);
                message.success('Жанр успешно обновлен');
            } else {
                response = await apiClient.post('/admin/genres/', values);
                message.success('Жанр успешно добавлен');
            }

            navigate('/genres_admin');
        } catch (error) {
            console.error('Ошибка:', error.response?.data || error);
            message.error(error.response?.data?.message || 'Ошибка сохранения жанра');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2>{id ? 'Редактирование жанра' : 'Добавление нового жанра'}</h2>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                <Form.Item
                    label="Название жанра"
                    name="name"
                    rules={[{ required: true, message: 'Пожалуйста, введите название жанра!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {id ? 'Сохранить изменения' : 'Добавить жанр'}
                    </Button>
                    <Button
                        style={{ marginLeft: 10 }}
                        onClick={() => navigate('/genres_admin')}
                    >
                        Отмена
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default New_genres;