import React from 'react';
import { useParams } from 'react-router-dom';

function New_book() {
    const { index } = useParams(); // получаем индекс из URL

    return (
        <>
            <h2>Редактирование книги с индексом: {index}</h2>
            //TODO добавить форму
        </>
    );
}

export default New_book;