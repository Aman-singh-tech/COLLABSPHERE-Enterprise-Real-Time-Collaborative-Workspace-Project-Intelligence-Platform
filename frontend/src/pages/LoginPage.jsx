import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import LoginForm from '../components/auth/LoginForm';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

const LoginPage = () => {
  return (
    <AuthLayout title="Welcome back" subtitle="Enter your details to access your workspace.">
      <div className="space-y-4">
        <GoogleLoginButton />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs uppercase tracking-wide text-gray-400">Or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

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
