import React, { useEffect } from 'react';
import MainContent from './components/main/main';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Authors from './components/authors/authors_table';
import './App.css';
import Header from './components/header/header';
import AboutMe from './components/aboutme';
import Login from './components/login';
import Prof from './components/profile';
import Books from './components/books/books_table';
import PopularBooks from './components/books/popular_books';
import Error from './components/error/Error404';
import Footer from './components/footer/footer';
import BooksInfo from './components/books/books_info'; // Переименовано для соответствия
import AuthorsInfo from './components/authors/authors_info'; // Переименовано для соответствия
import { useSelector, useDispatch } from 'react-redux';
import Booking from './components/store/booking';
import Order from './components/store/order';
import New from './components/store/new_order';
import { loginSuccess, logout, setTokenChecked } from './components/store/userSlice';
import Registration from './components/registration';
import Main_adm from './components/admin/main_admin';
import Authors_adm from './components/admin/authors_admin';
import Books_adm from './components/admin/books_admin';
import Bookings_adm from './components/admin/bookings_admin';
import Comments_adm from './components/admin/comments_admin';
import Orders_adm from './components/admin/orders_admin';
import Reports_adm from './components/admin/reports_admin';
import Users_adm from './components/admin/users_admin';
import New_book from './components/admin/new_book';
import New_author from './components/admin/new_author';
import ProtectedRoute from './components/ProtectedRoute';
import apiClient from './api/client';

function App() {
    const dispatch = useDispatch();
    const { data: user, tokenChecked } = useSelector((state) => state.user);

    useEffect(() => {
        const checkAuth = async () => {
          try {
            const response = await apiClient.get('/auth/check/');

            if (response.data.success && response.data.user) {
              dispatch(loginSuccess(response.data.user));
            } else {
              dispatch(logout());
            }
          } catch (err) {
            dispatch(logout());
          } finally {
            dispatch(setTokenChecked());
          }
        };

        if (!tokenChecked && !user) {
            checkAuth();
        }
    }, [dispatch, user, tokenChecked]);

    if (!tokenChecked) {
        return <div className="loading-screen">Проверка авторизации...</div>;
    }

    const getRootRoute = () => {
        if (!user) {
            return <Route path="/" element={<MainContent />} />;
        }
        return user.role === 'admin'
            ? <Route path="/" element={<Main_adm/>} />
            : <Route path="/" element={<Prof />} />;
    };

    return (
        <BrowserRouter>
            <div className="container">
                <Header />
                <div className="content">
                    <Routes>
                        {getRootRoute()}
                        <Route path="/info" element={<AboutMe />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/registration" element={<Registration />} />
                        <Route path="/popular_books" element={<PopularBooks />} />
                        <Route path="/books_table" element={<Books />} />
                        <Route path="/books_info/:index" element={<BooksInfo />} />


                        {/* Только для авторизованных пользователей */}
                        <Route
                            path="/booking"
                            element={
                                <ProtectedRoute requireAuth={true}>
                                    <Booking />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/order"
                            element={
                                <ProtectedRoute requireAuth={true}>
                                    <Order />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/new_order"
                            element={
                                <ProtectedRoute requireAuth={true}>
                                    <New />
                                </ProtectedRoute>
                            }
                        />

                        {/* Только для админов */}
                        <Route
                            path="/authors_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Authors_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/books_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Books_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/bookings_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Bookings_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/comments_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Comments_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/orders_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Orders_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/reports_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Reports_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/users_admin"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Users_adm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/new_book"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <New_book />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/new_book/:index"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <New_book />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/new_author"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <New_author />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/new_author/:id"
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <New_author />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="*" element={<Error />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </BrowserRouter>
    );
}

export default App;

