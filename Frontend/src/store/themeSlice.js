import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isDarkMode: localStorage.getItem('theme') === 'dark'
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode
      localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light')
    },
    setDarkMode: (state, action) => {
      state.isDarkMode = action.payload
      localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light')
    }
  }
})

export const { toggleDarkMode, setDarkMode } = themeSlice.actions
export default themeSlice.reducer
