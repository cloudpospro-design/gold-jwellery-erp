import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Shield, Mail, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

const UserManagementPage = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasPermission('users_read')) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      await api.patch(`/users/${userId}/toggle-active`);
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      accountant: 'bg-green-100 text-green-700',
      sales: 'bg-purple-100 text-purple-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  if (!hasPermission('users_read')) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to view user management.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            User Management
          </h1>
          <p className="text-[#78716C] mt-2">Manage team members, roles, and permissions</p>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[#78716C]">Loading users...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {users.map((user) => (
            <div 
              key={user.id}
              data-testid={`user-card-${user.id}`}
              className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center text-white font-bold text-lg">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1C1917]">{user.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#78716C]">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${getRoleBadgeColor(user.role)} border-0`}>
                      {user.role.toUpperCase()}
                    </Badge>
                    <Badge className={user.is_active ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-[#78716C]">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {user.permissions.slice(0, 5).map((perm, idx) => (
                      <span key={idx} className="text-xs bg-[#FEFCE8] text-[#78716C] px-2 py-1 rounded">
                        {perm}
                      </span>
                    ))}
                    {user.permissions.length > 5 && (
                      <span className="text-xs bg-[#F5F5F4] text-[#78716C] px-2 py-1 rounded">
                        +{user.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {hasPermission('users_write') && (
                  <div className="flex gap-2">
                    <Button
                      data-testid={`toggle-status-${user.id}`}
                      onClick={() => toggleUserStatus(user.id)}
                      variant="outline"
                      size="sm"
                      className="border-[#E7E5E4] hover:border-[#D4AF37] hover:text-[#D4AF37]"
                    >
                      {user.is_active ? (
                        <><ToggleRight className="w-4 h-4 mr-2" /> Deactivate</>
                      ) : (
                        <><ToggleLeft className="w-4 h-4 mr-2" /> Activate</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;