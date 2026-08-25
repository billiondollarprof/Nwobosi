/* ==========================================================================
   APP
   The four pages live in their own files for reading and working on. They
   build into one app here, so moving between them is instant with no page
   reload.
   ========================================================================== */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./shared/theme.jsx";

import Landing from "./pages/Landing.jsx";
import Setup from "./pages/Setup.jsx";
import Auth from "./pages/Auth.jsx";
import Chat from "./pages/Chat.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
