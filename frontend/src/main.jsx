import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ActiveWeddingProvider } from './context/ActiveWeddingContext.jsx';
import { CreateWeddingProvider } from './context/CreateWeddingContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <AuthProvider>
            <ActiveWeddingProvider>
              <CreateWeddingProvider>
                <App />
              </CreateWeddingProvider>
            </ActiveWeddingProvider>
          </AuthProvider>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
