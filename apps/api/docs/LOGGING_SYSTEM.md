# 📊 Organized Logging System

## 🎯 **Objective**

Centralized and organized logging system to improve visibility and debugging of the Deramp Backend system.

---

## 📐 **Format Standard**

### **Mandatory Structure**

```
[SYSTEM:ACTION] Message { data }
```

### **Components:**

1. **`[SYSTEM:ACTION]`** - Module and action identifier
2. **Emoji** - Visual indicator (✅ success, ❌ error, ⚠️ warning, 🔍 debug, 📊 info)
3. **Message** - Concise description
4. **`{ data }`** - Structured data (optional)

### **Correct Examples:**

```
✅ [WEBHOOK:RECEIVED] Incoming request at 2025-10-30T05:00:00.000Z
📥 [WEBHOOK:PROCESSING] Processing webhook { network: 'CELO_MAINNET', blockNumber: 49899317 }
✅ [DEPOSIT:FUNDED] Payout funded { payoutId: '...', amount: '100 cCOP' }
📧 [EMAIL:SENT] Notification sent { recipient: 'user@email.com' }
❌ [DEPOSIT:ERROR] Processing failed { payoutId: '...', error: 'Database error' }
🔍 [INVOICE:CREATED] New invoice { invoiceId: '...', amount: '1000 USD' }
⚠️ [CRON:STARTED] Email notification batch processing
```

### **Incorrect Examples:**

```
❌ Incoming request (no module)
❌ [WEBHOOK] Processing (no action)
❌ WEBHOOK:RECEIVED Incoming request (no brackets)
❌ [webhook:received] Incoming request (don't use lowercase)
```

---

## 🏗️ **System Modules**

### **Blockchain & Deposits**

- **`WEBHOOK:*`** - Alchemy webhook endpoints
- **`DEPOSIT:*`** - Deposit event processing
- **`VAULT:*`** - Vault operations (legacy)

### **Invoices & Payments**

- **`INVOICE:*`** - Invoice management
- **`EMAIL:*`** - Email notifications (invoices)
- **`URL:*`** - URL confirmations (invoices)

### **Cron Jobs**

- **`CRON:EMAIL`** - Email notification cron
- **`CRON:URL`** - URL confirmation cron
- **`CRON:ORDERS`** - Order expiration cron
- **`CRON:PRICES`** - Token prices update

### **API & System**

- **`API:*`** - API endpoints
- **`DB:*`** - Database operations
- **`AUTH:*`** - Authentication operations
- **`SYSTEM:*`** - System-level events

---

## 📝 **Usage Guide by Module**

### **Webhooks (WEBHOOK:\*)**

```typescript
// ✅ Correct
console.log(
  "🔔 [WEBHOOK:RECEIVED] Incoming request at 2025-10-30T05:00:00.000Z"
);
console.log("📥 [WEBHOOK:PROCESSING] Processing webhook", {
  network: "CELO_MAINNET",
  blockNumber: 123,
});
console.log("✅ [WEBHOOK:DECODED] Decoded Deposit event", {
  payoutId: "...",
  amount: "100 cCOP",
});
console.error("❌ [WEBHOOK:ERROR] Invalid signature", { signature: "..." });

// ❌ Incorrect
console.log("🔔 [WEBHOOK] Incoming request"); // missing action
console.log("[WEBHOOK:RECEIVED] Incoming request"); // missing emoji
```

### **Deposits (DEPOSIT:\*)**

```typescript
// ✅ Correct
console.log("✅ [DEPOSIT:FUNDED] Payout funded", {
  payoutId: "...",
  amount: "100 cCOP",
});
console.log("📧 [DEPOSIT:EMAIL_SENT] Email sent", {
  recipient: "user@email.com",
});
console.error("❌ [DEPOSIT:ERROR] Processing failed", {
  payoutId: "...",
  error: "...",
});

// ❌ Incorrect
console.log("[DEPOSIT] Processing deposit event"); // no specific action
```

### **Invoices (INVOICE:\*)**

```typescript
// ✅ Correct
console.log("🔍 [INVOICE:CREATED] New invoice", {
  invoiceId: "...",
  amount: "1000 USD",
});
console.log("✅ [INVOICE:PAID] Invoice paid", {
  invoiceId: "...",
  txHash: "0x...",
});
console.log("⚠️ [INVOICE:EXPIRED] Invoice expired", { invoiceId: "..." });

// ❌ Incorrect
console.log("📧 [EMAIL] Sending invoice email"); // should be [INVOICE:EMAIL_SENT]
```

### **Cron Jobs (CRON:\*)**

```typescript
// ✅ Correct
console.log("⚠️ [CRON:EMAIL_STARTED] Email notification batch processing");
console.log("✅ [CRON:EMAIL_COMPLETED] Processed 5 emails");
console.log("⚠️ [CRON:URL_STARTED] URL confirmation batch processing");
console.log("✅ [CRON:URL_COMPLETED] Processed 3 confirmations");

// ❌ Incorrect
console.log("📧 Processing pending email notifications..."); // no module
console.log("🔗 Found 0 invoices needing URL confirmations"); // no module
```

### **API Endpoints (API:\*)**

```typescript
// ✅ Correct
console.log("📊 [API:REQUEST] GET /api/invoices", { userId: "..." });
console.log("✅ [API:RESPONSE] 200 OK", { duration: "45ms" });
console.error("❌ [API:ERROR] 500 Internal Server Error", { error: "..." });

// ❌ Incorrect
console.log("Request received"); // no module
```

### **Database (DB:\*)**

```typescript
// ✅ Correct
console.log("📊 [DB:QUERY] Fetching payout", { payoutId: "..." });
console.log("✅ [DB:UPDATED] Payout status updated", {
  payoutId: "...",
  status: "Funded",
});
console.error("❌ [DB:ERROR] Connection failed", { error: "..." });

// ❌ Incorrect
console.log("Database update failed"); // no module
```

---

## 🎨 **System Benefits**

- ✅ **Immediate identification** of module and action
- ✅ **Easy filtering** with grep: `grep "WEBHOOK:" logs.txt`
- ✅ **Consistent format** across the entire system
- ✅ **Visual indicators** with emojis
- ✅ **Efficient debugging** by specific system

---

## 🔍 **Filtering Commands**

### **View only webhooks:**

```bash
grep "WEBHOOK:" logs.txt
```

### **View only errors:**

```bash
grep "❌" logs.txt
```

### **View only deposits:**

```bash
grep "DEPOSIT:" logs.txt
```

### **View only cron jobs:**

```bash
grep "CRON:" logs.txt
```

### **View errors from a specific module:**

```bash
grep "WEBHOOK:" logs.txt | grep "❌"
```

---

## 📚 **References**

### **Files following the standard:**

- ✅ `src/routes/webhooks.ts` - Webhook endpoints
- ✅ `src/blockchain/services/DepositProcessor.ts` - Deposit processing
- ⏳ `src/routes/invoices.ts` - Invoices (pending update)

### **Implementation Checklist:**

When adding new logs:

- [ ] Use format `[SYSTEM:ACTION]`
- [ ] Include appropriate emoji
- [ ] Concise message
- [ ] Structured data (optional)
- [ ] Use uppercase for system and action
- [ ] Test filtering with grep

---

**📅 Last updated:** 2025-10-30  
**👤 Author:** Deramp Backend System  
**🔄 Version:** 2.0.0
