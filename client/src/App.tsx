import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FloorPlan from './pages/FloorPlan'
import Tenants from './pages/Tenants'
import Contracts from './pages/Contracts'
import Transactions from './pages/Transactions'
import Income from './pages/Income'
import Expense from './pages/Expense'
import TransactionSearch from './pages/TransactionSearch'
import Report from './pages/Report'
import Settlements from './pages/Settlements'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/floor-plan" element={<FloorPlan />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/income" element={<Income />} />
        <Route path="/expense" element={<Expense />} />
        <Route path="/search" element={<TransactionSearch />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settlements" element={<Settlements />} />
      </Routes>
    </Layout>
  )
}

export default App



