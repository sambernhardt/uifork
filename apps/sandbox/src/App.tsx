import { Routes, Route } from "react-router-dom";
import { IndexPage } from "./pages/IndexPage";
import { DemoPage } from "./pages/DemoPage";
import { PromptTestPage } from "./pages/PromptTestPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/prompt-test" element={<PromptTestPage />} />
    </Routes>
  );
}

export default App;
