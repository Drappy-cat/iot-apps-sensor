import { createBrowserRouter, Navigate } from "react-router";
import { SplashScreen } from "./screens/SplashScreen";
import { RouteErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: "/login",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { LoginScreen } = await import("./screens/LoginScreen");
      return { Component: LoginScreen };
    },
  },
  {
    path: "/register",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { RegisterScreen } = await import("./screens/RegisterScreen");
      return { Component: RegisterScreen };
    },
  },
  {
    path: "/forgot-password",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { ForgotPasswordScreen } = await import("./screens/ForgotPasswordScreen");
      return { Component: ForgotPasswordScreen };
    },
  },
  {
    path: "/dashboard",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { DashboardScreen } = await import("./screens/DashboardScreen");
      return { Component: DashboardScreen };
    },
  },
  {
    path: "/analytics",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { AnalyticsScreen } = await import("./screens/AnalyticsScreen");
      return { Component: AnalyticsScreen };
    },
  },
  {
    path: "/schedule",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { ScheduleScreen } = await import("./screens/ScheduleScreen");
      return { Component: ScheduleScreen };
    },
  },
  {
    path: "/settings",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { SettingsScreen } = await import("./screens/SettingsScreen");
      return { Component: SettingsScreen };
    },
  },
  {
    path: "/notifications",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { NotificationScreen } = await import("./screens/NotificationScreen");
      return { Component: NotificationScreen };
    },
  },
  {
    path: "/offline",
    ErrorBoundary: RouteErrorBoundary,
    lazy: async () => {
      const { OfflineMonitoringScreen } = await import("./screens/OfflineMonitoringScreen");
      return { Component: OfflineMonitoringScreen };
    },
  },
  {
    path: "*",
    ErrorBoundary: RouteErrorBoundary,
    Component: () => <Navigate to="/dashboard" replace />,
  },
]);