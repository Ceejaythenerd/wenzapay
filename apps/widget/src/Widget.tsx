import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collectFingerprint } from './utils/fingerprint';
import styles from './Widget.module.css';

interface WidgetProps {
  apiKey: string;
  amount: string;
  currency: string;
  reference: string;
  apiBaseUrl: string;
}

export default function Widget({ apiKey, amount, currency, reference, apiBaseUrl }: WidgetProps) {
  const [step, setStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [quote, setQuote] = useState<number | null>(null);
  
  const [paymentData, setPaymentData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const isTestMode = apiKey.startsWith('wpay_test_');

  useEffect(() => {
    let timer: any;
    if (step === 3 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && step === 3) {
      setStep(5); // Timeout
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    let isActive = true;
    let timerId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (!isActive) return;
      try {
        const res = await fetch(`${apiBaseUrl}/api/payments/${paymentData.id}/status`);
        const data = await res.json();
        if (data.status === 'confirmed') {
          setStep(6);
          // @ts-ignore
          if (window.WenzaPay?.dispatchEvent) {
            // @ts-ignore
            window.WenzaPay.dispatchEvent('payment.confirmed', data);
          }
        } else if (data.status === 'failed') {
          setStep(5);
        } else if (isActive) {
          timerId = setTimeout(poll, 5000);
        }
      } catch (err) {
        console.error('Polling failed', err);
        if (isActive) timerId = setTimeout(poll, 5000);
      }
    };

    if (step === 4 && paymentData?.id) {
      poll();
    }

    return () => {
      isActive = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [step, paymentData, apiBaseUrl]);

  const selectChain = async (chain: string) => {
    setSelectedChain(chain);
    try {
      const res = await fetch(`${apiBaseUrl}/api/tokens?chain=${chain}`);
      const data = await res.json();
      setTokens(data);
      const defaultToken = data.find((t:any) => t.symbol === 'USDC') || data[0];
      setSelectedToken(defaultToken.symbol);
      await fetchQuote(defaultToken.symbol);
      setStep(2);
    } catch (err) {
      alert('Error fetching tokens');
      setSelectedChain(null);
    }
  };

  const fetchQuote = async (symbol: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/quote?amount_usd=${amount}&symbol=${symbol}`);
      const data = await res.json();
      setQuote(data.cryptoAmount);
    } catch (err) {
      console.error('Error fetching quote', err);
    }
  };

  const handleTokenChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const symbol = e.target.value;
    setSelectedToken(symbol);
    await fetchQuote(symbol);
  };

  const createPayment = async () => {
    try {
      const fp = await collectFingerprint();
      const res = await fetch(`${apiBaseUrl}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        // We pass the quoted crypto amount and selected token in a real integration.
        // For MVP, backend trusts `amount` usd and we let the listener handle swap if sent token != USDC.
        body: JSON.stringify({ amount, chain: selectedChain, ref: reference, fingerprint: fp, token: selectedToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');
      
      setPaymentData(data);
      setStep(3);
    } catch (err: any) {
      alert(`Error creating payment: ${err.message}`);
    }
  };

  const copyAddress = () => {
    if (paymentData?.stealth_address) {
      navigator.clipboard.writeText(paymentData.stealth_address);
      alert('Address copied to clipboard');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.widgetContainer}>
      {isTestMode && <div className={styles.testBanner}>Test Mode</div>}
      <div className={styles.header}>
        <h2>WenzaPay Checkout</h2>
        <span>{amount} {currency}</span>
      </div>

      <div className={styles.content}>
        {step === 1 && (
          <div>
            <p style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '14px' }}>Select Network:</p>
            <div className={styles.chainList}>
              <button className={styles.chainButton} onClick={() => selectChain('solana')}>
                <div>
                  <div className={styles.chainName}>Solana</div>
                  <div className={styles.chainDetails}>Fast, ~0.01 fee</div>
                </div>
              </button>
              <button className={styles.chainButton} onClick={() => selectChain('polygon')}>
                <div>
                  <div className={styles.chainName}>Polygon</div>
                  <div className={styles.chainDetails}>~0.05 fee</div>
                </div>
              </button>
              <button className={styles.chainButton} onClick={() => selectChain('tron')}>
                <div>
                  <div className={styles.chainName}>Tron</div>
                  <div className={styles.chainDetails}>~1.00 fee</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.center}>
            <p style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '14px' }}>Select Token to Pay With:</p>
            <select 
              value={selectedToken} 
              onChange={handleTokenChange}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155', marginBottom: '16px', fontSize: '16px' }}
            >
              {tokens.map(t => (
                <option key={t.symbol} value={t.symbol}>{t.name} ({t.symbol})</option>
              ))}
            </select>
            
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>You Pay:</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{quote ? quote.toFixed(4) : '...'} {selectedToken}</div>
            </div>

            <button 
              className={styles.copyButton} 
              onClick={createPayment}
              style={{ background: '#7C3AED', color: 'white', border: 'none' }}
            >
              Proceed to Payment
            </button>
            <button style={{marginTop:'16px', background:'transparent', color:'#94a3b8', border:'none', cursor:'pointer'}} onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        )}

        {step === 3 && paymentData && (
          <div className={styles.center}>
            <div className={styles.amount}>
              {quote ? quote.toFixed(4) : paymentData.amount_crypto || amount} {selectedToken}
            </div>
            
            <div className={styles.qrContainer}>
              <QRCodeSVG value={paymentData.stealth_address} size={180} />
            </div>
            
            <div className={styles.addressBox}>
              {paymentData.stealth_address}
            </div>
            
            <button className={styles.copyButton} onClick={copyAddress}>
              Copy Address
            </button>
            
            <div className={styles.timer}>
              Awaiting payment... {formatTime(timeLeft)}
            </div>

            <button style={{marginTop:'16px', background:'transparent', color:'#94a3b8', border:'none', cursor:'pointer'}} onClick={() => setStep(4)}>
              [Simulate Send (Dev)]
            </button>
          </div>
        )}

        {step === 4 && (
          <div className={styles.center}>
            <div className={styles.spinner}></div>
            <p>Confirming on {selectedChain}...</p>
          </div>
        )}

        {step === 5 && (
          <div className={styles.center}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>Session expired or failed.</p>
            <button className={styles.copyButton} onClick={() => { setStep(1); setTimeLeft(15*60); }}>
              Try Again
            </button>
          </div>
        )}

        {step === 6 && (
          <div className={styles.center}>
            <div className={styles.successIcon}>✓</div>
            <h3>Payment Confirmed</h3>
            <p style={{color: '#94a3b8', fontSize: '14px', marginTop: '8px'}}>
              Thank you! Your payment was received.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
