import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ListPage from "./pages/ListPage";
import PlateDetailPage from "./pages/PlateDetailPage";
import "./i18n";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/list", element: <ListPage /> },
  { path: "/plate/:plate", element: <PlateDetailPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);