import { Navigate } from 'react-router-dom';

// Invoice is now only accessible through admin panel
// Redirect to admin if someone tries to access /invoice directly
const Invoice = () => {
  return <Navigate to="/admin" replace />;
};

export default Invoice;
