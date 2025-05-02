// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';



export const store = configureStore({
    reducer: {
        cart: cartReducer,
        wishlist: wishlistReducer,
        products: productsReducer,
        categories: categoriesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
