import { Boxes } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left panel - branding */}
      <div className="relative hidden flex-col justify-between bg-gray-900 p-12 lg:flex overflow-hidden">
        {/* Background Image */}
        <img 
          src="/auth-illustration.jpg" 
          alt="Modern collaborative workspace overlooking city skyline" 
          className="absolute inset-0 z-0 h-full w-full object-cover object-top opacity-80" 
        />
        
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Boxes size={20} />
          </div>
          <span className="text-xl font-bold text-white">CollabSphere</span>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white/10 p-8 shadow-xl backdrop-blur-md border border-white/20">
            <p className="text-sm text-white/90">
              Real-time collaboration, project intelligence, and enterprise-grade security — all
              in one workspace.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white">Enterprise Collaboration, Simplified.</h2>
          <p className="mt-2 max-w-md text-white/80">
            Connect your teams, align your goals, and ship faster with our unified workspace
            platform designed for modern workflows.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
