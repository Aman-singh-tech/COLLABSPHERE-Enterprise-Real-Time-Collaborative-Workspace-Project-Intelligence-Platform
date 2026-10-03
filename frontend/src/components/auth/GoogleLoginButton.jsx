import { authService } from '../../services/auth.service';

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = authService.googleLoginUrl();
  };

  return (
    <button
      onClick={handleGoogleLogin}
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 tracking-wide hover:bg-gray-50"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.4 0 10.3-1.8 14-5.1l-6.4-5.4C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.9 39.7 16.4 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.5l6.4 5.4C40.9 36.3 44 31 44 24c0-1.3-.1-2.6-.4-3.5z"
        />
      </svg>
      Continue with Google
    </button>
  );
};

export default GoogleLoginButton;
