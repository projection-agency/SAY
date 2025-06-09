require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { formidable } = require('formidable');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Проксі ендпоінт для WooCommerce API - Products
app.get('/api/products', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.API_URL}/products`, {
            params: {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_SECRET,
                ...req.query
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Проксі ендпоінт для WooCommerce API - Single Product
app.get('/api/products/:id', async (req, res) => {
    try {
        const { lang } = req.query;
        const response = await axios.get(`${process.env.API_URL}/products/${req.params.id}`, {
            params: {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_SECRET,
                ...(lang ? { lang } : {}),
                ...req.query
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching single product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Проксі ендпоінт для WooCommerce API - Product Variations
app.get('/api/products/:id/variations', async (req, res) => {
    try {
        console.log('🔍 Fetching variations for product ID:', req.params.id);
        const { lang } = req.query;
        const response = await axios.get(`${process.env.API_URL}/products/${req.params.id}/variations`, {
            params: {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_SECRET,
                ...(lang ? { lang } : {}),
                ...req.query
            }
        });
        console.log('📦 WooCommerce API response:', {
            status: response.status,
            dataLength: Array.isArray(response.data) ? response.data.length : 'not an array',
            data: response.data
        });
        res.json(response.data);
    } catch (error) {
        console.error('❌ Error fetching product variations:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        res.status(500).json({ error: 'Failed to fetch variations' });
    }
});

// Отримати всі категорії
app.get('/api/products/categories', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.API_URL}/products/categories`, {
            params: {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_SECRET,
                ...req.query
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Отримати одну категорію за id
app.get('/api/products/categories/:id', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.API_URL}/products/categories/${req.params.id}`, {
            auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET
            },
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching category by id:', error);
        res.status(500).json({ error: 'Failed to fetch category by id' });
    }
});

// Проксі ендпоінт для WordPress API - Menu
app.get('/api/menu', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.WP_API_URL}/wp-json/menus/v1/menus/main-menu`, {
            params: req.query
        });
        res.json(response.data.items);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// Проксі ендпоінт для WordPress API - Banner
app.get('/api/banner', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.WP_API_URL}/wp-json/wp/v2/banner`, {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching banner:', error);
        res.status(500).json({ error: 'Failed to fetch banner' });
    }
});

// Проксі ендпоінт для WooCommerce API - Product by Slug
app.get('/api/products/slug/:slug', async (req, res) => {
    try {
        const { lang } = req.query;
        const response = await axios.get(`${process.env.API_URL}/products`, {
            params: {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_SECRET,
                slug: req.params.slug,
                ...(lang ? { lang } : {})
            }
        });
        res.json(response.data[0] || null);
    } catch (error) {
        console.error('Error fetching product by slug:', error);
        res.status(500).json({ error: 'Failed to fetch product by slug' });
    }
});

// Проксі ендпоінт для WordPress API - Page SEO
app.get('/api/page-seo', async (req, res) => {
    try {
        const { slug, lang } = req.query;
        const url = `${process.env.WP_API_URL}/wp-json/wp/v2/pages?slug=${slug}${lang ? `&lang=${lang}` : ''}`;
        console.log('SEO request URL:', url);
        const response = await axios.get(url);
        console.log('SEO API response:', response.data);
        if (!response.data || !response.data[0]) {
            console.log('No page found for slug:', slug);
            return res.status(404).json({ error: 'Page not found' });
        }
        if (!response.data[0].yoast_head_json) {
            console.log('No yoast_head_json for page:', response.data[0]);
            return res.status(404).json({ error: 'No SEO data' });
        }
        res.json(response.data[0].yoast_head_json);
    } catch (error) {
        console.error('Error fetching page SEO:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        res.status(500).json({ error: 'Failed to fetch page SEO' });
    }
});

// Проксі ендпоінт для WordPress API - FAQ
app.get('/api/faqs', async (req, res) => {
    try {
        const { lang } = req.query;
        const url = `${process.env.WP_API_URL}/wp-json/wp/v2/faq${lang ? `?lang=${lang}` : ''}`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching FAQs:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch FAQs' });
    }
});

// Проксі ендпоінт для WordPress API - Privacy Policy
app.get('/api/privacy-policy', async (req, res) => {
    try {
        const { lang } = req.query;
        const url = `${process.env.WP_API_URL}/wp-json/wp/v2/privacy-policy${lang ? `&lang=${lang}` : ''}`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching privacy policy:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch privacy policy' });
    }
});

// Проксі ендпоінт для SEO категорії WooCommerce
app.get('/api/category-seo', async (req, res) => {
    try {
        const { slug, lang } = req.query;
        if (!slug) {
            return res.status(400).json({ error: 'Category slug is required' });
        }
        let url = `${process.env.WP_API_URL}/wp-json/wp/v2/product_cat?slug=${slug}`;
        if (lang) url += `&lang=${lang}`;
        const response = await axios.get(url);
        res.json(response.data[0]?.yoast_head_json || {});
    } catch (error) {
        console.error('Error fetching category SEO:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch category SEO' });
    }
});

// Проксі для способів доставки
app.get('/api/shipping-methods', async (req, res) => {
    try {
        const response = await axios.get(
            `${process.env.WP_API_URL}/wp-json/wc/v3/shipping/zones/1/methods`,
            {
                auth: {
                    username: process.env.CONSUMER_KEY,
                    password: process.env.CONSUMER_SECRET,
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching shipping methods:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch shipping methods' });
    }
});

// Проксі для способів оплати
app.get('/api/payment-methods', async (req, res) => {
    try {
        const response = await axios.get(
            `${process.env.WP_API_URL}/wp-json/wc/v3/payment_gateways`,
            {
                auth: {
                    username: process.env.CONSUMER_KEY,
                    password: process.env.CONSUMER_SECRET,
                },
            }
        );
        // Фільтруємо тільки enabled
        const enabledMethods = Array.isArray(response.data)
            ? response.data.filter(method => method.enabled)
            : [];
        res.json(enabledMethods);
    } catch (error) {
        console.error('Error fetching payment methods:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
});

// Проксі для складів Нової Пошти
app.get('/api/np-warehouses', async (req, res) => {
    try {
        const response = await axios.get(
            `${process.env.WP_API_URL}/wp-json/responses/v1/np_warehouses`,
            {
                auth: {
                    username: process.env.CONSUMER_KEY,
                    password: process.env.CONSUMER_SECRET,
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching NP warehouses:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch NP warehouses' });
    }
});

// Проксі для купонів WooCommerce
app.get('/api/coupons', async (req, res) => {
    try {
        const { code } = req.query;
        const url = `${process.env.WP_API_URL}/wp-json/wc/v3/coupons${code ? `?code=${encodeURIComponent(code)}` : ''}`;
        const response = await axios.get(url, {
            auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET,
            },
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching coupons:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// Додаткові ендпоінти для інших WooCommerce запитів можна додати тут

app.post('/api/subscribe-email', async (req, res) => {
    try {
        const { email } = req.body;
        const response = await axios.post(
            `${process.env.WP_API_URL}/wp-json/responses/v1/save-email`,
            { email },
            {
                auth: {
                    username: process.env.CONSUMER_KEY,
                    password: process.env.CONSUMER_SECRET,
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error subscribing email:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to subscribe email' });
    }
});

app.post('/api/add-review', (req, res) => {
    const form = formidable({ 
        multiples: true,
        keepExtensions: true,
        uploadDir: '/tmp'
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('❌ Formidable error:', err);
            return res.status(400).json({ error: 'Invalid form data' });
        }

        try {
            console.log('📝 Received review data:', { 
                fields: JSON.stringify(fields, null, 2),
                files: JSON.stringify(files, null, 2)
            });
            
            const formData = new FormData();
            
            // Add text fields
            for (const [key, value] of Object.entries(fields)) {
                const realValue = Array.isArray(value) ? value[0] : value;
                formData.append(key, realValue);
                console.log(`📎 Added field: ${key} = ${realValue}`);
            }

            // Handle media files
            if (files['media[]']) {
                const mediaFiles = Array.isArray(files['media[]']) ? files['media[]'] : [files['media[]']];
                console.log('📎 Processing media files:', mediaFiles.map(f => ({
                    name: f.originalFilename,
                    type: f.mimetype,
                    size: f.size
                })));
                
                mediaFiles.forEach((file, idx) => {
                    if (!file.filepath) {
                        console.error('❌ No filepath for file:', file);
                        return;
                    }
                    try {
                        const fileStream = fs.createReadStream(file.filepath);
                        formData.append(`media_${idx + 1}`, fileStream, {
                            filename: file.originalFilename,
                            contentType: file.mimetype || 'application/octet-stream'
                        });
                        console.log(`✅ Added file to formData: media_${idx + 1} (${file.originalFilename})`);
                    } catch (fileError) {
                        console.error(`❌ Error processing file ${file.originalFilename}:`, fileError);
                    }
                });
            }

            console.log('🚀 Sending request to WordPress API...');
            const response = await axios.post(
                `${process.env.WP_API_URL}/wp-json/responses/v1/add-review`,
                formData,
                {
                    auth: {
                        username: process.env.CONSUMER_KEY,
                        password: process.env.CONSUMER_SECRET,
                    },
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
            
            console.log('✅ Review added successfully:', response.data);
            res.json(response.data);
        } catch (error) {
            console.error('❌ Error adding review:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            res.status(500).json({ 
                error: 'Failed to add review',
                details: error.response?.data || error.message
            });
        }
    });
});


// Проксі ендпоінт для WordPress API - Reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const { product } = req.query;
        if (!product) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        const url = `${process.env.WP_API_URL}/wp-json/wc/v3/products/reviews?product=${product}`;
        const response = await axios.get(url, {
            auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching reviews:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Проксі для створення замовлення WooCommerce
app.post('/api/orders', async (req, res) => {
    try {
        const response = await axios.post(
            `${process.env.WP_API_URL}/wp-json/wc/v3/orders`,
            req.body,
            {
                auth: {
                    username: process.env.CONSUMER_KEY,
                    password: process.env.CONSUMER_SECRET,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error creating order:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to create order', details: error?.response?.data || error.message });
    }
});

// Проксі для оплати (Plata)
app.post('/api/pay', async (req, res) => {
    try {
        const response = await axios.post(
            `${process.env.WP_API_URL}/wp-json/plata/v1/pay`,
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                auth: {
                    username: process.env.CONSUMER_KEY,
                    password: process.env.CONSUMER_SECRET,
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error processing payment:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to process payment', details: error?.response?.data || error.message });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 