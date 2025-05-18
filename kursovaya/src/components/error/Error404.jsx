import React from 'react'
import {Link} from 'react-router-dom'
import imgError from './error.jpg'

function Error(){
    return(
        <>
            <h1 className = "h_result" align = 'center'>Error404</h1>
            <img className = "img" src = {imgError} alt="error"/>
        </>
        )
}
export default Error