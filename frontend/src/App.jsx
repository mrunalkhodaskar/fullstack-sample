import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  createOrder,
  bulkDeleteOrders,
  bulkUpdateOrderStatus,
  deleteOrder,
  fetchOrders,
  fetchOrderReport,
  login,
  register,
  setAccessToken,
  updateOrder,
  updateOrderStatus
} from './api';
import { clearCachedOrders, getCachedOrders, saveCachedOrders } from './offlineStore';
import { InventoryPage, ProductsPage } from './ProductManagement';
import './App.css';

const emptyOrder = { productName: '', quantity: 1, price: '', notes: '' };
const orderStatuses = ['CREATED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const dateInputValue = (daysFromToday = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatOrderDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function Icon({ name, size = 20 }) {
  const paths = {
    bag: <><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
    moon: <><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}

function Brand({ light = false }) {
  return (
    <span className={`brand${light ? ' brand--light' : ''}`}>
      <span className="brand__icon"><Icon name="bag" size={19} /></span>
      <span>order<span className="brand__accent">ly</span></span>
    </span>
  );
}

function AuthScreen({ mode, setMode, credentials, setCredentials, submitting, error, onSubmit, theme, onToggleTheme }) {
  const isLogin = mode === 'login';

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="auth-story__inner">
          <Brand light />
          <div className="auth-story__content">
            <span className="eyebrow eyebrow--light"><Icon name="sparkle" size={15} /> SIMPLE ORDER MANAGEMENT</span>
            <h1>Less busywork.<br />More <span>business.</span></h1>
            <p>Keep every order in one place and spend your time growing what matters.</p>
            <div className="story-note">
              <span className="story-note__icon"><Icon name="check" size={17} /></span>
              <span>Everything you need to stay on top of every order.</span>
            </div>
          </div>
          <span className="auth-story__footer">A clearer way to run your day.</span>
        </div>
        <span className="auth-orb auth-orb--one" />
        <span className="auth-orb auth-orb--two" />
      </section>

      <section className="auth-panel">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <div className="auth-card">
          <div className="auth-card__mark"><Icon name="bag" size={23} /></div>
          <span className="eyebrow">{isLogin ? 'WELCOME BACK' : 'GET STARTED'}</span>
          <h2>{isLogin ? 'Sign in to your account' : 'Create your account'}</h2>
          <p className="auth-card__intro">
            {isLogin ? 'Your orders are right where you left them.' : 'A better handle on your orders starts here.'}
          </p>

          {error && <div className="alert" role="alert">{error}</div>}

          <form className="form-stack" onSubmit={onSubmit}>
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={credentials.email}
                onChange={(event) => setCredentials({ ...credentials, email: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? undefined : 8}
                placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'}
                required
                value={credentials.password}
                onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              />
            </label>
            {!isLogin && <p className="password-hint"><Icon name="lock" size={14} /> Use at least 8 characters for your password.</p>}
            <button className="button button--primary button--wide auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
              {!submitting && <Icon name="arrow" size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? 'New to Orderly?' : 'Already have an account?'}
            <button
              type="button"
              onClick={() => setMode(isLogin ? 'register' : 'login')}
            >
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          <p className="auth-card__secure"><Icon name="lock" size={13} /> Your account is private and secure</p>
        </div>
      </section>
    </main>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [theme, setTheme] = useState(() => (
    window.localStorage.getItem('orderly-theme') === 'dark' ? 'dark' : 'light'
  ));
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [mode, setMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [accountEmail, setAccountEmail] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersFromCache, setOrdersFromCache] = useState(false);
  const [cachedOrdersSavedAt, setCachedOrdersSavedAt] = useState(null);
  const [offlineCacheError, setOfflineCacheError] = useState('');
  const [form, setForm] = useState(emptyOrder);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageInfo, setPageInfo] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('PROCESSING');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(() => dateInputValue(-30));
  const [reportEndDate, setReportEndDate] = useState(() => dateInputValue());
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderActionId, setOrderActionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('orderly-theme', theme);
  }, [theme]);

  useEffect(() => {
    const updateConnection = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) setRefreshKey((current) => current + 1);
    };
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthenticated(false);
      setAccountEmail('');
      setAccessToken(null);
      setOrders([]);
      setReport(null);
      setError('Your session has expired. Please sign in again.');
      navigate('/');
    };
    window.addEventListener('orderly:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('orderly:unauthorized', handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    if (!authenticated) return undefined;

    let cancelled = false;
    setLoading(true);
    const options = { page, size: pageSize, sort: sortBy, status: statusFilter, search };
    const timeout = window.setTimeout(() => {
      fetchOrders(options)
      .then(async (data) => {
        if (cancelled) return;
        setOrders(data.content);
        setPageInfo(data);
        setPage((current) => data.totalPages > 0 ? Math.min(current, data.totalPages - 1) : 0);
        setSelectedOrderIds([]);
        setOrdersFromCache(false);
        setCachedOrdersSavedAt(null);
        setOfflineCacheError('');
        setError('');
        try {
          await saveCachedOrders(accountEmail, options, data);
          if (!cancelled) setCachedOrdersSavedAt(Date.now());
        } catch (cacheError) {
          if (!cancelled) setOfflineCacheError(`Offline copy could not be saved: ${cacheError.message}`);
        }
      })
      .catch(async (requestError) => {
        if (cancelled) return;

        const networkUnavailable = !navigator.onLine
          || requestError.message.startsWith('Unable to reach the backend.');
        if (!networkUnavailable) {
          setError(requestError.message);
          setOrdersFromCache(false);
          return;
        }

        try {
          const cachedPage = await getCachedOrders(accountEmail, options);
          if (cancelled) return;
          if (cachedPage) {
            setOrders(cachedPage.data.content);
            setPageInfo(cachedPage.data);
            setSelectedOrderIds([]);
            setOrdersFromCache(true);
            setCachedOrdersSavedAt(cachedPage.savedAt);
            setError('');
          } else {
            setOrders([]);
            setPageInfo({ totalElements: 0, totalPages: 0, number: 0 });
            setOrdersFromCache(false);
            setError('No saved copy of this page is available offline. Reconnect to load it.');
          }
        } catch (cacheError) {
          if (!cancelled) {
            setOrders([]);
            setPageInfo({ totalElements: 0, totalPages: 0, number: 0 });
            setOrdersFromCache(false);
            setError(`Unable to load offline orders: ${cacheError.message}`);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [authenticated, accountEmail, page, pageSize, sortBy, statusFilter, search, refreshKey]);

  useEffect(() => {
    if (!authenticated) return undefined;
    let cancelled = false;
    if (!reportStartDate || !reportEndDate || reportStartDate > reportEndDate) {
      setReport(null);
      setReportError('Choose a valid date range.');
      return undefined;
    }
    setReportLoading(true);
    setReportError('');
    fetchOrderReport(reportStartDate, reportEndDate)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((requestError) => {
        if (!cancelled) setReportError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, reportStartDate, reportEndDate, refreshKey]);

  const pageCount = Math.max(1, pageInfo.totalPages);
  const currentPage = pageInfo.number || 0;
  const paginatedOrders = orders;

  useEffect(() => {
    setPage(0);
    setSelectedOrderIds([]);
  }, [search, statusFilter, sortBy, pageSize]);

  const allVisibleSelected = orders.length > 0 && orders.every((order) => selectedOrderIds.includes(order.id));
  const stats = {
    count: report?.totalOrders ?? 0,
    units: report?.totalUnits ?? 0,
    value: report?.totalValue ?? 0
  };

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const authenticate = mode === 'login' ? login : register;
      const result = await authenticate(credentials);
      setAccessToken(result.accessToken);
      setAccountEmail(credentials.email);
      setCredentials({ email: '', password: '' });
      setAuthenticated(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function requireOnlineAction() {
    if (isOnline && !ordersFromCache) return true;
    setError('The backend is unavailable. Reconnect to make changes to orders.');
    return false;
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();
    if (!requireOnlineAction()) return;
    setSubmitting(true);
    setError('');

    const orderDetails = {
      ...form,
      quantity: Number(form.quantity),
      price: Number(form.price),
      notes: form.notes.trim()
    };

    const previousOrders = orders;
    const previousForm = form;
    const previousEditingOrderId = editingOrderId;

    try {
      if (editingOrderId !== null) {
        const updatedOrder = {
          ...orders.find((order) => order.id === editingOrderId),
          ...orderDetails,
          updatedAt: new Date().toISOString()
        };
        setOrders((current) => current.map((order) => order.id === editingOrderId ? updatedOrder : order));
        await updateOrder(editingOrderId, orderDetails);
        setEditingOrderId(null);
      } else {
        const optimisticId = `temp-${Date.now()}`;
        const optimisticOrder = {
          ...orderDetails,
          id: optimisticId,
          status: 'CREATED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setOrders((current) => [optimisticOrder, ...current]);
        const createdOrder = await createOrder(orderDetails);
        setOrders((current) => current.map((order) => order.id === optimisticId ? createdOrder : order));
      }
      setForm(emptyOrder);
      setPage(0);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setOrders(previousOrders);
      setForm(previousForm);
      setEditingOrderId(previousEditingOrderId);
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(order) {
    setEditingOrderId(order.id);
    setForm({
      productName: order.productName,
      quantity: order.quantity,
      price: order.price,
      notes: order.notes ?? ''
    });
    setError('');
  }

  function cancelEditing() {
    setEditingOrderId(null);
    setForm(emptyOrder);
  }

  async function handleStatusChange(orderId, status) {
    if (!requireOnlineAction()) return;
    const previousOrders = orders;
    setOrderActionId(orderId);
    setError('');
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, status, updatedAt: new Date().toISOString() }
      : order));

    try {
      await updateOrderStatus(orderId, status);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setOrders(previousOrders);
      setError(requestError.message);
    } finally {
      setOrderActionId(null);
    }
  }

  async function handleDeleteOrder(order) {
    if (!window.confirm(`Delete order #${order.id} for "${order.productName}"?`)) return;
    if (!requireOnlineAction()) return;

    const previousOrders = orders;
    const previousSelection = selectedOrderIds;
    const previousEditingOrderId = editingOrderId;
    const previousForm = form;

    setOrderActionId(order.id);
    setError('');
    setOrders((current) => current.filter((item) => item.id !== order.id));
    if (editingOrderId === order.id) cancelEditing();
    setSelectedOrderIds((current) => current.filter((id) => id !== order.id));

    try {
      await deleteOrder(order.id);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setOrders(previousOrders);
      setSelectedOrderIds(previousSelection);
      setForm(previousForm);
      setEditingOrderId(previousEditingOrderId);
      setError(requestError.message);
    } finally {
      setOrderActionId(null);
    }
  }

  async function handleBulkStatusUpdate() {
    if (selectedOrderIds.length === 0) return;
    if (!requireOnlineAction()) return;

    const previousOrders = orders;
    const previousSelection = selectedOrderIds;
    setBulkSubmitting(true);
    setError('');
    setOrders((current) => current.map((order) => selectedOrderIds.includes(order.id)
      ? { ...order, status: bulkStatus, updatedAt: new Date().toISOString() }
      : order));
    setSelectedOrderIds([]);

    try {
      await bulkUpdateOrderStatus(selectedOrderIds, bulkStatus);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setOrders(previousOrders);
      setSelectedOrderIds(previousSelection);
      setError(requestError.message);
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedOrderIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedOrderIds.length} selected orders? This cannot be undone.`)) return;
    if (!requireOnlineAction()) return;

    const previousOrders = orders;
    const previousSelection = selectedOrderIds;
    setBulkSubmitting(true);
    setError('');
    setOrders((current) => current.filter((item) => !selectedOrderIds.includes(item.id)));
    setSelectedOrderIds([]);

    try {
      await bulkDeleteOrders(selectedOrderIds);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setOrders(previousOrders);
      setSelectedOrderIds(previousSelection);
      setError(requestError.message);
    } finally {
      setBulkSubmitting(false);
    }
  }

  function toggleOrderSelection(orderId) {
    setSelectedOrderIds((current) => current.includes(orderId)
      ? current.filter((id) => id !== orderId)
      : [...current, orderId]);
  }

  function toggleVisibleOrders() {
    setSelectedOrderIds((current) => allVisibleSelected
      ? current.filter((id) => !orders.some((order) => order.id === id))
      : [...new Set([...current, ...orders.map((order) => order.id)])]);
  }

  async function exportOrders() {
    setExporting(true);
    setError('');
    try {
      const options = { page: 0, size: 100, sort: sortBy, status: statusFilter, search };
      const firstPage = await fetchOrders(options);
      const allOrders = [...firstPage.content];
      for (let currentPage = 1; currentPage < firstPage.totalPages; currentPage += 1) {
        const nextPage = await fetchOrders({ ...options, page: currentPage });
        allOrders.push(...nextPage.content);
      }

      const columns = ['Order ID', 'Product', 'Quantity', 'Unit Price', 'Total', 'Status', 'Notes', 'Created', 'Updated'];
    const escapeCell = (value) => {
      const text = String(value);
      const safeText = /^[\t\r=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
      const rows = allOrders.map((order) => [
      order.id,
      order.productName,
      order.quantity,
      order.price.toFixed(2),
      (order.price * order.quantity).toFixed(2),
        order.status,
        order.notes || '',
        order.createdAt || '',
        order.updatedAt || ''
    ]);
      const csv = [columns, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleLogout() {
    let logoutWarning = '';
    try {
      await clearCachedOrders(accountEmail);
    } catch (cacheError) {
      logoutWarning = `Could not clear offline order data: ${cacheError.message}`;
    }
    setAccessToken(null);
    setAuthenticated(false);
    setOrders([]);
    setOrdersFromCache(false);
    setCachedOrdersSavedAt(null);
    setOfflineCacheError('');
    setSearch('');
    setStatusFilter('ALL');
    setSortBy('newest');
    setPage(0);
    setPageSize(10);
    setSelectedOrderIds([]);
    cancelEditing();
    setError(logoutWarning);
    navigate('/');
  }

  if (!authenticated) {
    return (
      <AuthScreen
        mode={mode}
        setMode={(nextMode) => {
          setError('');
          setMode(nextMode);
        }}
        credentials={credentials}
        setCredentials={setCredentials}
        submitting={submitting}
        error={error}
        onSubmit={handleAuthSubmit}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Brand />
          <nav className="primary-nav" aria-label="Main navigation">
            <NavLink to="/" end>Orders</NavLink>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/inventory">Inventory</NavLink>
          </nav>
          <div className="topbar__right">
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
            <span className={`connection-pill${isOnline ? '' : ' connection-pill--offline'}`}>
              <span className="connection-pill__dot" />{isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="account-pill"><span className="account-pill__dot" /> Workspace</span>
            <span className="topbar__divider" />
            <span className="user-avatar" aria-hidden="true">{accountEmail.charAt(0).toUpperCase() || 'U'}</span>
            <button className="button button--quiet" type="button" onClick={handleLogout}>
              <Icon name="logout" size={16} /><span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {location.pathname === '/products' ? (
        <ProductsPage isOnline={isOnline} />
      ) : location.pathname === '/inventory' ? (
        <InventoryPage isOnline={isOnline} />
      ) : location.pathname === '/' ? (
      <main className="dashboard">
        <div className="welcome-row">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>Orders, in good order.</h1>
            <p className="welcome-row__subtitle">A little more clarity for your day.</p>
          </div>
          <div className="welcome-badge"><Icon name="sparkle" size={17} /> Looking good</div>
        </div>

        {error && <div className="alert alert--dashboard" role="alert">{error}</div>}
        {(!isOnline || ordersFromCache) && (
          <div className="connection-banner" role="status">
            {ordersFromCache
              ? `Showing saved orders from ${new Date(cachedOrdersSavedAt).toLocaleString()}. Order changes are disabled until the backend is reachable.`
              : 'You are offline. Only previously saved order pages are available; changes are disabled.'}
          </div>
        )}
        {offlineCacheError && <div className="alert alert--dashboard" role="alert">{offlineCacheError}</div>}

        <section className="stats-grid" aria-label="Order summary">
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--blue"><Icon name="box" /></span>
            <div><span className="stat-card__label">Total orders</span><strong>{stats.count}</strong></div>
            <span className="stat-card__hint">in your workspace</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--peach"><Icon name="bag" /></span>
            <div><span className="stat-card__label">Items ordered</span><strong>{stats.units}</strong></div>
            <span className="stat-card__hint">across all orders</span>
          </article>
          <article className="stat-card">
            <span className="stat-card__icon stat-card__icon--green"><Icon name="chart" /></span>
            <div><span className="stat-card__label">Order value</span><strong>{currency.format(stats.value)}</strong></div>
            <span className="stat-card__hint">total value</span>
          </article>
        </section>

        <section className="panel report-panel" aria-labelledby="report-title">
          <div className="report-heading">
            <div>
              <span className="eyebrow">DATE-RANGE REPORT</span>
              <h2 id="report-title">Order performance</h2>
              <p>Summary of your orders created in the selected date range.</p>
            </div>
            <div className="report-date-controls">
              <label className="field">
                <span>From</span>
                <input
                  type="date"
                  aria-label="Report start date"
                  value={reportStartDate}
                  max={reportEndDate}
                  onChange={(event) => setReportStartDate(event.target.value)}
                />
              </label>
              <label className="field">
                <span>To</span>
                <input
                  type="date"
                  aria-label="Report end date"
                  value={reportEndDate}
                  min={reportStartDate}
                  max={dateInputValue()}
                  onChange={(event) => setReportEndDate(event.target.value)}
                />
              </label>
            </div>
          </div>
          {reportError && <p className="report-error" role="alert">{reportError}</p>}
          {reportLoading ? (
            <div className="report-summary report-summary--loading"><span className="spinner" /> Updating report…</div>
          ) : report && (
            <div className="report-summary">
              <div><span>Total orders</span><strong>{report.totalOrders}</strong></div>
              <div><span>Items ordered</span><strong>{report.totalUnits}</strong></div>
              <div><span>Order value</span><strong>{currency.format(report.totalValue)}</strong></div>
              <div className="report-statuses">
                <span>By status</span>
                <div>{report.byStatus.length
                  ? report.byStatus.map((entry) => (
                    <span className="report-status" key={entry.status}>
                      {entry.status} <strong>{entry.orderCount}</strong>
                    </span>
                  ))
                  : <span className="report-empty">No orders in this date range</span>}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="workspace-grid">
          <section className="panel orders-panel">
            <div className="panel__heading">
              <div>
                <span className="eyebrow">OVERVIEW</span>
                <h2>Your orders <span className="count-badge">{pageInfo.totalElements}</span></h2>
                <p>All your recent orders, together in one place.</p>
              </div>
            </div>
            <div className="order-toolbar">
              <label className="search-box">
                <Icon name="search" size={17} />
                <input
                  type="search"
                  aria-label="Search orders"
                  placeholder="Search name, ID, or status"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="select-control">
                <span>Status</span>
                <select aria-label="Filter orders by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">All statuses</option>
                  {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="select-control select-control--sort">
                <span>Sort</span>
                <select aria-label="Sort orders" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="value-desc">Highest value</option>
                  <option value="value-asc">Lowest value</option>
                </select>
              </label>
              <button className="button button--export" type="button" onClick={exportOrders} disabled={!isOnline || ordersFromCache || pageInfo.totalElements === 0 || exporting}>
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
            <div className="bulk-toolbar">
              <label className="bulk-select-all">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={!isOnline || orders.length === 0 || loading}
                  onChange={toggleVisibleOrders}
                />
                <span>Select this page</span>
              </label>
              <span className="bulk-selection-count">{selectedOrderIds.length} selected</span>
              <select
                aria-label="Set selected orders status"
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
                disabled={!isOnline || selectedOrderIds.length === 0 || bulkSubmitting}
              >
                {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <button
                className="button button--bulk"
                type="button"
                onClick={handleBulkStatusUpdate}
                disabled={!isOnline || selectedOrderIds.length === 0 || bulkSubmitting}
              >
                Update status
              </button>
              <button
                className="button button--bulk button--bulk-delete"
                type="button"
                onClick={handleBulkDelete}
                disabled={!isOnline || selectedOrderIds.length === 0 || bulkSubmitting}
              >
                Delete selected
              </button>
            </div>

            {loading ? (
              <div className="loading-state"><span className="spinner" /> Loading your orders...</div>
            ) : pageInfo.totalElements === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon"><Icon name={search || statusFilter !== 'ALL' ? 'search' : 'box'} size={23} /></span>
                <h3>{search || statusFilter !== 'ALL' ? 'No matching orders' : 'Your order list is ready'}</h3>
                <p>{search || statusFilter !== 'ALL' ? 'Try changing your search or status filter.' : 'Once you add your first order, you’ll find it right here.'}</p>
              </div>
            ) : (
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr><th aria-label="Select order" /><th>ORDER</th><th>QUANTITY</th><th>UNIT PRICE</th><th>TOTAL</th><th>STATUS</th><th>CREATED</th><th>UPDATED</th><th>ACTIONS</th></tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select order ${order.id}`}
                            disabled={!isOnline || ordersFromCache}
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                          />
                        </td>
                        <td>
                          8919109910
                          <div className="order-product">
                            <span className="product-icon"><Icon name="bag" size={17} /></span>
                            <span>
                              <strong>{order.productName}</strong>
                              <small>Order #{order.id}</small>
                              {order.notes && <small className="order-note" title={order.notes}>{order.notes}</small>}
                            </span>
                          </div>
                        </td>
                        <td className="table-muted">{order.quantity} {order.quantity === 1 ? 'item' : 'items'}</td>
                        <td className="table-muted">{currency.format(order.price)}</td>
                        <td className="table-total">{currency.format(order.price * order.quantity)}</td>
                        <td>
                          <label className="status-select-wrap">
                            <span className="sr-only">Status for order {order.id}</span>
                            <select
                              className="status-select"
                              value={order.status}
                              disabled={!isOnline || ordersFromCache || orderActionId === order.id}
                              onChange={(event) => handleStatusChange(order.id, event.target.value)}
                            >
                              {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </label>
                        </td>
                        <td className="table-muted table-date">{formatOrderDate(order.createdAt)}</td>
                        <td className="table-muted table-date">{formatOrderDate(order.updatedAt)}</td>
                        <td>
                          <div className="row-actions">
                            <button className="text-action" type="button" onClick={() => startEditing(order)} disabled={!isOnline || ordersFromCache} aria-label={`Edit order ${order.id}`}>Edit</button>
                            <button
                              className="text-action text-action--delete"
                              type="button"
                              disabled={!isOnline || ordersFromCache || orderActionId === order.id}
                              onClick={() => handleDeleteOrder(order)}
                              aria-label={`Delete order ${order.id}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && pageInfo.totalElements > 0 && (
              <div className="panel__footer">
                <span>
                  Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, pageInfo.totalElements)} of {pageInfo.totalElements} orders
                </span>
                {pageInfo.totalElements > 0 && (
                  <div className="pagination">
                    <label className="page-size-control">
                      <span>Rows</span>
                      <select aria-label="Orders per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                        {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </label>
                    <button type="button" disabled={currentPage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button>
                    <span>Page {currentPage + 1} of {pageCount}</span>
                    <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Next</button>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="panel create-panel">
            <div className="create-panel__icon"><Icon name="plus" size={19} /></div>
            <span className="eyebrow">QUICK ACTION</span>
            <h2>{editingOrderId !== null ? 'Edit order' : 'Create an order'}</h2>
            <p className="create-panel__intro">
              {!isOnline || ordersFromCache
                ? 'Reconnect to the backend to create or edit orders.'
                : editingOrderId !== null ? `Update the details for order #${editingOrderId}.` : 'Add a new order to your workspace. It’ll show up in your list straight away.'}
            </p>
            <form className="form-stack order-form" onSubmit={handleOrderSubmit}>
              <label className="field">
                <span>Product name</span>
                <input
                  placeholder="e.g. Studio headphones"
                  required
                  disabled={!isOnline || ordersFromCache}
                  value={form.productName}
                  onChange={(event) => setForm({ ...form, productName: event.target.value })}
                />
              </label>
              <div className="form-row">
                <label className="field">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    disabled={!isOnline || ordersFromCache}
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Unit price</span>
                  <span className="price-input"><span>$</span><input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={!isOnline || ordersFromCache}
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                  /></span>
                </label>
              </div>
              <label className="field">
                <span>Order notes <span className="field__optional">Optional</span></span>
                <textarea
                  maxLength={500}
                  rows={3}
                  disabled={!isOnline || ordersFromCache}
                  placeholder="Add delivery instructions or other details"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
                <span className="field__hint">{form.notes.length}/500 characters</span>
              </label>
              <button className="button button--primary button--wide create-submit" type="submit" disabled={!isOnline || ordersFromCache || submitting}>
                <Icon name="plus" size={17} />{submitting ? 'Saving...' : editingOrderId !== null ? 'Save changes' : 'Add order'}
              </button>
              {editingOrderId !== null && (
                <button className="button button--cancel button--wide" type="button" onClick={cancelEditing} disabled={submitting}>
                  Cancel editing
                </button>
              )}
            </form>
            <div className="create-panel__note"><Icon name="check" size={15} /> Changes are saved to your account.</div>
          </aside>
        </div>
        <footer className="dashboard-footer"><Brand /><span>Made for a smoother workday.</span></footer>
      </main>
      ) : <Navigate to="/" replace />}
    </div>
  );
}

export default App;
