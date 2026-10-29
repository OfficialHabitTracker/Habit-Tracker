import { RouterProvider } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import router from "./main";
function App() {
  return (
    <>
      <RouterProvider router={router}></RouterProvider>
      <Analytics />
    </>
  );
}

export default App;
