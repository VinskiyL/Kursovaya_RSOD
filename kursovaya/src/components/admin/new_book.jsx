import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Select, Upload, message, Spin, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import './books.css';

const { Option } = Select;
const { TextArea } = Input;

function New_book() {
    const [form] = Form.useForm();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authors, setAuthors] = useState([]);
    const [genres, setGenres] = useState([]);
    const [fileList, setFileList] = useState([]);
    const [existingCover, setExistingCover] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [authorsRes, genresRes] = await Promise.all([
                    apiClient.get('/admin/authors-list/'),
                    apiClient.get('/admin/genres-list/')
                ]);

                setAuthors(authorsRes.data);
                setGenres(genresRes.data);

                if (id) {
                    const bookRes = await apiClient.get(`/admin/books/${id}/`);
                    const bookData = bookRes.data;

                    form.setFieldsValue({
                        ...bookData,
                        author_ids: bookData.authors.map(a => a.id),
                        genre_ids: bookData.genres.map(g => g.id)
                    });

                    if (bookData.cover) {
                        setExistingCover(bookData.cover);
                        setFileList([{
                            uid: '-1',
                            name: 'cover.jpg',
                            status: 'done',
                            url: bookData.cover
                        }]);
                    }
                }
            } catch (error) {
                message.error('Ошибка загрузки данных');
                console.error('Ошибка загрузки данных:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, form]);

    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Можно загружать только изображения!');
            return Upload.LIST_IGNORE;
        }
        setFileList([file]);
        return false;
    };

    const onRemove = () => {
        setFileList([]);
        setExistingCover(null);
    };

   const onFinish = async (values) => {
     try {
       setLoading(true);

       // 1. Подготовка данных
       const data = {
         ...values,
         // Гарантируем, что author_ids и genre_ids будут массивами
         author_ids: Array.isArray(values.author_ids)
           ? values.author_ids
           : [values.author_ids].filter(Boolean),
         genre_ids: Array.isArray(values.genre_ids)
           ? values.genre_ids
           : [values.genre_ids].filter(Boolean),
         // Для новых книг устанавливаем quantity_remaining = quantity_total
         quantity_remaining: id ? values.quantity_remaining : values.quantity_total
       };


       // 2. Отправка основных данных (JSON)
       let response;
       if (id) {
         response = await apiClient.put(`/admin/books/${id}/`, data);
       } else {
         response = await apiClient.post('/admin/books/', data);
       }

       // 3. Отдельная обработка обложки (если есть)
       if (fileList[0] instanceof File) {
         const coverForm = new FormData();
         coverForm.append('cover', fileList[0]);
         await apiClient.patch(`/admin/books/${response.data.id}/cover/`, coverForm);
       } else if (fileList.length === 0 && existingCover) {
         await apiClient.delete(`/admin/books/${response.data.id}/cover/`);
       }

       message.success(id ? 'Книга обновлена' : 'Книга добавлена');
       navigate('/books_admin');
     } catch (error) {
       console.error('Ошибка:', error.response?.data || error);
       message.error(error.response?.data?.message || 'Ошибка сохранения');
     } finally {
       setLoading(false);
     }
   };

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 className="h2">{id ? 'Редактирование книги' : 'Добавление новой книги'}</h2>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    quantity_total: 1,
                    quantity_remaining: 1,
                    volume: 1
                }}
            >
                <Form.Item
                    label="Индекс"
                    name="index"
                    rules={[{ required: true, message: 'Пожалуйста, введите индекс!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Название"
                    name="title"
                    rules={[{ required: true, message: 'Пожалуйста, введите название!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Авторы"
                    name="author_ids"
                    rules={[{ required: true, message: 'Пожалуйста, выберите авторов!' }]}
                >
                    <Select
                        mode="multiple"
                        placeholder="Выберите авторов"
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        {authors.map(author => (
                            <Option key={author.id} value={author.id}>
                                {`${author.author_surname} ${author.author_name} ${author.author_patronymic || ''}`}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Жанры"
                    name="genre_ids"
                >
                    <Select
                        mode="multiple"
                        placeholder="Выберите жанры"
                    >
                        {genres.map(genre => (
                            <Option key={genre.id} value={genre.id}>
                                {genre.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Место издания"
                    name="place_publication"
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Информация об издании"
                    name="information_publication"
                >
                    <TextArea rows={3} />
                </Form.Item>

                <Form.Item
                    label="Год издания"
                    name="date_publication"
                    rules={[
                        {
                            pattern: /^\d{4}$/,
                            message: 'Год должен состоять из 4 цифр'
                        }
                    ]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Объем (страниц)"
                    name="volume"
                >
                    <InputNumber min={1} />
                </Form.Item>

                <Form.Item
                    label="Общее количество экземпляров"
                    name="quantity_total"
                    rules={[{ required: true, message: 'Пожалуйста, укажите количество!' }]}
                >
                    <InputNumber min={1} />
                </Form.Item>

                {id && (
                    <Form.Item
                        label="Доступное количество экземпляров"
                        name="quantity_remaining"
                        rules={[{ required: true, message: 'Пожалуйста, укажите количество!' }]}
                    >
                        <InputNumber min={0} />
                    </Form.Item>
                )}

                <Form.Item label="Обложка">
                    <Upload
                        fileList={fileList}
                        beforeUpload={beforeUpload}
                        onRemove={onRemove}
                        accept="image/*"
                        listType="picture"
                        maxCount={1}
                    >
                        <Button icon={<UploadOutlined />}>Выберите файл</Button>
                    </Upload>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {id ? 'Сохранить изменения' : 'Добавить книгу'}
                    </Button>
                    <Button
                        style={{ marginLeft: 10 }}
                        onClick={() => navigate('/books_admin')}
                    >
                        Отмена
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default New_book;