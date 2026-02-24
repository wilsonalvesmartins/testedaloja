import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Lock, Plus, Edit, Trash2, LogOut, MessageCircle, ArrowLeft, CheckCircle, Image as ImageIcon, Package, Tag, DollarSign, ClipboardList, Layers, FileText, Search, AlertCircle } from 'lucide-react';

// --- DADOS INICIAIS ---
const defaultCategories = [
  { id: 1, name: 'Camisetas' },
  { id: 2, name: 'Calças' }
];

const defaultProducts = [
  { id: 1, name: "Camiseta Básica Algodão Premium", price: 59.90, promoPrice: null, stock: 15, sizes: [{name: 'P', stock: 5}, {name: 'M', stock: 5}, {name: 'G', stock: 3}, {name: 'GG', stock: 2}], image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80", category: "Camisetas" },
  { id: 2, name: "Calça Jeans Skinny Lavagem Escura", price: 149.90, promoPrice: 129.90, stock: 8, sizes: [{name: '36', stock: 2}, {name: '38', stock: 3}, {name: '40', stock: 2}, {name: '42', stock: 1}], image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80", category: "Calças" }
];

// --- FUNÇÕES AUXILIARES ---
const getProductStock = (product) => {
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes.reduce((acc, size) => acc + (parseInt(size.stock) || 0), 0);
  }
  return parseInt(product.stock) || 0;
};

const getSizeStock = (product, sizeName) => {
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const size = product.sizes.find(s => s.name === sizeName);
    return size ? (parseInt(size.stock) || 0) : 0;
  }
  return parseInt(product.stock) || 0;
};

// Segurança extra para evitar quebras por dados corrompidos no cache
const parseStorageArray = (key, defaultVal) => {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : defaultVal;
    }
    return defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

export default function App() {
  // --- ESTADOS GLOBAIS ---
  const [view, setView] = useState('store'); 
  const [cart, setCart] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ cpf: '', name: '', phone: '' });
  
  // Modais
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelJustification, setCancelJustification] = useState('');

  // Estados dos Dados (Armazenados localmente com segurança Array)
  const [products, setProducts] = useState(() => parseStorageArray('loja_products', defaultProducts));
  const [orders, setOrders] = useState(() => parseStorageArray('loja_orders', []));
  const [categories, setCategories] = useState(() => parseStorageArray('loja_categories', defaultCategories)); 

  // Estados do Painel Admin 
  const [adminTab, setAdminTab] = useState('orders');
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', promoPrice: '', stock: '', sizes: [], image: '', category: '' });
  const [newCategoryName, setNewCategoryName] = useState('');

  // Estados para "Meus Pedidos" e "Admin Login"
  const [searchCpf, setSearchCpf] = useState('');
  const [foundOrders, setFoundOrders] = useState(null);
  const [adminUserForm, setAdminUserForm] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  const storeWhatsApp = "5511999999999"; 

  // --- EFEITOS DE ARMAZENAMENTO LOCAL ---
  useEffect(() => {
    localStorage.setItem('loja_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('loja_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('loja_categories', JSON.stringify(categories));
  }, [categories]);


  // --- BLINDAGEM CONTRA FALHAS (SISTEMA DE AUTO-RECUPERAÇÃO) ---
  const safeRender = (renderFn) => {
    try {
      const component = renderFn();
      return component;
    } catch (err) {
      console.error("Erro Crítico de Renderização:", err);
      return (
        <div className="fixed inset-0 z-[999] bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 border-red-100 text-center">
            <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-gray-900 mb-4">Dados Incompatíveis</h2>
            <p className="text-gray-600 mb-8">
              O sistema encontrou dados de versões antigas armazenados no seu navegador que estão a causar conflito. Clique no botão abaixo para limpar a memória e reparar o sistema imediatamente.
            </p>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              className="w-full bg-red-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-red-700 shadow-lg transition-transform hover:scale-105"
            >
              Reparar Sistema (Apagar Dados Antigos)
            </button>
            <p className="mt-6 text-xs text-gray-400 bg-gray-50 p-3 rounded-lg overflow-hidden text-left font-mono">
              Log: {err.message}
            </p>
          </div>
        </div>
      );
    }
  };

  // --- FUNÇÕES DO CARRINHO ---
  const addToCart = (product, size) => {
    setCart(prev => {
      const cartItemId = `${product.id}-${size || 'unico'}`;
      const existing = prev.find(item => item.cartItemId === cartItemId);
      const maxStock = getSizeStock(product, size);

      if (existing) {
        if (existing.quantity >= maxStock) return prev;
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { cartItemId, product, size, quantity: 1 }];
    });
    setSelectedProductModal(null); 
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const updateCartQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = item.quantity + delta;
        const maxStock = getSizeStock(item.product, item.size);
        if (newQuantity > 0 && newQuantity <= maxStock) {
          return { ...item, quantity: newQuantity };
        }
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((total, item) => {
    const price = item.product.promoPrice || item.product.price;
    return total + (price * item.quantity);
  }, 0);

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  // --- FUNÇÕES DE CHECKOUT ---
  const formatCPF = (val) => {
    let formatted = String(val).replace(/\D/g, '');
    if (formatted.length > 3) formatted = formatted.slice(0,3) + '.' + formatted.slice(3);
    if (formatted.length > 7) formatted = formatted.slice(0,7) + '.' + formatted.slice(7);
    if (formatted.length > 11) formatted = formatted.slice(0,11) + '-' + formatted.slice(11, 13);
    return formatted;
  }

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    const rawCpf = formatted.replace(/\D/g, '');
    setCustomerInfo(prev => ({ ...prev, cpf: formatted }));

    if (rawCpf.length === 11) {
      const previousOrder = orders.find(o => o.customer && String(o.customer.cpfClean) === rawCpf);
      if (previousOrder) {
        setCustomerInfo(prev => ({ ...prev, name: previousOrder.customer.name, phone: previousOrder.customer.phone }));
      }
    }
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const cpfApenasNumeros = String(customerInfo.cpf).replace(/\D/g, '');
    
    const newOrder = {
      id: Date.now().toString(),
      orderNumber: Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
      date: new Date().toISOString(),
      customer: { ...customerInfo, cpfClean: cpfApenasNumeros },
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        size: item.size,
        quantity: item.quantity,
        price: item.product.promoPrice || item.product.price,
        image: item.product.image
      })),
      total: cartTotal,
      status: 'Aguardando Retirada'
    };

    setOrders(prev => [newOrder, ...prev]);

    // Desconta do Estoque
    let updatedProducts = [...products];
    for (const item of cart) {
      const pIndex = updatedProducts.findIndex(p => String(p.id) === String(item.product.id));
      if (pIndex !== -1) {
        let p = { ...updatedProducts[pIndex] };
        if (Array.isArray(p.sizes) && p.sizes.length > 0) {
          p.sizes = p.sizes.map(sz => sz.name === item.size ? { ...sz, stock: Math.max(0, sz.stock - item.quantity) } : sz);
        } else {
          p.stock = Math.max(0, (p.stock || 0) - item.quantity);
        }
        updatedProducts[pIndex] = p;
      }
    }
    setProducts(updatedProducts);
    setView('checkout-success');
  };

  const resetStore = () => {
    setCart([]);
    setCustomerInfo({ cpf: '', name: '', phone: '' });
    setView('store');
  };

  // --- FUNÇÕES DE CANCELAMENTO ---
  const handleConfirmCancel = () => {
    if (!cancelJustification.trim()) {
      alert("Por favor, insira uma justificativa para o cancelamento.");
      return;
    }
    
    // 1. Atualiza status do pedido
    const updatedOrders = orders.map(o => o.id === cancelModalOrder.id ? { ...o, status: 'Cancelado', cancelJustification } : o);
    setOrders(updatedOrders);

    // 2. Retorna produtos ao estoque
    let updatedProducts = [...products];
    for (const item of (cancelModalOrder.items || [])) {
      const pId = item.productId || item.product?.id;
      const pIndex = updatedProducts.findIndex(p => String(p.id) === String(pId));
      if (pIndex !== -1) {
        let p = { ...updatedProducts[pIndex] };
        if (Array.isArray(p.sizes) && p.sizes.length > 0) {
          p.sizes = p.sizes.map(sz => sz.name === item.size ? { ...sz, stock: (parseInt(sz.stock) || 0) + (parseInt(item.quantity) || 0) } : sz);
        } else {
          p.stock = (parseInt(p.stock) || 0) + (parseInt(item.quantity) || 0);
        }
        updatedProducts[pIndex] = p;
      }
    }
    setProducts(updatedProducts);
    
    // Atualiza o modal de pedido se estiver aberto
    if (selectedOrder && selectedOrder.id === cancelModalOrder.id) {
      setSelectedOrder({...cancelModalOrder, status: 'Cancelado', cancelJustification});
    }

    setCancelModalOrder(null);
    setCancelJustification('');
  };

  // --- RENDERS DE INTERFACE ---
  const renderNavbar = () => (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setView('store')}>
            <span className="font-bold text-2xl tracking-tighter text-gray-900 uppercase">Sua<span className="text-rose-600">Loja</span></span>
          </div>
          
          {view !== 'admin-login' && view !== 'admin-dashboard' && (
            <div className="flex items-center space-x-4">
              <button onClick={() => { setView('my-orders'); setFoundOrders(null); setSearchCpf(''); }} className="text-gray-500 hover:text-rose-600 font-medium text-sm flex items-center transition-colors">
                <FileText className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Meus Pedidos</span>
              </button>
              
              <button onClick={() => setView('cart')} className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-rose-600 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  const renderProductModal = () => {
    if (!selectedProductModal) return null;
    const p = selectedProductModal;
    const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
    const totalStock = getProductStock(p);
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-2xl relative max-h-[90vh]">
          <button onClick={() => setSelectedProductModal(null)} className="absolute top-4 right-4 bg-white text-gray-900 p-2 rounded-full shadow-md z-10 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
          
          <div className="w-full md:w-1/2 bg-gray-100 relative h-64 md:h-auto flex-shrink-0">
            <img src={p.image} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          
          <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
            <span className="text-sm text-rose-600 font-bold uppercase tracking-wider mb-2">{p.category}</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">{p.name}</h2>
            
            <div className="mb-6">
              {p.promoPrice ? (
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold text-rose-600">R$ {Number(p.promoPrice).toFixed(2)}</span>
                  <span className="text-lg text-gray-400 line-through mb-1">R$ {Number(p.price).toFixed(2)}</span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-gray-900">R$ {Number(p.price || 0).toFixed(2)}</span>
              )}
            </div>

            <div className="flex-grow">
              <h4 className="font-medium text-gray-900 mb-3">Selecione uma opção para reservar:</h4>
              {hasSizes ? (
                <div className="grid grid-cols-3 gap-3">
                  {p.sizes.map(sz => (
                    <button 
                      key={sz.name}
                      onClick={() => addToCart(p, sz.name)}
                      disabled={parseInt(sz.stock) === 0}
                      className={`py-3 px-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center justify-center
                        ${parseInt(sz.stock) === 0 
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900'}`}
                    >
                      <span className="text-lg">{sz.name}</span>
                      {parseInt(sz.stock) > 0 && parseInt(sz.stock) <= 3 && <span className="text-[10px] text-rose-500 mt-1">Restam {sz.stock}</span>}
                      {parseInt(sz.stock) === 0 && <span className="text-[10px] mt-1">Esgotado</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <button 
                  onClick={() => addToCart(p, '')}
                  disabled={totalStock === 0}
                  className={`w-full py-4 rounded-xl font-bold transition-all
                    ${totalStock === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-rose-600'}`}
                >
                  {totalStock === 0 ? 'Produto Esgotado' : 'Adicionar Tamanho Único'}
                </button>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-6 text-center border-t border-gray-100 pt-6">
               O pagamento só será realizado presencialmente na retirada na loja física.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCancelModal = () => {
    if (!cancelModalOrder) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
          <div className="flex items-center mb-4 text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">Cancelar Reserva</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Pedido <strong>#{cancelModalOrder.orderNumber || cancelModalOrder.id}</strong>. 
            Ao confirmar, os itens voltarão automaticamente para o estoque. Por favor, insira o motivo do cancelamento:
          </p>
          <textarea
            className="w-full border-2 border-gray-200 rounded-xl p-3 mb-4 outline-none focus:border-red-500 transition-colors"
            rows="3"
            placeholder="Ex: Cliente não compareceu, Tempo limite expirado..."
            value={cancelJustification}
            onChange={(e) => setCancelJustification(e.target.value)}
          ></textarea>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setCancelModalOrder(null); setCancelJustification(''); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Voltar</button>
            <button onClick={handleConfirmCancel} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-md">Confirmar Cancelamento</button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrderModal = () => {
    if (!selectedOrder) return null;
    const order = selectedOrder;

    const handleStatusChange = (e) => {
      const newStatus = e.target.value;
      if (newStatus === 'Cancelado' && order.status !== 'Cancelado') {
        setCancelModalOrder(order);
      } else {
        const updatedOrders = orders.map(o => o.id === order.id ? { ...o, status: newStatus } : o);
        setOrders(updatedOrders);
        setSelectedOrder({ ...order, status: newStatus });
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">Reserva #{order.orderNumber || order.id}</h2>
            <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Dados do Cliente</h3>
              <p className="font-bold text-gray-900 text-lg">{order.customer?.name || 'Cliente'}</p>
              <p className="text-gray-600 text-sm">CPF: {order.customer?.cpf || 'Não informado'}</p>
              {order.customer?.phone && (
                <a href={`https://wa.me/55${String(order.customer.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-green-600 font-medium hover:underline flex items-center mt-2 w-max">
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp: {order.customer.phone}
                </a>
              )}
            </div>

            {order.status === 'Cancelado' && order.cancelJustification && (
              <div className="mb-6 bg-red-50 p-4 rounded-2xl border border-red-100">
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" /> Motivo do Cancelamento
                </h3>
                <p className="text-red-700 text-sm">{order.cancelJustification}</p>
              </div>
            )}

            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Itens Reservados</h3>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden mb-6">
              {(order.items || []).map((item, idx) => {
                const itemName = String(item.name || item.product?.name || 'Produto');
                const itemImg = item.image || item.product?.image || '';
                const itemPrice = Number(item.price || item.product?.promoPrice || item.product?.price || 0);
                return (
                  <li key={idx} className="p-4 flex items-center gap-4 bg-white">
                    {itemImg ? <img src={itemImg} className="w-14 h-14 rounded-xl object-cover border border-gray-100" alt="" /> : <div className="w-14 h-14 bg-gray-100 rounded-xl"></div>}
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 line-clamp-1">{itemName}</p>
                      <p className="text-sm text-gray-500">Tam: {item.size || 'Único'} | Qtd: {item.quantity}</p>
                    </div>
                    <span className="font-black text-gray-900 whitespace-nowrap">R$ {(itemPrice * (parseInt(item.quantity)||1)).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between items-center text-xl font-black text-gray-900 mb-6 bg-rose-50 p-4 rounded-2xl text-rose-700">
              <span>Total da Reserva:</span>
              <span>R$ {Number(order.total || 0).toFixed(2)}</span>
            </div>

            {isAdminLoggedIn && (
              <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Atualizar Status da Reserva</label>
                <select 
                  value={order.status || 'Aguardando Retirada'} 
                  onChange={handleStatusChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-gray-900 outline-none font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <option value="Aguardando Retirada">⏳ Aguardando Retirada</option>
                  <option value="Retirado (Pago)">✅ Retirado (Pago)</option>
                  <option value="Cancelado">❌ Cancelado</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStorefront = () => {
    const groupedProducts = categories.map(cat => ({
      ...cat,
      items: products.filter(p => p.category === cat.name)
    })).filter(cat => cat.items.length > 0);

    const uncategorized = products.filter(p => !categories.some(c => c.name === p.category));
    if (uncategorized.length > 0) {
      groupedProducts.push({ id: 'outros', name: 'Outros', items: uncategorized });
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-12 text-center sm:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Nossa Coleção</h1>
          <p className="mt-3 text-base text-gray-500 max-w-2xl">Reserve seus itens favoritos agora e garanta-os. O pagamento é feito apenas na retirada em nossa loja física!</p>
        </div>

        {groupedProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum produto cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {groupedProducts.map(group => (
              <div key={group.id}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-100 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-rose-500" /> {group.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {group.items.map(product => {
                    const totalStock = getProductStock(product);
                    return (
                      <div key={product.id} className="group relative bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer" onClick={() => setSelectedProductModal(product)}>
                        <div className="aspect-w-3 aspect-h-4 bg-gray-50 relative">
                          <img src={product.image} alt={product.name} className="object-cover w-full h-72 sm:h-80 group-hover:scale-105 transition-transform duration-700" />
                          {product.promoPrice && (
                            <div className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg">Promoção</div>
                          )}
                          {totalStock === 0 && (
                            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center backdrop-blur-sm transition-all">
                              <span className="bg-gray-900 text-white text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest shadow-xl">Esgotado</span>
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-grow">
                          <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-rose-600 transition-colors">{product.name}</h3>
                          <div className="mt-auto pt-4 flex items-end justify-between">
                            <div>
                              {product.promoPrice ? (
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-400 line-through">R$ {Number(product.price).toFixed(2)}</span>
                                  <span className="text-xl font-black text-rose-600">R$ {Number(product.promoPrice).toFixed(2)}</span>
                                </div>
                              ) : (
                                <span className="text-xl font-black text-gray-900">R$ {Number(product.price || 0).toFixed(2)}</span>
                              )}
                            </div>
                            <div className="bg-gray-50 p-2 rounded-full group-hover:bg-rose-50 transition-colors">
                              <ShoppingBag className="h-5 w-5 text-gray-400 group-hover:text-rose-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCart = () => (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button onClick={() => setView('store')} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium">
        <ArrowLeft className="h-4 w-4 mr-2" /> Continuar Explorando
      </button>
      
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Sua Reserva</h1>

      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <ShoppingBag className="h-16 w-16 mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 text-lg">Seu carrinho está vazio.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {cart.map(item => {
              const price = Number(item.product.promoPrice || item.product.price || 0);
              return (
                <li key={item.cartItemId} className="p-6 flex flex-col sm:flex-row items-center gap-6 hover:bg-gray-50 transition-colors">
                  <img src={item.product.image} alt={item.product.name} className="w-24 h-24 object-cover rounded-2xl border border-gray-100 shadow-sm" />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-bold text-gray-900">{item.product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Tamanho: <span className="font-medium text-gray-900">{item.size || 'Único'}</span></p>
                    <p className="text-sm text-rose-600 font-medium mt-1">R$ {price.toFixed(2)} / un</p>
                  </div>
                  <div className="flex items-center border border-gray-200 rounded-full bg-white shadow-sm p-1">
                    <button type="button" onClick={() => updateCartQuantity(item.cartItemId, -1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-all"><X className="h-4 w-4" /></button>
                    <span className="px-4 font-bold text-gray-900 w-12 text-center">{item.quantity}</span>
                    <button type="button" onClick={() => updateCartQuantity(item.cartItemId, 1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-all"><Plus className="h-4 w-4" /></button>
                  </div>
                  <div className="text-xl font-black text-gray-900 min-w-[100px] text-right">
                    R$ {(price * item.quantity).toFixed(2)}
                  </div>
                  <button type="button" onClick={() => removeFromCart(item.cartItemId)} className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-full hover:bg-red-50">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              );
            })}
          </ul>
          
          <div className="bg-gray-900 p-8 text-white">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-6">
              <span className="text-lg text-gray-300">Total a pagar na retirada:</span>
              <span className="text-4xl font-extrabold text-white">R$ {Number(cartTotal).toFixed(2)}</span>
            </div>
            
            <form onSubmit={handleCheckout} className="space-y-5">
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                <h4 className="font-bold text-white mb-5 flex items-center"><Lock className="h-4 w-4 mr-2 text-rose-400"/> Identificação</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">CPF (Apenas números)</label>
                    <input 
                      required 
                      type="text" 
                      maxLength="14"
                      value={customerInfo.cpf} 
                      onChange={handleCpfChange} 
                      className="w-full bg-gray-900 border-gray-700 text-white border rounded-xl px-4 py-3 focus:ring-rose-500 focus:border-rose-500 outline-none transition-shadow font-mono" 
                      placeholder="000.000.000-00" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label>
                      <input required type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full bg-gray-900 border-gray-700 text-white border rounded-xl px-4 py-3 focus:ring-rose-500 focus:border-rose-500 outline-none transition-shadow" placeholder="João da Silva" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp de Contato</label>
                      <input required type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full bg-gray-900 border-gray-700 text-white border rounded-xl px-4 py-3 focus:ring-rose-500 focus:border-rose-500 outline-none transition-shadow" placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-rose-600 border border-transparent rounded-2xl shadow-xl py-5 px-4 text-xl font-black text-white hover:bg-rose-500 transition-all transform hover:-translate-y-1 mt-4">
                Confirmar Minha Reserva
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderCheckoutSuccess = () => (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-green-100 mb-8 shadow-inner border-4 border-green-50">
        <CheckCircle className="h-14 w-14 text-green-600" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Reserva Confirmada!</h1>
      <p className="text-lg text-gray-600 mb-8 leading-relaxed">
        Olá <strong>{customerInfo.name}</strong>, seus itens foram separados com sucesso.
      </p>
      
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 mb-8 shadow-sm">
        <h3 className="text-xl font-black text-amber-800 mb-2">Atenção ao Prazo</h3>
        <p className="text-amber-700 text-lg">
          Você tem até <strong>24 horas</strong> para retirar e pagar sua reserva na nossa loja. Após esse prazo, os produtos retornarão ao estoque automaticamente.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center">
        <a 
          href={`https://wa.me/${storeWhatsApp}?text=Olá! Fiz a reserva em nome de ${customerInfo.name} e gostaria de solicitar um prazo maior para retirada. Pode analisar por favor?`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-2xl shadow-lg text-white bg-green-500 hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Pedir mais prazo (WhatsApp)
        </a>
        <button 
          onClick={resetStore}
          className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-900 text-base font-bold rounded-2xl shadow-sm text-gray-900 bg-transparent hover:bg-gray-900 hover:text-white transition-colors"
        >
          Voltar para a Loja
        </button>
      </div>
    </div>
  );

  // --- RENDERS CLIENTE: MEUS PEDIDOS ---
  const renderMyOrders = () => {
    const handleSearch = (e) => {
      e.preventDefault();
      const rawCpf = String(searchCpf).replace(/\D/g, '');
      if(rawCpf.length === 11) {
        const clientOrders = orders.filter(o => o.customer && String(o.customer.cpfClean) === rawCpf);
        setFoundOrders(clientOrders);
      } else {
        alert("Digite um CPF válido com 11 números.");
      }
    };

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button onClick={() => { setView('store'); setFoundOrders(null); setSearchCpf(''); }} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para a loja
        </button>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Meus Pedidos</h1>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 flex-col sm:flex-row">
            <input 
              required 
              type="text" 
              maxLength="14"
              value={searchCpf} 
              onChange={(e) => setSearchCpf(formatCPF(e.target.value))} 
              className="flex-1 border-gray-300 border rounded-xl px-4 py-3 focus:ring-rose-500 focus:border-rose-500 outline-none transition-shadow font-mono" 
              placeholder="Digite seu CPF (000.000.000-00)" 
            />
            <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-600 transition-colors flex justify-center items-center">
              <Search className="h-5 w-5 mr-2" /> Consultar
            </button>
          </form>
        </div>

        {foundOrders !== null && (
          <div>
            {foundOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma reserva encontrada para este CPF.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {foundOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-bold block">Pedido #{order.orderNumber || order.id}</span>
                        <span className="text-sm text-gray-900 font-medium">{order.date ? new Date(order.date).toLocaleString('pt-BR') : ''}</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === 'Cancelado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{order.status}</span>
                    </div>
                    <div className="p-4">
                      {order.status === 'Cancelado' && order.cancelJustification && (
                        <div className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                          <p className="text-sm text-red-800"><strong>Motivo do Cancelamento:</strong> {order.cancelJustification}</p>
                        </div>
                      )}
                      <ul className="divide-y divide-gray-100">
                        {(order.items || []).map((item, idx) => {
                          const itemName = String(item.name || item.product?.name || 'Produto');
                          const itemImg = item.image || item.product?.image || '';
                          const itemPrice = Number(item.price || item.product?.promoPrice || item.product?.price || 0);
                          return (
                            <li key={idx} className="py-3 flex items-center gap-4">
                              {itemImg && <img src={itemImg} className="w-12 h-12 rounded-lg object-cover border border-gray-100" alt="" />}
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{itemName}</p>
                                <p className="text-xs text-gray-500">Tam: {item.size || 'Único'} | Qtd: {item.quantity}</p>
                              </div>
                              <span className="text-sm font-bold text-gray-900">R$ {(itemPrice * (parseInt(item.quantity)||1)).toFixed(2)}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-gray-600 font-medium text-sm">Total da Reserva:</span>
                        <span className="text-xl font-black text-rose-600">R$ {Number(order.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- RENDERS ADMINISTRATIVOS ---
  
  const renderAdminDashboard = () => {
    const handleAddSize = () => setProductForm({ ...productForm, sizes: [...productForm.sizes, { name: '', stock: 0 }] });
    const handleUpdateSize = (index, field, value) => {
      const newSizes = [...productForm.sizes];
      newSizes[index][field] = value;
      setProductForm({ ...productForm, sizes: newSizes });
    };
    const handleRemoveSize = (index) => {
      setProductForm({ ...productForm, sizes: productForm.sizes.filter((_, i) => i !== index) });
    };

    const handleSaveProduct = (e) => {
      e.preventDefault();
      
      const calculatedStock = productForm.sizes.length > 0 
        ? productForm.sizes.reduce((acc, sz) => acc + (parseInt(sz.stock) || 0), 0)
        : (parseInt(productForm.stock) || 0);

      const productData = {
        id: editingProduct ? editingProduct.id : Date.now().toString(),
        name: productForm.name,
        price: parseFloat(productForm.price),
        promoPrice: productForm.promoPrice ? parseFloat(productForm.promoPrice) : null,
        stock: calculatedStock,
        sizes: productForm.sizes.filter(sz => sz.name.trim() !== ''), 
        image: productForm.image || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
        category: productForm.category
      };

      if (editingProduct) {
        setProducts(products.map(p => p.id === editingProduct.id ? productData : p));
      } else {
        setProducts([...products, productData]);
      }
      
      setProductForm({ name: '', price: '', promoPrice: '', stock: '', sizes: [], image: '', category: '' });
      setEditingProduct(null);
      setAdminTab('list');
    };

    const deleteProduct = (id) => {
      if(window.confirm('Tem certeza que deseja remover este produto definitivamente?')) {
        setProducts(products.filter(p => p.id !== id));
      }
    };

    const handleAddCategory = (e) => {
      e.preventDefault();
      if(!newCategoryName.trim()) return;
      setCategories([...categories, { id: Date.now(), name: newCategoryName.trim() }]);
      setNewCategoryName('');
    };

    const deleteCategory = (id) => {
      if(window.confirm('Remover esta coleção? Os produtos não serão deletados, mas ficarão sem categoria.')) {
        setCategories(categories.filter(c => c.id !== id));
      }
    };

    const startEdit = (p) => {
      setEditingProduct(p);
      setProductForm({
        name: p.name, 
        price: p.price, 
        promoPrice: p.promoPrice || '', 
        stock: p.stock, 
        sizes: p.sizes ? [...p.sizes] : [],
        image: p.image, 
        category: p.category
      });
      setAdminTab('add');
    };

    const printOrder = (order) => {
      const printWindow = window.open('', '_blank');
      const orderDate = order.date ? new Date(order.date).toLocaleString('pt-BR') : '';
      const html = `
        <html><head><title>Pedido #${order.orderNumber || order.id}</title>
        <style>
          body{font-family:'Courier New',Courier,monospace;padding:20px;max-width:400px;margin:0 auto;color:#000;}
          h1{font-size:1.2rem;text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;}
          .info{margin-bottom:15px;font-size:0.9rem;}
          .item{display:flex;justify-content:space-between;margin-bottom:5px;font-size:0.9rem;}
          .total{font-weight:bold;font-size:1.2rem;text-align:right;border-top:1px dashed #000;padding-top:10px;margin-top:10px;}
          @media print{body{padding:0;}}
        </style></head><body>
          <h1>SUA LOJA - RESERVA #${order.orderNumber || order.id}</h1>
          <div class="info">
            <strong>Data:</strong> ${orderDate}<br/>
            <strong>Cliente:</strong> ${order.customer?.name || 'Sem nome'}<br/>
            <strong>CPF:</strong> ${order.customer?.cpf || 'Não informado'}<br/>
            <strong>WhatsApp:</strong> ${order.customer?.phone || 'Não informado'}
          </div>
          <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
          ${(order.items || []).map(item => {
            const itemName = String(item.name || item.product?.name || 'Produto');
            const itemPrice = Number(item.price || item.product?.promoPrice || item.product?.price || 0);
            return `
              <div class="item">
                <span>${item.quantity}x ${itemName.length > 15 ? itemName.substring(0, 15) + '...' : itemName} (${item.size || 'Único'})</span>
                <span>R$ ${(itemPrice * item.quantity).toFixed(2)}</span>
              </div>
            `;
          }).join('')}
          <div class="total">TOTAL: R$ ${Number(order.total || 0).toFixed(2)}</div>
          <p style="text-align:center; font-size: 0.8rem; margin-top:20px;">Pagamento a ser realizado na retirada.</p>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    };

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        <div className="w-full md:w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-10 md:min-h-screen sticky top-0">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center"><Package className="mr-2 h-5 w-5 text-rose-500"/> Gestão Local</h2>
            <p className="text-xs text-yellow-400 mt-1 flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>Armazenamento VPS</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setAdminTab('orders')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${adminTab === 'orders' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <ClipboardList className="h-5 w-5 mr-3" /> Reservas
            </button>
            <button onClick={() => setAdminTab('categories')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${adminTab === 'categories' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Layers className="h-5 w-5 mr-3" /> Coleções
            </button>
            <hr className="border-gray-800 my-4" />
            <button onClick={() => {setAdminTab('list'); setEditingProduct(null);}} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${adminTab === 'list' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Tag className="h-5 w-5 mr-3" /> Estoque
            </button>
            <button onClick={() => {setAdminTab('add'); setEditingProduct(null); setProductForm({ name: '', price: '', promoPrice: '', stock: '', sizes: [], image: '', category: '' });}} className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors ${adminTab === 'add' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Plus className="h-5 w-5 mr-3" /> Novo Produto
            </button>
          </nav>
          <div className="p-4 border-t border-gray-800">
            <button onClick={() => {setIsAdminLoggedIn(false); setView('store');}} className="w-full flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-red-900 hover:text-red-200 transition-colors">
              <LogOut className="h-5 w-5 mr-3" /> Sair
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {adminTab === 'orders' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">Reservas Recentes</h3>
                <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full">{orders.length} pedidos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4 font-medium">Pedido / Data</th>
                      <th className="p-4 font-medium">Cliente</th>
                      <th className="p-4 font-medium">Itens</th>
                      <th className="p-4 font-medium">Total</th>
                      <th className="p-4 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">Nenhuma reserva feita ainda.</td></tr>}
                    {orders.map(order => (
                      <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-gray-100 transition-colors cursor-pointer" title="Clique para abrir os detalhes">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">#{order.orderNumber || order.id}</p>
                          <span className="text-xs text-gray-500 block mb-1">{order.date ? new Date(order.date).toLocaleString('pt-PT') : ''}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${order.status === 'Retirado (Pago)' ? 'bg-green-100 text-green-800' : order.status === 'Cancelado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {order.status || 'Aguardando'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{order.customer?.name || 'Sem nome'}</p>
                          <p className="text-xs text-gray-500">{order.customer?.cpf}</p>
                          {order.customer?.phone && (
                            <a href={`https://wa.me/55${String(order.customer.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-green-600 hover:underline">{order.customer.phone}</a>
                          )}
                        </td>
                        <td className="p-4">
                          <ul className="text-xs text-gray-600 space-y-1">
                            {(order.items || []).map((item, idx) => {
                              const itemName = String(item.name || item.product?.name || 'Produto');
                              const itemImg = item.image || item.product?.image || '';
                              return (
                                <li key={idx} className="flex items-center gap-2">
                                  {itemImg && <img src={itemImg} className="w-6 h-6 rounded object-cover" alt="" />}
                                  {item.quantity}x {itemName.length > 15 ? itemName.substring(0,15) + '...' : itemName} <span className="font-bold text-gray-900">({item.size || 'Un'})</span>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                        <td className="p-4 font-black text-gray-900">
                          R$ {Number(order.total || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={(e) => { e.stopPropagation(); printOrder(order); }} className="inline-flex items-center px-4 py-2 bg-gray-900 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                            <Printer className="h-4 w-4 mr-2" /> Imprimir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'categories' && (
            <div className="max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center"><Layers className="h-6 w-6 mr-3 text-rose-500"/> Coleções da Loja</h3>
              
              <form onSubmit={handleAddCategory} className="flex gap-4 mb-8">
                <input required type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border-gray-300 border rounded-xl px-4 py-3 focus:ring-gray-900 focus:border-gray-900 outline-none" placeholder="Nome da Coleção (Ex: Moda Praia)" />
                <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-600 transition-colors">Adicionar</button>
              </form>

              <div className="space-y-3">
                {categories.length === 0 && <p className="text-gray-500 text-sm">Nenhuma coleção cadastrada.</p>}
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-900">{cat.name}</span>
                    <button onClick={() => deleteCategory(cat.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 className="h-5 w-5"/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'list' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">Estoque de Produtos</h3>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{products.length} itens</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4 font-medium">Produto</th>
                      <th className="p-4 font-medium">Variações / Estoque</th>
                      <th className="p-4 font-medium">Preço (R$)</th>
                      <th className="p-4 font-medium">Total Ref.</th>
                      <th className="p-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">Nenhum produto cadastrado.</td></tr>}
                    {products.map(p => {
                      const totalStock = getProductStock(p);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 flex items-center gap-4">
                            <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                            <div>
                              <p className="font-bold text-gray-900 line-clamp-1">{p.name}</p>
                              <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{p.category}</span>
                            </div>
                          </td>
                          <td className="p-4">
                             <div className="text-xs text-gray-600 flex flex-col gap-1">
                               {Array.isArray(p.sizes) && p.sizes.length > 0 
                                 ? p.sizes.map(sz => <span key={sz.name} className="bg-white border border-gray-200 px-2 py-1 rounded inline-block mb-1 mr-1"><strong>{sz.name}</strong>: {sz.stock} un.</span>)
                                 : <span className="bg-white border border-gray-200 px-2 py-1 rounded inline-block">Tamanho Único</span>}
                             </div>
                          </td>
                          <td className="p-4">
                            {p.promoPrice ? (
                              <div>
                                <span className="text-rose-600 font-black">{Number(p.promoPrice).toFixed(2)}</span>
                                <span className="text-xs text-gray-400 line-through block">{Number(p.price).toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-900 font-bold">{Number(p.price || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${totalStock > 5 ? 'bg-green-100 text-green-800' : totalStock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {totalStock} un.
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => startEdit(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors mr-2"><Edit className="h-5 w-5" /></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-colors"><Trash2 className="h-5 w-5" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'add' && (
            <div className="max-w-3xl bg-white rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h3>
              <form onSubmit={handleSaveProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                    <input required type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full border-gray-300 border rounded-xl px-4 py-3 focus:ring-gray-900 focus:border-gray-900 outline-none" placeholder="Ex: Vestido Longo Estampado" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coleção / Categoria</label>
                    <select required value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full border-gray-300 border rounded-xl px-4 py-3 focus:ring-gray-900 focus:border-gray-900 outline-none bg-white">
                      <option value="" disabled>Selecione uma coleção</option>
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      {categories.length === 0 && <option value="Geral">Geral (Crie categorias na outra aba)</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><DollarSign className="h-4 w-4 mr-1 text-gray-400"/> Preço Original (R$)</label>
                    <input required type="number" step="0.01" min="0" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full border-gray-300 border rounded-xl px-4 py-3 focus:ring-gray-900 focus:border-gray-900 outline-none" placeholder="99.90" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Tag className="h-4 w-4 mr-1 text-rose-500"/> Preço Promocional (Opcional - Deixe em branco se não houver)</label>
                    <input type="number" step="0.01" min="0" value={productForm.promoPrice} onChange={e => setProductForm({...productForm, promoPrice: e.target.value})} className="w-full border-gray-300 border rounded-xl px-4 py-3 focus:ring-rose-500 focus:border-rose-500 outline-none" placeholder="R$ 0,00" />
                  </div>

                  <div className="md:col-span-2 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                      <label className="block text-base font-bold text-gray-900">Variações e Estoque</label>
                      <button type="button" onClick={handleAddSize} className="text-sm text-rose-600 hover:text-white font-bold flex items-center bg-rose-100 hover:bg-rose-600 px-4 py-2 rounded-xl transition-all shadow-sm">
                        <Plus className="h-4 w-4 mr-1"/> Adicionar Tamanho
                      </button>
                    </div>
                    
                    {productForm.sizes.length === 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Este produto não possui tamanhos. Qual o estoque total?</label>
                        <input type="number" min="0" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} className="w-full border-gray-300 border rounded-xl px-4 py-3 focus:ring-gray-900 focus:border-gray-900 outline-none bg-white" placeholder="0" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {productForm.sizes.map((sz, idx) => (
                          <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-400 mb-1 ml-1">Nome do Tamanho</label>
                              <input required type="text" value={sz.name} onChange={e => handleUpdateSize(idx, 'name', e.target.value)} placeholder="Ex: P, M, 38..." className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none focus:border-gray-900" />
                            </div>
                            <div className="w-32">
                              <label className="block text-xs text-gray-400 mb-1 ml-1">Quantidade</label>
                              <input required type="number" min="0" value={sz.stock} onChange={e => handleUpdateSize(idx, 'stock', e.target.value)} placeholder="0" className="w-full border-gray-200 border rounded-xl px-4 py-2 outline-none focus:border-gray-900" />
                            </div>
                            <button type="button" onClick={() => handleRemoveSize(idx)} className="mt-5 p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors" title="Remover Tamanho">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><ImageIcon className="h-4 w-4 mr-1 text-gray-400"/> URL da Imagem (Link da Web)</label>
                    <input required type="url" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} className="w-full border-gray-300 border rounded-xl px-4 py-3 focus:ring-gray-900 focus:border-gray-900 outline-none" placeholder="https://..." />
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                  <button type="button" onClick={() => {setAdminTab('list'); setEditingProduct(null);}} className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-rose-600 transition-colors">
                    {editingProduct ? 'Salvar Alterações' : 'Publicar Produto'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminLogin = () => {
    const handleLogin = (e) => {
      e.preventDefault();
      if (adminUserForm === 'administrador' && adminPass === '93281434@Neto@') {
        setIsAdminLoggedIn(true);
        setView('admin-dashboard');
        setAdminError('');
      } else {
        setAdminError('Credenciais inválidas.');
      }
    };

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gray-900 py-8 text-center">
            <Lock className="h-12 w-12 text-rose-500 mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Acesso Gerencial</h2>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {adminError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center font-bold border border-red-100">{adminError}</div>}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Usuário</label>
              <input type="text" value={adminUserForm} onChange={e => setAdminUserForm(e.target.value)} className="w-full border-gray-300 border-2 rounded-xl px-4 py-3 focus:ring-0 focus:border-rose-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Senha</label>
              <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full border-gray-300 border-2 rounded-xl px-4 py-3 focus:ring-0 focus:border-rose-500 outline-none transition-colors" />
            </div>
            <button type="submit" className="w-full bg-gray-900 text-white rounded-xl py-4 font-extrabold hover:bg-rose-600 transition-colors shadow-lg mt-4">
              Entrar no Painel
            </button>
            <button type="button" onClick={() => { setView('store'); setAdminError(''); }} className="w-full text-gray-400 font-medium text-sm hover:text-gray-900 mt-2">
              Voltar para a loja
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --- RENDEREIZAÇÃO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 relative">
      {view !== 'admin-dashboard' && view !== 'admin-login' && safeRender(renderNavbar)}
      
      <main className="flex-grow">
        {view === 'store' && safeRender(renderStorefront)}
        {view === 'cart' && safeRender(renderCart)}
        {view === 'checkout-success' && safeRender(renderCheckoutSuccess)}
        {view === 'my-orders' && safeRender(renderMyOrders)}
        {view === 'admin-login' && safeRender(renderAdminLogin)}
        {view === 'admin-dashboard' && (isAdminLoggedIn ? safeRender(renderAdminDashboard) : safeRender(renderAdminLogin))}
      </main>

      {/* MODAIS SOBREPOSTOS */}
      {safeRender(renderProductModal)}
      {safeRender(renderOrderModal)}
      {safeRender(renderCancelModal)}

      {view !== 'admin-dashboard' && (
        <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 text-center sm:text-left">
              © {new Date().getFullYear()} SuaLoja. Todos os direitos reservados.<br/>
              <span className="text-xs">Reservas válidas por 24h. Pagamento presencial.</span>
            </p>
            <button onClick={() => setView('admin-login')} className="text-gray-300 hover:text-gray-900 transition-colors p-3 bg-gray-50 rounded-full" title="Acesso Restrito">
              <Lock className="h-4 w-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
