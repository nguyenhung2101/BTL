import React, { useState, useEffect, useMemo, useCallback } from 'react';

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
import { OrderCreateScreen } from './pages/OrderCreateScreen';
import { OrderEditScreen } from './pages/OrderEditScreen';
import CheckoutScreen from './pages/CheckoutScreen';

// Component Chứa Nội dung chính
const AppContent = ({ path, setPath, currentUser, userRoleName, onRefreshUser,refreshKey }) => {
    
const isAuthorized = useMemo(() => {
        // 1. Các trang công khai (Giữ nguyên)
        const publicRoutes = ['/shop', '/publicshop', '/login', '/', '/change-password', '/about', '/contact', '/profile'];
        
        if (publicRoutes.includes(path)) return true;
        if (userRoleName === ROLES.OWNER.name) return true;
        
        const allowedRoutes = roleToRoutes[userRoleName];
        if (!allowedRoutes) return false; 
        
        // --- ĐOẠN ĐÃ SỬA ---
        const isAllowed = allowedRoutes.some(route => {
            // Trường hợp 1: Trùng khớp hoàn toàn (VD: vào /orders)
            if (route.path === path) return true;

            // Trường hợp 2: Là trang con (VD: Cho phép /orders thì vào được /orders/create)
            // Logic: Đường dẫn hiện tại bắt đầu bằng "route gốc" + dấu "/"
            if (route.path !== '/' && path.startsWith(route.path + '/')) {
                return true;
            }

            // Trường hợp 3: Profile (Giữ lại logic cũ của bạn cho chắc chắn)
            if (route.path === '/profile') return true;

            return false;
        });
        // -------------------

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
        case '/products': return <ProductsScreen userRoleName={userRoleName} setPath={setPath} />; // Cần setPath nếu có nút Tạo/Sửa SP
        case '/customers': return <CustomersScreen key={refreshKey} userRoleName={userRoleName} setPath={setPath} />; // Cần setPath
        // 💡 ĐIỂM SỬA CHÍNH: BỔ SUNG setPath cho OrdersScreen
        case '/orders': 
            return <OrdersScreen 
                currentUserId={currentUser?.id} 
                userRoleName={userRoleName} 
                setPath={setPath} // <<< BỔ SUNG setPath
            />;
        case '/stockin': return <StockInScreen userRoleName={userRoleName} setPath={setPath} />; // Cần setPath
        case '/users': return <UsersScreen key={refreshKey} currentUser={currentUser} setPath={setPath} />; // Cần setPath
        case '/employees': return <EmployeesScreen key={refreshKey} setPath={setPath} />; // Cần setPath
        case '/salaries': return <SalariesScreen userRoleName={userRoleName} setPath={setPath} />; // Cần setPath
        
        case '/unauthorized': return <UnauthorizedScreen setPath={setPath} />;
        case '/about': return <AboutScreen setPath={setPath} />;
        case '/contact': return <ContactScreen setPath={setPath} />;
        case '/profile': 
            return <ProfileScreen currentUser={currentUser} setPath={setPath} onRefreshUser={onRefreshUser} />;

        default: 
        // [CẢNH BÁO] Nếu path là /orders/create hoặc /orders/edit/XXX, nó sẽ rơi vào đây (default).
        // Cần thêm các case cho các route con!
        
        // --- BỔ SUNG: Xử lý các route con của Đơn hàng ---
           if (path.startsWith('/orders/create')) {
               return <OrderCreateScreen currentUser={currentUser} setPath={setPath} />;
           }
           if (path.startsWith('/orders/')) {
               const parts = path.split('/');
               const orderId = parts[2]; // /orders/{id}/edit
               if (parts.length === 4 && parts[3] === 'edit') {
                  return <OrderEditScreen orderId={orderId} currentUser={currentUser} setPath={setPath} />;
               }
           }
           if (path === '/checkout') {
               return <CheckoutScreen setPath={setPath} isLoggedIn={!!currentUser} currentUser={currentUser} />;
           }
    }
};

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRoleName, setUserRoleName] = useState(null);
    const [path, setPathState] = useState('/'); 
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Hàm điều hướng ghi vào history để hỗ trợ Back/Forward
    const navigate = useCallback((newPath, { replace = false } = {}) => {
        if (!newPath) return;
        const url = newPath.startsWith('/') ? newPath : `/${newPath}`;
        if (replace) {
            window.history.replaceState({ path: url }, '', url);
        } else {
            window.history.pushState({ path: url }, '', url);
        }
        setPathState(url);
    }, []);

    // Cho phép dùng setPath như trước nhưng có ghi history
    const setPath = navigate;

    // Khởi tạo path theo URL hiện tại, lắng nghe Back/Forward, đồng thời phục hồi user từ localStorage
    useEffect(() => {
        const initialPath = window.location.pathname || '/';
        setPathState(initialPath);

        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setCurrentUser(parsed);
                setUserRoleName(parsed.roleName || parsed.role_name || null);
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
            }
        } catch (err) {
            console.error('Failed to load stored user:', err);
            setIsLoggedIn(false);
        } finally {
            setIsCheckingAuth(false);
        }

        const onPopState = (e) => {
            const nextPath = (e.state && e.state.path) || window.location.pathname || '/';
            setPathState(nextPath);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
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
            user_id: user.userId || user.id,
            userId: user.userId || user.id,
            fullName: user.fullName || user.username || "User"
        };

        setCurrentUser(normalizedUser);
        setUserRoleName(normalizedUser.roleName || normalizedUser.role_name);
        
        if (user.token) localStorage.setItem('jwt_token', user.token);
        localStorage.setItem('user_id', normalizedUser.id);
        localStorage.setItem('user_role_name', normalizedUser.roleName || normalizedUser.role_name);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
    };
    const handleRefreshUser = () => {
        console.log("Refreshing user data from LocalStorage...");
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Cập nhật lại State để Navbar hiển thị tên mới
                setCurrentUser(parsedUser);
                // Cập nhật lại Role (phòng trường hợp Role cũng đổi)
                setUserRoleName(parsedUser.roleName || parsedUser.role_name);
                setRefreshKey(prev => prev + 1);
            } catch (error) {
                console.error("Lỗi parse user data:", error);
            }
        }
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
        const id = path.replace('/product/', '');
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

    if (path === '/checkout') {
        if (!isLoggedIn) { setPath('/login'); return null; }
        return <CheckoutScreen setPath={setPath} isLoggedIn={isLoggedIn} currentUser={currentUser} />;
    }

    // Shop
    if (path === '/shop') {
        if (!isLoggedIn || userRoleName === 'Customer') {
            return <ShopScreen setPath={setPath} isLoggedIn={isLoggedIn} currentUser={currentUser} onLogout={handleLogout} />;
        }
    }

    // --- KIỂM TRA ĐĂNG NHẬP (BẮT BUỘC) ---
    if (!isLoggedIn) { setPath('/'); return null; }

    // Reset Password
    if (currentUser && currentUser.mustChangePassword && path !== '/reset-password') {
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
                    <AppContent path={path} setPath={setPath} currentUser={currentUser} userRoleName={userRoleName} onRefreshUser={handleRefreshUser} refreshKey={refreshKey}/>
                </main>
            </div>
        </div>
    );
}