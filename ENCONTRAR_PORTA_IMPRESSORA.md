# 🔍 Como Encontrar a Porta da Impressora TSC TE200

## Método 1: Gerenciador de Dispositivos (Mais Fácil)

### Passo 1: Abrir Gerenciador de Dispositivos
1. Pressione `Windows + X`
2. Selecione **"Gerenciador de Dispositivos"**

### Passo 2: Procurar a Porta COM da Impressora
1. Expanda **"Portas (COM e LPT)"**
2. Procure por:
   - ✅ **"TSC TE200"** → Anote a porta (ex: COM3, COM5)
   - ✅ **"USB Serial Port"** → Pode ser a impressora
   - ✅ **"Prolific USB-to-Serial"** → Pode ser a impressora
   - ❌ **"Modem Padrão em ligação Bluetooth"** → NÃO é a impressora

### Passo 3: Anotar o Número
Se encontrar algo como **"TSC TE200 (COM3)"**, a porta é **COM3**.

---

## Método 2: PowerShell (Se Não Encontrar)

### Passo 1: Abrir PowerShell
1. Clique com botão direito em **"Terminal"** ou **"PowerShell"**
2. Selecione **"Executar como administrador"**

### Passo 2: Rodar Comando
Cole este comando:

```powershell
Get-WmiObject Win32_SerialPort | Select-Object Name, Description, DeviceID | Format-Table
```

### Passo 3: Procurar a Impressora
Procure por linhas que contenham:
- ✅ **"TSC"** → Porta da impressora
- ✅ **"USB Serial"** → Pode ser a impressora
- ❌ **"Modem"** → NÃO é a impressora

**Resultado esperado:**
```
Name        Description                          DeviceID
----        -----------                          --------
COM3        TSC TE200                            COM3
COM4        Modem Padrão em ligação Bluetooth    COM4
```

---

## Método 3: Desconectar e Reconectar (Mais Seguro)

Se ainda não encontrar:

### Passo 1: Anotar Portas Atuais
1. Abra Gerenciador de Dispositivos
2. Expanda **"Portas (COM e LPT)"**
3. Anote todas as portas que aparecem

### Passo 2: Desconectar Impressora
1. Desconecte o cabo USB da impressora

### Passo 3: Atualizar Gerenciador
1. Pressione `F5` para atualizar
2. Veja qual porta desapareceu

### Passo 4: Reconectar Impressora
1. Reconecte o cabo USB
2. Pressione `F5` para atualizar
3. Veja qual porta reapareceu
4. **Essa é a porta da impressora!**

---

## ⚠️ Importante

- **COM4** que aparece no app é o **Modem Bluetooth**, não a impressora
- A impressora deve estar em outra porta (COM1, COM3, COM5, etc.)
- Se não encontrar nenhuma porta da impressora, o driver não foi instalado corretamente

---

## 🎯 Próximos Passos

1. **Encontre a porta correta** usando um dos métodos acima
2. **Anote o número** (ex: COM3)
3. **Volte ao app** e selecione a porta correta
4. **Clique em "Testar"**

Se conseguir encontrar a porta, avise-me qual é! 📍
