import React from 'react';
import { useParams } from 'react-router-dom';

function New_author() {
    const { id } = useParams(); // получаем индекс из URL

    return (
        <>
            <h2> {id}</h2>
            //TODO добавить форму
        </>
    );
}

export default New_author;