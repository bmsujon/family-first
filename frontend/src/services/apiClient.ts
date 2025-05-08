import axios from 'axios';

// Base URL for the API
const API_BASE_URL = '/api/v1'; // Assuming proxy or Nginx handles routing

const apiClient = axios.create({
    baseURL: API_BASE_URL, // Restore baseURL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the auth token
apiClient.interceptors.request.use(
    (config) => {
        console.log('[Interceptor] Running for request:', config.url);
        let token: string | null = null;
        const storedToken = localStorage.getItem('userToken');
        console.log('[Interceptor] Raw storedToken:', storedToken);

        if (storedToken) {
            try {
                token = JSON.parse(storedToken);
                console.log('[Interceptor] Parsed token:', token);
                // Validate that the parsed token is actually a non-empty string
                if (typeof token !== 'string' || token.trim() === '') {
                    console.warn('[Interceptor] Invalid token format after parse. Clearing.');
                    token = null;
                    localStorage.removeItem('userToken');
                } else {
                    console.log('[Interceptor] Token is valid string.');
                }
            } catch (e) {
                console.error("[Interceptor] Failed to parse userToken from localStorage. Clearing.", e);
                token = null;
                localStorage.removeItem('userToken');
            }
        } else {
             console.log('[Interceptor] No token found in localStorage.');
             token = null;
        }

        // Attach valid token to headers
        if (token && config.headers) {
            console.log('[Interceptor] Attaching token to header.');
            config.headers['Authorization'] = `Bearer ${token}`;
        } else if (config.headers?.Authorization) {
             console.log('[Interceptor] No valid token found, ensuring Authorization header is removed.');
             delete config.headers.Authorization;
        } else {
            console.log('[Interceptor] No valid token found, no Authorization header to remove.');
        }
        
        console.log('[Interceptor] Exiting successfully.');
        return config;
    },
    (error) => {
        // This logs errors if the promise setup somehow fails
        console.error('[Interceptor] Error in request interceptor setup:', error);
        return Promise.reject(error);
    }
);

// Optional: Add response interceptor for global error handling (e.g., 401 redirects)
// apiClient.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.response && error.response.status === 401) {
//             // Handle unauthorized access, e.g., clear token, redirect to login
//             localStorage.removeItem('userToken');
//             // Dispatch logout action or directly navigate
//             // window.location.href = '/login'; 
//             console.error("Unauthorized access - 401");
//         }
//         return Promise.reject(error);
//     }
// );

export default apiClient; 