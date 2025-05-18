import { createSlice } from '@reduxjs/toolkit'

const userSlice = createSlice({
  name: 'user',
  initialState: {
    data: null,
    tokenChecked: false
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.data = action.payload
    },
    logout: (state) => {
      state.data = null
    },
    setTokenChecked: (state) => {
      state.tokenChecked = true
    }
  }
})

export const { loginSuccess, logout, setTokenChecked } = userSlice.actions
export default userSlice.reducer
