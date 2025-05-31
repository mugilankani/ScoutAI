import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import ContinueWithGoogle from "./ContinueWithGoogle";

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-[#F5F5F5] to-[#F0EEF6] px-4 py-12 font-sans">
      <div className="mb-7">
        <p className="pt-6 pb-2 text-4xl font-bold">ScoutAI</p>
      </div>

      <div className="mb-7 max-w-2xl px-4 text-center">
        <h1 className="mb-4 font-serif text-5xl">
          Let AI take over your search for talent
        </h1>
        <p className="mb-8 text-base text-neutral-500">
          Effortlessy search through the web to find best talent for your
          organization.
        </p>

        <div className="flex flex-col items-center">
          <ContinueWithGoogle />
          <span className="text-sm text-[#666]">
            takes ~4 minutes to find talent
          </span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
