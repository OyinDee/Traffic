import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import MapView from './components/MapView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapView />} />
      </Routes>
    </Router>
  );
}

export default App;
