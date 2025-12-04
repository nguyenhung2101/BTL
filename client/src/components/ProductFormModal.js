import React, { useState, useEffect } from 'react';
import api, { createProduct, updateProduct, getCategories, getProducts } from '../services/api';

const ProductFormModal = ({ open, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState({ id: '', name: '', categoryId: '', price: '', costPrice: '', stockQuantity: '', isActive: true, sizes: '', colors: '', material: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) setForm({
      id: initialData.id || '',
      name: initialData.name || '',
      categoryId: initialData.categoryId || '',
      price: initialData.price || '',
      costPrice: initialData.costPrice || '',
      stockQuantity: initialData.stockQuantity || '',
      isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      sizes: initialData.sizes || '',
      colors: initialData.colors || '',
      material: initialData.material || ''
    });
  }, [initialData]);

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);

        // If creating new product (no initialData), auto-generate next product id
        if (!initialData) {
          try {
            const prods = await getProducts();
            let maxNum = 0;
                prods.forEach(p => {
                  const idVal = String(p.id || p.product_id || '');
                  const m = idVal.match(/^PR-?0*(\d+)$/i);
                  if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > maxNum) maxNum = n;
                  }
                });
                const next = String(maxNum + 1).padStart(4, '0');
                setForm(f => ({ ...f, id: `PR-${next}` }));
          } catch (e) {
            // ignore id auto-generation failure
          }
        }
      } catch (err) {
        // ignore
      }
    };
    load();
  }, []);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setLoading(true);
    try {
      const originalStock = Number(form.stockQuantity) || 0;

      // Validate required fields for creation
      if (!initialData) {
        if (!form.categoryId) {
          alert('Danh mục là bắt buộc.');
          setLoading(false);
          return;
        }
        if (!form.price) {
          alert('Giá bán là bắt buộc.');
          setLoading(false);
          return;
        }
        if (!form.costPrice) {
          alert('Giá vốn là bắt buộc.');
          setLoading(false);
          return;
        }
      }

      const payload = {
        id: form.id.trim(),
        name: form.name.trim(),
        categoryId: form.categoryId || null,
        price: Number(form.price) || 0,
        costPrice: Number(form.costPrice) || 0,
        // If creating new and there is initial stock, create product with 0 stock first
        stockQuantity: (initialData && initialData.id) ? Number(form.stockQuantity) || 0 : 0,
        isActive: !!form.isActive,
        sizes: form.sizes || null,
        colors: form.colors || null,
        material: form.material || null,
      };

      let res;
      if (initialData && initialData.id) {
        res = await updateProduct(initialData.id, payload);
        // If editing and user increased stockQuantity, we won't auto-create stock-in here
      } else {
        // CREATE product with zero stock when originalStock > 0 (we will create stock-in entry next)
        res = await createProduct(payload);

        // If user provided initial stock, create a stock-in record to add inventory
        if (originalStock > 0) {
          try {
            await api.post('/stockin/items', {
              productId: payload.id,
              quantity: originalStock,
              priceImport: payload.costPrice || 0,
              note: 'Nhập kho tự động khi tạo sản phẩm'
            });
            // dispatch product update so other pages refresh
            try { window.dispatchEvent(new CustomEvent('products:updated')); } catch (e) {}
          } catch (err) {
            console.error('Failed to create automatic stock-in after creating product', err);
            // Still proceed but inform user
            alert('Sản phẩm được tạo nhưng không tạo được phiếu nhập tự động: ' + (err.response?.data?.message || err.message));
          }
        }
      }

      onSaved && onSaved(payload);
      // notify other components to refresh products
      try { window.dispatchEvent(new CustomEvent('products:updated')); } catch (e) {}
      onClose && onClose();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{initialData ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Mã sản phẩm <span className="text-red-500">*</span></label>
              <input required placeholder="VD: PR-0001" value={form.id} readOnly className="mt-1 block w-full rounded-lg border-2 border-blue-100 px-3 py-2 bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Mã tự sinh theo định dạng <code>PR-0001</code>. Nếu cần mã tuỳ chỉnh, chỉnh sau khi tạo.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tên sản phẩm <span className="text-red-500">*</span></label>
              <input required placeholder="Tên sản phẩm" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="mt-1 block w-full rounded-lg border-2 border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-sm font-medium text-gray-700">Danh mục</label>
              <select value={form.categoryId} onChange={(e)=>setForm({...form,categoryId:e.target.value})} className="mt-1 block w-full appearance-none rounded-lg border-2 border-blue-100 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-800">
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c=> (<option key={c.category_id} value={c.category_id}>{c.category_name}</option>))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Giá bán (VND)</label>
              <div className="mt-1 relative">
                <input type="number" min="0" placeholder="0" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} className="block w-full rounded-lg border-2 border-blue-100 px-3 py-2 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₫</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Giá vốn (VND)</label>
              <div className="mt-1 relative">
                <input type="number" min="0" placeholder="0" value={form.costPrice} onChange={(e)=>setForm({...form,costPrice:e.target.value})} className="block w-full rounded-lg border-2 border-blue-100 px-3 py-2 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₫</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tồn kho</label>
              <input type="number" min="0" placeholder="0" value={form.stockQuantity} onChange={(e)=>setForm({...form,stockQuantity:e.target.value})} className="mt-1 block w-full rounded-lg border-2 border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Kích cỡ (CSV)</label>
              <input placeholder="VD: S,M,L,XL" value={form.sizes} onChange={(e)=>setForm({...form,sizes:e.target.value})} className="mt-1 block w-full rounded-lg border-2 border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <p className="text-xs text-gray-400 mt-1">Nhập danh sách kích cỡ, phân cách bằng dấu phẩy.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Màu sắc (CSV)</label>
              <input placeholder="VD: Đỏ,Đen,Trắng" value={form.colors} onChange={(e)=>setForm({...form,colors:e.target.value})} className="mt-1 block w-full rounded-lg border-2 border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <p className="text-xs text-gray-400 mt-1">Nhập danh sách màu sắc, phân cách bằng dấu phẩy.</p>
            </div>
          </div>

          <div className="mt-2">
            <label className="text-sm font-medium text-gray-700">Chất liệu</label>
            <input placeholder="VD: Cotton" value={form.material} onChange={(e)=>setForm({...form,material:e.target.value})} className="mt-1 block w-full rounded-lg border-2 border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center">
              <input type="checkbox" checked={form.isActive} onChange={(e)=>setForm({...form,isActive:e.target.checked})} className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"/>
              <span className="text-sm text-gray-700">Đang bán</span>
            </label>
            <p className="text-xs text-gray-400">Bỏ chọn để ẩn sản phẩm khỏi cửa hàng.</p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>onClose && onClose()} className="px-4 py-2 border rounded-lg">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow">{loading ? 'Đang lưu...' : (initialData ? 'Lưu' : 'Tạo sản phẩm')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
