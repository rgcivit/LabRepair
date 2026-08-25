import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.onerror = function(message, source, lineno, colno, error) {
  const errorMsg = `Error: ${message} at ${source}:${lineno}:${colno}`;
  console.error(errorMsg);
  localStorage.setItem('last_error', errorMsg);
  return false;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
