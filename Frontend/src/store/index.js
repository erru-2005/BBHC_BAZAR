import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import dataReducer from './dataSlice'
import authReducer from './authSlice'
import sellerReducer from './sellerSlice'
import masterReducer from './masterSlice'
import outletReducer from './outletSlice'

// Configure persist for auth reducer
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'isAuthenticated', 'userType'] // Only persist these fields
}

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer)

export const store = configureStore({
  reducer: {
    data: dataReducer,
    auth: persistedAuthReducer,
    seller: sellerReducer,
    master: masterReducer,
    outlet: outletReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
})

export const persistor = persistStore(store)


