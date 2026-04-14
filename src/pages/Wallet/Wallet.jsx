import React, { useState, useEffect } from 'react';
import Navbar from '../../components/organisms/Navbar/Navbar';
import './Wallet.css';
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Loader2 } from 'lucide-react';
import { fetchTransactions } from '../../services/api';

const Wallet = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await fetchTransactions();
        setTransactions(data);
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const calculateBalance = () => {
    return transactions.reduce((acc, t) => {
      const amount = t.amount || 0;
      return t.type === 'Credit' ? acc + amount : acc - amount;
    }, 0);
  };

  const balance = calculateBalance();

  return (
    <>
      <Navbar />
      <div className="wallet-container">
        <h1 className="page-title">Wallet</h1>
        
        {/* Balance Structure */}
        <div className="balance-card">
           <div className="balance-header">
              <span className="balance-label">Available Balance</span>
              <WalletIcon size={24} color="white" />
           </div>
            <div className="balance-amount">₹{balance.toLocaleString('en-IN')}</div>
            <div className="balance-expiry">Secure transactions with 256-bit encryption</div>
        </div>

        {/* Payment Methods */}
        <div className="section-header">
           <h2>Payment Methods</h2>
           <button className="add-btn"><Plus size={16} /> Add New</button>
        </div>
        
        <div className="cards-grid">
           <div className="payment-method-card">
              <div className="card-logo">VISA</div>
              <div className="card-number">•••• 4242</div>
              <div className="card-expiry">Expires 12/28</div>
           </div>
           
           <div className="payment-method-card mastercard">
              <div className="card-logo">Mastercard</div>
              <div className="card-number">•••• 8899</div>
              <div className="card-expiry">Expires 09/25</div>
           </div>
        </div>

        {/* Transactions */}
        <div className="section-header" style={{marginTop: '40px'}}>
           <h2>Transaction History</h2>
        </div>

        <div className="transactions-list">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
              </div>
            ) : transactions.length > 0 ? (
              transactions.map(t => (
                <div key={t._id} className="transaction-item">
                   <div className={`transaction-icon ${t.type.toLowerCase()}`}>
                      {t.type === 'Credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                   </div>
                   <div className="transaction-info">
                      <div className="t-title">{t.description || t.category}</div>
                      <div className="t-date">{new Date(t.createdAt).toLocaleDateString()}</div>
                   </div>
                   <div className={`t-amount ${t.type.toLowerCase()}`}>
                     {t.type === 'Credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                   </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#717171' }}>
                No transactions found.
              </div>
            )}
         </div>

      </div>
    </>
  );
};

export default Wallet;
