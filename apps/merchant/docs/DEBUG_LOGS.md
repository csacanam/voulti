# Debug Logs Guide

Esta guía te ayuda a entender todos los logs que se imprimen durante el proceso de creación de un payout con post-hook.

## 🔍 Qué Buscar en la Consola

### 1. Creación del Post-Hook

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 Creating Vault Post-Hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payout data: {
  id: "660e8400-...",
  to_chain: 42220,
  to_token_symbol: "cCOP",  ← ⚠️ IMPORTANTE: Debe coincidir exactamente
  to_token_address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
  from_address: "0xd9ceee7c37e577a19a9b82a6a8d3bdb9203ebbfd"
}

Vault lookup: {
  chainId: 42220,
  tokenSymbol: "cCOP",
  vaultFound: true,  ← ⚠️ DEBE SER TRUE
  vaultAddress: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8"
}

Encoding deposit() with args: [
  "0xd9ceee7c37e577a19a9b82a6a8d3bdb9203ebbfd",  // commerce
  "0",  // amount placeholder
  "660e8400-..."  // payoutId
]

CallData encoded: 0x6f0c...  ← El callData completo

✅ Post-hook created successfully:
  - Vault: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8
  - Commerce: 0xd9ceee7c37e577a19a9b82a6a8d3bdb9203ebbfd
  - PayoutId: 660e8400-...
  - Token: 0x8A567e2aE79CA692Bd748aB832081C45de4041eA
  - CallType: FULL_TOKEN_BALANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**✅ Si ves esto:** Post-hook generado correctamente
**❌ Si ves "NO VAULT CONFIGURED":** El vault no existe para ese token/chain

---

### 2. Creación de Route Parameters

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Creating Route Parameters
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Amount conversion: {
  original: 0.1,
  decimals: 6,
  converted: "100000"
}

📍 Route destination decision:
  - postHook exists: true  ← ⚠️ DEBE SER TRUE
  - postHook.target: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8  ← Vault
  - provided toAddress: N/A
  - fallback (from_address): 0xd9ceee7c...
  - FINAL toAddress: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8  ← VAULT!

✅ Post-hook WILL BE ADDED to params
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**✅ Si ves "FINAL toAddress" = vault address:** Correcto
**❌ Si ves "FINAL toAddress" = merchant address:** Post-hook no se agregó

---

### 3. Request a Squid API

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 SQUID API - Getting Route
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Request Parameters: {
  "fromAddress": "0xd9ceee7c...",
  "fromChain": "42161",
  "fromToken": "0x...",
  "fromAmount": "100000",
  "toChain": "42220",
  "toToken": "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
  "toAddress": "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",  ← Vault
  "enableForecall": true,
  "quoteOnly": false,
  "postHook": {  ← ⚠️ ESTO DEBE EXISTIR
    "chainType": "evm",
    "callType": "FULL_TOKEN_BALANCE",
    "target": "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",
    "value": "0",
    "callData": "0x6f0c...",
    "payload": {
      "tokenAddress": "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
      "inputPos": 1
    },
    "estimatedGas": "200000",
    "description": "Deposit cCOP to PayoutVault..."
  }
}

🎯 POST-HOOK DETECTED:  ← ⚠️ ESTO DEBE APARECER
  - chainType: evm
  - callType: FULL_TOKEN_BALANCE
  - target (vault): 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8
  - tokenAddress: 0x8A567e2aE79CA692Bd748aB832081C45de4041eA
  - inputPos: 1
  - estimatedGas: 200000
  - callData length: 324 chars
  - callData (first 66 chars): 0x6f0c...
  - callData (full): 0x6f0c... [completo]

✅ Squid Route Response:
  - requestId: abc-123-xyz
  - routeFound: true
  - toAddress: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8
  - estimatedDuration: 180 seconds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**✅ Si ves "POST-HOOK DETECTED":** Post-hook enviado a Squid correctamente
**❌ Si ves "NO POST-HOOK in request":** Error - Post-hook no se agregó

---

## 🚨 Problemas Comunes

### Problema 1: "NO VAULT CONFIGURED"

```
❌ NO VAULT CONFIGURED!
   Chain: 42220, Token: CCOP
   Post-hook will NOT be created
```

**Causa:** El `to_token_symbol` del backend no coincide con lo configurado en `vaults.ts`

**Solución:**
- Verifica que el backend retorne `to_token_symbol: "cCOP"` (exacto, case-sensitive)
- Verifica que `vaults.ts` tenga configurado el vault para ese token y chain

---

### Problema 2: "NO POST-HOOK in request"

```
⚠️ NO POST-HOOK in request!
```

**Causa:** El post-hook no se generó o no se agregó a los parámetros

**Solución:**
- Busca el log anterior "NO VAULT CONFIGURED" para ver por qué no se generó
- Verifica que `to_token_symbol` sea correcto

---

### Problema 3: toAddress es merchant en vez de vault

```
📍 Route destination decision:
  - FINAL toAddress: 0xd9ceee7c...  ← Merchant address, no vault!
```

**Causa:** Post-hook es `null`, por lo que usa `from_address` como fallback

**Solución:**
- Revisa por qué el vault no se encontró (logs anteriores)
- Verifica configuración en `vaults.ts`

---

## 📋 Checklist para Debuggear

Cuando hagas un payout, verifica en ORDEN:

### ✅ Paso 1: Post-Hook Generation
- [ ] Aparece "🏦 Creating Vault Post-Hook"
- [ ] `vaultFound: true`
- [ ] `vaultAddress` es el correcto (0x77e94a9BC...)
- [ ] Aparece "✅ Post-hook created successfully"

### ✅ Paso 2: Route Parameters
- [ ] `postHook exists: true`
- [ ] `FINAL toAddress` es el vault (no merchant)
- [ ] Aparece "✅ Post-hook WILL BE ADDED"

### ✅ Paso 3: Squid API Request
- [ ] Aparece "🎯 POST-HOOK DETECTED"
- [ ] `postHook` está presente en Request Parameters
- [ ] `toAddress` es el vault
- [ ] Squid responde con `routeFound: true`

---

## 📞 Compartir con Squid Team

Si todos los logs anteriores son correctos pero el post-hook no se ejecuta, copia estos logs y compártelos con Squid:

1. **Todo el bloque de "SQUID API - Getting Route"** (incluye post-hook completo)
2. **El `requestId`** de la respuesta
3. **El transaction hash** de Arbitrum
4. **El link de Axelarscan**

Ejemplo de mensaje:

```
Post-hook was sent in route request but didn't execute:

Request ID: abc-123-xyz
Arbitrum TX: 0xf531c4b...
Axelarscan: https://axelarscan.io/gmp/0xf531c4b...

Post-hook details:
- target: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8
- callType: FULL_TOKEN_BALANCE
- callData: 0x6f0c... [full calldata]

Full request params: [paste JSON]
```

---

## 🧪 Testing

Para probar que los logs funcionan:

1. Abre la consola del navegador (F12)
2. Filtra por logs que contengan "━━━" para ver solo nuestros logs importantes
3. Crea un payout
4. Verifica que aparezcan TODOS los logs en el orden correcto

---

## 📝 Información Importante

### Vaults Deployados:

- **cCOP (Celo 42220):** `0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8`
- **cREAL (Celo 42220):** `0x60Eb87BDa27917889B1ED651b3008a9d5cD38833`
- **MXNB (Arbitrum 42161):** `0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8`

### Token Symbols (case-sensitive):

- ✅ `"cCOP"` - Correcto
- ❌ `"CCOP"` - Incorrecto
- ❌ `"ccop"` - Incorrecto

