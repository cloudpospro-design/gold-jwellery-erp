import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  MessageCircle,
  Send,
  FileText,
  Users,
  Settings,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Phone
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WhatsAppIntegrationPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Send message form
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [messagesRes, templatesRes, customersRes, configRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/whatsapp/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/whatsapp/templates`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/customers/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/whatsapp/config`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/whatsapp/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setMessages(messagesRes.data);
      setTemplates(templatesRes.data);
      setCustomers(customersRes.data);
      setConfig(configRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedCustomer || !messageContent.trim()) {
      toast.error('Please select a customer and enter a message');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer?.phone) {
      toast.error('Selected customer has no phone number');
      return;
    }

    setSending(true);
    try {
      await axios.post(
        `${API_URL}/api/whatsapp/send`,
        {
          customer_id: selectedCustomer,
          phone_number: customer.phone,
          message_type: messageType,
          message_content: messageContent
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Message sent successfully');
      setMessageContent('');
      setSelectedCustomer('');
      fetchData();
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const toggleConfig = async (enabled) => {
    try {
      await axios.patch(
        `${API_URL}/api/whatsapp/config`,
        { enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`WhatsApp integration ${enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update configuration');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      read: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      failed: 'bg-red-100 text-red-800'
    };
    const icons = {
      sent: <Send className="w-3 h-3" />,
      delivered: <CheckCircle className="w-3 h-3" />,
      read: <CheckCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />
    };
    return (
      <Badge className={`${styles[status] || styles.pending} flex items-center gap-1`}>
        {icons[status]} {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="whatsapp-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]" style={{ fontFamily: 'Playfair Display, serif' }}>
            WhatsApp Integration
          </h1>
          <p className="text-[#78716C] mt-1">Send invoices and notifications via WhatsApp</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            config?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {config?.enabled ? 'Enabled' : 'Disabled'}
          </div>
          <Button variant="outline" onClick={fetchData} className="border-[#D4AF37] text-[#D4AF37]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-[#E7E5E4]">
            <CardContent className="pt-4">
              <p className="text-sm text-[#78716C]">Total Messages</p>
              <p className="text-2xl font-bold text-[#1C1917]">{stats.total_messages}</p>
            </CardContent>
          </Card>
          <Card className="border-[#E7E5E4]">
            <CardContent className="pt-4">
              <p className="text-sm text-[#78716C]">Sent</p>
              <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            </CardContent>
          </Card>
          <Card className="border-[#E7E5E4]">
            <CardContent className="pt-4">
              <p className="text-sm text-[#78716C]">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </CardContent>
          </Card>
          <Card className="border-[#E7E5E4]">
            <CardContent className="pt-4">
              <p className="text-sm text-[#78716C]">Read</p>
              <p className="text-2xl font-bold text-green-600">{stats.read}</p>
            </CardContent>
          </Card>
          <Card className="border-[#E7E5E4]">
            <CardContent className="pt-4">
              <p className="text-sm text-[#78716C]">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#E7E5E4]">
          <TabsTrigger value="messages" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-[#FEFCE8] data-[state=active]:text-[#D4AF37]">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          {/* Send Message Form */}
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#D4AF37]" />
                Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.phone).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {customer.name} - {customer.phone}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Type</label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Message</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                      <SelectItem value="order_update">Order Update</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={sending || !selectedCustomer || !messageContent.trim()}
                className="bg-[#D4AF37] hover:bg-[#B8942D] text-white"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Messages List */}
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle>Recent Messages ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-[#78716C]">
                  No messages sent yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.slice(0, 20).map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium">{msg.customer_name}</TableCell>
                        <TableCell>{msg.phone_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{msg.message_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{msg.message_content}</TableCell>
                        <TableCell>{getStatusBadge(msg.status)}</TableCell>
                        <TableCell className="text-sm text-[#78716C]">
                          {msg.sent_at?.split('T')[0]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Pre-defined templates for common messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 border border-[#E7E5E4] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline" className="capitalize">{template.template_type}</Badge>
                      </div>
                      <Badge className={template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <pre className="text-sm text-[#78716C] bg-[#F5F5F4] p-3 rounded whitespace-pre-wrap">
                      {template.content}
                    </pre>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.variables?.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">{`{${v}}`}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-[#E7E5E4]">
            <CardHeader>
              <CardTitle>WhatsApp Configuration</CardTitle>
              <CardDescription>Configure WhatsApp integration settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable WhatsApp Integration</p>
                  <p className="text-sm text-[#78716C]">Allow sending messages via WhatsApp</p>
                </div>
                <Switch
                  checked={config?.enabled || false}
                  onCheckedChange={toggleConfig}
                />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">WhatsApp Business API Setup</h4>
                <p className="text-sm text-amber-700">
                  To send actual WhatsApp messages, you need to configure the WhatsApp Business API.
                  This requires setting up a WhatsApp Business account and obtaining API credentials.
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Current implementation simulates message sending for demo purposes.
                </p>
              </div>

              {config && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#78716C]">API Provider</p>
                    <p className="font-medium capitalize">{config.api_provider}</p>
                  </div>
                  <div>
                    <p className="text-[#78716C]">Connection Status</p>
                    <p className="font-medium capitalize">{config.connection_status}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppIntegrationPage;
