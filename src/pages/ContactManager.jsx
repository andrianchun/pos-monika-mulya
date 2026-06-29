import React, { useState } from 'react';
import { Edit, Phone, X } from 'lucide-react';
import { playSound } from '../utils/helpers';
import DataTable from '../components/ui/DataTable';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';

export default function ContactManager({ customers, setCustomers, suppliers, setSuppliers, colors, showToast, isSoundOn }) {
  const [tab, setTab] = useState('customer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteContact, setDeleteContact] = useState(null);
  const defaultForm = { name: '', phone: '', address: '', points: 0, distance: 0 };
  const [form, setForm] = useState(defaultForm);

  const handleWA = (phone) => {
      if(!phone || phone === '-') return;
      let num = phone.replace(/\D/g, '');
      if(num.startsWith('0')) num = '62' + num.slice(1);
      window.open(`https://wa.me/${num}`, '_blank');
  };

  const columnsCustomer = [
    { key: 'name', label: 'Nama', render: r => <span className="font-semibold">{r.name} {r.id === 1 ? <span className="text-[10px] text-gray-500 font-normal">(Default)</span> : ''}</span> },
    { key: 'phone', label: 'Telepon', render: r => r.phone !== '-' && r.phone ? <button onClick={(e) => { e.stopPropagation(); playSound('pop', isSoundOn); handleWA(r.phone); }} className="text-green-600 hover:underline flex items-center gap-1 font-semibold"><Phone size={14}/> {r.phone}</button> : '-' },
    { key: 'points', label: 'Poin' },
    { key: 'distance', label: 'Jarak (Km)' }
  ];

  const columnsSupplier = [
    { key: 'name', label: 'Nama', render: r => <span className="font-semibold">{r.name}</span> },
    { key: 'phone', label: 'Telepon', render: r => r.phone !== '-' && r.phone ? <button onClick={(e) => { e.stopPropagation(); playSound('pop', isSoundOn); handleWA(r.phone); }} className="text-green-600 hover:underline flex items-center gap-1 font-semibold"><Phone size={14}/> {r.phone}</button> : '-' },
    { key: 'address', label: 'Alamat' }
  ];

  const handleSave = (e) => {
     e.preventDefault();
     playSound('success', isSoundOn);
     if(tab === 'customer') {
        if(editingId) setCustomers(customers.map(c => c.id === editingId ? { ...c, ...form } : c));
        else setCustomers([{ ...form, id: Date.now() }, ...customers]);
     } else {
        if(editingId) setSuppliers(suppliers.map(s => s.id === editingId ? { ...s, ...form } : s));
        else setSuppliers([{ ...form, id: Date.now() }, ...suppliers]);
     }
     setIsModalOpen(false); showToast('Kontak tersimpan', 'success');
  };

  const handleEdit = (data) => {
     if(data.id === 1 && tab === 'customer') { showToast('Kontak default tidak bisa diedit', 'error'); return; }
     playSound('pop', isSoundOn); setEditingId(data.id); setForm(data); setIsModalOpen(true);
  };
  
  return (
    <div className="h-full flex flex-col relative">
       <div className="flex gap-2 mb-4 shrink-0">
         <button onClick={() => setTab('customer')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${tab==='customer' ? colors.goldBg + ' text-[#18181B]' : colors.panel + ' ' + colors.text + ' border ' + colors.border}`}>Pelanggan</button>
         <button onClick={() => setTab('supplier')} className={`px-4 py-2 font-bold rounded-lg transition-colors ${tab==='supplier' ? colors.goldBg + ' text-[#18181B]' : colors.panel + ' ' + colors.text + ' border ' + colors.border}`}>Supplier</button>
       </div>
       
       <div className="flex-1 overflow-hidden">
         {tab === 'customer' ? (
            <DataTable title="Data Pelanggan" columns={columnsCustomer} data={customers} colors={colors} onAdd={() => { playSound('pop', isSoundOn); setEditingId(null); setForm(defaultForm); setIsModalOpen(true); }} actions={[{icon: Edit, label: 'Edit', colorClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200', onClick: handleEdit}]} onDelete={(row) => { if(row.id === 1) showToast('Kontak default tidak bisa dihapus', 'error'); else { playSound('pop', isSoundOn); setDeleteContact(row); } }} />
         ) : (
            <DataTable title="Data Supplier" columns={columnsSupplier} data={suppliers} colors={colors} onAdd={() => { playSound('pop', isSoundOn); setEditingId(null); setForm(defaultForm); setIsModalOpen(true); }} actions={[{icon: Edit, label: 'Edit', colorClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200', onClick: handleEdit}]} onDelete={(row) => { playSound('pop', isSoundOn); setDeleteContact(row); }} />
         )}
       </div>

       {deleteContact && (
         <DeleteConfirmModal 
            title={`Hapus Data ${tab === 'customer' ? 'Pelanggan' : 'Supplier'}?`} 
            desc={`Yakin ingin menghapus ${deleteContact.name} dari daftar kontak?`} 
            btnText="Hapus"
            onConfirm={() => {
               if(tab === 'customer') setCustomers(customers.filter(c => c.id !== deleteContact.id));
               else setSuppliers(suppliers.filter(s => s.id !== deleteContact.id));
               setDeleteContact(null); showToast('Kontak dihapus', 'success'); playSound('pop', isSoundOn);
            }} 
            onCancel={() => setDeleteContact(null)} 
            colors={colors} isSoundOn={isSoundOn} 
         />
       )}

       {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
             <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className={`text-xl font-bold ${colors.text}`}>{editingId ? 'Edit Kontak' : 'Tambah Kontak'} {tab === 'customer' ? 'Pelanggan' : 'Supplier'}</h3>
                   <button onClick={() => { playSound('pop', isSoundOn); setIsModalOpen(false); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                   <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Lengkap *</label><input type="text" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                   <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nomor Telepon / WA</label><input type="text" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} placeholder="Cth: 081234..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                   <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Alamat Lengkap</label><textarea className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border} resize-none`} rows="2" value={form.address} onChange={e => setForm({...form, address: e.target.value})}></textarea></div>
                   {tab === 'customer' && (
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Jarak (Km)</label><input type="number" step="0.1" className={`w-full p-2.5 rounded-xl border bg-transparent ${colors.text} ${colors.border} outline-none`} value={form.distance} onChange={e => setForm({...form, distance: Number(e.target.value)})} /></div>
                         <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Poin Reward</label><input type="number" className={`w-full p-2.5 rounded-xl border bg-transparent ${colors.text} ${colors.border} outline-none`} value={form.points} onChange={e => setForm({...form, points: Number(e.target.value)})} /></div>
                      </div>
                   )}
                   <div className="flex gap-3 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700 mt-4">
                      <button type="button" onClick={() => { playSound('pop', isSoundOn); setIsModalOpen(false); }} className={`flex-1 py-3 border rounded-xl font-bold ${colors.text} ${colors.border}`}>Batal</button>
                      <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90`}>Simpan</button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}