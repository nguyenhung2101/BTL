import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Trash2, Package, DollarSign, FileText, TrendingUp } from "lucide-react";
import api from "../services/api";
import ProductFormModal from '../components/ProductFormModal';

const StockInScreen = () => {
  const [stockIns, setStockIns] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    priceImport: "",
    note: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const stockRes = await api.get("/stockin/items");
      const productRes = await api.get("/products");

      setStockIns(stockRes.data || []);
      setProducts(productRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return stockIns;
    return stockIns.filter((item) => {
      const productName = item.productId?.name || "";
      return productName.toLowerCase().includes(search.toLowerCase());
    });
  }, [stockIns, search]);

  // Tính toán thống kê
  const stats = useMemo(() => {
    const totalItems = filtered.length;
    const totalQuantity = filtered.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = filtered.reduce((sum, item) => sum + (item.quantity || 0) * (item.priceImport || 0), 0);
    return { totalItems, totalQuantity, totalValue };
  }, [filtered]);

  const handleAdd = async () => {
    if (!form.productId || !form.quantity || !form.priceImport) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    try {
      setError("");
      const res = await api.post("/stockin/items", form);
      // Controller returns { message, data: { success, stockInId } }
      const createdId = res?.data?.data?.stockInId || res?.data?.stockInId;
      setShowAdd(false);
      setForm({ productId: "", quantity: "", priceImport: "", note: "" });
      loadData();
      if (createdId) {
        setError(`Thêm thành công. Mã phiếu: ${createdId}`);
        setTimeout(() => setError(''), 4000);
      }
        // Notify other parts of app to refresh products (tồn kho / giá)
        try { window.dispatchEvent(new CustomEvent('products:updated')); } catch(e){}
    } catch (err) {
      console.error("Error adding item:", err);
      setError(err.response?.data?.message || "Không thể thêm chi tiết nhập kho.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa?")) return;
    
    try {
      setError("");
      await api.delete(`/stockin/items/${id}`);
      loadData();
    } catch (err) {
      console.error("Error deleting item:", err);
      setError(err.response?.data?.message || "Không thể xóa chi tiết nhập kho.");
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] rounded-xl shadow-lg">
                  <Package className="text-white" size={32} />
                </div>
                Nhập Kho
              </h1>
              <p className="text-gray-600 ml-16">Quản lý chi tiết nhập kho sản phẩm</p>
            </div>
            <button
              onClick={() => {
                setShowAdd(true);
                setError("");
              }}
              className="group bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              Nhập hàng mới
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-blue-500 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Tổng sản phẩm</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalItems}</p>
                </div>
                <div className="p-4 bg-blue-100 rounded-xl">
                  <Package className="text-blue-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-green-500 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Tổng số lượng</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalQuantity.toLocaleString("vi-VN")}</p>
                </div>
                <div className="p-4 bg-green-100 rounded-xl">
                  <TrendingUp className="text-green-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-[#D4AF37] hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Tổng giá trị</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalValue.toLocaleString("vi-VN")} đ</p>
                </div>
                <div className="p-4 bg-[#D4AF37]/10 rounded-xl">
                  <DollarSign className="text-[#D4AF37]" size={28} />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md flex items-center gap-3 animate-fade-in">
              <div className="p-2 bg-red-100 rounded-lg">
                <FileText size={20} />
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sản phẩm..."
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all duration-200 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#D4AF37] border-t-transparent mb-4"></div>
              <p className="text-gray-500 text-lg font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                <Package className="text-gray-400" size={48} />
              </div>
              <p className="text-gray-500 text-lg font-medium">Không có dữ liệu nhập kho</p>
              <p className="text-gray-400 text-sm mt-2">Hãy thêm sản phẩm mới để bắt đầu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Sản phẩm
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Số lượng
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Giá nhập
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ghi chú
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((item, index) => (
                    <tr 
                      key={item._id} 
                      className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                            <Package className="text-blue-600" size={18} />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {item.productId?.name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-green-100 text-green-800">
                          {item.quantity || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.priceImport
                            ? `${item.priceImport.toLocaleString("vi-VN")} đ`
                            : "0 đ"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {item.note || <span className="text-gray-400 italic">Không có ghi chú</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 group/btn"
                          title="Xóa"
                        >
                          <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdd(false);
              setError("");
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all duration-300 scale-100 border-t-4 border-[#D4AF37]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] rounded-lg">
                  <Plus className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Nhập hàng mới</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <FileText size={16} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sản phẩm  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all duration-200 bg-white"
                  placeholder=""
                  value={form.productId}
                  onChange={(e) => {
                    setForm({ ...form, productId: e.target.value });
                    setError("");
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={()=>setShowProductModal(true)} className="text-sm text-blue-600 hover:underline">Tạo sản phẩm mới</button>
                  <span className="text-xs text-gray-400">|</span>
                  <button type="button" onClick={loadData} className="text-sm text-gray-600 hover:underline">Làm mới danh sách</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số lượng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all duration-200"
                  placeholder="Nhập số lượng"
                  value={form.quantity}
                  onChange={(e) => {
                    setForm({ ...form, quantity: e.target.value });
                    setError("");
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giá nhập <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">đ</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all duration-200"
                    placeholder="Nhập giá nhập"
                    value={form.priceImport}
                    onChange={(e) => {
                      setForm({ ...form, priceImport: e.target.value });
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ghi chú <span className="text-gray-400 text-xs">(tùy chọn)</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all duration-200 resize-none"
                  placeholder="Nhập ghi chú nếu có..."
                  rows="3"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setError("");
                  setForm({ productId: "", quantity: "", priceImport: "", note: "" });
                }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleAdd}
                className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}
      <ProductFormModal open={showProductModal} onClose={()=>setShowProductModal(false)} onSaved={async (payload)=>{
        // reload products and set created id into form so user can continue nhập kho
        try {
          const productRes = await api.get('/products');
          setProducts(productRes.data || []);
        } catch (err) {
          // ignore
        }
        setForm(f => ({ ...f, productId: payload.id }));
        setShowProductModal(false);
        setError(`Đã tạo sản phẩm ${payload.id}`);
        setTimeout(()=>setError(''), 3000);
      }} />
      </div>
    </>
  );
};

export default StockInScreen;
