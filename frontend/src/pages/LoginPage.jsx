import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import LoginForm from '../components/auth/LoginForm';


const LoginPage = () => {
  return (
    <AuthLayout title="Welcome back" subtitle="Enter your details to access your workspace.">
      <div className="space-y-4">


        <LoginForm />

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-primary-600 hover:underline">
            Sign up
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400">
          By proceeding, you agree to our{' '}
          <a href="/terms" className="underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
