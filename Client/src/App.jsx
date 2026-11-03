import { RouterProvider } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import router from "./main";
import { ThemeProvider } from "./theme/ThemeContext";
function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router}></RouterProvider>
      <Analytics />
    </ThemeProvider>
  );
}

export default App;
