// App.tsx
import './App.css';
import AppErrorBoundary from './pages/ErrorBoundary';
// import MapView from './components/MapView';
import MapViewEnhanced from './components/MapViewEnhanced';

function App() {
  return (
    <div className="App">
      {/* <MapView /> */}
      <AppErrorBoundary>
        <MapViewEnhanced />
      </AppErrorBoundary>
    </div>
  );
}

export default App;
