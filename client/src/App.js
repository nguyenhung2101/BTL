import React, { useState, useEffect, useMemo } from 'react';

// Import các màn hình và component
import { ROLES, roleToRoutes } from './utils/constants';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { UnauthorizedScreen } from './components/UnauthorizedScreen';

import { LoginScreen } from './pages/LoginScreen'; 
import { GatewayScreen } from './pages/GatewayScreen'; 
import { DashboardScreen } from './pages/DashboardScreen';
import { ProductsScreen } from './pages/ProductsScreen';
import { CustomersScreen } from './pages/CustomersScreen';
import { OrdersScreen } from './pages/OrdersScreen';
import StockInScreen from './pages/StockInScreen';
import { UsersScreen } from './pages/UsersScreen';
import { EmployeesScreen } from './pages/EmployeesScreen'; 
import { SalariesScreen } from './pages/SalariesScreen';
import { ChangePasswordScreen } from './pages/ChangePasswordScreen';
import { ResetPasswordScreen } from './pages/ResetPasswordScreen';
import { ShopScreen } from './pages/ShopScreen';
import { AboutScreen } from './pages/AboutScreen';
import { ContactScreen } from './pages/ContactScreen';
import ProductDetail from "./pages/ProductDetail";
import { ProfileScreen } from './pages/ProfileScreen';
// Component Chứa Nội dung chính
const AppContent = ({ path, setPath, currentUser, userRoleName }) => {
    
    const isAuthorized = useMemo(() => {
        // --- 2. CẬP NHẬT: Thêm /about và /contact vào danh sách cho phép ---
        const publicRoutes = ['/shop', '/publicshop', '/login', '/', '/change-password', '/about', '/contact','/profile'];
        
        if (publicRoutes.includes(path)) return true;
        if (userRoleName === ROLES.OWNER.name) return true;
        
        const allowedRoutes = roleToRoutes[userRoleName];
        if (!allowedRoutes) return false; 
        
        const isAllowed = allowedRoutes.some(route => route.path === path || route.path === '/profile');
        if (isAllowed) return true;
        
        return path === '/unauthorized'; 
    }, [path, userRoleName]);

    useEffect(() => {
        if (userRoleName === 'Customer' && path !== '/shop' && path !== '/profile' && path !== '/change-password') {
            setPath('/shop'); return;
        }
        if (userRoleName && !isAuthorized && path !== '/unauthorized') {
            setPath('/unauthorized');
        }
    }, [isAuthorized, userRoleName, path, setPath]);

    switch (path) {
        case '/dashboard': return <DashboardScreen />;
        case '/products': return <ProductsScreen userRoleName={userRoleName} />;
        case '/customers': return <CustomersScreen userRoleName={userRoleName} />;
        case '/orders': return <OrdersScreen currentUserId={currentUser?.id} userRoleName={userRoleName} />;
        case '/stockin': return <StockInScreen userRoleName={userRoleName} />;
        case '/users': return <UsersScreen currentUser={currentUser} />;
        case '/employees': return <EmployeesScreen />; 
        case '/salaries': return <SalariesScreen userRoleName={userRoleName} />;
        
        case '/unauthorized': return <UnauthorizedScreen setPath={setPath} />;
        case '/about': return <AboutScreen setPath={setPath} />;
        case '/contact': return <ContactScreen setPath={setPath} />;
        case '/profile': return <ProfileScreen currentUser={currentUser} setPath={setPath} />;

        default: return null;
    }
};

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRoleName, setUserRoleName] = useState(null);
    const [path, setPath] = useState('/'); 
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // --- Khởi tạo trạng thái từ localStorage nếu có (không xóa tự động) ---
    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const userJson = localStorage.getItem('user');
        if (token && userJson) {
            try {
                const u = JSON.parse(userJson);
                setIsLoggedIn(true);
                setCurrentUser(u);
                setUserRoleName(u.roleName || u.role || null);
            } catch (e) {
                console.warn('Failed to parse stored user, clearing corrupted data');
                localStorage.removeItem('user');
                localStorage.removeItem('jwt_token');
            }
        }
        // leave path as-is (Gateway or last route handled elsewhere)
        setIsCheckingAuth(false);
    }, []);

    // Developer helper: auto-login in development for faster UI testing
    // Enabled only when REACT_APP_DEV_AUTO_LOGIN === 'true' and no existing token is present
    useEffect(() => {
        try {
            const enabled = process.env.REACT_APP_DEV_AUTO_LOGIN === 'true';
            const hasToken = !!localStorage.getItem('jwt_token');
            if (process.env.NODE_ENV === 'development' && enabled && !hasToken) {
                const devUser = { id: 'dev', fullName: 'Developer', roleName: 'Owner' };
                setIsLoggedIn(true);
                setCurrentUser(devUser);
                setUserRoleName(devUser.roleName);
                localStorage.setItem('jwt_token', 'dev-token');
                localStorage.setItem('user', JSON.stringify(devUser));
                console.info('Dev auto-login applied (REACT_APP_DEV_AUTO_LOGIN=true)');
            }
        } catch (e) {
            console.warn('Dev auto-login check failed', e);
        }
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setUserRoleName(null);
        setCurrentUser(null);
        setPath('/login'); 
    };

    const setUser = (user) => {
        const normalizedUser = {
            ...user,
            id: user.userId || user.id, 
            fullName: user.fullName || user.username || "User" 
        };

        setCurrentUser(normalizedUser);
        setUserRoleName(normalizedUser.roleName);
        
        if(user.token) localStorage.setItem('jwt_token', user.token);
        localStorage.setItem('user_id', normalizedUser.id);
        localStorage.setItem('user_role_name', normalizedUser.roleName);
        localStorage.setItem('user', JSON.stringify(normalizedUser)); 
    };

    if (isCheckingAuth) return <div className="flex h-screen items-center justify-center">Đang khởi tạo hệ thống...</div>;

    // --- 3. CÁC TRANG CÔNG KHAI (RENDER TRƯỚC KHI CHECK LOGIN) ---

    // Gateway
    if (path === '/') return <GatewayScreen setPath={setPath} />;

    // About Us (Mới)
    if (path === '/about') return <AboutScreen setPath={setPath} />;

    // Contact (Mới)
    if (path === '/contact') return <ContactScreen setPath={setPath} />;

    // Login
    if (path === '/login') {
        if (isLoggedIn) {
             const defaultPath = userRoleName === 'Customer' ? '/shop' : '/dashboard';
             setPath(defaultPath); return null;
        }
        return <LoginScreen setPath={setPath} setUser={setUser} setIsLoggedIn={setIsLoggedIn} />;
    }
      // PRODUCT DETAIL (public)
    if (path.startsWith('/product/')) {
        const id = decodeURIComponent(path.replace('/product/', '').trim());
        console.log('App.js - Product detail route, ID:', id);
        return (
            <ProductDetail
                setPath={setPath}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                productId={id}
            />
        );
    }

    if (path === "/shop") {
        return (
            <ShopScreen
                setPath={setPath}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
            />
        );
    }

    // Shop
    if (path === '/shop') {
        if (!isLoggedIn || userRoleName === 'Customer') {
            return <ShopScreen setPath={setPath} isLoggedIn={isLoggedIn} currentUser={currentUser} onLogout={handleLogout} />;
        }
    }

    // --- KIỂM TRA ĐĂNG NHẬP (BẮT BUỘC) ---
    if (!isLoggedIn) { setPath('/'); return null; }

        // Reset Password (enforce only when REACT_APP_REQUIRE_PASSWORD_CHANGE === 'true')
        const requirePwChange = process.env.REACT_APP_REQUIRE_PASSWORD_CHANGE === 'true';
        if (requirePwChange && currentUser && currentUser.mustChangePassword && path !== '/reset-password') {
            setPath('/reset-password');
            return <ResetPasswordScreen currentUser={currentUser} setPath={setPath} />;
        }
    
    // Routes khác
    if (path === '/change-password') return <ChangePasswordScreen currentUser={currentUser} setPath={setPath} />;
    if (path === '/reset-password') return <ResetPasswordScreen currentUser={currentUser} setPath={setPath} />;

    // 7. GIAO DIỆN QUẢN TRỊ
    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            <Sidebar currentPath={path} setPath={setPath} userRoleName={userRoleName} />
            <div className="flex-1 md:ml-64 flex flex-col">
                <Navbar currentUser={currentUser} handleLogout={handleLogout} setPath={setPath} />
                <main className="flex-1 overflow-y-auto p-4">
                    <AppContent path={path} setPath={setPath} currentUser={currentUser} userRoleName={userRoleName} />
                </main>
            </div>
        </div>
    );
}