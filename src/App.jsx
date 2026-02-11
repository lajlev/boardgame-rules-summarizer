import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import Home from "@/pages/home";
import UploadPage from "@/pages/upload";
import SummaryPage from "@/pages/summary";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/summary/:id" element={<SummaryPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
