import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import SignupForm from '../components/auth/SignupForm';


const SignupPage = () => {
  return (
    <AuthLayout title="Create your account" subtitle="Start collaborating with your team today.">
      <div className="space-y-4">


        <SignupForm />

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
