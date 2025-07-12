import { createRoot } from "react-dom/client";
import "./index.css";

function SimpleApp() {
  return (
    <div style={{ 
      backgroundColor: 'black', 
      color: 'white', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>✓ React App is Working! Portfolio Loading...</h1>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<SimpleApp />);
