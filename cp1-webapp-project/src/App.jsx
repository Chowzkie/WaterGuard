import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Dashboard from './Components/Dashboard/Dashboard';
import Header from  './Components/Navigation-Header/Header';
import Navigation from './Components/Navigation-Header/Navigation';
import Overview from "./Components/Overview/Overview";

function App() {

  return(

    <>

      
      <Header/>
      <Navigation/>

      <main>

       <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>

      </main>
  
    </>

  );
  
}

export default App
