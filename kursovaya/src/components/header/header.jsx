import React, { useState } from 'react'
import myImage from './logo.png'
import './header.css'
import { useDispatch } from 'react-redux';
import { logout } from '../store/userSlice';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';

function Header(){
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async (e) => {
    e.preventDefault();

    try {
      await apiClient.post('/logout/');

      dispatch(logout());
      localStorage.removeItem('access_token');

      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      dispatch(logout());
      navigate('/');
    }
    };
    return (
        <div className = "back">
            <div className='header'>
                <div className='logo'>
                    <img className = "img_logo" src={myImage} alt="logo" />
                </div>
                <Link className = "a" to = "/"><h1 className = "h1">LIBRARY</h1></Link>
                <div className = "menu">
                    <div className = "login">
                        <Link className="a1" to={'login'}><h2 className="h">ВХОД</h2></Link>
                    </div>
                    <div className = "login">
                        <Link className="a1" to={'registration'}><h2 className="h">РЕГИСТРАЦИЯ</h2></Link>
                    </div>
                    <div className = "logout">
                        <button
                            className="a1" // Стилизуем как ссылку, если нужно
                            onClick={handleLogout}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              font: 'inherit'
                            }}
                        >
                            <h2 className="h">ВЫХОД</h2>
                        </button>
                    </div>
                    <div className = "info">
                        <Link className="a1" to={'info'}><h2 className="h">О ПРОЕКТЕ</h2></Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Header