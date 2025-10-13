import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Databases from './pages/Databases';
import Collections from './pages/Collections';
import QueryBuilder from './pages/QueryBuilder';
import Aggregations from './pages/Aggregations';
import SchemaUpload from './pages/SchemaUpload';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="databases" element={<Databases />} />
          <Route path="collections" element={<Collections />} />
          <Route path="query-builder" element={<QueryBuilder />} />
          <Route path="aggregations" element={<Aggregations />} />
          <Route path="schema-upload" element={<SchemaUpload />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
