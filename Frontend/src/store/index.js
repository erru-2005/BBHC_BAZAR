import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import dataReducer from './dataSlice'
import authReducer from './authSlice'
import sellerReducer from './sellerSlice'
import masterReducer from './masterSlice'
import outletReducer from './outletSlice'
import themeReducer from './themeSlice'

// Configure persist for auth reducer
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'isAuthenticated', 'userType'] // Only persist these fields
}

const themePersistConfig = {
  key: 'theme',
  storage
}

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer)
const persistedThemeReducer = persistReducer(themePersistConfig, themeReducer)

export const store = configureStore({
  reducer: {
    data: dataReducer,
    auth: persistedAuthReducer,
    seller: sellerReducer,
    master: masterReducer,
    outlet: outletReducer,
    theme: persistedThemeReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
})

export const persistor = persistStore(store)


