import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Bell, Mail, MessageSquare, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const NotificationsPage = () => {
  const { hasPermission } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    subject: '',
    message: '',
    channel: 'email'
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notificationsRes, statsRes] = await Promise.all([
        api.get('/notifications?limit=100'),
        api.get('/notifications/stats')
      ]);
      setNotifications(notificationsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulk = async () => {
    if (!bulkForm.subject || !bulkForm.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/notifications/bulk-announcement', bulkForm);
      toast.success(`Sent ${response.data.length} notifications`);
      setShowBulkModal(false);
      setBulkForm({ subject: '', message: '', channel: 'email' });
      fetchData();
    } catch (error) {
      toast.error('Failed to send bulk notifications');
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  if (!hasPermission('sales_all') && !hasPermission('customer_all')) {
    return (
      <div className="p-8 text-center">
        <Bell className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
        <h2 className="text-2xl font-bold text-[#1C1917] mb-2">Access Denied</h2>
        <p className="text-[#78716C]">You don't have permission to manage notifications.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Notifications Center
          </h1>
          <p className="text-[#78716C] mt-2">Manage customer communications</p>
        </div>
        {hasPermission('customer_all') && (
          <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#B5952F] text-white">
                <Send className="w-4 h-4 mr-2" />
                Send Bulk Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Bulk Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={bulkForm.channel} onValueChange={(value) => setBulkForm({...bulkForm, channel: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={bulkForm.subject}
                    onChange={(e) => setBulkForm({...bulkForm, subject: e.target.value})}
                    placeholder="Enter subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={bulkForm.message}
                    onChange={(e) => setBulkForm({...bulkForm, message: e.target.value})}
                    placeholder="Enter message content"
                    rows={6}
                  />
                </div>
                <Button 
                  onClick={handleSendBulk} 
                  disabled={sending}
                  className="w-full bg-[#D4AF37] hover:bg-[#B5952F]"
                >
                  {sending ? 'Sending...' : 'Send to All Customers'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-[#78716C]">Total Sent</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]">{stats.total_sent}</p>
          </div>
          
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-[#78716C]">Sent Today</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]">{stats.sent_today}</p>
          </div>
          
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-[#78716C]">This Month</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]">{stats.sent_this_month}</p>
          </div>
          
          <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm text-[#78716C]">Failed</p>
            </div>
            <p className="text-3xl font-bold text-[#1C1917]">{stats.failed_count}</p>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white border border-[#E7E5E4] rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Recent Notifications
        </h3>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto text-[#78716C] mb-4" />
            <p className="text-[#78716C]">No notifications sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className="flex items-start gap-4 p-4 border border-[#E7E5E4] rounded-lg hover:bg-[#FAFAF9] transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(notification.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getChannelIcon(notification.channel)}
                    <span className="text-xs text-[#78716C] uppercase">{notification.channel}</span>
                    <span className="text-xs text-[#78716C]">•</span>
                    <span className="text-xs text-[#78716C]">{notification.type.replace('_', ' ')}</span>
                  </div>
                  
                  <p className="font-medium text-[#1C1917] mb-1">{notification.subject}</p>
                  
                  <p className="text-sm text-[#78716C] mb-2 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-[#78716C]">
                    {notification.recipient_email && (
                      <span>To: {notification.recipient_email}</span>
                    )}
                    {notification.sent_at && (
                      <span>Sent: {new Date(notification.sent_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
