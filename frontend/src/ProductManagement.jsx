import React, { useEffect, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  fetchProductSummary,
  fetchProducts,
  updateProduct,
  updateProductStock
} from './api';
import './ProductManagement.css';

const emptyProduct = {
  name: '',
  sku: '',
  description: '',
  unitPrice: '',
  stockQuantity: 0,
  lowStockThreshold: 5
};
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const PAGE_SIZE = 25;

function useProducts({ search, page, sort, lowStockOnly, refreshKey }) {
  const [products, setProducts] = useState([]);
  const [pageInfo, setPageInfo] = useState({ totalElements: 0, totalPages: 0, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    fetchProducts({ page, size: PAGE_SIZE, sort, search: debouncedSearch, lowStockOnly })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.content);
        setPageInfo({
          totalElements: result.totalElements,
          totalPages: result.totalPages,
          pageSize: result.size
        });
      })
      .catch((requestError) => {
        if (!cancelled) setLoadError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, sort, debouncedSearch, lowStockOnly, refreshKey]);

  return { products, setProducts, pageInfo, loading, loadError };
}

function useProductSummary(refreshKey) {
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSummaryError('');
    fetchProductSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((requestError) => {
        if (!cancelled) setSummaryError(requestError.message);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { summary, summaryError };
}

function ProductPagination({ pageInfo, page, setPage, loading }) {
  if (pageInfo.totalElements === 0) return null;
  const pageCount = Math.max(pageInfo.totalPages, 1);
  const firstItem = page * PAGE_SIZE + 1;
  const lastItem = Math.min(firstItem + pageInfo.pageSize - 1, pageInfo.totalElements);

  return (
    <div className="panel__footer">
      <span>Showing {firstItem}–{lastItem} of {pageInfo.totalElements} products</span>
      <div className="pagination">
        <button type="button" disabled={loading || page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <span>Page {page + 1} of {pageCount}</span>
        <button type="button" disabled={loading || page >= pageCount - 1} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
    </div>
  );
}

function ProductForm({ product, isOnline, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(product || emptyProduct);
  const isEditing = product !== null;

  useEffect(() => {
    setForm(product || emptyProduct);
  }, [product]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      unitPrice: Number(form.unitPrice),
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold)
    });
  }

  return (
    <form className="product-form panel" onSubmit={submit}>
      <div className="product-form__heading">
        <div>
          <span className="eyebrow">{isEditing ? 'UPDATE CATALOG' : 'NEW CATALOG ITEM'}</span>
          <h2>{isEditing ? 'Edit product' : 'Add a product'}</h2>
        </div>
        <button className="product-close" type="button" onClick={onCancel} aria-label="Close product form">×</button>
      </div>
      <div className="product-form__grid">
        <label className="field">
          <span>Product name</span>
          <input maxLength={120} required disabled={!isOnline} value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label className="field">
          <span>SKU</span>
          <input maxLength={64} required disabled={!isOnline} value={form.sku} onChange={(event) => updateField('sku', event.target.value)} />
        </label>
        <label className="field">
          <span>Unit price</span>
          <input type="number" min="0" step="0.01" required disabled={!isOnline} value={form.unitPrice} onChange={(event) => updateField('unitPrice', event.target.value)} />
        </label>
        <label className="field">
          <span>Stock quantity</span>
          <input type="number" min="0" step="1" required disabled={!isOnline} value={form.stockQuantity} onChange={(event) => updateField('stockQuantity', event.target.value)} />
        </label>
        <label className="field">
          <span>Low-stock alert at</span>
          <input type="number" min="0" step="1" required disabled={!isOnline} value={form.lowStockThreshold} onChange={(event) => updateField('lowStockThreshold', event.target.value)} />
        </label>
        <label className="field product-form__description">
          <span>Description <span className="field__optional">Optional</span></span>
          <textarea maxLength={500} rows={2} disabled={!isOnline} value={form.description || ''} onChange={(event) => updateField('description', event.target.value)} />
        </label>
      </div>
      <div className="product-form__actions">
        <button className="button button--primary" type="submit" disabled={!isOnline || saving}>{saving ? 'Saving…' : isEditing ? 'Save product' : 'Add product'}</button>
        <button className="button button--cancel" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

function ProductSearch({ value, onChange }) {
  return (
    <label className="search-box product-search">
      <span className="sr-only">Search products</span>
      <input
        type="search"
        placeholder="Search by name or SKU"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ProductsPage({ isOnline }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('name-asc');
  const [refreshKey, setRefreshKey] = useState(0);
  const { products, pageInfo, loading, loadError } = useProducts({
    search, page, sort, lowStockOnly: false, refreshKey
  });
  const { summary, summaryError } = useProductSummary(refreshKey);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  async function saveProduct(details) {
    setSaving(true);
    setError('');
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, details);
      } else {
        await createProduct(details);
        setPage(0);
      }
      setRefreshKey((current) => current + 1);
      setEditingProduct(null);
      setFormOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete "${product.name}" from your product catalog?`)) return;
    setActionId(product.id);
    setError('');
    try {
      await deleteProduct(product.id);
      if (products.length === 1 && page > 0) setPage((current) => current - 1);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionId(null);
    }
  }

  function startEditing(product) {
    setEditingProduct({
      ...product,
      unitPrice: String(product.unitPrice),
      description: product.description || ''
    });
    setFormOpen(true);
  }

  useEffect(() => {
    setPage(0);
  }, [search, sort]);

  return (
    <main className="dashboard product-page">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">PRODUCT CATALOG</span>
          <h1>Products, all in one place.</h1>
          <p className="welcome-row__subtitle">Manage your catalog, pricing, and stock alerts.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => { setEditingProduct(null); setFormOpen(true); }} disabled={!isOnline}>
          + Add product
        </button>
      </div>
      {!isOnline && <div className="connection-banner">Reconnect to manage products and inventory.</div>}
      {error && <div className="alert alert--dashboard" role="alert">{error}</div>}
      {loadError && <div className="alert alert--dashboard" role="alert">{loadError}</div>}
      {summaryError && <div className="alert alert--dashboard" role="alert">{summaryError}</div>}

      <section className="product-stats" aria-label="Product summary">
        <article className="panel product-stat"><span>Products</span><strong>{summary?.totalProducts ?? '—'}</strong><small>in your catalog</small></article>
        <article className="panel product-stat"><span>Low stock</span><strong>{summary?.lowStockProducts ?? '—'}</strong><small>at or below alert level</small></article>
        <article className="panel product-stat"><span>Catalog value</span><strong>{summary ? currency.format(summary.totalStockValue) : '—'}</strong><small>based on current stock</small></article>
      </section>

      {formOpen && (
        <ProductForm
          key={editingProduct?.id || 'new-product'}
          product={editingProduct}
          isOnline={isOnline}
          saving={saving}
          onCancel={() => { setFormOpen(false); setEditingProduct(null); }}
          onSubmit={saveProduct}
        />
      )}

      <section className="panel product-list" aria-labelledby="products-title">
        <div className="product-list__heading">
          <div><span className="eyebrow">YOUR CATALOG</span><h2 id="products-title">Products</h2></div>
          <div className="product-list__controls">
            <ProductSearch value={search} onChange={setSearch} />
            <label className="select-control">
              <span>Sort</span>
              <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="price-asc">Price low–high</option>
                <option value="price-desc">Price high–low</option>
                <option value="stock-asc">Stock low–high</option>
                <option value="stock-desc">Stock high–low</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? <div className="loading-state"><span className="spinner" /> Loading products…</div> : loadError ? null : pageInfo.totalElements === 0 ? (
          <div className="empty-state"><h3>{search ? 'No matching products' : 'Your catalog is ready'}</h3><p>{search ? 'Try another product name or SKU.' : 'Add a product to start tracking its stock.'}</p></div>
        ) : (
          <div className="table-scroll">
            <table className="product-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Unit price</th><th>In stock</th><th>Stock health</th><th>Actions</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong>{product.description && <small>{product.description}</small>}</td>
                  <td className="table-muted">{product.sku}</td>
                  <td>{currency.format(product.unitPrice)}</td>
                  <td>{product.stockQuantity}</td>
                  <td><span className={`stock-badge${product.lowStock ? ' stock-badge--low' : ''}`}>{product.lowStock ? 'Low stock' : 'In stock'}</span></td>
                  <td><div className="row-actions">
                    <button className="text-action" type="button" onClick={() => startEditing(product)} disabled={!isOnline}>Edit</button>
                    <button className="text-action text-action--delete" type="button" onClick={() => removeProduct(product)} disabled={!isOnline || actionId === product.id}>{actionId === product.id ? 'Deleting…' : 'Delete'}</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <ProductPagination pageInfo={pageInfo} page={page} setPage={setPage} loading={loading} />
      </section>
    </main>
  );
}

export function InventoryPage({ isOnline }) {
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const { products, setProducts, pageInfo, loading, loadError } = useProducts({
    search, page, sort: 'name-asc', lowStockOnly, refreshKey
  });
  const { summary, summaryError } = useProductSummary(refreshKey);
  const [error, setError] = useState('');
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  async function saveStock(product) {
    const stockQuantity = Number(stockDrafts[product.id] ?? product.stockQuantity);
    setSavingId(product.id);
    setError('');
    try {
      const updated = await updateProductStock(product.id, stockQuantity);
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setRefreshKey((current) => current + 1);
      setStockDrafts((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    setPage(0);
  }, [search, lowStockOnly]);

  return (
    <main className="dashboard product-page">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">INVENTORY</span>
          <h1>Know what’s in stock.</h1>
          <p className="welcome-row__subtitle">Review stock levels and update quantities as items move.</p>
        </div>
      </div>
      {!isOnline && <div className="connection-banner">Reconnect to manage products and inventory.</div>}
      {error && <div className="alert alert--dashboard" role="alert">{error}</div>}
      {loadError && <div className="alert alert--dashboard" role="alert">{loadError}</div>}
      {summaryError && <div className="alert alert--dashboard" role="alert">{summaryError}</div>}

      <section className="product-stats" aria-label="Inventory summary">
        <article className="panel product-stat"><span>Products tracked</span><strong>{summary?.totalProducts ?? '—'}</strong><small>unique catalog items</small></article>
        <article className="panel product-stat"><span>Units in stock</span><strong>{summary?.totalStockUnits ?? '—'}</strong><small>across all products</small></article>
        <article className="panel product-stat"><span>Low stock alerts</span><strong>{summary?.lowStockProducts ?? '—'}</strong><small>at or below threshold</small></article>
        <article className="panel product-stat"><span>Stock value</span><strong>{summary ? currency.format(summary.totalStockValue) : '—'}</strong><small>based on unit price</small></article>
      </section>

      <section className="panel product-list" aria-labelledby="inventory-title">
        <div className="product-list__heading">
          <div><span className="eyebrow">STOCK LEVELS</span><h2 id="inventory-title">Inventory</h2></div>
          <div className="inventory-controls">
            <ProductSearch value={search} onChange={setSearch} />
            <label className="inventory-filter"><input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} /> Low stock only</label>
          </div>
        </div>
        {loading ? <div className="loading-state"><span className="spinner" /> Loading inventory…</div> : loadError ? null : pageInfo.totalElements === 0 ? (
          <div className="empty-state"><h3>{lowStockOnly ? 'No products need restocking' : search ? 'No matching products' : 'No inventory yet'}</h3><p>{lowStockOnly ? 'Everything is above its low-stock threshold.' : 'Add products to your catalog to track their stock.'}</p></div>
        ) : (
          <div className="table-scroll">
            <table className="product-table inventory-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Stock level</th><th>Alert threshold</th><th>Status</th><th>Update stock</th></tr></thead>
              <tbody>{products.map((product) => {
                const draft = stockDrafts[product.id] ?? String(product.stockQuantity);
                return (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td className="table-muted">{product.sku}</td>
                    <td>{product.stockQuantity} {product.stockQuantity === 1 ? 'unit' : 'units'}</td>
                    <td>{product.lowStockThreshold}</td>
                    <td><span className={`stock-badge${product.lowStock ? ' stock-badge--low' : ''}`}>{product.stockQuantity === 0 ? 'Out of stock' : product.lowStock ? 'Low stock' : 'Healthy'}</span></td>
                    <td><form className="stock-update" onSubmit={(event) => { event.preventDefault(); saveStock(product); }}>
                      <label className="sr-only" htmlFor={`stock-${product.id}`}>New stock quantity for {product.name}</label>
                      <input
                        id={`stock-${product.id}`}
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={draft}
                        disabled={!isOnline || savingId === product.id}
                        onChange={(event) => setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))}
                      />
                      <button className="button button--bulk" type="submit" disabled={!isOnline || savingId === product.id || Number(draft) === product.stockQuantity}>
                        {savingId === product.id ? 'Saving…' : 'Save'}
                      </button>
                    </form></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
        <ProductPagination pageInfo={pageInfo} page={page} setPage={setPage} loading={loading} />
      </section>
    </main>
  );
}
