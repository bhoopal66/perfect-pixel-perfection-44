import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  MessageCircle,
  Plus,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useAccountStore } from '@/stores/accountStore';
import { useWhatsAppAccounts } from '@/hooks/use-whatsapp-accounts';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare, badge: 12 },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { name: 'Pipeline', href: '/dashboard/pipeline', icon: Kanban },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, organization } = useAuthStore();
  const { selectedAccountId, setSelectedAccountId } = useAccountStore();
  const { data: accounts, isLoading: accountsLoading } = useWhatsAppAccounts();
  const navigate = useNavigate();
  const { toast } = useToast();

  const connectedAccounts = accounts?.filter(a => a.is_connected) || [];
  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const getAccountDisplayText = () => {
    if (selectedAccount) {
      return selectedAccount.account_name;
    }
    return 'All Accounts';
  };

  const getAccountSubtext = () => {
    if (selectedAccount) {
      return selectedAccount.phone_number || 'Connected';
    }
    const count = connectedAccounts.length;
    return `${count} connected`;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">WhatsApp CRM</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Switcher */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {getAccountDisplayText()}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">
                      {getAccountSubtext()}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/60 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* All Accounts option */}
                <DropdownMenuItem onClick={() => setSelectedAccountId(null)}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="flex-1">All Accounts</span>
                    {!selectedAccountId && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </DropdownMenuItem>
                
                {accounts && accounts.length > 0 ? (
                  <>
                    <DropdownMenuSeparator />
                    {accounts.map((account) => (
                      <DropdownMenuItem
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              account.is_connected ? 'bg-primary' : 'bg-muted-foreground/30'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{account.account_name}</p>
                            {account.phone_number && (
                              <p className="text-xs text-muted-foreground truncate">
                                {account.phone_number}
                              </p>
                            )}
                          </div>
                          {selectedAccountId === account.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : !accountsLoading ? (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">No accounts yet</span>
                  </DropdownMenuItem>
                ) : null}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Plus className="w-4 h-4 mr-2 text-primary" />
                  <span className="text-primary">Add WhatsApp Account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1 font-medium">{item.name}</span>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 min-w-[20px] justify-center"
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {organization?.name || 'No organization'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations, contacts..."
                className="w-64 lg:w-80 pl-9 h-9 bg-secondary/50 border-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile?.full_name || 'User'}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {profile?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
