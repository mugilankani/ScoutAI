import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div>
        <div>Loading</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
