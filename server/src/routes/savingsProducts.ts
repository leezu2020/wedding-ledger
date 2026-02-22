import { Router } from 'express';
import db from '../db/connection';
import { sendError } from '../utils/errorHandler';

const router = Router();

// Helper to calculate summary logic for a single product
function enrichProduct(product: any) {
  // 1. Calculate Maturity Date (start_date + term_months)
  const startDate = new Date(product.start_date);
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + product.term_months);
  const maturityDateStr = maturityDate.toISOString().split('T')[0];

  // 2. Calculate Principal
  // Deposit: amount. Savings Plan: amount * term
  const principal = product.type === 'deposit' 
    ? product.amount 
    : product.amount * product.term_months;

  // 3. Calculate Interest
  let interest = 0;
  const rate = product.interest_rate / 100;
  
  if (product.type === 'deposit') {
    // Deposit (예금): term is in months
    if (product.interest_type === 'simple') {
      interest = principal * rate * (product.term_months / 12);
    } else {
      // Monthly compound interest for deposits
      interest = principal * Math.pow(1 + rate/12, product.term_months) - principal;
    }
  } else {
    // Savings Plan (적금)
    if (product.interest_type === 'simple') {
      // Simple interest savings plan formula: (n * (n+1) / 2) * amount * (r/12)
      const n = product.term_months;
      interest = (n * (n + 1) / 2) * product.amount * (rate / 12);
    } else {
      // Compound interest savings plan
      const r_monthly = rate / 12;
      interest = product.amount * ((Math.pow(1 + r_monthly, product.term_months) - 1) / r_monthly) * (1 + r_monthly) - principal;
    }
  }
  interest = Math.round(interest);

  // 4. Calculate Tax
  let tax = 0;
  if (product.tax_type === '일반과세') {
    tax = Math.round(interest * 0.154);
  } else if (product.tax_type === '세금우대') {
    tax = Math.round(interest * 0.095);
  }

  // 5. Total Amount
  const totalAmount = principal + interest - tax;

  // 6. Paid Info (Count & Total)
  // We look up transactions that use the product's category_id
  let paidCount = 0;
  let txTotal = 0;
  let paidStatus = '-';

  if (product.category_id) {
    const tx = db.prepare('SELECT COUNT(*) as cnt, SUM(amount) as total FROM transactions WHERE category_id = ?').get(product.category_id) as { cnt: number, total: number };
    paidCount = tx.cnt || 0;
    txTotal = tx.total || 0;
  }

  const initialPaid = product.initial_paid || 0;
  const paidTotal = txTotal + initialPaid;

  // For savings plans: calculate elapsed months from start_date
  let elapsedMonths = 0;
  if (product.type === 'savings_plan') {
    const now = new Date();
    const sd = new Date(product.start_date);
    elapsedMonths = (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth());
    elapsedMonths = Math.max(0, Math.min(elapsedMonths, product.term_months));
  }

  // Compute count for savings plans
  const initialPaidCount = product.type === 'savings_plan' && product.amount > 0
    ? Math.round(initialPaid / product.amount)
    : 0;
  const totalPaidCount = paidCount + initialPaidCount;

  if (product.type === 'savings_plan') {
    // If actual paid < expected (amount * elapsedMonths), use elapsed months for count
    // because the payment periods have passed even if user didn't pay fully
    const expectedPaid = product.amount * elapsedMonths;
    const displayCount = paidTotal < expectedPaid ? elapsedMonths : totalPaidCount;
    paidStatus = `${displayCount}/${product.term_months}`;
  } else {
    // Deposit: show elapsed months
    const now = new Date();
    const sd = new Date(product.start_date);
    let elapsed = (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth());
    elapsed = Math.max(0, Math.min(elapsed, product.term_months));
    paidStatus = `${elapsed}/${product.term_months}개월`;
  }

  // For underpaid savings plans: adjust principal and project future totals
  let adjustedPrincipal = principal;
  let adjustedInterest = interest;
  let adjustedTax = tax;
  let adjustedTotalAmount = totalAmount;

  if (product.type === 'savings_plan' && principal > 0) {
    const expectedPaidSoFar = product.amount * elapsedMonths;
    
    if (paidTotal < expectedPaidSoFar) {
      // Missed some payments — reduce principal by missed amount
      // adjustedPrincipal = what was actually paid + what will be paid for remaining months
      const remainingMonths = product.term_months - elapsedMonths;
      adjustedPrincipal = paidTotal + (product.amount * remainingMonths);
      
      // Scale interest proportionally based on adjusted principal
      const ratio = adjustedPrincipal / principal;
      adjustedInterest = Math.round(interest * ratio);
      
      // Recalculate tax on adjusted interest
      if (product.tax_type === '일반과세') {
        adjustedTax = Math.round(adjustedInterest * 0.154);
      } else if (product.tax_type === '세금우대') {
        adjustedTax = Math.round(adjustedInterest * 0.095);
      } else {
        adjustedTax = 0;
      }
      
      // Project total at maturity: adjusted principal + interest - tax
      adjustedTotalAmount = adjustedPrincipal + adjustedInterest - adjustedTax;
    }
  }

  // Time-based progress for deposit
  let progressPercent = 0;
  if (product.type === 'deposit') {
    const now = new Date();
    const sd = new Date(product.start_date);
    let elapsed = (now.getFullYear() - sd.getFullYear()) * 12 + (now.getMonth() - sd.getMonth());
    elapsed = Math.max(0, Math.min(elapsed, product.term_months));
    progressPercent = product.term_months > 0 ? (elapsed / product.term_months) * 100 : 0;
  } else {
    // Savings plan: based on paid amount vs adjusted principal
    progressPercent = adjustedPrincipal > 0 ? (paidTotal / adjustedPrincipal) * 100 : 0;
  }

  return {
    ...product,
    maturity_date: product.maturity_date || maturityDateStr,
    principal: adjustedPrincipal,
    interest: adjustedInterest,
    tax: adjustedTax,
    totalAmount: adjustedTotalAmount,
    paidCount: totalPaidCount,
    paidTotal,
    paidStatus,
    progressPercent
  };
}

// GET /api/savings-products
router.get('/', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM savings_products ORDER BY start_date DESC, id DESC').all();
    const enriched = products.map(enrichProduct);
    res.json(enriched);
  } catch (error) {
    sendError(res, '저축상품 조회 실패', error);
  }
});

// POST /api/savings-products
router.post('/', (req, res) => {
  const { type, bank, name, pay_day, start_date, interest_rate, interest_type, term_months, amount, tax_type, memo, initial_paid } = req.body;

  if (!type || !bank || !start_date || interest_rate === undefined || !term_months || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const typeLabel = type === 'savings_plan' ? '적금' : '예금';
    const categoryMiddle = `${bank}(${typeLabel})`;

    // Use transaction to ensure both category and product are created
    const result = db.transaction(() => {
      // 1. Create or Find Category
      // We create an expense category under '저축'
      let category = db.prepare("SELECT id FROM categories WHERE major = '저축' AND middle = ?").get(categoryMiddle) as { id: number } | undefined;
      
      if (!category) {
        const info = db.prepare(`
          INSERT INTO categories (type, major, middle, minor)
          VALUES ('expense', '저축', ?, NULL)
        `).run(categoryMiddle);
        category = { id: info.lastInsertRowid as number };
      }

      // 2. Create Product
      const stmt = db.prepare(`
        INSERT INTO savings_products (
          type, bank, name, pay_day, start_date, interest_rate, interest_type, 
          term_months, amount, tax_type, category_id, memo, initial_paid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        type, bank, name || null, pay_day || null, start_date, interest_rate, 
        interest_type || 'simple', term_months, amount, tax_type || '일반과세', category.id, memo || null, initial_paid || 0
      );

      return { id: info.lastInsertRowid };
    })();

    res.status(201).json(result);
  } catch (error) {
    sendError(res, '저축상품 생성 실패', error);
  }
});

// PUT /api/savings-products/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { type, bank, name, pay_day, start_date, interest_rate, interest_type, term_months, amount, tax_type, memo, is_active, initial_paid } = req.body;

  if (!type || !bank || !start_date || interest_rate === undefined || !term_months || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE savings_products SET
          type = ?, bank = ?, name = ?, pay_day = ?, start_date = ?, interest_rate = ?, 
          interest_type = ?, term_months = ?, amount = ?, tax_type = ?, memo = ?, is_active = ?, initial_paid = ?
        WHERE id = ?
      `);
      stmt.run(
        type, bank, name || null, pay_day || null, start_date, interest_rate,
        interest_type || 'simple', term_months, amount, tax_type || '일반과세', memo || null, is_active !== undefined ? is_active : 1, initial_paid || 0, id
      );
    })();

    res.json({ id, ...req.body });
  } catch (error) {
    sendError(res, '저축상품 수정 실패', error);
  }
});

// DELETE /api/savings-products/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const info = db.prepare('DELETE FROM savings_products WHERE id = ?').run(id);
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    sendError(res, '저축상품 삭제 실패', error);
  }
});

export default router;
