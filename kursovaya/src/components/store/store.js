import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'

const saveToLocalStorage = (state) => {
  try {
    localStorage.setItem('user', JSON.stringify(state.user))
  } catch {}
}

const loadFromLocalStorage = () => {
  try {
    const data = localStorage.getItem('user')
    if (!data) return undefined
    return { user: JSON.parse(data) }
  } catch {
    return undefined
  }
}

const store = configureStore({
  reducer: {
    user: userReducer
  },
  preloadedState: loadFromLocalStorage()
})

store.subscribe(() => saveToLocalStorage(store.getState()))

export default store
