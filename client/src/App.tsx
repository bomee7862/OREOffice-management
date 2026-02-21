import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FloorPlan from './pages/FloorPlan'
import Tenants from './pages/Tenants'
import Transactions from './pages/Transactions'
import Income from './pages/Income'
import Expense from './pages/Expense'
import TransactionSearch from './pages/TransactionSearch'
import Report from './pages/Report'
import Settlements from './pages/Settlements'
import Users from './pages/Users'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { user } = useAuth();

  return (
    <>
    <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/floor-plan" element={<FloorPlan />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/income" element={<Income />} />
              <Route path="/expense" element={<Expense />} />
              <Route path="/search" element={<TransactionSearch />} />
              <Route path="/report" element={<Report />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/users" element={
                <AdminRoute><Users /></AdminRoute>
              } />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
    </>
  )
}

export default App
