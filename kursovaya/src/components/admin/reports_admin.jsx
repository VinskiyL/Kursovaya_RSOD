import React, { useState } from 'react';
import { Button, DatePicker, message, Card, Row, Col } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../../api/client';

const { RangePicker } = DatePicker;

const Reports_adm = () => {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!dates || dates.length !== 2) {
      message.error('Пожалуйста, выберите период');
      return;
    }

    const [start, end] = dates;
    const startDate = dayjs(start).format('YYYY-MM-DD');
    const endDate = dayjs(end).format('YYYY-MM-DD');

    try {
      setLoading(true);
      message.loading('Генерация отчёта...', 0);

      const response = await apiClient.post(
        '/report/',
        {
          start_date: startDate,
          end_date: endDate
        },
        {
          responseType: 'blob' // Добавляем responseType в конфиг
        }
      );

      // Создаем URL для скачивания файла
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `library_report_${startDate}_${endDate}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      message.destroy();
      message.success('Отчёт успешно сгенерирован');
    } catch (error) {
      console.error('Ошибка при генерации отчёта:', error);
      message.destroy();

      // Улучшенная обработка ошибок
      if (error.response) {
        if (error.response.status === 403) {
          message.error('Доступ запрещен. Требуются права администратора');
        } else {
          message.error(`Ошибка сервера: ${error.response.status}`);
        }
      } else {
        message.error('Ошибка при генерации отчёта');
      }
    } finally {
      setLoading(false);
    }
  };

  const disabledDate = (current) => {
    return current && current > dayjs().endOf('day');
  };

  return (
    <Card
      title="Генератор отчётов"
      bordered={false}
      style={{ maxWidth: 800, margin: '20px auto' }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12}>
          <RangePicker
            style={{ width: '100%' }}
            disabledDate={disabledDate}
            value={dates}
            onChange={(values) => setDates(values)}
            placeholder={['Дата начала', 'Дата окончания']}
            format="DD.MM.YYYY"
          />
        </Col>
        <Col xs={24} sm={12}>
          <Button
            type="primary"
            onClick={handleDownload}
            loading={loading}
            disabled={!dates || dates.length !== 2}
            block
          >
            Создать отчёт
          </Button>
        </Col>
      </Row>
      <div style={{ marginTop: 20 }}>
        <p>Отчёт будет содержать:</p>
        <ul>
          <li>Книги у читателей (выданные и не возвращенные)</li>
          <li>10 самых популярных книг</li>
          <li>10 самых популярных авторов</li>
          <li>10 самых популярных жанров</li>
        </ul>
      </div>
    </Card>
  );
};

export default Reports_adm;