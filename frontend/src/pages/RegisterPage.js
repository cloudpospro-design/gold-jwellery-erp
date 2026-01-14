import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'sales'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await register(formData);
    
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1737515045459-365999ac9da0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxJbmRpYW4lMjBicmlkYWwlMjBqZXdlbGxlcnklMjBtb2RlbCUyMHBvcnRyYWl0JTIwaGlnaCUyMHJlc29sdXRpb258ZW58MHx8fHwxNzY4NDEwOTk1fDA&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C1917]/80 to-transparent" />
        <div className="relative z-10 p-12 flex flex-col justify-end">
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Gilded Ledger
          </h1>
          <p className="text-xl text-[#FAFAF9] max-w-md">
            Professional Gold Jewellery ERP with GST Compliance
          </p>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAFAF9]">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-[#E7E5E4] p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[#1C1917] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Create Account
              </h2>
              <p className="text-[#78716C]">Join your team's ERP system</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-[#1C1917]">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  data-testid="register-name-input"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="border-[#E7E5E4] focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1C1917]">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="register-email-input"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="border-[#E7E5E4] focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1C1917]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="register-password-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="border-[#E7E5E4] focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#1C1917]">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger data-testid="register-role-select" className="border-[#E7E5E4] focus:ring-[#D4AF37]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Staff</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                data-testid="register-submit-button"
                disabled={loading}
                className="w-full bg-[#D4AF37] hover:bg-[#B5952F] text-white font-medium py-2.5 transition-all duration-200"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#78716C]">
                Already have an account?{' '}
                <Link to="/login" className="text-[#D4AF37] hover:text-[#B5952F] font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;