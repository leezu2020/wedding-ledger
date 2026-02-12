import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import MonthlySheet from './pages/MonthlySheet';
import AccountsPage from './pages/AccountsPage';
import CategoryPage from './pages/CategoryPage';
import BudgetPage from './pages/BudgetPage';
import StockPage from './pages/StockPage';
import StatisticsPage from './pages/StatisticsPage';
import InputPage from './pages/InputPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/input/:type" element={<InputPage />} />
        <Route path="/sheet" element={<MonthlySheet />} />
        <Route path="/budgets" element={<BudgetPage />} />
        <Route path="/savings" element={<MonthlySheet />} /> {/* Temporary redirect or specific page if needed */}
        <Route path="/stocks" element={<StockPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
