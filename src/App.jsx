import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/home";
import SummaryPage from "@/pages/summary";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
