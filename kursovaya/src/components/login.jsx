import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { loginSuccess } from './store/userSlice'
import './login.css'

function Login() {
  const [formData, setFormData] = useState({ login: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/login/', {
        login: formData.login,
        password: formData.password
      })

      if (response.data.user) {
        dispatch(loginSuccess(response.data.user))
        navigate('/')
      } else {
        setError('Ошибка авторизации')
      }
    } catch (err) {
      if (err.response) {
        switch (err.response.status) {
          case 401: setError('Неверный логин или пароль'); break
          case 429: setError('Слишком много попыток. Попробуйте позже'); break
          case 500: setError('Ошибка сервера. Попробуйте позже'); break
          default: setError('Произошла ошибка')
        }
      } else if (err.request) {
        setError('Не удалось подключиться к серверу')
      } else {
        setError('Произошла ошибка')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <h2 className="h2">Вход в систему</h2>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="login" className="input-label">Логин</label>
          <input
            id="login"
            type="text"
            name="login"
            value={formData.login}
            onChange={handleChange}
            required
            className="form-input"
            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="input-label">Пароль</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'Выполняется вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}

export default Login
