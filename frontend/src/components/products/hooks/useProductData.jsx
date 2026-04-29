import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const useProductData = () => {
    const API_BASE = "http://localhost:3000/api";
    const API_PRODUCTS = `${API_BASE}/products`;
    const TOKEN_KEY = "accessToken";

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [errorProduct, setErrorProduct] = useState(null);
    const { logout } = useAuth();
    const authExpiredHandledRef = useRef(false);

    const handleUnauthorized = useCallback(async () => {
        if (authExpiredHandledRef.current) return;
        authExpiredHandledRef.current = true;
        await logout({ reason: "expired", callApi: false });
    }, [logout]);

    const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

    const buildHeaders = (withBody = false) => {
        const token = getAccessToken();
        const headers = {
            ...(withBody ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        return headers;
    };

    const extractApiPayload = (payload = {}) => {
        const data = payload?.data ?? null;
        return {
            data,
            message: payload?.message || "",
            errors: payload?.meta?.errors || [],
        };
    };

    const normalizeProduct = (apiProduct = {}) => ({
        id: apiProduct._id || apiProduct.id || "",
        name: apiProduct.name || "",
        description: apiProduct.description || "",
        price: apiProduct.price?.$numberDecimal ? Number(apiProduct.price.$numberDecimal) : Number(apiProduct.price) || 0,
        stock: Number(apiProduct.stock) || 0,
        // Keeping the mock frontend data structure fields
        category: apiProduct.category || "General",
        status: apiProduct.status || "stable",
        sku: apiProduct.sku || "N/A",
        supplier: apiProduct.supplier || "N/A"
    });

    const fetchProducts = async () => {
        setLoading(true);
        setErrorProduct(null);

        try {
            const token = getAccessToken();
            if (!token) {
                await handleUnauthorized();
                return;
            }

            const response = await fetch(API_PRODUCTS, {
                method: "GET",
                headers: buildHeaders(),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { data, message } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return;
                }
                throw new Error(message || "Error al obtener los productos");
            }

            const productList = Array.isArray(data) ? data.map(normalizeProduct) : [];
            setProducts(productList);
        } catch (error) {
            setProducts([]);
            setErrorProduct(error.message);
            toast.error(error.message || "Error al obtener los productos");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (formData) => {
        setLoading(true);
        setErrorProduct(null);

        try {
            const response = await fetch(API_PRODUCTS, {
                method: "POST",
                headers: buildHeaders(true),
                body: JSON.stringify(formData),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { message, errors } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return false;
                }
                const backendErrors = Array.isArray(errors) && errors.length > 0 ? `: ${errors.join(", ")}` : "";
                throw new Error((message || "Error al crear el producto") + backendErrors);
            }

            toast.success(message || "Producto creado exitosamente");
            await fetchProducts();
            return true;
        } catch (error) {
            setErrorProduct(error.message);
            toast.error(error.message || "Error al crear el producto");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async (formData, productId) => {
        if (!productId) {
            toast.error("No se encontró el producto a actualizar");
            return false;
        }

        setLoading(true);
        setErrorProduct(null);

        try {
            const response = await fetch(`${API_PRODUCTS}/${productId}`, {
                method: "PUT",
                headers: buildHeaders(true),
                body: JSON.stringify(formData),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { message, errors } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return false;
                }
                const backendErrors = Array.isArray(errors) && errors.length > 0 ? `: ${errors.join(", ")}` : "";
                throw new Error((message || "Error al actualizar el producto") + backendErrors);
            }

            toast.success(message || "Producto actualizado exitosamente");
            await fetchProducts();
            return true;
        } catch (error) {
            setErrorProduct(error.message);
            toast.error(error.message || "Error al actualizar el producto");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteProduct = async (productId) => {
        if (!productId) return false;

        setLoading(true);
        setErrorProduct(null);

        try {
            const response = await fetch(`${API_PRODUCTS}/${productId}`, {
                method: "DELETE",
                headers: buildHeaders(),
                credentials: "include",
            });

            const payload = await response.json().catch(() => ({}));
            const { message } = extractApiPayload(payload);

            if (!response.ok) {
                if (response.status === 401) {
                    await handleUnauthorized();
                    return false;
                }
                throw new Error(message || "Error al eliminar el producto");
            }

            toast.success(message || "Producto eliminado exitosamente");
            await fetchProducts();
            return true;
        } catch (error) {
            setErrorProduct(error.message);
            toast.error(error.message || "Error al eliminar el producto");
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    return {
        products,
        loading,
        errorProduct,
        fetchProducts,
        handleCreateSubmit,
        handleUpdateSubmit,
        deleteProduct,
    };
};

export default useProductData;
