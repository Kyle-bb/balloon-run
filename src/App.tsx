import { Link } from 'react-router-dom';
import AppRoutes from './components/AppRoutes';

export default function App() {
  return (
    <div>
      <header style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
        <Link to="/balloon-run">Open BalloonRun</Link>
      </header>
      <AppRoutes />
    </div>
  );
}
