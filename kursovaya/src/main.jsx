import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from './components/store/store';
import App from './App';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')).render(
    <Provider store={store}>
        <App />
    </Provider>
);

