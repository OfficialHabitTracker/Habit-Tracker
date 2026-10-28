import { RouterProvider } from "react-router-dom";
import router from "./main";
function App() {
  return (
    <>
      <RouterProvider router={router}></RouterProvider>
    </>
  );
}

export default App;
