import { useEffect, useState, useMemo } from 'react';
import {Link, useSearchParams, useParams, useLocation, useNavigate} from 'react-router-dom';
import { getCategories } from '../../services/fetchCategories.ts';
import { CategoryInfo } from '../../types/categoryTypes.ts';
import { ProductInfo } from '../../types/productTypes';
import ProductItem from '../../components/ProductItem/ProductItem';
import s from './CategoryPage.module.css';
import CatalogFilters from '../../components/CatalogFilters/CatalogFilters';
import Loader from '../../components/Loader/Loader';
import { Breadcrumbs, Crumb } from '../../components/Breadcrumbs/Breadcrumbs.tsx';
import { fetchProductsByCategorySlug } from '../../services/fetchProductsByCategory';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { API_BASE_URL } from '../../config/api';
import {useTranslation} from "react-i18next";

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

const CategoryPage = () => {
    const { slug } = useParams();

    const { t, i18n } = useTranslation();
    const langPrefix = i18n.language === '' ? '/' : i18n.language === 'ru' ? '/ru' : '';
    const navigate = useNavigate();

    const location = useLocation();
    const currentUrl = `${window.location.origin}${location.pathname}`;

    const [seoData, setSeoData] = useState<any>(null);

    useEffect(() => {
        const fetchSeo = async () => {
            const lang = i18n.language === 'ua' || i18n.language === 'uk' ? '' : i18n.language;
            const url = `${API_BASE_URL}/category-seo?slug=${slug}${lang ? `&lang=${lang}` : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            setSeoData(data);
        };
        if (slug) fetchSeo();
    }, [slug, i18n.language]);

    const [products, setProducts] = useState<ProductInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<CategoryInfo | null>(null);
    const [subcategories, setSubcategories] = useState<CategoryInfo[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const [visibleCount, setVisibleCount] = useState(18);

    const [selectedSubcategory, setSelectedSubcategory] = useState(() => searchParams.get('subcat') || null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>(() => {
        const result: Record<string, string[]> = {};
        searchParams.forEach((value, key) => {
            if (key.startsWith('attr_')) {
                result[key.replace('attr_', '')] = value.split(',');
            }
        });
        return result;
    });
    const [priceRange, setPriceRange] = useState({
        min: parseFloat(searchParams.get('min') || '0'),
        max: parseFloat(searchParams.get('max') || '10000'),
    });
    const [sortOption, setSortOption] = useState(() => searchParams.get('sort') || 'default');

    const [categories, setCategories] = useState<CategoryInfo[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const lang = i18n.language === 'ua' ? 'uk' : i18n.language;
                const categoriesData = await getCategories(lang);
                setCategories(categoriesData);
                const current = slug ? categoriesData.find(cat => cat.slug === slug) || null : null;
                setCategory(current);
                const children = slug
                    ? categoriesData.filter(cat => cat.parent === current?.id && !['без категорії', 'без категории'].includes(cat.name.toLowerCase()))
                    : categoriesData.filter(cat => cat.parent === 0 && !['без категорії', 'без категории'].includes(cat.name.toLowerCase()));
                setSubcategories(children);
                const fetched = await fetchProductsByCategorySlug(slug || null, 1, lang);
                setProducts(fetched);
                setCurrentPage(1);
                setHasMore(fetched.length === 18);
                setVisibleCount(18);
            } catch (err) {
                console.error('❌ Помилка при завантаженні:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug, i18n.language]);

    useEffect(() => {
        if (!category?.translations) return;

        const newLang = i18n.language === 'ua' ? 'uk' : i18n.language;
        const translatedId = category.translations[newLang];

        if (!translatedId || category.id === translatedId) return;

        const fetchTranslatedCategory = async () => {
            try {
                // Запит через бекенд-проксі
                const response = await fetch(
                    `${API_BASE_URL}/products/categories/${translatedId}?lang=${newLang}`
                );
                const data = await response.json();
                const translatedCategory = Array.isArray(data) ? data[0] : data;

                if (translatedCategory?.slug) {
                    const langPrefix = newLang === 'ru' ? '/ru' : '';
                    const newUrl = `${langPrefix}/product-category/${translatedCategory.slug}`;
                    const currentPath = window.location.pathname.replace(/\/$/, '');
                    const targetPath = newUrl.replace(/\/$/, '');

                    if (currentPath !== targetPath) {
                        navigate(newUrl); // 🚀 SPA редірект
                    }
                }

            } catch (error) {
                console.error('Помилка при завантаженні перекладу категорії:', error);
            }
        };

        fetchTranslatedCategory();
    }, [i18n.language, category]);

    const filteredProducts = useMemo(() => {
        const catalogProducts = products.filter(p => !p.hiddenInCatalog);
        console.log('🔍 Filtering products:', {
            totalProducts: products.length,
            catalogProducts: catalogProducts.length,
            selectedSubcategory,
            selectedAttributes,
            priceRange
        });

        return catalogProducts.filter((product) => {
            if (selectedSubcategory) {
                const hasSubcategory = product.categories?.some(cat => cat.slug === selectedSubcategory);
                if (!hasSubcategory) {
                    return false;
                }
            }

            const hasActiveAttributes = Object.values(selectedAttributes).some(options => options.length > 0);
            if (hasActiveAttributes) {

                for (const [attrName, selectedOptions] of Object.entries(selectedAttributes)) {
                    if (!selectedOptions.length) continue;

                    if (attrName === 'Колір' || attrName === 'Цвет') {
                        const productColor = (product.productColor || product.colorName)?.toLowerCase().trim();
                        const hasSelectedColor = selectedOptions.some(selectedColor => 
                            selectedColor.toLowerCase().trim() === productColor
                        );
                        
                        if (!hasSelectedColor) {
                            console.log('❌ Товар не відповідає вибраному кольору:', {
                                productId: product.id,
                                productName: product.name,
                                productColor,
                                colorName: product.colorName,
                                selectedColors: selectedOptions
                            });
                            return false;
                        }
                    } else {
                        const productAttr = product.attributes.find(attr => attr.name === attrName);
                        if (!productAttr) {
                            console.log('❌ Атрибут не знайдено:', {
                                productId: product.id,
                                productName: product.name,
                                attrName
                            });
                            return false;
                        }

                        const hasOption = selectedOptions
                            .filter((opt: string): opt is string => typeof opt === 'string')
                            .some((opt: string) =>
                                productAttr.options.some(o => o.name === opt)
                            );

                        if (!hasOption) {
                            console.log('❌ Товар не відповідає вибраному атрибуту:', {
                                productId: product.id,
                                productName: product.name,
                                attrName,
                                selectedOptions,
                                productOptions: productAttr.options
                            });
                            return false;
                        }
                    }
                }
            }

            const price = parseFloat(product.price);
            if (price < priceRange.min || price > priceRange.max) {
                console.log('❌ Товар не відповідає діапазону цін:', {
                    productId: product.id,
                    productName: product.name,
                    price,
                    priceRange
                });
                return false;
            }

            return true;
        });
    }, [products, selectedSubcategory, selectedAttributes, priceRange]);


    const sortedProducts = useMemo(() => {
        let sorted = [...filteredProducts];
        console.log('🔍 Sorting products:', {
            beforeSort: filteredProducts.length,
            sortOption
        });
        if (sortOption === 'bestsellers') {
            sorted = sorted.filter(product => product.featured);
        }
        if (sortOption === 'new') {
            sorted = sorted.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
        }
        if (sortOption === 'sale') {
            sorted = sorted.filter(product => parseFloat(product.sale_price) < parseFloat(product.regular_price));
        }
        if (sortOption === 'price_asc') {
            sorted = sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        }
        if (sortOption === 'price_desc') {
            sorted = sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        }
        return sorted;
    }, [filteredProducts, sortOption]);

    const visibleProducts = useMemo(() => {
        return sortedProducts.slice(0, visibleCount);
    }, [sortedProducts, visibleCount]);

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const lang = i18n.language === 'ua' ? 'uk' : i18n.language;
            const newProducts = await fetchProductsByCategorySlug(slug || null, nextPage, lang);
            setProducts(prev => [...prev, ...newProducts]);
            setCurrentPage(nextPage);
            setHasMore(newProducts.length === 18);
            setVisibleCount(prev => prev + 18);
        } catch (err) {
            console.error('❌ Помилка при завантаженні додаткових товарів:', err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const allAttributes = useMemo(() => {
        const attributesMap: Record<string, Set<string>> = {};
        products.forEach((product) => {
            (product.attributes ?? []).forEach(({ name, options }) => {
                if (!attributesMap[name]) attributesMap[name] = new Set();
                options.forEach((opt) => attributesMap[name].add(opt.name));
            });
        });
        return Object.entries(attributesMap)
            .map(([name, options]) => ({
                name,
                slug: name.toLowerCase().replace(/\s+/g, '-'),
                options: Array.from(options),
            }))
            .filter(attr => attr.name !== 'Розмірна сітка' && attr.slug !== 'pa_rozmirna-sitka');
    }, [products]);

    const applyFilters = () => {
        const params: Record<string, string> = {};
        if (selectedSubcategory) params.subcat = selectedSubcategory;
        Object.entries(selectedAttributes).forEach(([attr, options]) => {
            if (options.length > 0) params[`attr_${attr}`] = options.join(',');
        });
        params.min = String(priceRange.min);
        params.max = String(priceRange.max);
        if (sortOption !== 'default') {
            params.sort = sortOption;
        }

        setSearchParams(params);
        if (isMobile) setIsFilterOpen(false);
    };

    const resetFilters = () => {
        setSelectedSubcategory(null);
        setSelectedAttributes({});
        setPriceRange({ min: 0, max: 10000 });
        setSearchParams({});
    };

    const handleSortChange = (option: string) => {
        setSortOption(option);
        setIsSortOpen(false);

        const params = new URLSearchParams(searchParams);
        if (option === 'default') {
            params.delete('sort');
        } else {
            params.set('sort', option);
        }
        setSearchParams(params);
    };

    const allAttributeColors = Array.from(new Set(
        products
            .filter(p => !!p.colorName)
            .map(p => ({
                id_variations: {
                    variation_id: p.variation_id,
                    variation_atribute_color: p.colorName,
                    variation_slug: p.slug,
                },
            }))
            .filter(c => c.id_variations.variation_atribute_color)
            .map(c => c.id_variations.variation_atribute_color)
    )).map(colorName => ({
        id_variations: {
            variation_id: 0,
            variation_atribute_color: colorName,
            variation_slug: '',
        },
    }));

    useEffect(() => {
        console.log('🔍 Load more button visibility:', {
            loading,
            currentPage,
            hasMore,
            shouldShow: !loading && hasMore,
            productsCount: products.length,
            visibleProductsCount: visibleProducts.length,
            visibleCount
        });
    }, [loading, currentPage, hasMore, products.length, visibleProducts.length, visibleCount]);

    // Breadcrumbs logic
    let crumbs: Crumb[] = [
        { label: 'Головна', url: `${langPrefix}/` },
    ];
    if (category) {
        if (category.parent && category.parent !== 0) {
            const parentCat = categories.find(cat => cat.id === category.parent);
            if (parentCat) {
                crumbs.push({ label: parentCat.name, url: `${langPrefix}/product-category/${parentCat.slug}` });
            }
        }
        crumbs.push({ label: category.name });
    } else {
        crumbs.push({ label: 'Каталог' });
    }

    return (
        <div className={s.categoryPage}>
            <HelmetProvider>
            <Helmet>
                <title>{category?.name}</title>
                <link rel="canonical" href={currentUrl} />

                {seoData?.og_title && <meta property="og:title" content={seoData.og_title} />}
                {seoData?.og_description && <meta property="og:description" content={seoData.og_description} />}
                <meta property="og:url" content={currentUrl} />

                {seoData?.og_locale && <meta property="og:locale" content={seoData.og_locale} />}
                {seoData?.og_type && <meta property="og:type" content={seoData.og_type} />}
                {seoData?.og_site_name && <meta property="og:site_name" content={seoData.og_site_name} />}
                {seoData?.twitter_card && <meta name="twitter:card" content={seoData.twitter_card} />}

                <meta
                    name="robots"
                    content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
                />
            </Helmet>
            </HelmetProvider>

            {category?.parent !== 0 ? (
                // 🔸 Банер для підкатегорії
                <div className={s.heroBannerSmall}>
                    <Breadcrumbs
                        variant="default"
                        crumbs={crumbs}
                    />
                    <h1 className={s.categoryTitleSmall}>{category?.name}</h1>
                </div>
            ) : (
                <div
                    className={s.heroBanner}
                    style={{ backgroundImage: `url(${category?.custom_category_image?.src || '/images/category-placeholder.jpg'})` }}
                >
                    <Breadcrumbs
                        variant="catalog"
                        crumbs={crumbs}
                    />
                    <h1 className={s.categoryTitle}>{category?.name || 'Каталог'}</h1>
                </div>
            )}

            <div className={s.container}>
                {subcategories.length > 0 && (
                    <div className={s.subcategories}>
                        {subcategories.map((subcategory) => (
                            <Link
                                to={`${langPrefix}/product-category/${subcategory.slug}`}
                                key={subcategory.id}
                                className={s.subcategoryCard}
                            >
                                <p className={s.subcategoryName}>{subcategory.name}</p>
                            </Link>
                        ))}
                    </div>
                )}

                <div className={s.contentWrapper}>
                    <div className={s.filtersTop}>
                        {isMobile && (
                            <button className={s.filterButton} onClick={() => setIsFilterOpen(true)}>
                                <svg width="23" height="20" viewBox="0 0 23 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.83333 15.625H13.1667V13.75H9.83333V15.625ZM4 4.375V6.25H19V4.375H4ZM6.5 10.9375H16.5V9.0625H6.5V10.9375Z" fill="black" />
                                </svg>
                                {t('title_filter')}
                            </button>
                        )}
                        {!isMobile && (
                            <div className={s.filtersHeader}>
                                <h3 className={s.titleFilter}>{t('title_filter')}</h3>
                            </div>
                        )}

                        <div className={`${s.sortWrapper} ${isSortOpen ? s.active : ''}`}>
                            <button className={s.sortButton} onClick={() => setIsSortOpen(prev => !prev)}>
                                {t('sort_heading')}
                                <span className={s.arrow}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="9" viewBox="0 0 16 9" fill="none">
                                      <path d="M2 2L8 8L14 2" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"/>
                                    </svg>
                                </span>
                            </button>

                            {isSortOpen && (
                                <div className={s.sortDropdown}>
                                    <button onClick={() => handleSortChange('bestsellers')}>{t('sort.bestsellers')}</button>
                                    <button onClick={() => handleSortChange('new')}>{t('sort.new')}</button>
                                    <button onClick={() => handleSortChange('sale')}>{t('sort.sale')}</button>
                                    <button onClick={() => handleSortChange('price_desc')}>{t('sort.price_desc')}</button>
                                    <button onClick={() => handleSortChange('price_asc')}>{t('sort.price_asc')}</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={s.productListWrapper}>
                        {!isMobile && (
                            <div className={s.sortingBar}>
                                <CatalogFilters
                                    subcategories={subcategories}
                                    allAttributes={allAttributes}
                                    attributeColor={allAttributeColors}
                                    priceRange={priceRange}
                                    selectedSubcategory={selectedSubcategory}
                                    selectedAttributes={selectedAttributes}
                                    onChangeSubcategory={setSelectedSubcategory}
                                    onChangeAttributes={setSelectedAttributes}
                                    onChangePrice={setPriceRange}
                                />
                                <div className={s.buttons}>
                                    <button onClick={applyFilters} className={s.applyBtn}>{t('filters.apply')}</button>
                                    <button onClick={resetFilters} className={s.resetBtn}>{t('filters.reset')}</button>
                                </div>
                            </div>
                        )}

                        <div className={s.wrapProducts}>
                            <div className={s.productGrid}>
                                {loading ? (
                                    <Loader />
                                ) : visibleProducts.length ? (
                                    visibleProducts.map((product, index) => (
                                        <ProductItem key={`${product.id}-${index}`} product={product} />
                                    ))
                                ) : (
                                    <p>Товари не знайдено.</p>
                                )}
                            </div>
                            {!loading && hasMore && (
                                <div className={s.loadMoreWrapper}>
                                    <button 
                                        className={s.loadMoreBtn} 
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? t('loading') : t('loadMore')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isMobile && isFilterOpen && (
                <div className={s.popupOverlay}>
                    <div className={s.popupContent}>
                        <div className={s.popupHeader}>
                            <h3>{t('title_filter')}</h3>
                            <button className={s.closeButton} onClick={() => setIsFilterOpen(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M1.26935 15.955L8.00046 9.22384L14.7316 15.955L15.9554 14.7311L9.2243 8L15.9554 1.26889L14.7316 0.0450475L8.00046 6.77616L1.26935 0.0450488L0.0455065 1.26889L6.77662 8L0.0455065 14.7311L1.26935 15.955Z" fill="#1A1A1A"/>
                                </svg>
                            </button>
                        </div>

                        <CatalogFilters
                            subcategories={subcategories}
                            allAttributes={allAttributes}
                            attributeColor={allAttributeColors}
                            priceRange={priceRange}
                            selectedSubcategory={selectedSubcategory}
                            selectedAttributes={selectedAttributes}
                            onChangeSubcategory={setSelectedSubcategory}
                            onChangeAttributes={setSelectedAttributes}
                            onChangePrice={setPriceRange}
                        />
                        <div className={s.popupButtons}>
                            <button onClick={applyFilters} className={s.applyBtn}>{t('filters.apply')}</button>
                            <button onClick={resetFilters} className={s.resetBtn}>{t('filters.reset')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
