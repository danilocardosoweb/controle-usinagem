# 🔧 Diagnóstico: Porta USB Não Detectada

## ✅ Status Atual
- **Backend**: Funcionando ✅
- **Endpoint `/api/print/portas-com`**: Respondendo ✅
- **Portas detectadas**: COM4 (Bluetooth Modem)
- **Porta USB plugada**: NÃO detectada ❌

---

## 🤔 Por que a porta USB não aparece?

Existem 3 possibilidades:

### 1️⃣ **Falta de Driver (MAIS PROVÁVEL)**
A impressora USB precisa de um **driver que crie uma porta COM virtual**.

**Solução:**
- Procure o modelo da impressora (ex: TSC TE200)
- Baixe o driver USB do site do fabricante
- Instale o driver
- Reconecte o cabo USB
- A porta COM deve aparecer em Gerenciador de Dispositivos

### 2️⃣ **Cabo USB Defeituoso**
O cabo pode estar com mau contato.

**Solução:**
- Tente outro cabo USB
- Tente outra porta USB do PC
- Verifique se o LED da impressora acende

### 3️⃣ **Impressora Desligada ou em Modo de Espera**
A impressora pode estar desligada ou sem bateria.

**Solução:**
- Verifique se a impressora está ligada
- Procure por um botão de power ou reset
- Verifique o LED de status

---

## 🔍 Como Verificar em Gerenciador de Dispositivos

1. Pressione `Windows + X`
2. Selecione **Gerenciador de Dispositivos**
3. Procure por:
   - **Portas (COM e LPT)** → Deve aparecer a porta COM da impressora
   - **Dispositivos USB** → Deve aparecer a impressora
   - **Outros Dispositivos** → Se houver ⚠️, o driver está faltando

---

## 📋 Checklist de Diagnóstico

- [ ] Impressora está ligada?
- [ ] Cabo USB está bem conectado?
- [ ] Outro dispositivo USB funciona nessa porta?
- [ ] Gerenciador de Dispositivos mostra a impressora?
- [ ] Existe um ⚠️ amarelo na impressora (driver faltando)?
- [ ] Você instalou o driver da impressora?

---

## 🚀 Próximas Etapas

1. **Instale o driver** da impressora (se não tiver)
2. **Reconecte o cabo USB**
3. **Volte para Configurações > Impressoras**
4. **Clique no botão 🔄 ao lado de "Porta COM/USB"**
5. A porta deve aparecer na lista

---

## 💡 Se Ainda Não Funcionar

Se mesmo após instalar o driver a porta não aparecer:

1. Abra **Gerenciador de Dispositivos**
2. Procure pela impressora
3. Anote o **nome exato** (ex: "TSC TE200 USB Device")
4. Clique com botão direito → **Propriedades**
5. Vá para aba **Detalhes**
6. Procure por **"Caminho do dispositivo"** ou **"Número da porta"**

Se encontrar algo como `COM3` ou `COM5`, você pode digitar manualmente em:
**Configurações > Impressoras > Porta COM/USB**

---

## 📞 Suporte

Se precisar de ajuda:
1. Envie uma foto do **Gerenciador de Dispositivos**
2. Informe o **modelo exato da impressora**
3. Informe o **sistema operacional** (Windows 10/11)
