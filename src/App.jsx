import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/home";
import SummaryPage from "@/pages/summary";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
      </Routes>
    </HashRouter>
  );
}
