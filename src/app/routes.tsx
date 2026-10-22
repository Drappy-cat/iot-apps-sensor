import { createBrowserRouter } from "react-router";
import { SplashScreen } from "./screens/SplashScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/login",
    lazy: async () => {
      const { LoginScreen } = await import("./screens/LoginScreen");
      return { Component: LoginScreen };
    },
  },
  {
    path: "/register",
    lazy: async () => {
      const { RegisterScreen } = await import("./screens/RegisterScreen");
      return { Component: RegisterScreen };
    },
  },
  {
    path: "/forgot-password",
    lazy: async () => {
      const { ForgotPasswordScreen } = await import("./screens/ForgotPasswordScreen");
      return { Component: ForgotPasswordScreen };
    },
  },
  {
    path: "/dashboard",
    lazy: async () => {
      const { DashboardScreen } = await import("./screens/DashboardScreen");
      return { Component: DashboardScreen };
    },
  },
  {
    path: "/analytics",
    lazy: async () => {
      const { AnalyticsScreen } = await import("./screens/AnalyticsScreen");
      return { Component: AnalyticsScreen };
    },
  },
  {
    path: "/schedule",
    lazy: async () => {
      const { ScheduleScreen } = await import("./screens/ScheduleScreen");
      return { Component: ScheduleScreen };
    },
  },
  {
    path: "/settings",
    lazy: async () => {
      const { SettingsScreen } = await import("./screens/SettingsScreen");
      return { Component: SettingsScreen };
    },
  },
  {
    path: "/notifications",
    lazy: async () => {
      const { NotificationScreen } = await import("./screens/NotificationScreen");
      return { Component: NotificationScreen };
    },
  },
]);