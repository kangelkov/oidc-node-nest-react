import React from 'react';
import { createRoot } from 'react-dom/client';
import {
    createBrowserRouter,
    RouterProvider,
    Navigate,
    Outlet
} from 'react-router-dom';
import { AuthProvider, useAuth } from './modules/auth/AuthProvider';
import { Callback } from './modules/auth/Callback';
import { Home } from './modules/home/Home';
import { Todos } from './modules/todos/Todos';
import { ErrorBoundary } from './modules/common/ErrorBoundary';

function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function RootLayout() {
    // Providers that need router context live here
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Outlet />
            </AuthProvider>
        </ErrorBoundary>
    );
}

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            { path: '/', element: <Home /> },
            { path: '/callback', element: <Callback /> },
            {
                path: '/app',
                element: (
                    <RequireAuth>
                        <Todos />
                    </RequireAuth>
                )
            },
            { path: '*', element: <Navigate to="/" replace /> }
        ]
    }
]);

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
