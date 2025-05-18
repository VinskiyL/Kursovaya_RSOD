import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAuth = false, requireAdmin = false }) => {
  const { data: user } = useSelector((state) => state.user);
  
  if (requireAuth && !user) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && (!user || user.role !== 'admin')) {
    return <Navigate to="/" />;
  }
  
  return children;
};

export default ProtectedRoute;