import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {useState, useEffect} from 'react';
import Header from './components/Header/Header';
import HeaderCheckout from './components/HeaderCheckout/HeaderCheckout'; // твій інший хедер для Checkout
import CartDrawer from './components/CartDrawer/CartDrawer.tsx';
import Footer from './components/Footer/Footer';
import HomePage from './Pages/HomePage/HomePage';
import CategoryPage from './Pages/CategoryPage/CategoryPage';
import ProductPage from './Pages/ProductPage/ProductPage';
import SalePage from './Pages/SalePage/SalePage.tsx';
import NewPage from './Pages/NewPage/NewPage.tsx';
import DeliveryPage from './Pages/DeliveryAndPaymentPage/DeliveryAndPaymentPage.tsx';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import CheckoutPage from './Pages/CheckoutPage/CheckoutPage';
import { OrderSuccesWrapper } from './Pages/SuccessPage/OrderSuccesWrapper';
import FaqPage from './Pages/FaqPage/FaqPage.tsx';
import PrivacyPolicyPage from './Pages/PrivacyPolicyPage/PrivacyPolicyPage.tsx';
import NotFoundPage from './components/NotFoundPage/NotFoundPage';
import { WP_API_URL } from './config/api';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import './assets/styles/reset.css';
import './assets/fonts/stylesheet.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import i18n from './i18n';
import DogovirOferty from './Pages/DogovirPage/DogovirPage.tsx';

export const lang = i18n.language === 'ua' ? 'ru' : i18n.language; // WPML використовує 'uk' для української


export interface SlideData {
    id: number;
    image: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
}
const Layout: React.FC = () => {

    const location = useLocation();

    const isCheckoutPage = location.pathname.includes('/checkout');


    const [slides, setSlides] = useState<SlideData[]>([]);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const lang = i18n.language === 'ua' || i18n.language === 'uk' ? '' : `?lang=${i18n.language}`;
                const response = await fetch(`${WP_API_URL}wp-json/wp/v2/banner${lang}`);
                const data = await response.json();

                const mappedSlides = data.map((item: any) => ({
                    id: item.id,
                    image: item.load_image_text_image,
                    title: item.input_title,
                    subtitle: item.input_description,
                    buttonText: item.input_btn_text,
                    buttonLink: item.input_btn_link,
                }));

                setSlides(mappedSlides);
            } catch (error) {
                console.error('Помилка при завантаженні слайдів:', error);
            }
        };

        fetchSlides();
    }, [i18n.language]); // 🟢 тільки ця залежність


    useEffect(() => {
        const lang = location.pathname.startsWith('/ru') ? 'ru' : 'ua';
        if (i18n.language !== lang) {
            i18n.changeLanguage(lang);
        }
    }, [location.pathname]);






    return (

        <div className="flex flex-col min-h-screen relative">

            <ToastContainer position="top-right" autoClose={3000} />


            {isCheckoutPage ? <HeaderCheckout /> : <Header />}




            <CartDrawer />

            <main className="flex-grow">
                <Routes>
                    <Route path="/*" element={<HomePage slides={slides} />} />
                    <Route path="/ru/*" element={<HomePage slides={slides} />} />
                    <Route path="/shop" element={<CategoryPage />} />
                    <Route path="/ru/shop" element={<CategoryPage />} />
                    <Route path="/product-category/:slug" element={<CategoryPage />} />
                    <Route path="/ru/product-category/:slug" element={<CategoryPage />} />

                    <Route path="/product/:slug/:colorSlug?" element={<ProductPage />} />
                    <Route path="/ru/product/:slug/:colorSlug?" element={<ProductPage />} />

                    <Route path="/sales" element={<SalePage />} />
                    <Route path="/ru/sales" element={<SalePage />} />
                    <Route path="/new" element={<NewPage />} />
                    <Route path="/ru/new" element={<NewPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/ru/checkout" element={<CheckoutPage />} />
                    <Route path="/checkout-success" element={<OrderSuccesWrapper />} />
                    <Route path="/ru/checkout-success" element={<OrderSuccesWrapper />} />
                    <Route path="/how-to-buy" element={<DeliveryPage />} />
                    <Route path="/ru/how-to-buy" element={<DeliveryPage />} />
                    <Route path="/faqs" element={<FaqPage />} />
                    <Route path="/ru/faqs" element={<FaqPage />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/ru/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/dogovir-oferty" element={<DogovirOferty />} />
                    <Route path="/ru/dogovir-oferty" element={<DogovirOferty />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <ScrollToTop />
            <Layout />
        </Router>
    );
};

export default App;
